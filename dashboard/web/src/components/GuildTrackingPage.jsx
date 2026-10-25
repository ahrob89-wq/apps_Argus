import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, Filter, LogOut, Menu, Shield, Users } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getGuildTracking, postGuildAction } from '../lib/api.js';
import { formatDashboardTimestamp } from '../lib/formatters.js';

const PAGE_LIMITS = [25, 50, 100];

function formatRemaining(value, now, t) {
  const expires = Date.parse(value);
  if (!Number.isFinite(expires)) return t.timestampInvalid;
  const seconds = Math.max(0, Math.floor((expires - now) / 1000));
  if (!seconds) return t.trackingExpired;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (days) return t.remainingDays(days, hours);
  if (hours) return t.remainingHours(hours, minutes);
  if (minutes) return t.remainingMinutes(minutes, remainingSeconds);
  return t.remainingSeconds(remainingSeconds);
}

function ReasonList({ reasons, t }) {
  if (!Array.isArray(reasons) || reasons.length === 0) return <span className="tracking-muted">{t.noReasons}</span>;
  return (
    <ul className="tracking-reasons">
      {reasons.map((reason, index) => {
        const source = typeof reason.source === 'string' ? reason.source : null;
        const code = typeof reason.code === 'string' ? reason.code : t.unknownReason;
        const weight = typeof reason.weight === 'number' ? reason.weight : null;
        return <li key={`${source || 'reason'}-${code}-${index}`} title={[source, code, weight === null ? null : `${t.weight}: ${weight}`].filter(Boolean).join(' · ')}>
          {source && <span>{source}</span>}<code>{code}</code>{weight !== null && <small>{weight}</small>}
        </li>;
      })}
    </ul>
  );
}

function TrackingActions({ entry, t, onAction, busy, feedback }) {
  const [durationHours, setDurationHours] = useState('24');
  const [reason, setReason] = useState('');
  const validDuration = Number.isInteger(Number(durationHours)) && Number(durationHours) >= 1 && Number(durationHours) <= 672;
  const submit = (action) => onAction(action, entry.userId, {
    reason: reason.trim(),
    ...(action === 'tracking-extend' || action === 'tracking-reduce' || action === 'jail'
      ? { durationHours: Number(durationHours) }
      : {})
  });

  return (
    <details className="tracking-actions">
      <summary>{t.manageMember}</summary>
      <div className="tracking-action-form">
        <label><span>{t.actionReason}</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={300} required rows={2} /></label>
        <label><span>{t.durationHours}</span><input type="number" min="1" max="672" step="1" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} /></label>
        <div className="tracking-action-buttons">
          <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => submit('tracking-clear')}>{t.endTracking}</button>
          <button type="button" disabled={busy || reason.trim().length < 3 || !validDuration} onClick={() => submit('tracking-extend')}>{t.extendTracking}</button>
          <button type="button" disabled={busy || reason.trim().length < 3 || !validDuration} onClick={() => submit('tracking-reduce')}>{t.reduceTracking}</button>
          <button type="button" disabled={busy || reason.trim().length < 3 || !validDuration} onClick={() => submit('jail')}>{t.jailMember}</button>
          <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => submit('unjail')}>{t.unjailMember}</button>
          <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => submit('trust')}>{t.trustMember}</button>
          <button type="button" className="tracking-action-danger" disabled={busy || reason.trim().length < 3} onClick={() => submit('ban')}>{t.banMember}</button>
        </div>
        {busy && <p className="tracking-action-feedback" role="status">{t.actionInProgress}</p>}
        {feedback && <p className={`tracking-action-feedback ${feedback.success ? 'success' : 'error'}`} role={feedback.success ? 'status' : 'alert'}>{feedback.message}</p>}
      </div>
    </details>
  );
}

