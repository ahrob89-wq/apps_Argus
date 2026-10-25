import { useEffect } from 'react';
import { Activity, Archive, ChartPie, ChevronDown, LayoutDashboard, LogOut, ScrollText, Settings, Users, SlidersHorizontal, Server, Layers, Bot, Shield, ListChecks } from 'lucide-react';
import { getDashboardCopy } from '../dashboardCopy.js';
import ArgusMark from './ArgusMark.jsx';

const navItems = [
  { key: 'overview', icon: LayoutDashboard, active: true },
  { key: 'analytics', icon: ChartPie },
  { key: 'tracking', icon: Users },
  { key: 'events', icon: ScrollText },
  { key: 'settings', icon: Settings },
  { key: 'backups', icon: Archive },
  { key: 'siteHealth', icon: Activity, siteAdminOnly: true },
  { key: 'siteControl', icon: SlidersHorizontal, siteAdminOnly: true },
  { key: 'siteServers', icon: Server, siteAdminOnly: true },
  { key: 'sitePlans', icon: Layers, siteAdminOnly: true },
  { key: 'sitePlanFeatures', icon: ListChecks, siteAdminOnly: true },
  { key: 'siteServices', icon: Bot, siteAdminOnly: true },
  { key: 'siteAudit', icon: Shield, siteAdminOnly: true }
];

export default function AppSidebar({ t, guild, user, botStatus = 'unknown', selectedPage = 'overview', onNavigate, onSwitchServer, onSignOut, authBusy = false, onCloseMobileMenu, mobileMenuOpen = false, siteAdmin = false, adminMode = false }) {
  const live = Boolean(guild);
  const copy = getDashboardCopy(document.documentElement.lang);
  const initials = guild?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AS';
  const guildIcon = guild?.icon && /^\d{1,24}$/.test(guild.id) && /^[a-zA-Z0-9_]+$/.test(guild.icon)
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`
    : null;
  const visibleNavItems = adminMode
    ? navItems.filter(({ siteAdminOnly }) => siteAdminOnly)
    : navItems.filter(({ key, siteAdminOnly }) => !siteAdminOnly && (live || !['analytics', 'settings', 'backups'].includes(key)));
  const adminPaths = { siteHealth: '/admin/health', siteControl: '/admin/control', siteServers: '/admin/control/servers', sitePlans: '/admin/control/plans', sitePlanFeatures: '/admin/control/plan-features', siteServices: '/admin/control/services', siteAudit: '/admin/control/audit' };
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const firstLink = document.querySelector('.side-nav a');
    if (window.matchMedia('(max-width: 650px)').matches) firstLink?.focus();
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      onCloseMobileMenu?.();
      window.setTimeout(() => document.querySelector('.mobile-menu')?.focus(), 0);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);
  return (
    <aside className="sidebar" id="dashboard-sidebar" aria-label={t.dashboardLabel}>
      <a className="brand" href="/" aria-label="Argus home">
        <span className="brand-mark"><ArgusMark size={22} /></span>
        <span>Argus<span className="brand-period">.</span></span>
        <span className="brand-caption">SECURITY</span>
      </a>

      {live ? <button className="server-switcher" type="button" aria-label={`${t.selectedServer}: ${guild?.name || 'Argus Security Lab'}`} onClick={onSwitchServer}>
        <span className="server-avatar">{guildIcon ? <img src={guildIcon} alt="" /> : initials}</span>
        <span className="server-copy"><small>{t.selectedServer}</small><strong>{guild?.name || 'Argus Security Lab'}</strong></span>
        <ChevronDown size={16} aria-hidden="true" />
      </button> : <div className="server-switcher" aria-label={adminMode ? 'Site administration' : `${t.selectedServer}: Argus Security Lab`}>
        <span className="server-avatar">{adminMode ? 'AD' : 'AS'}</span>
        <span className="server-copy"><small>{adminMode ? 'ARGUS' : t.selectedServer}</small><strong>{adminMode ? copy.siteAdministration : 'Argus Security Lab'}</strong></span>
      </div>}

      <div className="nav-caption">{adminMode ? copy.siteAdministration : live ? t.workspace : 'WORKSPACE'}</div>
      <nav className="side-nav" aria-label={t.mainNavigation}>
        {visibleNavItems.map(({ key, icon: Icon, active: previewActive }) => {
          const active = adminMode ? selectedPage === key : live ? selectedPage === key : previewActive;
          const label = adminMode ? copy[key] : t[key];
          const href = adminMode ? adminPaths[key] : live ? `/guilds/${guild.id}/${key}` : active ? '#overview' : `#${key}`;
          return (
          <a key={key} href={href} className={`nav-link${active ? ' selected' : ''}`} aria-label={label} title={label} aria-current={active ? 'page' : undefined} onClick={(event) => {
            if (live || adminMode) { event.preventDefault(); onNavigate(href); }
            onCloseMobileMenu?.();
          }}>
            <Icon size={18} aria-hidden="true" /><span>{label}</span>{key === 'tracking' && !live && <span className="nav-count">12</span>}
          </a>
        );})}
      </nav>

      {live && siteAdmin && !adminMode && <div className="site-admin-shortcut">
        <div className="nav-caption">{copy.siteAdministration}</div>
        <nav className="side-nav" aria-label={copy.siteAdministration}>
          <a className="nav-link" href={adminPaths.siteHealth} onClick={(event) => { event.preventDefault(); onNavigate(adminPaths.siteHealth); onCloseMobileMenu?.(); }}>
            <Activity size={18} aria-hidden="true" /><span>{copy.adminDashboard}</span>
          </a>
        </nav>
      </div>}

      <div className="sidebar-bottom">
        <div className="sidebar-system"><span className={`status-indicator ${botStatus}`} /><span>{botStatus === 'online' ? t.botOnline : botStatus === 'offline' ? t.botOffline : t.botUnknown}</span></div>
        <div className="profile-row"><div className="profile-avatar">{user?.username?.slice(0, 2).toUpperCase() || 'LH'}</div><div className="profile-copy"><strong>{user?.globalName || user?.username || 'Server Admin'}</strong><small>{live ? t.discordAccount : 'Discord account'}</small></div>{live ? <button className="sidebar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={t.signOut || 'Sign out'}><LogOut size={15} aria-hidden="true" /></button> : <Activity size={15} className="profile-more" aria-hidden="true" />}</div>
      </div>
    </aside>
  );
}
