export async function getAuthSession() {
  return requestJson('/api/v1/auth/session');
}

export function getSiteHealth(signal) {
  return getAuthorizedJson('/api/v1/admin/health', signal);
}

export function getAdminControl(signal, page = 1, search = '') {
  const query = new URLSearchParams({ page: String(page), search });
  return getAuthorizedJson(`/api/v1/admin/control?${query}`, signal);
}

export function saveAdminControl(change) {
  return requestJson('/api/v1/admin/control', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change)
  });
}

export async function logoutFromDashboard() {
  return requestJson('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
}

async function getAuthorizedJson(path, signal) {
  return requestJson(path, { signal });
}

async function requestJson(path, { method = 'GET', credentials = 'include', signal, headers = {}, body } = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response;
    try {
      response = await fetch(path, {
        method,
        headers: { Accept: 'application/json', ...headers },
        credentials,
        cache: 'no-store',
        signal,
        ...(body === undefined ? {} : { body })
      });
    } catch (error) {
      if (method !== 'GET' || signal?.aborted || attempt === 2) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    if (method === 'GET' && [502, 503, 504].includes(response.status) && attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
      continue;
    }
    throw new Error(payload?.error?.code || 'request-failed');
  }
  throw new Error('request-failed');
}

export function getGuilds(signal) {
  return getAuthorizedJson('/api/v1/guilds', signal);
}

export function checkGuildAccess(guildId, signal) {
  return getAuthorizedJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/access`, signal);
}

export function getGuildOverview(guildId, signal) {
  return getAuthorizedJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/overview`, signal);
}

export function getGuildSettings(guildId, signal) {
  return getAuthorizedJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/settings`, signal);
}

export function getGuildBackups(guildId, { page = 1, limit = 25 } = {}, signal) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return getAuthorizedJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/backups?${query}`, signal);
}

export function getGuildTracking(guildId, { page = 1, limit = 25, minScore, userId } = {}, signal) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (minScore !== undefined && minScore !== '') query.set('minScore', String(minScore));
  if (userId) query.set('userId', userId);
  return getAuthorizedJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/tracking?${query}`, signal);
}

export function postGuildAction(guildId, action) {
  return requestJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(action)
  });
}

export function getGuildEvents(guildId, { page = 1, limit = 25, severity, type, from, to } = {}, signal) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (severity) query.set('severity', severity);
  if (type) query.set('type', type);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return getAuthorizedJson(`/api/v1/guilds/${encodeURIComponent(guildId)}/events?${query}`, signal);
}
