const guildPages = new Set([
  'overview', 'analytics', 'tracking', 'appeals', 'bot-reviews', 'events',
  'protection', 'link-security', 'backups', 'settings'
]);

export function resolveRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/') return { name: 'landing' };
  if (['/features', '/privacy', '/setup'].includes(path)) return { name: 'public-page', page: path.slice(1) };
  if (path === '/login') return { name: 'login' };
  if (path === '/guilds') return { name: 'guilds' };
  if (path === '/admin/health') return { name: 'admin-health' };
  if (path === '/admin/control') return { name: 'admin-control', section: 'overview' };
  const adminControlMatch = path.match(/^\/admin\/control\/(services|servers|plans|plan-features|audit)$/);
  if (adminControlMatch) return { name: 'admin-control', section: adminControlMatch[1] === 'plan-features' ? 'planFeatures' : adminControlMatch[1] };

  const guildRootMatch = path.match(/^\/guilds\/(\d{1,24})$/);
  if (guildRootMatch) return { name: 'guild', guildId: guildRootMatch[1] };

  const guildPageMatch = path.match(/^\/guilds\/(\d{1,24})\/([a-z-]+)$/);
  if (guildPageMatch && guildPages.has(guildPageMatch[2])) {
    return { name: 'guild-page', guildId: guildPageMatch[1], page: guildPageMatch[2] };
  }

  return { name: 'not-found' };
}