function TrackingEntry({ entry, now, language, t, onAction, actionState }) {
  return (
    <article className="tracking-entry">
      <div className="tracking-entry-heading">
        <span className="tracking-entry-icon"><Users size={17} aria-hidden="true" /></span>
        <div className="tracking-entry-member"><span>{t.discordUserId}</span><code dir="ltr">{entry.userId}</code></div>
        <span className="tracking-score"><span>{t.score}</span><strong>{Number.isFinite(entry.score) ? entry.score : '—'}</strong></span>
      </div>
      <div className="tracking-entry-details">
        <div className="tracking-expiry"><span><Clock3 size={14} aria-hidden="true" />{t.expiresIn}</span>
          <strong>{formatRemaining(entry.expiresAt, now, t)}</strong>
          <time dateTime={entry.expiresAt}>{formatDashboardTimestamp(entry.expiresAt, language, t.timestampInvalid)}</time>
        </div>
        <div className="tracking-started"><span>{t.startedAt}</span><time dateTime={entry.startedAt}>{formatDashboardTimestamp(entry.startedAt, language, t.timestampInvalid)}</time></div>
      </div>
      <div className="tracking-entry-reasons"><span>{t.trackingReasons}</span><ReasonList reasons={entry.reasons} t={t} /></div>
      <TrackingActions
        entry={entry}
        t={t}
        onAction={onAction}
        busy={actionState?.userId === entry.userId && actionState.status === 'pending'}
        feedback={actionState?.userId === entry.userId && actionState.status !== 'pending' ? actionState : null}
      />
    </article>
  );
}

