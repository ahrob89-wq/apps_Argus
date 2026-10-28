import { supabase } from './supabase.js';

const DISCORD_SNOWFLAKE = /^\d{1,24}$/;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE = 50;
const MAX_PAGE_SIZE = 100;

const PUBLIC_ERRORS = Object.freeze({
  AUTHENTICATION_REQUIRED: { statusCode: 401, message: 'Sign in with Discord to continue.' },
  INVALID_GUILD_ID: { statusCode: 400, message: 'A valid server ID is required.' },
  INVALID_PAGINATION: { statusCode: 400, message: 'Pagination is outside the allowed range.' },
  INVALID_FILTERS: { statusCode: 400, message: 'One or more filters are invalid.' },
  ADMIN_REQUIRED: { statusCode: 403, message: 'Administrator access is required for this resource.' },
  GUILD_NOT_AVAILABLE: { statusCode: 404, message: 'The requested server is not available.' },
  READ_UNAVAILABLE: { statusCode: 503, message: 'Data could not be loaded right now.' }
});

export class DashboardReadError extends Error {
  constructor(code) {
    const publicError = PUBLIC_ERRORS[code] || PUBLIC_ERRORS.READ_UNAVAILABLE;
    super(publicError.message);
    this.name = 'DashboardReadError';
    this.code = PUBLIC_ERRORS[code] ? code : 'READ_UNAVAILABLE';
    this.statusCode = publicError.statusCode;
  }
}

function parsePositiveInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d{1,4}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

function parsePagination(query = {}) {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, MAX_PAGE);
  const pageSize = parsePositiveInteger(query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (page === null || pageSize === null) throw new DashboardReadError('INVALID_PAGINATION');
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize };
}

function validateQueryKeys(query, allowedKeys) {
  if (!query || typeof query !== 'object' || Array.isArray(query) ||
      Object.keys(query).some((key) => !allowedKeys.has(key))) {
    throw new DashboardReadError('INVALID_FILTERS');
  }
}

