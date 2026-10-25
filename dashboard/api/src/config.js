import dotenv from 'dotenv';
import { createHmac } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryEnvPath = resolve(currentDirectory, '../../../../.env');
const apiEnvPath = resolve(currentDirectory, '../.env');

// Local API settings can live beside this package; shared Supabase settings
// may fall back to the repository-root .env. Production hosts inject secrets.
dotenv.config({ path: apiEnvPath });
dotenv.config({ path: repositoryEnvPath });

function required(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : '');
  if (!value || !value.trim()) {
    throw new Error(`Missing required dashboard API environment variable: ${name}`);
  }
  return value.trim();
}

const supabaseUrl = required('SUPABASE_URL');
const supabaseSecretKey = required('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_KEY');
const parsedSupabaseUrl = new URL(supabaseUrl);
if (!['https:', 'http:'].includes(parsedSupabaseUrl.protocol)) {
  throw new Error('SUPABASE_URL must use HTTP or HTTPS.');
}
if (process.env.NODE_ENV === 'production' && parsedSupabaseUrl.protocol !== 'https:') {
  throw new Error('SUPABASE_URL must use HTTPS in production.');
}

const webOrigin = process.env.DASHBOARD_WEB_ORIGIN || 'http://localhost:5173';
const parsedWebOrigin = new URL(webOrigin);
if (!['https:', 'http:'].includes(parsedWebOrigin.protocol)) {
  throw new Error('DASHBOARD_WEB_ORIGIN must be an HTTP or HTTPS origin.');
}
if (process.env.NODE_ENV === 'production' && parsedWebOrigin.protocol !== 'https:') {
  throw new Error('DASHBOARD_WEB_ORIGIN must use HTTPS in production.');
}

const discordOAuthClientId = process.env.DISCORD_OAUTH_CLIENT_ID?.trim() || '';
const discordOAuthClientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET?.trim() || '';
const discordOAuthRedirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI?.trim() || '';
const oauthValues = [discordOAuthClientId, discordOAuthClientSecret, discordOAuthRedirectUri];
const oauthConfiguredCount = oauthValues.filter(Boolean).length;
const oauthSessionEncryptionKey = discordOAuthClientSecret
  ? createHmac('sha256', discordOAuthClientSecret).update('argus-dashboard-session-store-v1').digest()
  : null;

const dashboardAdminUserIds = [...new Set((process.env.DASHBOARD_ADMIN_USER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => /^\d{1,24}$/.test(value)))];

const dashboardActionBridgeSecret = process.env.DASHBOARD_ACTION_BRIDGE_SECRET?.trim() || '';
const dashboardActionBridgeUrl = process.env.DASHBOARD_ACTION_BRIDGE_URL?.trim() || 'http://127.0.0.1:3120/v1/tracking/actions';
const parsedDashboardActionBridgeUrl = new URL(dashboardActionBridgeUrl);
const bridgeHost = parsedDashboardActionBridgeUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase();
if (parsedDashboardActionBridgeUrl.protocol !== 'http:' ||
    !(bridgeHost === 'localhost' || bridgeHost === '::1' || /^127(?:\.\d{1,3}){3}$/.test(bridgeHost)) ||
    parsedDashboardActionBridgeUrl.pathname !== '/v1/tracking/actions' || parsedDashboardActionBridgeUrl.search || parsedDashboardActionBridgeUrl.hash) {
  throw new Error('DASHBOARD_ACTION_BRIDGE_URL must be the private loopback HTTP tracking action endpoint.');
}
if (dashboardActionBridgeSecret && Buffer.byteLength(dashboardActionBridgeSecret) < 32) {
  throw new Error('DASHBOARD_ACTION_BRIDGE_SECRET must contain at least 32 bytes.');
}
if (oauthConfiguredCount > 0 && oauthConfiguredCount < oauthValues.length) {
  throw new Error('Discord OAuth requires DISCORD_OAUTH_CLIENT_ID, DISCORD_OAUTH_CLIENT_SECRET, and DISCORD_OAUTH_REDIRECT_URI.');
}

if (discordOAuthRedirectUri) {
  const parsedRedirectUri = new URL(discordOAuthRedirectUri);
  if (!['https:', 'http:'].includes(parsedRedirectUri.protocol)) {
    throw new Error('DISCORD_OAUTH_REDIRECT_URI must use HTTP or HTTPS.');
  }
  if (process.env.NODE_ENV === 'production' && parsedRedirectUri.protocol !== 'https:') {
    throw new Error('DISCORD_OAUTH_REDIRECT_URI must use HTTPS in production.');
  }
}

function boundedInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

const port = Number(process.env.DASHBOARD_API_PORT || 3100);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DASHBOARD_API_PORT must be a valid TCP port.');
}

const dashboardBotHeartbeatToken = process.env.DASHBOARD_BOT_HEARTBEAT_TOKEN?.trim() || '';
if (dashboardBotHeartbeatToken && Buffer.byteLength(dashboardBotHeartbeatToken) < 32) {
  throw new Error('DASHBOARD_BOT_HEARTBEAT_TOKEN must contain at least 32 bytes.');
}

export const config = Object.freeze({
  supabaseUrl: parsedSupabaseUrl.origin + parsedSupabaseUrl.pathname.replace(/\/$/, ''),
  supabaseSecretKey,
  host: process.env.DASHBOARD_API_HOST || '127.0.0.1',
  port,
  webOrigin: parsedWebOrigin.origin,
  nodeEnv: process.env.NODE_ENV || 'development',
  dashboardAdminUserIds: Object.freeze(dashboardAdminUserIds),
  dashboardActionBridge: Object.freeze({
    enabled: dashboardActionBridgeSecret.length >= 32,
    secret: dashboardActionBridgeSecret,
    url: parsedDashboardActionBridgeUrl.toString()
  }),
  dashboardBotHeartbeat: Object.freeze({
    enabled: Boolean(dashboardBotHeartbeatToken),
    token: dashboardBotHeartbeatToken,
    staleAfterMs: boundedInteger('DASHBOARD_BOT_HEARTBEAT_TTL_SECONDS', 900, 60, 3600) * 1000
  }),
  discordOAuth: Object.freeze({
    enabled: oauthConfiguredCount === oauthValues.length,
    clientId: discordOAuthClientId,
    clientSecret: discordOAuthClientSecret,
    redirectUri: discordOAuthRedirectUri,
    sessionTtlSeconds: boundedInteger('DASHBOARD_SESSION_TTL_SECONDS', 2_592_000, 300, 7_776_000),
    maxSessions: boundedInteger('DASHBOARD_MAX_SESSIONS', 2_000, 10, 10_000),
    sessionEncryptionKey: oauthSessionEncryptionKey,
    sessionStorePath: process.env.DASHBOARD_SESSION_STORE_PATH?.trim() ||
      resolve(currentDirectory, '../data/dashboard-sessions.enc')
  })
});

export default config;
