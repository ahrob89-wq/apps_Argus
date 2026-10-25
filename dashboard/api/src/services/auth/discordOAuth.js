import { randomBytes, timingSafeEqual } from 'node:crypto';
import { SessionStore } from './sessionStore.js';
import { getActiveGuildIds as getActiveGuildIdsFromDatabase } from '../supabase.js';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/v10/users/@me';
const DISCORD_USER_GUILDS_URL = 'https://discord.com/api/v10/users/@me/guilds?with_counts=false';
const OAUTH_STATE_COOKIE = 'argus_oauth_state';
const SESSION_COOKIE = 'argus_session';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;
const OAUTH_STATE_CAPACITY = 1_000;
const DISCORD_REQUEST_TIMEOUT_MS = 10_000;
const GUILD_CACHE_TTL_MS = 5_000;
const GUILD_CACHE_STALE_TTL_MS = 15_000;
const DISCORD_ADMINISTRATOR = 0x8n;
const DISCORD_MANAGE_GUILD = 0x20n;
const DISCORD_BAN_MEMBERS = 0x4n;
const DISCORD_MODERATE_MEMBERS = 0x10000000000n;

class DiscordSessionExpiredError extends Error {}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseCookies(header = '') {
  const cookies = new Map();
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies.set(name, value);
  }
  return cookies;
}

function cookieOptions(config, maxAge) {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (config.nodeEnv === 'production') parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(config, name) {
  return `${name}=; ${cookieOptions(config, 0)}`;
}

function safeRedirect(config, result) {
  const destination = new URL('/', config.webOrigin);
  destination.searchParams.set('auth', result);
  return destination.toString();
}

function stateMatches(queryState, cookieState) {
  if (typeof queryState !== 'string' || typeof cookieState !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(queryState) || !/^[A-Za-z0-9_-]{43}$/.test(cookieState)) return false;
  const queryBytes = Buffer.from(queryState);
  const cookieBytes = Buffer.from(cookieState);
  return queryBytes.length === cookieBytes.length && timingSafeEqual(queryBytes, cookieBytes);
}

async function readJsonResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== 'object') {
    throw new Error('Discord OAuth request failed.');
  }
  return body;
}

