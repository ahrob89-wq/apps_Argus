import { timingSafeEqual } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import config from './config.js';
import { checkDatabaseConnection } from './services/supabase.js';
import { createDiscordOAuth } from './services/auth/discordOAuth.js';
import { createBotHeartbeatTracker } from './services/botHeartbeat.js';
import { createBotControlDeliveryTracker } from './services/botControlDelivery.js';
import { createDashboardReadService, DashboardReadError } from './services/dashboardRead.js';
import { supabase } from './services/supabase.js';

const CONTROL_FEATURES = ['antiNuke', 'raidDefense', 'tracking', 'linkScanning', 'verification', 'backups', 'alerts'];

export function buildApp({ databaseCheck = checkDatabaseConnection, authService = createDiscordOAuth(config) } = {}) {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'req.headers.cookie']
    },
    bodyLimit: 64 * 1024,
    requestTimeout: 10_000,
    trustProxy: false,
    // OAuth callbacks contain one-time codes in their query string. Avoid
    // automatic request logs that could record those values.
    disableRequestLogging: true
  });

  app.decorate('dashboardRead', createDashboardReadService({
    getSession: authService.getSession,
    resolveAuthorizedGuild: authService.resolveAuthorizedGuild
  }));
  app.decorate('botHeartbeat', createBotHeartbeatTracker(config.dashboardBotHeartbeat));
  app.decorate('botControlDelivery', createBotControlDeliveryTracker(config.dashboardBotHeartbeat));

  app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' }
  });
  app.register(cors, {
    origin: (origin, callback) => callback(null, origin === config.webOrigin ? origin : false),
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600
  });
  app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

  authService.registerRoutes(app);

  app.post('/api/v1/bot/heartbeat', {
    config: { rateLimit: { max: 12, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    if (!app.botHeartbeat.enabled) {
      return reply.code(503).send({ error: { code: 'BOT_HEARTBEAT_NOT_CONFIGURED', message: 'Bot heartbeat reporting is not configured.' } });
    }
    const expected = Buffer.from(`Bearer ${config.dashboardBotHeartbeat.token}`);
    const actual = Buffer.from(request.headers.authorization || '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return reply.code(401).send({ error: { code: 'BOT_HEARTBEAT_UNAUTHORIZED', message: 'The bot heartbeat could not be authenticated.' } });
    }
    if (request.body !== undefined) {
      return reply.code(400).send({ error: { code: 'BOT_HEARTBEAT_INVALID_REQUEST', message: 'The bot heartbeat request must not include a body.' } });
    }

    const receivedAt = app.botHeartbeat.record();
    return { status: 'accepted', receivedAt: new Date(receivedAt).toISOString() };
  });

  // Bot control polling is authenticated with the existing heartbeat secret.
  // The API returns only operational flags; missing rows retain safe defaults.
  app.get('/api/v1/bot/control', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const expected = Buffer.from(`Bearer ${config.dashboardBotHeartbeat.token}`);
    const actual = Buffer.from(request.headers.authorization || '');
    if (!app.botHeartbeat.enabled || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return reply.code(401).send({ error: { code: 'BOT_CONTROL_UNAUTHORIZED', message: 'Bot control authentication failed.' } });
    }
    const controlResult = await supabase.rpc('get_argus_control_snapshot');
    if (controlResult.error || !controlResult.data || typeof controlResult.data !== 'object') {
      request.log.warn({ event: 'bot_control_read_failed' }, 'Bot control settings could not be read');
      return reply.code(503).send({ error: { code: 'BOT_CONTROL_UNAVAILABLE', message: 'Bot control settings are temporarily unavailable.' } });
    }
    return { ...controlResult.data, fetchedAt: new Date().toISOString() };
  });

  app.post('/api/v1/bot/control/ack', {
    config: { rateLimit: { max: 12, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const expected = Buffer.from(`Bearer ${config.dashboardBotHeartbeat.token}`);
    const actual = Buffer.from(request.headers.authorization || '');
    if (!app.botHeartbeat.enabled || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return reply.code(401).send({ error: { code: 'BOT_CONTROL_ACK_UNAUTHORIZED', message: 'Bot control acknowledgement authentication failed.' } });
    }
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !/^(0|[1-9]\d{0,19})$/.test(String(body.revision ?? ''))) {
      return reply.code(400).send({ error: { code: 'BOT_CONTROL_ACK_INVALID', message: 'A control revision is required.' } });
    }
    const recorded = app.botControlDelivery.record(body.revision);
    return { acknowledged: true, revision: recorded.revision };
  });

  app.get('/api/v1/admin/control', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const sessionId = authService.getSessionIdFromRequest(request);
    const session = authService.getSession(sessionId);
    if (!session) return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
    if (!authService.isSiteAdmin?.(sessionId)) return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Site administrator access is required.' } });
    const page = Math.max(1, Math.min(10_000, Number.parseInt(request.query?.page, 10) || 1));
    const pageSize = 100;
    const search = typeof request.query?.search === 'string'
      ? request.query.search.trim().replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 80) : '';
    let guildQuery = supabase.from('guilds').select('guild_id,name,is_active,argus_guild_control(enabled,plan,feature_overrides,feature_plans)', { count: 'exact' }).order('name');
    if (search) guildQuery = /^\d{17,20}$/.test(search) ? guildQuery.eq('guild_id', search) : guildQuery.ilike('name', `%${search}%`);
    guildQuery = guildQuery.range((page - 1) * pageSize, page * pageSize - 1);
    const [globalResult, guildResult, planResult, auditResult, auditVersionResult] = await Promise.all([
      supabase.from('argus_global_control').select('maintenance_mode,updated_at').eq('control_id', true).maybeSingle(),
      guildQuery,
      supabase.from('argus_plan_features').select('plan,features,updated_at'),
      supabase.from('argus_control_audit').select('id,actor_id,scope,target_id,action,before_state,after_state,created_at').order('created_at', { ascending: false }).limit(30),
      supabase.from('argus_control_audit').select('id').order('id', { ascending: false }).limit(1).maybeSingle()
    ]);
    if (globalResult.error || guildResult.error || planResult.error || auditResult.error || auditVersionResult.error) {
      request.log.warn({ event: 'admin_control_read_failed' }, 'Admin control data could not be loaded');
      return reply.code(503).send({ error: { code: 'CONTROL_DATA_UNAVAILABLE', message: 'Control data is unavailable. Apply the control-plane migration first.' } });
    }
    return {
      global: globalResult.data || { maintenance_mode: false },
      guilds: (guildResult.data || []).map((row) => ({
        guildId: row.guild_id, name: row.name || row.guild_id, active: row.is_active,
        control: (Array.isArray(row.argus_guild_control) ? row.argus_guild_control[0] : row.argus_guild_control) || { enabled: true, plan: 'free', feature_overrides: {}, feature_plans: {} }
      })),
      serverPage: { page, pageSize, total: guildResult.count || 0, search },
      plans: planResult.data || [], audit: auditResult.data || [], botControlConfigured: app.botHeartbeat.enabled,
      botHeartbeat: app.botHeartbeat.snapshot(),
      botControlDelivery: app.botControlDelivery.snapshot(auditVersionResult.data?.id ?? '0')
    };
  });

  app.post('/api/v1/admin/control', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    if (request.headers.origin !== config.webOrigin) return reply.code(403).send({ error: { code: 'INVALID_ORIGIN', message: 'The request origin is not allowed.' } });
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'A JSON request body is required.' } });
    const sessionId = authService.getSessionIdFromRequest(request);
    const session = authService.getSession(sessionId);
    if (!session) return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
    if (!authService.isSiteAdmin?.(sessionId)) return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Site administrator access is required.' } });
    const { scope, targetId, changes } = request.body || {};
    if (!['global', 'guild', 'plan'].includes(scope) || !changes || typeof changes !== 'object' || Array.isArray(changes)) return reply.code(400).send({ error: { code: 'INVALID_CONTROL_CHANGE', message: 'A valid control change is required.' } });
    const actorId = session.user?.id || session.userId;
    const validGlobalChange = scope === 'global' && targetId === 'global' && Object.keys(changes).length === 1 && typeof changes.maintenanceMode === 'boolean';
    const validGuildChange = scope === 'guild' && /^\d{17,20}$/.test(targetId || '') && Object.keys(changes).length > 0 && Object.keys(changes).every((keyName) => ['enabled', 'plan', 'feature', 'featurePlan'].includes(keyName));
    const validPlanChange = scope === 'plan' && ['free', 'paid'].includes(targetId) && Object.keys(changes).length === 2 && CONTROL_FEATURES.includes(changes.exclusiveFeature) && typeof changes.enabled === 'boolean';
    if (validGuildChange) {
      if (changes.enabled !== undefined && typeof changes.enabled !== 'boolean') return reply.code(400).send({ error: { code: 'INVALID_CONTROL_CHANGE', message: 'Guild enabled must be boolean.' } });
      if (changes.plan !== undefined && !['free', 'paid'].includes(changes.plan)) return reply.code(400).send({ error: { code: 'INVALID_CONTROL_CHANGE', message: 'Plan must be free or paid.' } });
      if (changes.feature && (!CONTROL_FEATURES.includes(changes.feature.key) || ![true, false, null].includes(changes.feature.value))) return reply.code(400).send({ error: { code: 'INVALID_CONTROL_CHANGE', message: 'Invalid feature override.' } });
      if (changes.featurePlan !== undefined && (!changes.featurePlan || Object.keys(changes).length !== 1 || Object.keys(changes.featurePlan).length !== 2 || !CONTROL_FEATURES.includes(changes.featurePlan.key) || !['free', 'paid'].includes(changes.featurePlan.plan))) return reply.code(400).send({ error: { code: 'INVALID_CONTROL_CHANGE', message: 'Invalid per-server feature plan.' } });
    }
    if (!validGlobalChange && !validGuildChange && !validPlanChange) return reply.code(400).send({ error: { code: 'INVALID_CONTROL_CHANGE', message: 'The control change is not supported.' } });

    const write = scope === 'plan'
      ? await supabase.rpc('set_argus_exclusive_plan_feature', {
        p_plan: targetId, p_feature: changes.exclusiveFeature, p_enabled: changes.enabled, p_actor_id: actorId
      })
      : scope === 'guild' && changes.featurePlan
        ? await supabase.rpc('set_argus_guild_feature_plan', {
          p_guild_id: targetId, p_feature: changes.featurePlan.key, p_plan: changes.featurePlan.plan, p_actor_id: actorId
        })
      : await supabase.rpc('apply_argus_control_change', {
        p_scope: scope, p_target_id: targetId, p_actor_id: actorId, p_changes: changes
      });
    if (write.error) {
      request.log.warn({ event: 'admin_control_write_failed', scope }, 'Control change and audit transaction failed');
      return reply.code(503).send({ error: { code: 'CONTROL_WRITE_FAILED', message: 'The control change and its audit record could not be saved.' } });
    }
    return { saved: true, state: write.data };
  });

  app.get('/api/v1/guilds/:guildId/overview', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const overview = await app.dashboardRead.getOverview({
      sessionId: authService.getSessionIdFromRequest(request),
      guildId: request.params?.guildId
    });
    return {
      ...overview,
      summary: {
        ...overview.summary,
        bot: app.botHeartbeat.snapshot()
      }
    };
  });

  app.get('/api/v1/guilds/:guildId/tracking', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return app.dashboardRead.listActiveTracking({
      sessionId: authService.getSessionIdFromRequest(request),
      guildId: request.params?.guildId,
      query: request.query
    });
  });

  app.post('/api/v1/guilds/:guildId/tracking/:targetId/actions', {
    config: { rateLimit: { max: 8, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    if (request.headers.origin !== config.webOrigin) {
      return reply.code(403).send({ error: { code: 'INVALID_ORIGIN', message: 'The request origin is not allowed.' } });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'A JSON request body is required.' } });
    }
    const sessionId = authService.getSessionIdFromRequest(request);
    const session = authService.getSession(sessionId);
    if (!session) return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
    if (!config.dashboardActionBridge.enabled) {
      return reply.code(503).send({ error: { code: 'ACTION_BRIDGE_UNAVAILABLE', message: 'Discord actions are not configured.' } });
    }

    const { guildId, targetId } = request.params || {};
    const { action, reason } = request.body || {};
    const idempotencyKey = request.headers['idempotency-key'];
    if (!/^\d{17,20}$/.test(guildId || '') || !/^\d{17,20}$/.test(targetId || '') ||
        !['trust', 'timeout', 'ban'].includes(action) || typeof reason !== 'string' ||
        reason.trim().length < 3 || reason.trim().length > 300 || typeof idempotencyKey !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return reply.code(400).send({ error: { code: 'INVALID_ACTION', message: 'Provide a supported action, an idempotency key, and a reason between 3 and 300 characters.' } });
    }

    try {
      const authorized = await authService.authorizeGuildAction(sessionId, guildId, action);
      if (!authorized) return reply.code(403).send({ error: { code: 'ACTION_PERMISSION_REQUIRED', message: 'You cannot perform this action in this server.' } });

      const bridgeResponse = await fetch(config.dashboardActionBridge.url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.dashboardActionBridge.secret}`,
          'content-type': 'application/json',
          accept: 'application/json',
          'idempotency-key': idempotencyKey
        },
        body: JSON.stringify({ guildId, targetId, actorId: authorized.actorId, action, reason: reason.trim(), idempotencyKey }),
        signal: AbortSignal.timeout(10_000)
      });
      const result = await bridgeResponse.json().catch(() => null);
      if (!result || typeof result !== 'object') {
        return reply.code(502).send({ error: { code: 'ACTION_BRIDGE_INVALID_RESPONSE', message: 'Argus could not confirm the action result. Refresh before retrying.' } });
      }
      return reply.code(bridgeResponse.status).send(result);
    } catch (error) {
      if (error?.name === 'DiscordSessionExpiredError') {
        return reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Sign in with Discord again.' } });
      }
      request.log.warn({ event: 'dashboard_tracking_action_unavailable', action }, 'The Discord action could not be dispatched');
      return reply.code(503).send({ error: { code: 'ACTION_UNAVAILABLE', message: 'The action could not be confirmed. Refresh the tracking list before retrying.' } });
    }
  });

  app.post('/api/v1/guilds/:guildId/actions', {
    config: { rateLimit: { max: 8, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    if (request.headers.origin !== config.webOrigin) {
      return reply.code(403).send({ error: { code: 'INVALID_ORIGIN', message: 'The request origin is not allowed.' } });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'A JSON request body is required.' } });
    }

    const sessionId = authService.getSessionIdFromRequest(request);
    const session = authService.getSession(sessionId);
    if (!session) return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
    if (!config.dashboardActionBridge.enabled) {
      return reply.code(503).send({ error: { code: 'ACTION_BRIDGE_UNAVAILABLE', message: 'Discord actions are not configured.' } });
    }

    const guildId = request.params?.guildId;
    const body = request.body || {};
    const { action, targetId, reason, durationHours, configChange } = body;
    const idempotencyKey = request.headers['idempotency-key'];
    const backupAction = action === 'backup-create';
    const configAction = action === 'antinuke-config';
    const lockdownAction = ['lockdown-start', 'lockdown-end'].includes(action);
    const settingsAction = ['settings-options', 'settings-save'].includes(action);
    const backupMutation = ['backup-delete', 'backup-rename', 'backup-restore-preview', 'backup-restore'].includes(action);
    const backupWorkflow = backupAction || backupMutation;
    const durationAction = ['tracking-extend', 'tracking-reduce', 'jail'].includes(action);
    if (!/^\d{17,20}$/.test(guildId || '') ||
        !['trust', 'timeout', 'ban', 'tracking-clear', 'tracking-extend', 'tracking-reduce', 'jail', 'unjail', 'backup-create', 'antinuke-config', 'lockdown-start', 'lockdown-end', 'backup-delete', 'backup-rename', 'backup-restore-preview', 'backup-restore', 'settings-options', 'settings-save'].includes(action) ||
        (!backupWorkflow && !configAction && !lockdownAction && !settingsAction && !/^\d{17,20}$/.test(targetId || '')) ||
        (!backupWorkflow && !settingsAction && (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > (lockdownAction ? 200 : 300))) ||
        (action === 'settings-save' && (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings) || !Object.keys(body.settings).length)) ||
        (durationAction && (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 672)) ||
        (configAction && (!configChange || typeof configChange !== 'object' ||
          !['enabled', 'mode', 'threshold'].includes(configChange.setting))) ||
        (backupMutation && (typeof body.snapshotId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.snapshotId))) ||
        (action === 'backup-rename' && (typeof body.backupName !== 'string' || !body.backupName.trim() || body.backupName.trim().length > 100)) ||
        (action === 'backup-restore' && (typeof body.challengeCode !== 'string' || !/^[A-Z0-9]{6}$/i.test(body.challengeCode) ||
          typeof body.nonce !== 'string' || !/^[a-f0-9]{64}$/i.test(body.nonce) ||
          body.allowAdministratorGrant === true || body.destructivePurge === true)) ||
        typeof idempotencyKey !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return reply.code(400).send({ error: { code: 'INVALID_ACTION', message: 'Provide a supported action and valid action details.' } });
    }

    try {
      const authorized = await authService.authorizeGuildAction(sessionId, guildId, action);
      if (!authorized) return reply.code(403).send({ error: { code: 'ACTION_PERMISSION_REQUIRED', message: 'You cannot perform this action in this server.' } });

      const bridgeResponse = await fetch(config.dashboardActionBridge.url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.dashboardActionBridge.secret}`,
          'content-type': 'application/json',
          accept: 'application/json',
          'idempotency-key': idempotencyKey
        },
        body: JSON.stringify({
          guildId,
          targetId: backupWorkflow || configAction || lockdownAction || settingsAction ? null : targetId,
          actorId: authorized.actorId,
          action,
          ...(backupWorkflow || settingsAction ? {} : { reason: reason.trim() }),
          ...(configAction ? { configChange } : {}),
          ...(action === 'settings-save' ? { settings: body.settings } : {}),
          ...(backupMutation ? {
            snapshotId: body.snapshotId,
            ...(action === 'backup-rename' ? { backupName: body.backupName.trim() } : {}),
            ...(action === 'backup-restore' ? { challengeCode: body.challengeCode, nonce: body.nonce } : {})
          } : {}),
          ...(durationAction ? { durationHours } : {}),
          idempotencyKey
        }),
        signal: AbortSignal.timeout(backupAction || lockdownAction || action === 'backup-restore' ? 120_000 : settingsAction ? 30_000 : 10_000)
      });
      const result = await bridgeResponse.json().catch(() => null);
      if (!result || typeof result !== 'object') {
        return reply.code(502).send({ error: { code: 'ACTION_BRIDGE_INVALID_RESPONSE', message: 'Argus could not confirm the action result. Refresh before retrying.' } });
      }
      return reply.code(bridgeResponse.status).send(result);
    } catch (error) {
      if (error?.name === 'DiscordSessionExpiredError') {
        return reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Sign in with Discord again.' } });
      }
      request.log.warn({ event: 'dashboard_action_unavailable', action }, 'The Discord action could not be dispatched');
      return reply.code(503).send({ error: { code: 'ACTION_UNAVAILABLE', message: 'The action could not be confirmed. Refresh before retrying.' } });
    }
  });

  app.get('/api/v1/guilds/:guildId/events', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return app.dashboardRead.listSecurityEvents({
      sessionId: authService.getSessionIdFromRequest(request),
      guildId: request.params?.guildId,
      query: request.query
    });
  });

  app.get('/api/v1/guilds/:guildId/settings', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return app.dashboardRead.getGuildSettings({
      sessionId: authService.getSessionIdFromRequest(request),
      guildId: request.params?.guildId
    });
  });

  app.get('/api/v1/guilds/:guildId/backups', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return app.dashboardRead.listBackups({
      sessionId: authService.getSessionIdFromRequest(request),
      guildId: request.params?.guildId,
      query: request.query
    });
  });

  app.get('/api/v1/admin/health', async (request, reply) => {
    const sessionId = authService.getSessionIdFromRequest(request);
    reply.header('cache-control', 'no-store');
    if (!authService.getSession(sessionId)) {
      return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in with Discord to continue.' } });
    }
    if (!authService.isSiteAdmin?.(sessionId)) {
      return reply.code(403).send({ error: { code: 'SITE_ADMIN_REQUIRED', message: 'Site administrator access is required.' } });
    }

    let database = { status: 'connected' };
    try {
      await databaseCheck();
    } catch {
      database = { status: 'unavailable' };
    }
    return {
      generatedAt: new Date().toISOString(),
      api: { status: 'available' },
      database,
      bot: app.botHeartbeat.snapshot(),
      discordGateway: { status: 'unknown', reason: 'The dashboard API cannot observe the bot gateway directly.' }
    };
  });

  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/api/v1/health/ready', async (_request, reply) => {
    try {
      await databaseCheck();
      return { status: 'ready', database: 'connected' };
    } catch (error) {
      app.log.error({ code: error?.code || 'DATABASE_CHECK_FAILED' }, 'Dashboard database readiness check failed');
      return reply.code(503).send({ status: 'degraded', database: 'unavailable' });
    }
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof DashboardReadError) {
      app.log.warn({
        code: error.code,
        route: request.routeOptions?.url
      }, 'Dashboard data read failed');
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message }
      });
    }
    app.log.error({ code: error?.code || 'REQUEST_FAILED' }, 'Dashboard API request failed');
    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
      error: {
        code: error.statusCode && error.statusCode < 500 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
        message: error.statusCode && error.statusCode < 500 ? 'The request could not be processed.' : 'The service could not complete the request.'
      }
    });
  });

  return app;
}

export default buildApp;