function parseEventFilters(query = {}) {
  validateQueryKeys(query, new Set(['page', 'limit', 'severity', 'type', 'from', 'to']));
  const filters = {};

  if (query.severity !== undefined) {
    if (!['info', 'warning', 'critical'].includes(query.severity)) throw new DashboardReadError('INVALID_FILTERS');
    filters.severity = query.severity;
  }
  if (query.type !== undefined) {
    if (typeof query.type !== 'string' || !/^[a-z][a-z0-9_.-]{0,99}$/.test(query.type)) {
      throw new DashboardReadError('INVALID_FILTERS');
    }
    filters.type = query.type;
  }

  for (const key of ['from', 'to']) {
    if (query[key] === undefined) continue;
    if (typeof query[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(query[key])) {
      throw new DashboardReadError('INVALID_FILTERS');
    }
    const timestamp = Date.parse(query[key]);
    if (!Number.isFinite(timestamp)) throw new DashboardReadError('INVALID_FILTERS');
    filters[key] = new Date(timestamp).toISOString();
  }

  if (filters.from && filters.to && Date.parse(filters.from) > Date.parse(filters.to)) {
    throw new DashboardReadError('INVALID_FILTERS');
  }
  if (filters.from && filters.to && Date.parse(filters.to) - Date.parse(filters.from) > 90 * 24 * 60 * 60 * 1000) {
    throw new DashboardReadError('INVALID_FILTERS');
  }
  return filters;
}

function parseTrackingFilters(query = {}) {
  validateQueryKeys(query, new Set(['page', 'limit', 'minScore', 'userId']));
  const filters = {};
  if (query.minScore !== undefined) {
    if (typeof query.minScore !== 'string' || !/^\d{1,9}$/.test(query.minScore)) {
      throw new DashboardReadError('INVALID_FILTERS');
    }
    filters.minScore = Number(query.minScore);
  }
  if (query.userId !== undefined) {
    if (typeof query.userId !== 'string' || !DISCORD_SNOWFLAKE.test(query.userId)) {
      throw new DashboardReadError('INVALID_FILTERS');
    }
    filters.userId = query.userId;
  }
  return filters;
}

function projectSecurityEvent(row, guildId) {
  if (row.guild_id !== guildId) throw new DashboardReadError('READ_UNAVAILABLE');
  return {
    id: String(row.id),
    type: row.type,
    severity: row.severity,
    summary: row.summary,
    createdAt: row.created_at
  };
}

function projectTrackingRecord(row, guildId) {
  if (row.guild_id !== guildId) throw new DashboardReadError('READ_UNAVAILABLE');
  const reasons = Array.isArray(row.reasons)
    ? row.reasons
      .slice(0, 50)
      .flatMap((reason) => {
        if (typeof reason === 'string') return [{ code: reason.slice(0, 100) }];
        if (!reason || typeof reason !== 'object' || Array.isArray(reason)) return [];
        return [{
          ...(typeof reason.source === 'string' ? { source: reason.source.slice(0, 50) } : {}),
          ...(typeof reason.code === 'string' ? { code: reason.code.slice(0, 100) } : {}),
          ...(typeof reason.weight === 'number' && Number.isFinite(reason.weight) ? { weight: reason.weight } : {})
        }];
      })
    : [];

  return {
    id: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    score: row.score,
    reasons,
    status: row.status
  };
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function copyAllowedValues(source, keys, expectedType = 'number') {
  if (!isRecord(source)) return undefined;
  const result = {};
  for (const key of keys) {
    const value = source[key];
    if (expectedType === 'number' && typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    if (expectedType === 'boolean' && typeof value === 'boolean') result[key] = value;
    if (expectedType === 'string' && typeof value === 'string') result[key] = value.slice(0, 100);
  }
  return Object.keys(result).length ? result : undefined;
}

function projectGuildSettings(row, guild) {
  if (!row) {
    return {
      guild: { id: guild.id, name: guild.name },
      configured: false,
      updatedAt: null,
      settings: null
    };
  }
  if (row.guild_id !== guild.id || !isRecord(row.settings)) throw new DashboardReadError('READ_UNAVAILABLE');

  const stored = row.settings;
  const modules = {};
  if (isRecord(stored.antinuke)) {
    const antiNuke = {
      ...copyAllowedValues(stored.antinuke, ['enabled'], 'boolean'),
      ...copyAllowedValues(stored.antinuke, ['mode', 'unauthorizedBotAction'], 'string'),
      quarantineRoleId: typeof stored.antinuke.quarantineRoleId === 'string' ? stored.antinuke.quarantineRoleId : null,
      ...copyAllowedValues(stored.antinuke, ['quarantineTimeoutHours']),
    };
    const thresholds = {};
    for (const key of ['channelDelete', 'channelCreate', 'roleDelete', 'roleCreate', 'memberRemoval', 'webhookCreate']) {
      const threshold = copyAllowedValues(stored.antinuke.thresholds?.[key], ['limit', 'windowSeconds']);
      if (threshold) thresholds[key] = threshold;
    }
    if (Object.keys(thresholds).length) antiNuke.thresholds = thresholds;
    const escalation = copyAllowedValues(stored.antinuke.escalation, ['banAfterBreaches', 'windowMinutes']);
    if (escalation) antiNuke.escalation = escalation;
    modules.antiNuke = antiNuke;
  }
  if (isRecord(stored.raid)) {
    modules.raid = {
      ...copyAllowedValues(stored.raid, ['enabled'], 'boolean'),
      ...copyAllowedValues(stored.raid, ['watch_joins', 'watch_window_seconds', 'mode_joins', 'mode_window_seconds', 'suspicious_ratio'])
    };
  }
  if (isRecord(stored.tracking)) {
    modules.tracking = {
      ...copyAllowedValues(stored.tracking, ['tier_suspicious_score', 'tier_high_risk_score', 'tier_critical_score', 'tracking_duration_hours', 'username_entropy_threshold']),
      channelId: typeof stored.tracking.channelId === 'string' ? stored.tracking.channelId : null
    };
  }
  if (isRecord(stored.alerts)) {
    modules.alerts = { channelId: typeof stored.alerts.channelId === 'string' ? stored.alerts.channelId : null };
  }
  if (isRecord(stored.appeals)) {
    modules.appeals = { reviewChannelId: typeof stored.appeals.reviewChannelId === 'string' ? stored.appeals.reviewChannelId : null };
  }

  return {
    guild: { id: guild.id, name: guild.name },
    configured: true,
    updatedAt: row.updated_at,
    settings: {
      language: row.language === 'ar' || row.language === 'en' ? row.language : null,
      securityLogChannelId: typeof row.security_log_channel_id === 'string' ? row.security_log_channel_id : null,
      ownerAlertsEnabled: typeof row.owner_alerts_enabled === 'boolean' ? row.owner_alerts_enabled : null,
      modules
    }
  };
}

function projectBackup(row, guildId) {
  if (row.guild_id !== guildId) throw new DashboardReadError('READ_UNAVAILABLE');
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const safeCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  return {
    id: row.id,
    name: typeof row.backup_name === 'string' ? row.backup_name.slice(0, 100) : null,
    triggerType: row.trigger_type,
    createdBy: row.created_by,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    sizeBytes: safeCount(metadata.payload_bytes),
    counts: {
      roles: safeCount(metadata.role_count),
      categories: safeCount(metadata.category_count),
      channels: safeCount(metadata.channel_count)
    }
  };
}

export function createDashboardReadService({
  supabaseClient = supabase,
  getSession,
  resolveAuthorizedGuild,
  now = Date.now
}) {
  if (typeof getSession !== 'function' || typeof resolveAuthorizedGuild !== 'function') {
    throw new TypeError('Dashboard reads require server-side session and guild authorization functions.');
  }

  async function getAuthorizedGuild(sessionId, requestedGuildId, permission = 'overview-view') {
    if (typeof requestedGuildId !== 'string' || !DISCORD_SNOWFLAKE.test(requestedGuildId)) {
      throw new DashboardReadError('INVALID_GUILD_ID');
    }
    if (!getSession(sessionId)) throw new DashboardReadError('AUTHENTICATION_REQUIRED');

    let guild;
    try {
      guild = await resolveAuthorizedGuild(sessionId, requestedGuildId, permission);
    } catch {
      throw new DashboardReadError('READ_UNAVAILABLE');
    }
    if (!guild || guild.id !== requestedGuildId) throw new DashboardReadError('GUILD_NOT_AVAILABLE');
    return guild;
  }

  async function readPage(query, pagination, project, guildId) {
    let result;
    try {
      result = await query.range(pagination.from, pagination.to);
    } catch {
      throw new DashboardReadError('READ_UNAVAILABLE');
    }
    if (result?.error || !Array.isArray(result?.data)) throw new DashboardReadError('READ_UNAVAILABLE');

    const hasMore = result.data.length > pagination.pageSize;
    const items = result.data.slice(0, pagination.pageSize).map((row) => project(row, guildId));
    return { items, page: pagination.page, limit: pagination.pageSize, hasMore };
  }

  async function listSecurityEvents({ sessionId, guildId, query = {} }) {
    const pagination = parsePagination(query);
    const filters = parseEventFilters(query);
    const guild = await getAuthorizedGuild(sessionId, guildId, 'events-view');
    let readQuery = supabaseClient
      .from('security_events')
      .select('guild_id,id,type,severity,summary,created_at')
      .eq('guild_id', guild.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (filters.severity) readQuery = readQuery.eq('severity', filters.severity);
    if (filters.type) readQuery = readQuery.eq('type', filters.type);
    if (filters.from) readQuery = readQuery.gte('created_at', filters.from);
    if (filters.to) readQuery = readQuery.lte('created_at', filters.to);
    return readPage(readQuery, pagination, projectSecurityEvent, guild.id);
  }

  async function listActiveTracking({ sessionId, guildId, query = {} }) {
    const pagination = parsePagination(query);
    const filters = parseTrackingFilters(query);
    const guild = await getAuthorizedGuild(sessionId, guildId, 'tracking-view');
    const currentTime = new Date(now()).toISOString();
    let readQuery = supabaseClient
      .from('silent_tracking')
      .select('guild_id,id,user_id,started_at,expires_at,score,reasons,status')
      .eq('guild_id', guild.id)
      .eq('status', 'active')
      .gt('expires_at', currentTime)
      .order('started_at', { ascending: false })
      .order('id', { ascending: false });
    if (filters.minScore !== undefined) readQuery = readQuery.gte('score', filters.minScore);
    if (filters.userId) readQuery = readQuery.eq('user_id', filters.userId);
    return readPage(readQuery, pagination, projectTrackingRecord, guild.id);
  }

  async function getOverview({ sessionId, guildId }) {
    const guild = await getAuthorizedGuild(sessionId, guildId, 'overview-view');
    const generatedAt = now();
    const today = new Date(generatedAt);
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    const activityStart = new Date(today);
    activityStart.setUTCDate(activityStart.getUTCDate() - 6);

    const activeTrackingQuery = supabaseClient
      .from('silent_tracking')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', guild.id)
      .eq('status', 'active')
      .gt('expires_at', new Date(generatedAt).toISOString());
    const alertsTodayQuery = supabaseClient
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', guild.id)
      .gte('created_at', todayStart)
      .lte('created_at', new Date(generatedAt).toISOString())
      .in('severity', ['warning', 'critical']);
    const criticalTodayQuery = supabaseClient
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', guild.id)
      .gte('created_at', todayStart)
      .lte('created_at', new Date(generatedAt).toISOString())
      .eq('severity', 'critical');
    const recentEventsQuery = supabaseClient
      .from('security_events')
      .select('guild_id,id,type,severity,summary,created_at')
      .eq('guild_id', guild.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(5);
    const settingsQuery = supabaseClient
      .from('guild_settings')
      .select('guild_id,settings')
      .eq('guild_id', guild.id)
      .maybeSingle();

    const activityQueries = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(activityStart);
      dayStart.setUTCDate(dayStart.getUTCDate() + index);
      const nextDay = new Date(dayStart);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const dayEnd = new Date(Math.min(nextDay.getTime(), generatedAt));
      const rangeStart = dayStart.toISOString();
      const rangeEnd = dayEnd.toISOString();
      const total = supabaseClient
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guild.id)
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd);
      const critical = supabaseClient
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guild.id)
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd)
        .eq('severity', 'critical');
      const warning = supabaseClient
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guild.id)
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd)
        .eq('severity', 'warning');
      const info = supabaseClient
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guild.id)
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd)
        .eq('severity', 'info');
      return Promise.all([total, critical, warning, info]).then(([totalResult, criticalResult, warningResult, infoResult]) => ({
        date: rangeStart.slice(0, 10),
        total: totalResult?.count,
        critical: criticalResult?.count,
        warning: warningResult?.count,
        info: infoResult?.count,
        error: totalResult?.error || criticalResult?.error || warningResult?.error || infoResult?.error
      }));
    });

    let results;
    let activityResults;
    try {
      results = await Promise.all([
        activeTrackingQuery,
        alertsTodayQuery,
        criticalTodayQuery,
        recentEventsQuery,
        settingsQuery
      ]);
    } catch {
      throw new DashboardReadError('READ_UNAVAILABLE');
    }
    try {
      activityResults = await Promise.all(activityQueries);
    } catch {
      activityResults = [];
    }

    const [trackingResult, alertsResult, criticalResult, eventsResult, settingsResult] = results;
    if (results.some((result) => result?.error) ||
        !Number.isInteger(trackingResult?.count) ||
        !Number.isInteger(alertsResult?.count) ||
        !Number.isInteger(criticalResult?.count) ||
        !Array.isArray(eventsResult?.data) ||
        !settingsResult || (settingsResult.data !== null && typeof settingsResult.data !== 'object')) {
      throw new DashboardReadError('READ_UNAVAILABLE');
    }

    const events = eventsResult.data.map((row) => projectSecurityEvent(row, guild.id));
    const settings = settingsResult.data?.settings && typeof settingsResult.data.settings === 'object'
      ? settingsResult.data.settings
      : {};
    const antiNukeEnabled = typeof settings.antinuke?.enabled === 'boolean' ? settings.antinuke.enabled : null;
    const raidProtectionEnabled = typeof settings.raid?.enabled === 'boolean' ? settings.raid.enabled : null;

    return {
      guild: { id: guild.id, name: guild.name, icon: guild.icon || null },
      generatedAt: new Date(generatedAt).toISOString(),
      dataWindow: { timezone: 'UTC', dayStartsAt: todayStart },
      summary: {
        protection: {
          status: 'runtime_unknown',
          antiNukeEnabled,
          raidProtectionEnabled
        },
        activeTrackedMembers: trackingResult.count,
        securityAlertsToday: {
          total: alertsResult.count,
          critical: criticalResult.count
        },
        database: { status: 'connected' }
      },
      activity: activityResults.every((day) => !day.error && Number.isInteger(day.total) && Number.isInteger(day.critical) && Number.isInteger(day.warning) && Number.isInteger(day.info))
        ? { available: true, timezone: 'UTC', days: activityResults.map(({ date, total, critical, warning, info }) => ({ date, total, critical, warning, info })) }
        : { available: false },
      recentEvents: events
    };
  }

  async function getGuildSettings({ sessionId, guildId }) {
    const guild = await getAuthorizedGuild(sessionId, guildId, 'settings-view');
    let result;
    try {
      result = await supabaseClient
        .from('guild_settings')
        .select('guild_id,language,security_log_channel_id,owner_alerts_enabled,settings,updated_at')
        .eq('guild_id', guild.id)
        .maybeSingle();
    } catch {
      throw new DashboardReadError('READ_UNAVAILABLE');
    }
    if (result?.error || (result?.data !== null && !isRecord(result?.data))) {
      throw new DashboardReadError('READ_UNAVAILABLE');
    }
    return projectGuildSettings(result.data, guild);
  }

  async function listBackups({ sessionId, guildId, query = {} }) {
    const pagination = parsePagination(query);
    validateQueryKeys(query, new Set(['page', 'limit']));
    const guild = await getAuthorizedGuild(sessionId, guildId, 'backups-view');

    const readQuery = supabaseClient
      .from('server_backups')
      .select('guild_id,id,backup_name,trigger_type,created_by,schema_version,metadata,created_at')
      .eq('guild_id', guild.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    return readPage(readQuery, pagination, projectBackup, guild.id);
  }

  return Object.freeze({
    getOverview,
    listSecurityEvents,
    listActiveTracking,
    getGuildSettings,
    listBackups
  });
}