export function createDiscordOAuth(config, { fetchImpl = fetch, now = Date.now } = {}) {
  const sessions = new SessionStore({
    ttlSeconds: config.discordOAuth.sessionTtlSeconds,
    maxEntries: config.discordOAuth.maxSessions,
    encryptionKey: config.discordOAuth.sessionEncryptionKey,
    filePath: config.discordOAuth.sessionStorePath,
    now
  });
  const pendingStates = new Map();
  const refreshRequests = new Map();
  const guildRequests = new Map();
  const guildCache = new Map();

  function pruneStates() {
    const timestamp = now();
    for (const [state, expiresAt] of pendingStates) {
      if (expiresAt <= timestamp) pendingStates.delete(state);
    }
  }

  function hasOrigin(request) {
    return request.headers.origin === config.webOrigin;
  }

  async function exchangeCode(code) {
    const body = new URLSearchParams({
      client_id: config.discordOAuth.clientId,
      client_secret: config.discordOAuth.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.discordOAuth.redirectUri
    });
    const response = await fetchImpl(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS)
    });
    return readJsonResponse(response);
  }

  async function fetchCurrentUser(accessToken) {
    const response = await fetchImpl(DISCORD_USER_URL, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS)
    });
    const user = await readJsonResponse(response);
    if (typeof user.id !== 'string' || !/^\d{1,24}$/.test(user.id) || typeof user.username !== 'string') {
      throw new Error('Discord returned an invalid user profile.');
    }
    return Object.freeze({
      id: user.id,
      username: user.username,
      globalName: typeof user.global_name === 'string' ? user.global_name : null,
      avatar: typeof user.avatar === 'string' ? user.avatar : null
    });
  }

  async function refreshSession(sessionId, session) {
    if (!session.refreshToken) {
      sessions.delete(sessionId);
      guildCache.delete(sessionId);
      throw new DiscordSessionExpiredError('Discord OAuth session has no refresh token.');
    }

    const body = new URLSearchParams({
      client_id: config.discordOAuth.clientId,
      client_secret: config.discordOAuth.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken
    });
    const response = await fetchImpl(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS)
    });
    if ([400, 401].includes(response.status)) {
      sessions.delete(sessionId);
      guildCache.delete(sessionId);
      throw new DiscordSessionExpiredError('Discord OAuth refresh token expired.');
    }

    const token = await readJsonResponse(response);
    const expiresIn = Number(token.expires_in);
    if (typeof token.access_token !== 'string' || !token.access_token ||
        !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error('Discord returned an invalid refreshed token.');
    }
    const updatedSession = sessions.update(sessionId, {
      ...session,
      accessToken: token.access_token,
      refreshToken: typeof token.refresh_token === 'string' && token.refresh_token
        ? token.refresh_token
        : session.refreshToken,
      accessTokenExpiresAt: now() + expiresIn * 1000
    });
    if (!updatedSession) throw new DiscordSessionExpiredError('Discord OAuth session no longer exists.');
    return updatedSession;
  }

  async function getValidSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    if (session.accessTokenExpiresAt > now() + 60_000) return session;
    const pending = refreshRequests.get(sessionId);
    if (pending) return pending;

    const request = refreshSession(sessionId, session);
    refreshRequests.set(sessionId, request);
    try {
      return await request;
    } finally {
      if (refreshRequests.get(sessionId) === request) refreshRequests.delete(sessionId);
    }
  }

  async function fetchCurrentUserGuilds(accessToken, attempt = 0) {
    const response = await fetchImpl(DISCORD_USER_GUILDS_URL, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS)
    });
    if (response.status === 401) throw new DiscordSessionExpiredError('Discord OAuth token expired.');
    if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
      const retryAfter = Number(response.headers.get('retry-after')) * 1000;
      await wait(Math.min(Math.max(retryAfter || 350 * (attempt + 1), 100), 2_000));
      return fetchCurrentUserGuilds(accessToken, attempt + 1);
    }
    const guilds = await readJsonResponse(response);
    if (!Array.isArray(guilds)) throw new Error('Discord returned an invalid guild list.');
    return guilds.filter((guild) => guild && typeof guild.id === 'string' && /^\d{1,24}$/.test(guild.id) &&
      typeof guild.name === 'string' && guild.name.length > 0);
  }

  function canManageGuild(guild) {
    if (guild.owner === true) return true;
    const rawPermissions = typeof guild.permissions === 'string' ? guild.permissions : guild.permissions_new;
    if (typeof rawPermissions !== 'string' || !/^\d+$/.test(rawPermissions)) return false;
    try {
      const permissions = BigInt(rawPermissions);
      return (permissions & (DISCORD_ADMINISTRATOR | DISCORD_MANAGE_GUILD)) !== 0n;
    } catch {
      return false;
    }
  }

  function hasAdministratorPermission(guild) {
    if (guild.owner === true) return true;
    const rawPermissions = typeof guild.permissions === 'string' ? guild.permissions : guild.permissions_new;
    if (typeof rawPermissions !== 'string' || !/^\d+$/.test(rawPermissions)) return false;
    try {
      return (BigInt(rawPermissions) & DISCORD_ADMINISTRATOR) !== 0n;
    } catch {
      return false;
    }
  }

  async function listManagedGuilds(sessionId) {
    const cached = guildCache.get(sessionId);
    if (cached && cached.expiresAt > now()) return cached.guilds;
    const pending = guildRequests.get(sessionId);
    if (pending) return pending;

    const request = (async () => {
      const session = await getValidSession(sessionId);
      if (!session) return [];
      const discordGuilds = await fetchCurrentUserGuilds(session.accessToken);
      const manageableGuilds = discordGuilds.filter(canManageGuild);
      if (!manageableGuilds.length) return [];

      const activeGuildIds = new Set(await getActiveGuildIdsFromDatabase(manageableGuilds.map(({ id }) => id)));
      return manageableGuilds
        .filter(({ id }) => activeGuildIds.has(id))
        .map(({ id, name, icon, owner, permissions, permissions_new: permissionsNew }) => ({
          id,
          name,
          icon: typeof icon === 'string' ? icon : null,
          owner: owner === true,
          administrator: hasAdministratorPermission({ owner, permissions, permissions_new: permissionsNew })
        }));
    })();
    guildRequests.set(sessionId, request);
    try {
      const guilds = await request;
      guildCache.set(sessionId, { guilds, expiresAt: now() + GUILD_CACHE_TTL_MS });
      return guilds;
    } catch (error) {
      if (error instanceof DiscordSessionExpiredError) {
        sessions.delete(sessionId);
        guildCache.delete(sessionId);
        throw error;
      }
      const lastGood = guildCache.get(sessionId);
      if (lastGood && now() - lastGood.expiresAt <= GUILD_CACHE_STALE_TTL_MS) return lastGood.guilds;
      throw error;
    } finally {
      if (guildRequests.get(sessionId) === request) guildRequests.delete(sessionId);
    }
  }

  async function authorizeGuildAction(sessionId, guildId, action) {
    const session = await getValidSession(sessionId);
    if (!session || typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) return null;
    let guilds;
    try {
      guilds = await fetchCurrentUserGuilds(session.accessToken);
    } catch (error) {
      if (error instanceof DiscordSessionExpiredError) sessions.delete(sessionId);
      throw error;
    }
    const guild = guilds.find((entry) => entry.id === guildId);
    if (!guild) return null;
    const activeGuildIds = new Set(await getActiveGuildIdsFromDatabase([guildId]));
    if (!activeGuildIds.has(guildId)) return null;

    const rawPermissions = typeof guild.permissions === 'string' ? guild.permissions : guild.permissions_new;
    let permissions = 0n;
    if (typeof rawPermissions === 'string' && /^\d+$/.test(rawPermissions)) permissions = BigInt(rawPermissions);
    const administrator = guild.owner === true || (permissions & DISCORD_ADMINISTRATOR) !== 0n;
    const backupMutation = ['backup-delete', 'backup-rename', 'backup-restore-preview', 'backup-restore'].includes(action);
    const ownerSettingsAction = ['settings-options', 'settings-save'].includes(action);
    const allowed = backupMutation || ownerSettingsAction
      ? guild.owner === true
      : action === 'ban'
      ? administrator || (permissions & DISCORD_BAN_MEMBERS) !== 0n
      : action === 'antinuke-config'
        ? guild.owner === true
      : ['lockdown-start', 'lockdown-end'].includes(action)
        ? administrator || (permissions & DISCORD_MANAGE_GUILD) !== 0n
      : action === 'backup-create'
        ? administrator
        : ['timeout', 'jail', 'unjail'].includes(action)
        ? administrator || (permissions & DISCORD_MODERATE_MEMBERS) !== 0n
        : ['trust', 'tracking-clear', 'tracking-extend', 'tracking-reduce'].includes(action)
          ? administrator || (permissions & (DISCORD_MODERATE_MEMBERS | DISCORD_MANAGE_GUILD)) !== 0n
          : false;
    return allowed ? Object.freeze({ actorId: session.user.id, guildId }) : null;
  }

  async function revokeAccessToken(accessToken) {
    const body = new URLSearchParams({
      client_id: config.discordOAuth.clientId,
      client_secret: config.discordOAuth.clientSecret,
      token: accessToken,
      token_type_hint: 'access_token'
    });
    await fetchImpl('https://discord.com/api/oauth2/token/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS)
    });
  }

  function registerRoutes(app) {
    app.get('/api/v1/auth/discord', {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, async (_request, reply) => {
      if (!config.discordOAuth.enabled) {
        return reply.code(503).send({ error: { code: 'OAUTH_UNAVAILABLE', message: 'Discord sign-in is not configured.' } });
      }

      pruneStates();
      while (pendingStates.size >= OAUTH_STATE_CAPACITY) {
        const oldestState = pendingStates.keys().next().value;
        if (!oldestState) break;
        pendingStates.delete(oldestState);
      }

      const state = randomBytes(32).toString('base64url');
      pendingStates.set(state, now() + OAUTH_STATE_TTL_MS);
      const authorizationUrl = new URL(DISCORD_AUTHORIZE_URL);
      authorizationUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: config.discordOAuth.clientId,
        scope: 'identify guilds',
        state,
        redirect_uri: config.discordOAuth.redirectUri
      }).toString();

      return reply
        .header('cache-control', 'no-store')
        .header('set-cookie', `${OAUTH_STATE_COOKIE}=${state}; ${cookieOptions(config, 300)}`)
        .redirect(authorizationUrl.toString(), 302);
    });

    app.get('/api/v1/auth/discord/callback', async (request, reply) => {
      const cookies = parseCookies(request.headers.cookie);
      const state = request.query?.state;
      const cookieState = cookies.get(OAUTH_STATE_COOKIE);
      const stateExpiry = typeof state === 'string' && state.length === 43 ? pendingStates.get(state) : undefined;
      pendingStates.delete(typeof state === 'string' ? state : '');

      reply.header('cache-control', 'no-store')
        .header('referrer-policy', 'no-referrer')
        .header('set-cookie', clearCookie(config, OAUTH_STATE_COOKIE));

      if (!config.discordOAuth.enabled || !stateMatches(state, cookieState) || !stateExpiry || stateExpiry <= now()) {
        return reply.redirect(safeRedirect(config, 'error'), 303);
      }
      if (typeof request.query?.error === 'string' || typeof request.query?.code !== 'string' ||
          !request.query.code || request.query.code.length > 2_048) {
        return reply.redirect(safeRedirect(config, 'denied'), 303);
      }

      try {
        const token = await exchangeCode(request.query.code);
        if (typeof token.access_token !== 'string' || !token.access_token ||
            !Number.isFinite(Number(token.expires_in)) || Number(token.expires_in) <= 0) {
          throw new Error('Discord returned an invalid token response.');
        }
        const grantedScopes = new Set(typeof token.scope === 'string' ? token.scope.split(/\s+/) : []);
        if (!grantedScopes.has('identify') || !grantedScopes.has('guilds')) {
          throw new Error('Discord did not grant the required sign-in scopes.');
        }
        const user = await fetchCurrentUser(token.access_token);
        const accessTokenExpiresAt = now() + Number(token.expires_in) * 1000;
        const previousSessionId = cookies.get(SESSION_COOKIE);
        sessions.delete(previousSessionId);
        guildCache.delete(previousSessionId);
        const { sessionId, session } = sessions.create({
          user,
          accessToken: token.access_token,
          refreshToken: typeof token.refresh_token === 'string' ? token.refresh_token : null,
          accessTokenExpiresAt
        });
        const sessionMaxAge = Math.max(0, Math.floor((session.expiresAt - now()) / 1000));

        return reply
          .header('set-cookie', [
            clearCookie(config, OAUTH_STATE_COOKIE),
            `${SESSION_COOKIE}=${sessionId}; ${cookieOptions(config, sessionMaxAge)}`
          ])
          .redirect(safeRedirect(config, 'complete'), 303);
      } catch {
        request.log.warn({ event: 'discord_oauth_callback_failed' }, 'Discord sign-in could not be completed');
        return reply.redirect(safeRedirect(config, 'error'), 303);
      }
    });

    app.get('/api/v1/auth/session', async (request, reply) => {
      const sessionId = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
      const session = sessions.get(sessionId);
      reply.header('cache-control', 'no-store');
      if (!session) {
        if (sessionId) reply.header('set-cookie', clearCookie(config, SESSION_COOKIE));
        return { authenticated: false, loginAvailable: config.discordOAuth.enabled };
      }

      return {
        authenticated: true,
        loginAvailable: true,
        siteAdmin: config.dashboardAdminUserIds?.includes(session.user.id) === true,
        user: session.user,
        expiresAt: new Date(session.expiresAt).toISOString()
      };
    });

    app.get('/api/v1/guilds', async (request, reply) => {
      const sessionId = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
      const session = sessions.get(sessionId);
      reply.header('cache-control', 'no-store');
      if (!session) {
        if (sessionId) reply.header('set-cookie', clearCookie(config, SESSION_COOKIE));
        return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
      }

      try {
        const guilds = await listManagedGuilds(sessionId);
        return { guilds: guilds.map(({ administrator: _administrator, ...guild }) => guild) };
      } catch (error) {
        if (error instanceof DiscordSessionExpiredError) {
          sessions.delete(sessionId);
          reply.header('set-cookie', clearCookie(config, SESSION_COOKIE));
          return reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Sign in with Discord again.' } });
        }
        request.log.warn({
          event: 'discord_guild_discovery_failed',
          code: typeof error?.code === 'string' ? error.code : undefined,
          status: Number.isInteger(error?.status) ? error.status : undefined,
          name: typeof error?.name === 'string' ? error.name : 'Error'
        }, 'Authorized Discord servers could not be loaded');
        return reply.code(503).send({ error: { code: 'GUILD_DISCOVERY_UNAVAILABLE', message: 'Server access could not be checked right now.' } });
      }
    });

    app.get('/api/v1/guilds/:guildId/access', async (request, reply) => {
      const guildId = request.params?.guildId;
      if (typeof guildId !== 'string' || !/^\d{1,24}$/.test(guildId)) {
        return reply.code(400).send({ error: { code: 'INVALID_GUILD_ID', message: 'A valid server ID is required.' } });
      }

      const sessionId = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
      const session = sessions.get(sessionId);
      reply.header('cache-control', 'no-store');
      if (!session) {
        if (sessionId) reply.header('set-cookie', clearCookie(config, SESSION_COOKIE));
        return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
      }

      try {
        const guild = (await listManagedGuilds(sessionId)).find((item) => item.id === guildId);
        if (!guild) {
          return reply.code(403).send({ error: { code: 'GUILD_ACCESS_DENIED', message: 'You cannot access this server.' } });
        }
        const { administrator: _administrator, ...publicGuild } = guild;
        return { authorized: true, guild: publicGuild };
      } catch (error) {
        if (error instanceof DiscordSessionExpiredError) {
          sessions.delete(sessionId);
          reply.header('set-cookie', clearCookie(config, SESSION_COOKIE));
          return reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Sign in with Discord again.' } });
        }
        request.log.warn({
          event: 'discord_guild_authorization_failed',
          code: typeof error?.code === 'string' ? error.code : undefined,
          status: Number.isInteger(error?.status) ? error.status : undefined,
          name: typeof error?.name === 'string' ? error.name : 'Error'
        }, 'Discord server access could not be checked');
        return reply.code(503).send({ error: { code: 'GUILD_ACCESS_UNAVAILABLE', message: 'Server access could not be checked right now.' } });
      }
    });

    app.post('/api/v1/auth/logout', async (request, reply) => {
      if (!hasOrigin(request)) {
        return reply.code(403).send({ error: { code: 'INVALID_ORIGIN', message: 'The request origin is not allowed.' } });
      }

      const sessionId = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
      const session = sessions.delete(sessionId);
      guildCache.delete(sessionId);
      reply.header('cache-control', 'no-store').header('set-cookie', clearCookie(config, SESSION_COOKIE));

      if (session?.accessToken && config.discordOAuth.enabled) {
        try {
          await revokeAccessToken(session.accessToken);
        } catch {
          request.log.warn({ event: 'discord_oauth_revoke_failed' }, 'Discord token revocation failed after local logout');
        }
      }

      return { authenticated: false };
    });
  }

  return Object.freeze({
    registerRoutes,
    getSession: (sessionId) => sessions.get(sessionId),
    isSiteAdmin: (sessionId) => {
      const session = sessions.get(sessionId);
      return Boolean(session && config.dashboardAdminUserIds?.includes(session.user.id));
    },
    getSessionIdFromRequest: (request) => parseCookies(request.headers.cookie).get(SESSION_COOKIE),
    resolveAuthorizedGuild: async (sessionId, guildId) => {
      if (!sessions.get(sessionId) || typeof guildId !== 'string' || !/^\d{1,24}$/.test(guildId)) return null;
      return (await listManagedGuilds(sessionId)).find((guild) => guild.id === guildId) || null;
    },
    authorizeGuildAction
  });
}
