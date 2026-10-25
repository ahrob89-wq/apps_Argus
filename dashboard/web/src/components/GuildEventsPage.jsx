import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Clock3, Filter, LogOut, Menu, Shield, ShieldAlert } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getGuildEvents } from '../lib/api.js';
import { formatDashboardTimestamp } from '../lib/formatters.js';
import { getDashboardCopy } from '../dashboardCopy.js';

const PAGE_LIMITS = [25, 50, 100];
const MAX_PAGE = 50;
const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

function toApiTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

const eventNames = {
  'appeal_accepted': ['Appeal accepted', 'تم قبول الاستئناف'],
  'appeal_submitted': ['Appeal submitted', 'تم تقديم استئناف'],
  'antinuke.bot_review_decision': ['Bot review decision', 'قرار مراجعة بوت'],
  'antinuke.breach': ['Anti-Nuke breach', 'تجاوز حماية مكافحة التخريب'],
  'antinuke.config_changed': ['Anti-Nuke settings changed', 'تغيير إعدادات مكافحة التخريب'],
  'antinuke.dangerous_permission': ['Dangerous permission granted', 'منح صلاحية خطرة'],
  'antinuke.rogue_bot': ['Unauthorized bot detected', 'اكتشاف بوت غير مصرح به'],
  'antinuke.whitelist_changed': ['Whitelist changed', 'تغيير قائمة السماح'],
  'backup.restore_completed': ['Backup restore completed', 'اكتملت استعادة نسخة احتياطية'],
  'links.malicious_url': ['Malicious link blocked', 'تم حظر رابط ضار'],
  'lockdown_partially_restored': ['Lockdown partially lifted', 'رُفع الإغلاق جزئيًا'],
  'lockdown_started': ['Emergency lockdown started', 'بدأ الإغلاق الطارئ'],
  'member.verification_completed': ['Member verification completed', 'اكتمل تحقق العضو'],
  'verification.panel_published': ['Verification panel published', 'تم نشر لوحة التحقق'],
  'verification.strict_role_policy_enabled': ['Strict role policy enabled', 'تم تفعيل سياسة الأدوار الصارمة']
};

function SecurityEvent({ event, language, t }) {
  const copy = getDashboardCopy(language);
  const severity = ['critical', 'warning', 'info'].includes(event.severity) ? event.severity : 'info';
  const Icon = severity === 'critical' ? AlertTriangle : severity === 'warning' ? ShieldAlert : Check;
  const severityText = severity === 'critical' ? t.critical : severity === 'warning' ? t.warning : t.severityInfo;
  const rawType = typeof event.type === 'string' ? event.type : '';
  const eventType = eventNames[rawType]?.[language === 'ar' ? 1 : 0] || (rawType ? rawType.replace(/[._-]/g, ' ') : t.unknownEventType);
  const iconMeaning = severity === 'critical' ? copy.criticalIconMeaning : severity === 'warning' ? copy.warningIconMeaning : copy.infoIconMeaning;
  return (
    <details className="security-event">
      <summary className="security-event-summary">
        <time className="security-event-time" dateTime={event.createdAt}>{formatDashboardTimestamp(event.createdAt, language, t.timestampInvalid)}</time>
        <span className={`event-icon event-${severity === 'critical' ? 'urgent' : severity === 'warning' ? 'review' : 'info'}`} aria-label={iconMeaning} title={iconMeaning}><Icon size={15} aria-hidden="true" /></span>
        <div className="security-event-copy">
          <div><h3>{eventType}</h3><span className={`event-tag ${severity === 'critical' ? 'urgent' : severity === 'warning' ? 'review' : 'info'}`}>{severityText}</span></div>
          <p>{typeof event.summary === 'string' ? event.summary : t.eventSummaryUnavailable}</p>
        </div>
        <span className="event-expand-label">{copy.eventDetails}<ChevronDown size={14} aria-hidden="true" /></span>
      </summary>
      <dl className="security-event-details">
        <div><dt>{t.eventType}</dt><dd><code dir="ltr">{rawType || t.unknownEventType}</code></dd></div>
        <div><dt>{t.severityFilter}</dt><dd>{severityText} — {iconMeaning}</dd></div>
        <div><dt>{copy.eventIdentifier}</dt><dd><code dir="ltr">{typeof event.id === 'string' ? event.id : t.notAvailable}</code></dd></div>
        <div><dt>{copy.eventTime}</dt><dd><time dateTime={event.createdAt}>{formatDashboardTimestamp(event.createdAt, language, t.timestampInvalid)}</time></dd></div>
        <div className="event-detail-summary"><dt>{copy.eventSummary}</dt><dd>{typeof event.summary === 'string' ? event.summary : t.eventSummaryUnavailable}</dd></div>
      </dl>
    </details>
  );
}

