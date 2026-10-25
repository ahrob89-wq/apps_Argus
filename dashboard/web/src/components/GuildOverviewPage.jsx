import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Check, CircleAlert, Gauge, LogOut, Menu, Shield, ShieldAlert, Users } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getGuildOverview } from '../lib/api.js';
import { formatDashboardTimestamp } from '../lib/formatters.js';

const SecurityActivityChart = lazy(() => import('./SecurityActivityChart.jsx'));
const SeverityBreakdownChart = lazy(() => import('./SeverityBreakdownChart.jsx'));

function statusText(status, t) {
  if (status === true || status === 'connected' || status === 'available') return t.connected;
  if (status === false || status === 'disabled') return t.disabled;
  if (status === 'enabled') return t.enabled;
  if (status === 'unavailable') return t.unavailable;
  if (status === 'checking') return t.connecting;
  return t.runtimeUnknown;
}

function statusTone(status) {
  if (status === true || status === 'connected' || status === 'available' || status === 'enabled') return 'green';
  if (status === false || status === 'disabled' || status === 'unavailable') return 'amber';
  return 'blue';
}

function botStatusText(status, t) {
  if (status === 'online') return t.botOnline;
  if (status === 'offline') return t.botOffline;
  return t.botUnknown;
}

function botStatusTone(status) {
  if (status === 'online') return 'green';
  if (status === 'offline') return 'red';
  return 'blue';
}

function Metric({ icon: Icon, tone, label, value, detail }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon"><Icon size={18} aria-hidden="true" /></div>
      <div className="metric-copy"><h3>{label}</h3><strong>{value}</strong><p title={detail}>{detail}</p></div>
    </article>
  );
}

function StatusRow({ icon: Icon, label, detail, status, t }) {
  const tone = statusTone(status);
  return (
    <li>
      <span className={`posture-icon ${tone}`}><Icon size={16} aria-hidden="true" /></span>
      <span className="posture-copy"><strong>{label}</strong><small>{detail}</small></span>
      <span className={`status-pill ${tone}`}><span className="status-indicator" />{statusText(status, t)}</span>
    </li>
  );
}

function ProtectionPanel({ protection, t }) {
  return (
    <section className="panel posture-panel live-posture-panel" aria-labelledby="live-posture-heading">
      <div className="panel-heading"><div><h2 id="live-posture-heading">{t.posture}</h2><p>{t.protection}</p></div><ShieldAlert size={17} className="live-panel-icon" aria-hidden="true" /></div>
      <ul className="posture-list">
        <StatusRow icon={ShieldAlert} label={t.antiNukeStatus} detail={t.antinukeDetail} status={protection?.antiNukeEnabled} t={t} />
        <StatusRow icon={Gauge} label={t.raidStatus} detail={t.raidDetail} status={protection?.raidProtectionEnabled} t={t} />
      </ul>
    </section>
  );
}

function RecentEvent({ event, language, t }) {
  const severity = event.severity === 'critical' ? 'urgent' : event.severity === 'warning' ? 'review' : 'info';
  const Icon = severity === 'urgent' ? AlertTriangle : severity === 'review' ? ShieldAlert : Check;
  const severityLabel = event.severity === 'critical' ? t.critical : event.severity === 'warning' ? t.warning : t.severityInfo;
  const type = typeof event.type === 'string' ? event.type.replace(/[._-]/g, ' ') : t.recentEvents;
  return (
    <li className="event-item live-event-item">
      <time dateTime={event.createdAt}>{formatDashboardTimestamp(event.createdAt, language, t.timestampInvalid)}</time>
      <span className={`event-icon event-${severity}`}><Icon size={15} aria-hidden="true" /></span>
      <div className="event-copy">
        <div><h3>{type}</h3><span className={`event-tag ${severity}`}>{severityLabel}</span></div>
        <p title={event.summary}>{event.summary}</p>
      </div>
    </li>
  );
}