export default function GuildTrackingPage({ t, language, guild, user, siteAdmin, onNavigate, onSwitchServer, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const [filterInput, setFilterInput] = useState({ minScore: '', userId: '' });
  const [filters, setFilters] = useState({ minScore: '', userId: '' });
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [actionState, setActionState] = useState(null);
  const handledExpiry = useRef(false);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

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
    const hasResult = Boolean(result);
    setState(hasResult ? 'refreshing' : 'loading');
    getGuildTracking(guild.id, { page, limit, ...filters }, controller.signal).then((data) => {
      setResult(data);
      setState('ready');
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      if (['GUILD_NOT_AVAILABLE', 'GUILD_ACCESS_DENIED', 'ADMIN_REQUIRED'].includes(error.message)) {
        setResult(null);
        setState('denied');
        return;
      }
      setState(hasResult ? 'stale-error' : 'error');
    });
    return () => controller.abort();
  }, [filters, guild.id, limit, onSessionExpired, page, refreshToken]);

  useEffect(() => {
    const entries = Array.isArray(result?.items) ? result.items : [];
    const nextExpiry = entries.map((entry) => Date.parse(entry.expiresAt)).filter((timestamp) => Number.isFinite(timestamp) && timestamp > now).sort((a, b) => a - b)[0];
    if (!nextExpiry) return undefined;
    const timer = window.setTimeout(refresh, Math.max(0, nextExpiry - now + 500));
    return () => window.clearTimeout(timer);
  }, [now, refresh, result]);

  const entries = Array.isArray(result?.items) ? result.items.filter((entry) => Date.parse(entry.expiresAt) > now) : [];
  const onApplyFilters = (event) => {
    event.preventDefault();
    const minScore = filterInput.minScore.trim();
    const userId = filterInput.userId.trim();
    setPage(1);
    setResult(null);
    setFilters({ minScore, userId });
    setRefreshToken((value) => value + 1);
  };
  const onResetFilters = () => {
    setFilterInput({ minScore: '', userId: '' });
    setPage(1);
    setResult(null);
    setFilters({ minScore: '', userId: '' });
    setRefreshToken((value) => value + 1);
  };
  const onTrackingAction = async (action, targetId, details) => {
    if (['tracking-clear', 'jail', 'unjail', 'ban'].includes(action) &&
        !window.confirm(t.confirmMemberAction)) return;
    setActionState({ userId: targetId, status: 'pending' });
    try {
      const response = await postGuildAction(guild.id, { action, targetId, ...details });
      const message = action === 'jail'
        ? `${t.actionSucceeded} ${response.dmSent ? t.jailDmSent : t.jailDmFailed}`
        : t.actionSucceeded;
      setActionState({ userId: targetId, status: 'success', success: true, message });
      refresh();
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setActionState({
        userId: targetId,
        status: 'error',
        success: false,
        message: t.actionFailed(error.message)
      });
      refresh();
    }
  };
  const pageNumber = Number.isInteger(result?.page) ? result.page : page;
  const hasMore = result?.hasMore === true && pageNumber < 50;

  return (
    <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar t={t} guild={guild} user={user} siteAdmin={siteAdmin} selectedPage="tracking" mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }} onSignOut={onSignOut} authBusy={authBusy} />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => { setMobileMenuOpen(false); document.querySelector('.mobile-menu')?.focus(); }} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{t.tracking}</strong></nav>
          <div className="topbar-actions live-topbar-actions">
            <span className="live-user-name">{user?.globalName || user?.username}</span>
            <div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div>
            <ThemeToggle language={language} />
            <button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button>
          </div>
        </header>

        <main className="page-content live-tracking-page">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />ARGUS WORKSPACE</div><h1>{t.tracking}</h1><p>{guild.name} · {t.trackingSubtitle}</p></div>
            <div className="heading-actions"><span className="connection-badge"><span className="status-indicator muted" />{language === 'ar' ? 'تحديث تلقائي كل 30 ثانية' : 'Auto-updates every 30 seconds'}</span></div>
          </div>

          <form className="tracking-filters panel" onSubmit={onApplyFilters}>
            <div className="tracking-filter-title"><Filter size={16} aria-hidden="true" /><div><h2>{t.filters}</h2><p>{t.trackingFilterDescription}</p></div></div>
            <label><span>{t.minimumScore}</span><input type="number" inputMode="numeric" min="0" max="999999999" step="1" value={filterInput.minScore} onChange={(event) => setFilterInput((value) => ({ ...value, minScore: event.target.value }))} placeholder={t.anyScore} /></label>
            <label><span>{t.discordUserId}</span><input type="text" inputMode="numeric" dir="ltr" maxLength="24" pattern="[0-9]{1,24}" value={filterInput.userId} onChange={(event) => setFilterInput((value) => ({ ...value, userId: event.target.value.replace(/\D/g, '') }))} placeholder={t.userIdPlaceholder} /></label>
            <label><span>{t.rowsPerPage}</span><select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); setResult(null); }}>{PAGE_LIMITS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <div className="tracking-filter-actions"><button className="refresh-button" type="submit"><Filter size={14} aria-hidden="true" />{t.applyFilters}</button><button className="tracking-reset-button" type="button" onClick={onResetFilters}>{t.resetFilters}</button></div>
          </form>

          {state === 'loading' && <p className="live-loading-state" role="status">{t.loadingTracking}</p>}
          {state === 'refreshing' && <p className="live-stale-state" role="status">{t.refreshingTracking}</p>}
          {state === 'error' && <div className="live-error-state" role="alert"><p>{t.trackingUnavailable}</p><button className="tracking-reset-button" type="button" onClick={refresh}>{t.retry}</button></div>}
          {state === 'stale-error' && <div className="live-stale-state" role="status"><p>{t.staleData}</p><button className="tracking-reset-button" type="button" onClick={refresh}>{t.retry}</button></div>}
          {state === 'denied' && <div className="tracking-empty panel" role="alert"><Shield size={20} aria-hidden="true" /><h2>{t.trackingDeniedTitle}</h2><p>{t.trackingDeniedDescription}</p><button className="tracking-reset-button" type="button" onClick={() => onNavigate('/guilds')}>{t.switchServer}</button></div>}

          {['ready', 'refreshing', 'stale-error'].includes(state) && entries.length === 0 && <div className="tracking-empty panel"><Users size={20} aria-hidden="true" /><h2>{t.noActiveTracking}</h2><p>{filters.userId || filters.minScore ? t.noTrackingMatches : t.noTrackingDescription}</p><button className="tracking-reset-button" type="button" onClick={onResetFilters}>{t.resetFilters}</button></div>}

          {['ready', 'refreshing', 'stale-error'].includes(state) && entries.length > 0 && (
            <section aria-labelledby="tracking-list-heading">
              <div className="tracking-list-heading"><div><h2 id="tracking-list-heading">{t.activeTracking}</h2><p>{t.trackingPageLabel(pageNumber, result?.limit || limit)}</p></div><span className="live-event-count">{entries.length}</span></div>
              <div className="tracking-entry-list">{entries.map((entry) => <TrackingEntry key={entry.id} entry={entry} now={now} language={language} t={t} onAction={onTrackingAction} actionState={actionState} />)}</div>
            </section>
          )}

          {['ready', 'refreshing', 'stale-error'].includes(state) && (pageNumber > 1 || hasMore) && <nav className="tracking-pagination" aria-label={t.trackingPagination}><button type="button" className="tracking-reset-button" disabled={pageNumber <= 1 || state === 'refreshing'} onClick={() => { setResult(null); setPage((value) => Math.max(1, value - 1)); }}>{t.previousPage}</button><span>{t.pageOf(pageNumber)}</span><button type="button" className="tracking-reset-button" disabled={!hasMore || state === 'refreshing'} onClick={() => { setResult(null); setPage((value) => Math.min(50, value + 1)); }}>{t.nextPage}</button></nav>}

          <footer className="page-footer"><span><Shield size={14} aria-hidden="true" />{t.trackingActionsNote}</span><span>ARGUS SECURITY · {new Date().getUTCFullYear()}</span></footer>
        </main>
      </div>
    </div>
  );
}