export default function GuildEventsPage({ t, language, guild, user, siteAdmin, onNavigate, onSwitchServer, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const copy = getDashboardCopy(language);
  const [filterInput, setFilterInput] = useState({ severity: '', type: '', from: '', to: '' });
  const [filters, setFilters] = useState({ severity: '', type: '', from: '', to: '' });
  const [filterError, setFilterError] = useState('');
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const handledExpiry = useRef(false);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') setRefreshToken((value) => value + 1);
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const previousResult = result;
    setState(previousResult ? 'loading-page' : 'loading');
    getGuildEvents(guild.id, { page, limit, ...filters }, controller.signal).then((data) => {
      setResult(data);
      setState('ready');
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      if (['GUILD_NOT_AVAILABLE', 'GUILD_ACCESS_DENIED'].includes(error.message)) {
        setResult(null);
        setState('denied');
        return;
      }
      setState(previousResult ? 'page-error' : 'error');
    });
    return () => controller.abort();
  }, [filters, guild.id, limit, onSessionExpired, page, refreshToken]);

  const applyFilters = (event) => {
    event.preventDefault();
    const from = filterInput.from ? new Date(filterInput.from).getTime() : null;
    const to = filterInput.to ? new Date(filterInput.to).getTime() : null;
    if ((from !== null && !Number.isFinite(from)) || (to !== null && !Number.isFinite(to))) {
      setFilterError(t.invalidDateFilter);
      return;
    }
    if (from !== null && to !== null && from > to) {
      setFilterError(t.dateOrderError);
      return;
    }
    if (from !== null && to !== null && to - from > MAX_RANGE_MS) {
      setFilterError(t.dateRangeError);
      return;
    }
    setFilterError('');
    setResult(null);
    setPage(1);
    setFilters({ severity: filterInput.severity, type: filterInput.type.trim(), from: toApiTimestamp(filterInput.from), to: toApiTimestamp(filterInput.to) });
    setRefreshToken((value) => value + 1);
  };

  const resetFilters = () => {
    const emptyFilters = { severity: '', type: '', from: '', to: '' };
    setFilterInput(emptyFilters);
    setFilters(emptyFilters);
    setFilterError('');
    setResult(null);
    setPage(1);
    setRefreshToken((value) => value + 1);
  };

  const pageNumber = Number.isInteger(result?.page) ? result.page : page;
  const hasMore = result?.hasMore === true && pageNumber < MAX_PAGE;
  const items = Array.isArray(result?.items) ? result.items : [];
  const loading = state === 'loading' || state === 'loading-page';

  return (
    <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar t={t} guild={guild} user={user} siteAdmin={siteAdmin} selectedPage="events" mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }} onSignOut={onSignOut} authBusy={authBusy} />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => { setMobileMenuOpen(false); document.querySelector('.mobile-menu')?.focus(); }} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{t.events}</strong></nav>
          <div className="topbar-actions live-topbar-actions">
            <span className="live-user-name">{user?.globalName || user?.username}</span>
            <div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div>
            <ThemeToggle language={language} />
            <button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button>
          </div>
        </header>

        <main className="page-content live-events-page">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />ARGUS WORKSPACE</div><h1>{t.events}</h1><p>{guild.name} · {t.eventsSubtitle}</p></div>
            <div className="heading-actions"><span className="connection-badge"><span className="status-indicator muted" />{language === 'ar' ? 'تحديث تلقائي كل 30 ثانية' : 'Auto-updates every 30 seconds'}</span></div>
          </div>

          <form className="tracking-filters events-filters panel" onSubmit={applyFilters}>
            <div className="tracking-filter-title"><Filter size={16} aria-hidden="true" /><div><h2>{t.filters}</h2><p>{t.eventFilterDescription}</p></div></div>
            <label><span>{t.severityFilter}</span><select value={filterInput.severity} onChange={(event) => setFilterInput((value) => ({ ...value, severity: event.target.value }))}><option value="">{t.allSeverities}</option><option value="info">{t.severityInfo}</option><option value="warning">{t.warning}</option><option value="critical">{t.critical}</option></select></label>
            <label><span>{t.eventType}</span><input type="text" dir="ltr" maxLength="100" pattern="[a-z][a-z0-9_.-]{0,99}" value={filterInput.type} onChange={(event) => setFilterInput((value) => ({ ...value, type: event.target.value }))} placeholder={t.eventTypePlaceholder} /></label>
            <label><span>{t.fromTime}</span><input type="datetime-local" value={filterInput.from} onChange={(event) => setFilterInput((value) => ({ ...value, from: event.target.value }))} /></label>
            <label><span>{t.toTime}</span><input type="datetime-local" value={filterInput.to} onChange={(event) => setFilterInput((value) => ({ ...value, to: event.target.value }))} /></label>
            <label><span>{t.rowsPerPage}</span><select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); setResult(null); }} aria-label={t.rowsPerPage}>{PAGE_LIMITS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <div className="tracking-filter-actions"><button className="refresh-button" type="submit"><Filter size={14} aria-hidden="true" />{t.applyFilters}</button><button className="tracking-reset-button" type="button" onClick={resetFilters}>{t.resetFilters}</button></div>
          </form>
          {filterError && <p className="live-error-state" role="alert">{filterError}</p>}
          <div className="event-severity-legend" aria-label={copy.eventIconLegend}><span><Check size={13} aria-hidden="true" />{t.severityInfo}: {copy.infoIconMeaning}</span><span><ShieldAlert size={13} aria-hidden="true" />{t.warning}: {copy.warningIconMeaning}</span><span><AlertTriangle size={13} aria-hidden="true" />{t.critical}: {copy.criticalIconMeaning}</span></div>

          {state === 'loading' && <p className="live-loading-state" role="status">{t.loadingEvents}</p>}
          {state === 'loading-page' && <p className="live-stale-state" role="status">{t.loadingEventPage}</p>}
          {state === 'error' && <div className="live-error-state" role="alert"><p>{t.eventsUnavailable}</p><button className="tracking-reset-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>{t.retry}</button></div>}
          {state === 'page-error' && <div className="live-error-state" role="alert"><p>{t.eventPageUnavailable}</p><button className="tracking-reset-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>{t.retry}</button></div>}
          {state === 'denied' && <div className="tracking-empty panel" role="alert"><Shield size={20} aria-hidden="true" /><h2>{t.eventsDeniedTitle}</h2><p>{t.eventsDeniedDescription}</p><button className="tracking-reset-button" type="button" onClick={() => onNavigate('/guilds')}>{t.switchServer}</button></div>}

          {state === 'ready' && items.length === 0 && <div className="tracking-empty panel"><Clock3 size={20} aria-hidden="true" /><h2>{t.noEventsFound}</h2><p>{filters.severity || filters.type || filters.from || filters.to ? t.noEventsMatch : t.noSecurityEvents}</p><button className="tracking-reset-button" type="button" onClick={resetFilters}>{t.resetFilters}</button></div>}

          {result && items.length > 0 && (
            <section aria-labelledby="security-events-heading">
              <div className="tracking-list-heading"><div><h2 id="security-events-heading">{t.eventLog}</h2><p>{t.eventsUtc}</p></div><span className="live-event-count">{items.length}</span></div>
              <div className="security-event-list">{items.map((event) => <SecurityEvent key={event.id} event={event} language={language} t={t} />)}</div>
            </section>
          )}

          {result && (pageNumber > 1 || hasMore) && <nav className="tracking-pagination" aria-label={t.eventsPagination}><button type="button" className="tracking-reset-button" disabled={pageNumber <= 1 || loading} onClick={() => { setPage(Math.max(1, pageNumber - 1)); setRefreshToken((value) => value + 1); }}>{t.previousPage}</button><span>{t.pageOf(pageNumber)}</span><button type="button" className="tracking-reset-button" disabled={!hasMore || loading} onClick={() => { setPage(Math.min(MAX_PAGE, pageNumber + 1)); setRefreshToken((value) => value + 1); }}>{t.nextPage}</button></nav>}

          <footer className="page-footer"><span><Shield size={14} aria-hidden="true" />{t.safeEventProjection}</span><span>ARGUS SECURITY · {new Date().getUTCFullYear()}</span></footer>
        </main>
      </div>
    </div>
  );
}