export default function GuildOverviewPage({ t, language, guild, user, siteAdmin, onNavigate, onSwitchServer, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const [overview, setOverview] = useState(null);
  const [overviewState, setOverviewState] = useState('loading');
  const [refreshToken, setRefreshToken] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handledExpiry = useRef(false);
  const lastData = useRef({ overview: null });
  lastData.current = { overview };

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    const previous = lastData.current;
    setOverviewState(previous.overview ? 'refreshing' : 'loading');

    const load = (request, setData, setState, previousData) => request(guild.id, controller.signal)
      .then((data) => {
        setData(data);
        setState('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
          handledExpiry.current = true;
          onSessionExpired();
        }
        setState(previousData ? 'stale' : 'error');
      });

    load(getGuildOverview, setOverview, setOverviewState, previous.overview);
    return () => controller.abort();
  }, [guild.id, onSessionExpired, refreshToken]);

  const summary = overview?.summary;
  const protection = summary?.protection;
  const bot = summary?.bot;
  const botStatus = bot?.status;
  const heartbeatDetail = bot?.lastHeartbeatAt
    ? `${t.lastHeartbeat}: ${formatDashboardTimestamp(bot.lastHeartbeatAt, language, t.timestampInvalid)}${botStatus === 'offline' ? ` · ${t.botHeartbeatStale}` : ''}`
    : botStatus === 'offline' ? t.botHeartbeatMissing : t.botHeartbeatUnknown;
  const recentEvents = Array.isArray(overview?.recentEvents) ? overview.recentEvents : [];
  const statusLabel = (value) => value === true ? t.enabled : value === false ? t.disabled : t.notConfigured;

  return (
    <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar t={t} guild={guild} user={user} botStatus={botStatus} siteAdmin={siteAdmin} selectedPage="overview" mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }} onSignOut={onSignOut} authBusy={authBusy} />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => { setMobileMenuOpen(false); document.querySelector('.mobile-menu')?.focus(); }} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{t.overview}</strong></nav>
          <div className="topbar-actions live-topbar-actions">
            <span className="live-user-name">{user?.globalName || user?.username}</span>
            <div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div>
            <ThemeToggle language={language} />
            <button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button>
          </div>
        </header>

        <main className="page-content live-overview">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />ARGUS COMMAND CENTER</div><h1>{t.securityOverview}</h1><p>{guild.name} · {t.liveSubtitle}</p></div>
            <div className="heading-actions">
              <span className={`connection-badge ${botStatus === 'online' ? 'connected' : botStatus === 'offline' ? 'unavailable' : 'checking'}`}><span className={`status-indicator ${botStatus || 'muted'}`} />{t.botStatus}: {botStatusText(botStatus, t)}</span>
            </div>
          </div>

          {overview?.generatedAt && <div className="live-data-window"><span>{t.generatedAt}: <time dateTime={overview.generatedAt}>{formatDashboardTimestamp(overview.generatedAt, language, t.timestampInvalid)}</time></span><span>{t.utcWindow}: <time dateTime={overview.dataWindow?.dayStartsAt}>{formatDashboardTimestamp(overview.dataWindow?.dayStartsAt, language, t.timestampInvalid)}</time></span></div>}
          {overviewState === 'error' && <p className="live-error-state" role="alert">{t.overviewUnavailable}</p>}
          {overviewState === 'stale' && <p className="live-stale-state" role="status">{t.staleData}</p>}
          {overviewState === 'loading' && <p className="live-loading-state" role="status">{t.loadingOverview}</p>}

          {overview && (
            <>
              <section className="summary-section" aria-labelledby="live-summary-heading">
                <div className="section-heading"><h2 id="live-summary-heading">{t.summary}</h2><span>{guild.id}</span></div>
                <div className="metrics-grid">
                  <Metric icon={Shield} tone="blue" label={t.protection} value={statusText(protection?.status, t)} detail={`${t.antinuke}: ${statusLabel(protection?.antiNukeEnabled)} · ${t.raid}: ${statusLabel(protection?.raidProtectionEnabled)}`} />
                  <Metric icon={Users} tone="amber" label={t.activeTracked} value={Number.isInteger(summary?.activeTrackedMembers) ? summary.activeTrackedMembers : '—'} detail={t.activeTrackedDetail} />
                  <Metric icon={CircleAlert} tone="red" label={t.alerts} value={Number.isInteger(summary?.securityAlertsToday?.total) ? summary.securityAlertsToday.total : '—'} detail={`${t.critical}: ${Number.isInteger(summary?.securityAlertsToday?.critical) ? summary.securityAlertsToday.critical : '—'}`} />
                  <Metric icon={Activity} tone={botStatusTone(botStatus)} label={t.botStatus} value={botStatusText(botStatus, t)} detail={heartbeatDetail} />
                </div>
              </section>

              {overview.activity?.available === true && (
                <section className="panel security-analytics-panel" aria-labelledby="security-analytics-heading">
                  <div className="panel-heading security-analytics-heading">
                    <div><h2 id="security-analytics-heading">{t.securityAnalytics}</h2><p>{t.securityAnalyticsDetail}</p></div>
                  </div>
                  <Suspense fallback={<p className="live-loading-state" role="status">{t.loadingOverview}</p>}>
                    <div className="security-analytics-grid">
                      <SecurityActivityChart activity={overview.activity} language={language} t={t} />
                      <SeverityBreakdownChart activity={overview.activity} language={language} t={t} />
                    </div>
                  </Suspense>
                  <table className="sr-only">
                    <caption>{t.analyticsDataTable}</caption>
                    <thead><tr><th scope="col">{t.date}</th><th scope="col">{t.eventCount}</th><th scope="col">{t.critical}</th><th scope="col">{t.warning}</th><th scope="col">{t.severityInfo}</th></tr></thead>
                    <tbody>{overview.activity.days.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.total}</td><td>{day.critical}</td><td>{day.warning}</td><td>{day.info}</td></tr>)}</tbody>
                  </table>
                </section>
              )}

              <div className="activity-grid live-overview-grid">
                <ProtectionPanel protection={protection} t={t} />

                <section className="panel events-panel live-events-panel" aria-labelledby="live-events-heading">
                  <div className="panel-heading"><div><h2 id="live-events-heading">{t.recentEvents}</h2><p>{t.eventsUtc}</p></div><span className="live-event-count">{recentEvents.length}</span></div>
                  {recentEvents.length ? <ol className="event-list">{recentEvents.map((event) => <RecentEvent key={event.id} event={event} language={language} t={t} />)}</ol> : <p className="live-empty-events">{t.noEvents}</p>}
                </section>
              </div>
              {overview.activity?.available !== true && <p className="live-activity-note"><span><Gauge size={15} aria-hidden="true" /></span><span><strong>{t.activityUnavailable}</strong><small>{t.activityUnavailableDetail}</small></span></p>}
            </>
          )}


          <footer className="page-footer"><span><Shield size={14} aria-hidden="true" />{t.liveSubtitle}</span><span>ARGUS SECURITY · {new Date().getUTCFullYear()}</span></footer>
        </main>
      </div>
    </div>
  );
}
