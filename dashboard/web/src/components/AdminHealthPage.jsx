import { useEffect, useRef, useState } from 'react';
import { Activity, Database, LogOut, Menu, Shield, ShieldAlert } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getSiteHealth } from '../lib/api.js';
import { formatDashboardTimestamp } from '../lib/formatters.js';
import { getDashboardCopy } from '../dashboardCopy.js';

function StatusCard({ icon: Icon, label, item, t, copy, language, bot = false }) {
  const status = ['available', 'connected', 'unavailable'].includes(item?.status) ? item.status : 'unknown';
  const botStatus = ['online', 'offline'].includes(item?.status) ? item.status : status;
  const tone = ['available', 'connected', 'online'].includes(botStatus) ? 'green' : ['unavailable', 'offline'].includes(botStatus) ? 'red' : 'neutral';
  const text = bot && botStatus === 'online' ? t.botOnline
    : bot && botStatus === 'offline' ? t.botOffline
      : bot && botStatus === 'unknown' ? t.botUnknown
        : status === 'available' ? t.available : status === 'connected' ? t.connected : status === 'unavailable' ? t.unavailable : t.runtimeUnknown;
  const description = bot
    ? botStatus === 'online' ? t.botOnline
      : botStatus === 'offline' ? item?.lastHeartbeatAt ? `${t.lastHeartbeat}: ${formatDashboardTimestamp(item.lastHeartbeatAt, language, t.timestampInvalid)} · ${t.botHeartbeatStale}` : t.botHeartbeatMissing
        : t.botHeartbeatUnknown
    : item?.reason === 'The dashboard API cannot observe the bot gateway directly.' ? copy.gatewayHealthUnknown
      : typeof item?.reason === 'string' ? item.reason : t.healthSourceDetail;
  return <article className="health-status-card">
    <span className="health-status-icon"><Icon size={17} aria-hidden="true" /></span>
    <div><h2>{label}</h2><p>{description}</p></div>
    <span className={`health-status-pill ${tone}`}><span className="status-indicator" />{text}</span>
  </article>;
}

export default function AdminHealthPage({ t, language, user, onNavigate, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const copy = getDashboardCopy(language);
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const handledExpiry = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    getSiteHealth(controller.signal).then((data) => {
      setResult(data);
      setState('ready');
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setState('error');
    });
    return () => controller.abort();
  }, [onSessionExpired, reload]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') setReload((value) => value + 1);
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);

  return <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
    <AppSidebar t={t} user={user} selectedPage="siteHealth" adminMode siteAdmin mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSignOut={onSignOut} authBusy={authBusy} />
    {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => setMobileMenuOpen(false)} />}
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
        <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{copy.siteAdministration}</span><span className="breadcrumb-separator">/</span><strong>{copy.siteHealth}</strong></nav>
        <div className="topbar-actions live-topbar-actions"><span className="live-user-name">{user?.globalName || user?.username}</span><div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div><ThemeToggle language={language} /><button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button></div>
      </header>
      <main className="page-content live-read-page">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />ARGUS ADMINISTRATION</div><h1>{copy.siteHealth}</h1><p>{copy.siteHealthSubtitle}</p></div><div className="heading-actions"><span className="connection-badge"><span className="status-indicator muted" />{language === 'ar' ? 'تحديث تلقائي كل 30 ثانية' : 'Auto-updates every 30 seconds'}</span></div></div>
        {state === 'loading' && <p className="live-loading-state" role="status">{t.loadingPage(copy.siteHealth)}</p>}
        {state === 'error' && !result && <div className="live-error-state" role="alert"><p>{t.pageUnavailable}</p><button className="tracking-reset-button" type="button" onClick={() => setReload((value) => value + 1)}>{t.retry}</button></div>}
        {state === 'error' && result && <p className="live-stale-state" role="status">{t.staleData}</p>}
        {result && <section className="read-info-card panel"><div className="read-section-heading"><div><h2>{t.systemHealth}</h2><p>{result.generatedAt ? `${t.generatedAt}: ${formatDashboardTimestamp(result.generatedAt, language, t.timestampInvalid)}` : t.healthSourceDetail}</p></div><Activity size={17} aria-hidden="true" /></div><div className="health-status-list"><StatusCard icon={Activity} label={t.apiStatus} item={result.api} t={t} copy={copy} language={language} /><StatusCard icon={Database} label={t.database} item={result.database} t={t} copy={copy} language={language} /><StatusCard icon={ShieldAlert} label={t.botStatus} item={result.bot} t={t} copy={copy} language={language} bot /><StatusCard icon={Activity} label={t.gatewayStatus} item={result.discordGateway} t={t} copy={copy} language={language} /></div></section>}
        <footer className="page-footer"><span><Shield size={14} aria-hidden="true" />{copy.adminHealthNote}</span><span>ARGUS SECURITY Â· {new Date().getUTCFullYear()}</span></footer>
      </main>
    </div>
  </div>;
}
