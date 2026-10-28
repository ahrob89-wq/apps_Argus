import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  Clock3,
  LogOut,
  Maximize2,
  MapPinOff,
  Menu,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
  X
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { ContentSkeleton } from './LoadingSkeleton.jsx';
import { getGuildOverview } from '../lib/api.js';
import { formatDashboardChartDate, formatDashboardTimestamp } from '../lib/formatters.js';

const severityColors = {
  critical: 'var(--chart-danger)',
  warning: 'var(--chart-warning)',
  info: 'var(--chart-info)'
};

const metricColors = {
  total: 'var(--chart-total)',
  critical: severityColors.critical,
  warning: severityColors.warning,
  info: severityColors.info
};

const metricKeys = ['total', 'critical', 'warning', 'info'];

const analyticsCopy = {
  en: {
    eyebrow: 'SERVER SECURITY INTELLIGENCE',
    title: 'Security analytics',
    subtitle: 'A live, server-specific view of security events and member tracking.',
    range: 'Last 7 days · UTC',
    totalEvents: 'Security events',
    criticalEvents: 'Critical events',
    warningEvents: 'Warnings',
    trackedMembers: 'Active tracked members',
    activeTrackingDetail: 'Currently active tracking records',
    dailyTrend: 'Security activity',
    dailyTrendDetail: 'Choose a signal to explore its daily trend.',
    allSignals: 'All events',
    severityMix: 'Bot & server activity',
    severityMixDetail: 'Live bot status and real activity signals from this server.',
    expandActivity: 'Enlarge activity view',
    closeActivity: 'Close activity view',
    activityDialogEyebrow: 'LIVE SERVER OVERVIEW',
    activityDialogTotal: 'Security events · 7 days',
    activityDialogTracked: 'Tracked members',
    activityDialogHint: 'Select a security signal to filter the recent event feed.',
    dialogSignals: 'Signal breakdown',
    dialogRecent: 'Latest server events',
    dialogTimeline: 'Seven-day activity',
    dialogNoRecent: 'No recent security signals.',
    dialogActivityLabel: 'Recorded events',
    dialogOnline: 'Protection active',
    dialogOffline: 'Bot offline',
    trackedActivity: 'Tracked members',
    activityPulse: 'Daily activity pulse',
    activityPulseDetail: 'Select a day to inspect its recorded security signals.',
    dayBreakdown: 'Selected day',
    latestEvents: 'Recent security signals',
    eventFeedDetail: 'Latest records reported for this server',
    noEvents: 'No security events were recorded in this period.',
    noSeverityMatches: 'No recent events match this severity.',
    noDailyEvents: 'No events',
    noActivity: 'No daily activity series is available for this server yet.',
    noActivityDetail: 'The summary and recent event feed are still available when returned by the API.',
    noLocation: 'Argus does not collect member locations. These analytics use real server security records instead of inferred geographic data.',
    highestDay: 'Busiest day',
    dailyAverage: 'Daily average',
    events: 'events',
    refresh: 'Refresh data',
    refreshing: 'Refreshing…',
    loading: 'Loading server analytics…',
    unavailable: 'Analytics could not be loaded. Check the connection and try again.',
    stale: 'Could not refresh. Showing the last successful data.',
    updated: 'Updated',
    viewEvents: 'Open event log',
    viewTracking: 'Review tracked members',
    selectedDay: 'Selected day',
    noActivityForDay: 'No events were recorded on this day.',
    severity: 'Severity',
    date: 'Date',
    count: 'Count',
    chartDescription: 'Interactive daily chart of real server security events over the last seven days.',
    distributionDescription: 'Interactive server activity diagram. Select a security signal to filter recent events.',
    currentSelection: 'Showing',
    eventTypeFallback: 'Security event',
    botUnknown: 'Bot status unknown',
    online: 'Bot online',
    offline: 'Bot offline',
    timestampInvalid: 'Time unavailable'
  },
  ar: {
    eyebrow: 'مؤشرات أمان السيرفر',
    title: 'تحليلات الأمان',
    subtitle: 'عرض حيّ خاص بهذا السيرفر لأحداث الأمان والأعضاء قيد التتبع.',
    range: 'آخر 7 أيام · UTC',
    totalEvents: 'أحداث الأمان',
    criticalEvents: 'أحداث حرجة',
    warningEvents: 'تحذيرات',
    trackedMembers: 'أعضاء نشطون قيد التتبع',
    activeTrackingDetail: 'سجلات التتبع النشطة حاليًا',
    dailyTrend: 'نشاط الأمان',
    dailyTrendDetail: 'اختر مؤشرًا لاستكشاف اتجاهه اليومي.',
    allSignals: 'كل الأحداث',
    severityMix: 'نشاط البوت والسيرفر',
    severityMixDetail: 'حالة البوت وإشارات النشاط الفعلية لهذا السيرفر.',
    expandActivity: 'تكبير عرض النشاط',
    closeActivity: 'إغلاق عرض النشاط',
    activityDialogEyebrow: 'نظرة مباشرة على السيرفر',
    activityDialogTotal: 'أحداث الأمان · ٧ أيام',
    activityDialogTracked: 'أعضاء قيد التتبع',
    activityDialogHint: 'اختر إشارة أمنية لتصفية سجل الأحداث الحديثة.',
    dialogSignals: 'تفصيل الإشارات',
    dialogRecent: 'أحدث أحداث السيرفر',
    dialogTimeline: 'نشاط الأيام السبعة',
    dialogNoRecent: 'لا توجد إشارات أمنية حديثة.',
    dialogActivityLabel: 'الأحداث المسجلة',
    dialogOnline: 'الحماية تعمل',
    dialogOffline: 'البوت متوقف',
    trackedActivity: 'أعضاء قيد التتبع',
    activityPulse: 'نبض النشاط اليومي',
    activityPulseDetail: 'اختر يومًا لعرض مؤشرات الأمان المسجلة فيه.',
    dayBreakdown: 'اليوم المحدد',
    latestEvents: 'أحدث الإشارات الأمنية',
    eventFeedDetail: 'أحدث السجلات التي أبلغ عنها هذا السيرفر',
    noEvents: 'لم تُسجّل أحداث أمنية خلال هذه الفترة.',
    noSeverityMatches: 'لا توجد أحداث حديثة بهذا المستوى من الخطورة.',
    noDailyEvents: 'لا أحداث',
    noActivity: 'لا تتوفر سلسلة النشاط اليومي لهذا السيرفر حتى الآن.',
    noActivityDetail: 'قد يظل الملخص وسجل الأحداث الحديثة متاحين عند إعادتهما من API.',
    noLocation: 'لا يجمع Argus مواقع الأعضاء. تعرض هذه التحليلات سجلات أمان حقيقية للسيرفر بدلًا من بيانات جغرافية مستنتجة.',
    highestDay: 'أكثر الأيام نشاطًا',
    dailyAverage: 'المتوسط اليومي',
    events: 'حدث',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث…',
    loading: 'جارٍ تحميل تحليلات السيرفر…',
    unavailable: 'تعذر تحميل التحليلات. تحقق من الاتصال ثم أعد المحاولة.',
    stale: 'تعذر التحديث. نعرض آخر بيانات تم تحميلها بنجاح.',
    updated: 'آخر تحديث',
    viewEvents: 'فتح سجل الأحداث',
    viewTracking: 'مراجعة الأعضاء المتتبعين',
    selectedDay: 'اليوم المحدد',
    noActivityForDay: 'لم تُسجّل أحداث في هذا اليوم.',
    severity: 'الخطورة',
    date: 'التاريخ',
    count: 'العدد',
    chartDescription: 'مخطط تفاعلي يومي لأحداث الأمان الفعلية في السيرفر خلال آخر سبعة أيام.',
    distributionDescription: 'مخطط تفاعلي لنشاط السيرفر. اختر إشارة أمنية لتصفية الأحداث الحديثة.',
    currentSelection: 'المعروض',
    eventTypeFallback: 'حدث أمني',
    botUnknown: 'حالة البوت غير معروفة',
    online: 'البوت يعمل',
    offline: 'البوت متوقف',
    timestampInvalid: 'الوقت غير متاح'
  }
};

function validActivityDays(activity) {
  if (activity?.available !== true || !Array.isArray(activity.days) || activity.days.length !== 7) return null;
  const valid = activity.days.every((day) =>
    typeof day.date === 'string' &&
    ['total', 'critical', 'warning', 'info'].every((key) => Number.isInteger(day[key]) && day[key] >= 0)
  );
  return valid ? activity.days : null;
}

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en').format(value);
}

function AnalyticsMetric({ icon: Icon, tone, label, value, detail }) {
  return (
    <article className={`metric-card metric-${tone} analytics-metric`}>
      <div className="metric-icon"><Icon size={18} aria-hidden="true" /></div>
      <div className="metric-copy">
        <h3>{label}</h3>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function TrendTooltip({ active, payload, label, copy, language, metricLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="security-chart-tooltip">
      <strong>{label}</strong>
      <span>{copy.currentSelection} {metricLabel}: {formatNumber(payload[0]?.value ?? 0, language)}</span>
    </div>
  );
}

function ServerActivityDiagram({ copy, t, language, totals, activeTracked, botStatus, severityFilter, onSelectSeverity, expanded = false }) {
  return (
    <div className={`analytics-activity-diagram${expanded ? ' is-expanded' : ''}`} role="group" aria-label={copy.distributionDescription}>
      <svg className="analytics-activity-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {expanded ? (
          <>
            <path className="connection-critical" d="M50 50 Q33 32 17 22" />
            <path className="connection-warning" d="M50 50 Q67 32 83 22" />
            <path className="connection-info" d="M50 50 Q33 68 17 78" />
            <path className="connection-tracking" d="M50 50 Q67 68 83 78" />
          </>
        ) : (
          <>
            <line className="connection-critical" x1="50" y1="50" x2="17" y2="22" />
            <line className="connection-warning" x1="50" y1="50" x2="83" y2="22" />
            <line className="connection-info" x1="50" y1="50" x2="17" y2="78" />
            <line className="connection-tracking" x1="50" y1="50" x2="83" y2="78" />
          </>
        )}
      </svg>
      {expanded && (
        <>
          <span className="analytics-orbit-track orbit-track-outer" aria-hidden="true"><i /></span>
          <span className="analytics-orbit-track orbit-track-inner" aria-hidden="true"><i /></span>
          <span className="analytics-orbit-track orbit-track-tilted" aria-hidden="true"><i /></span>
        </>
      )}
      <button
        type="button"
        className={`analytics-activity-node node-critical${severityFilter === 'critical' ? ' is-selected' : ''}`}
        aria-pressed={severityFilter === 'critical'}
        onClick={() => onSelectSeverity('critical')}
      >
        <AlertTriangle size={13} aria-hidden="true" />
        <span>{t.critical}</span>
        <strong>{totals ? formatNumber(totals.critical, language) : '—'}</strong>
      </button>
      <button
        type="button"
        className={`analytics-activity-node node-warning${severityFilter === 'warning' ? ' is-selected' : ''}`}
        aria-pressed={severityFilter === 'warning'}
        onClick={() => onSelectSeverity('warning')}
      >
        <ShieldAlert size={13} aria-hidden="true" />
        <span>{t.warning}</span>
        <strong>{totals ? formatNumber(totals.warning, language) : '—'}</strong>
      </button>
      <button
        type="button"
        className={`analytics-activity-node node-info${severityFilter === 'info' ? ' is-selected' : ''}`}
        aria-pressed={severityFilter === 'info'}
        onClick={() => onSelectSeverity('info')}
      >
        <Activity size={13} aria-hidden="true" />
        <span>{t.severityInfo}</span>
        <strong>{totals ? formatNumber(totals.info, language) : '—'}</strong>
      </button>
      <div className="analytics-activity-node node-tracking">
        <Users size={13} aria-hidden="true" />
        <span>{copy.trackedActivity}</span>
        <strong>{activeTracked === null ? '—' : formatNumber(activeTracked, language)}</strong>
      </div>
      <div className={`analytics-activity-core bot-${botStatus}`}>
        <span className="analytics-bot-icon"><Bot size={23} aria-hidden="true" /></span>
        <strong>ARGUS</strong>
        <span className="analytics-bot-status">
          <i aria-hidden="true" />
          {botStatus === 'online' ? copy.online : botStatus === 'offline' ? copy.offline : copy.botUnknown}
        </span>
      </div>
      <span className="analytics-activity-particle particle-one" aria-hidden="true" />
      <span className="analytics-activity-particle particle-two" aria-hidden="true" />
      <span className="analytics-activity-particle particle-three" aria-hidden="true" />
    </div>
  );
}

function RecentSignal({ event, language, copy, t }) {
  const severity = ['critical', 'warning', 'info'].includes(event.severity) ? event.severity : 'info';
  const Icon = severity === 'critical' ? AlertTriangle : severity === 'warning' ? ShieldAlert : Check;
  const type = typeof event.type === 'string' ? event.type.replace(/[._-]/g, ' ') : copy.eventTypeFallback;
  return (
    <li className="analytics-signal">
      <span className={`event-icon event-${severity === 'critical' ? 'urgent' : severity === 'warning' ? 'review' : 'info'}`}><Icon size={15} aria-hidden="true" /></span>
      <div className="analytics-signal-copy">
        <div><strong>{type}</strong><span className={`event-tag ${severity === 'critical' ? 'urgent' : severity === 'warning' ? 'review' : 'info'}`}>{t[severity] || t.severityInfo}</span></div>
        <p>{event.summary || copy.eventTypeFallback}</p>
      </div>
      <time dateTime={event.createdAt}>{formatDashboardTimestamp(event.createdAt, language, copy.timestampInvalid)}</time>
    </li>
  );
}

export default function GuildAnalyticsPage({
  t,
  language,
  guild,
  user,
  siteAdmin,
  onNavigate,
  onSwitchServer,
  onSignOut,
  authBusy,
  onLanguageToggle,
  onSessionExpired
}) {
  const copy = analyticsCopy[language] || analyticsCopy.en;
  const [overview, setOverview] = useState(null);
  const [state, setState] = useState('loading');
  const [refreshToken, setRefreshToken] = useState(0);
  const [metric, setMetric] = useState('total');
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [severityFilter, setSeverityFilter] = useState(null);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handledExpiry = useRef(false);
  const activityDialogRef = useRef(null);
  const activityTriggerRef = useRef(null);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!activityExpanded) return;
    const dialog = activityDialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector('button')?.focus();
    return () => {
      if (dialog.open) dialog.close();
      activityTriggerRef.current?.focus();
    };
  }, [activityExpanded]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    // Keep the displayed bot heartbeat close to real time; the API marks it
    // offline once its heartbeat TTL expires.
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    setState(overview ? 'refreshing' : 'loading');
    getGuildOverview(guild.id, controller.signal).then((data) => {
      setOverview(data);
      setState('ready');
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
      }
      setState(overview ? 'stale' : 'error');
    });
    return () => controller.abort();
  }, [guild.id, onSessionExpired, refreshToken]);

  const days = useMemo(() => validActivityDays(overview?.activity), [overview?.activity]);
  const totals = useMemo(() => days?.reduce((result, day) => ({
    total: result.total + day.total,
    critical: result.critical + day.critical,
    warning: result.warning + day.warning,
    info: result.info + day.info
  }), { total: 0, critical: 0, warning: 0, info: 0 }) ?? null, [days]);
  const chartDays = useMemo(() => days?.map((day) => ({
    ...day,
    label: formatDashboardChartDate(day.date, language)
  })) ?? [], [days, language]);
  const selectedDay = selectedDayIndex === null ? null : days?.[selectedDayIndex] ?? null;
  const highestDay = days?.reduce((highest, day) => !highest || day.total > highest.total ? day : highest, null) ?? null;
  const recentEvents = Array.isArray(overview?.recentEvents) ? overview.recentEvents : [];
  const filteredEvents = severityFilter ? recentEvents.filter((event) => event.severity === severityFilter) : recentEvents;
  const activeTracked = Number.isInteger(overview?.summary?.activeTrackedMembers) ? overview.summary.activeTrackedMembers : null;
  const botStatus = overview?.summary?.bot?.status || 'unknown';
  const severityData = totals ? [
    { name: 'critical', value: totals.critical },
    { name: 'warning', value: totals.warning },
    { name: 'info', value: totals.info }
  ] : [];
  const timelineMax = days ? Math.max(...days.map((day) => day.total), 1) : 1;
  const metricLabels = {
    total: copy.allSignals,
    critical: t.critical,
    warning: t.warning,
    info: t.severityInfo
  };
  const severityLabels = {
    critical: t.critical,
    warning: t.warning,
    info: t.severityInfo
  };

  const selectSeverity = (severity) => {
    setMetric(severity);
    setSeverityFilter((current) => current === severity ? null : severity);
  };

  return (
    <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar
        t={t}
        guild={guild}
        user={user}
        botStatus={botStatus}
        siteAdmin={siteAdmin}
        selectedPage="analytics"
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }}
        onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }}
        onSignOut={onSignOut}
        authBusy={authBusy}
      />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => { setMobileMenuOpen(false); document.querySelector('.mobile-menu')?.focus(); }} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{t.analytics}</strong></nav>
          <div className="topbar-actions live-topbar-actions">
            <span className="live-user-name">{user?.globalName || user?.username}</span>
            <div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div>
            <ThemeToggle language={language} />
            <button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button>
          </div>
        </header>

        <main className="page-content live-analytics-page">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{copy.eyebrow}</div>
              <h1>{copy.title}</h1>
              <p>{guild.name} · {copy.subtitle}</p>
            </div>
            <div className="heading-actions">
              <span className={`connection-badge ${botStatus === 'online' ? 'connected' : botStatus === 'offline' ? 'unavailable' : 'checking'}`}>
                <span className={`status-indicator ${botStatus === 'online' ? 'online' : botStatus === 'offline' ? 'offline' : 'muted'}`} />
                {botStatus === 'online' ? copy.online : botStatus === 'offline' ? copy.offline : copy.botUnknown}
              </span>
              <button className="refresh-button" type="button" onClick={refresh} disabled={state === 'loading' || state === 'refreshing'} aria-label={state === 'refreshing' ? copy.refreshing : copy.refresh}>
                <RefreshCw size={14} aria-hidden="true" className={state === 'refreshing' ? 'analytics-refreshing' : ''} />
                <span>{state === 'refreshing' ? copy.refreshing : copy.refresh}</span>
              </button>
            </div>
          </div>

          <div className="analytics-context-bar">
            <span><Clock3 size={14} aria-hidden="true" />{copy.range}</span>
            {overview?.generatedAt && <span>{copy.updated}: <time dateTime={overview.generatedAt}>{formatDashboardTimestamp(overview.generatedAt, language, copy.timestampInvalid)}</time></span>}
          </div>

          {state === 'error' && <div className="live-error-state analytics-error" role="alert"><span>{copy.unavailable}</span><button type="button" onClick={refresh}>{t.retry}</button></div>}
          {state === 'stale' && <p className="live-stale-state analytics-stale" role="status">{copy.stale}</p>}
          {state === 'loading' && <ContentSkeleton variant="analytics" label={copy.loading} />}

          {overview && (
            <>
              <section className="metrics-grid analytics-metrics" aria-label={copy.title}>
                <AnalyticsMetric icon={Activity} tone="blue" label={copy.totalEvents} value={totals ? formatNumber(totals.total, language) : '—'} detail={copy.range} />
                <AnalyticsMetric icon={AlertTriangle} tone="red" label={copy.criticalEvents} value={totals ? formatNumber(totals.critical, language) : '—'} detail={copy.range} />
                <AnalyticsMetric icon={ShieldAlert} tone="amber" label={copy.warningEvents} value={totals ? formatNumber(totals.warning, language) : '—'} detail={copy.range} />
                <AnalyticsMetric icon={Users} tone="blue" label={copy.trackedMembers} value={activeTracked === null ? '—' : formatNumber(activeTracked, language)} detail={copy.activeTrackingDetail} />
              </section>

              <section className="analytics-main-grid">
                <article className="panel analytics-chart-panel">
                  <div className="analytics-panel-heading">
                    <div><h2>{copy.dailyTrend}</h2><p>{copy.dailyTrendDetail}</p></div>
                    <div className="analytics-period-tag">{copy.range}</div>
                  </div>
                  <div className="analytics-metric-tabs" role="group" aria-label={copy.dailyTrend}>
                    {metricKeys.map((key) => (
                      <button type="button" key={key} className={metric === key ? 'is-selected' : ''} aria-pressed={metric === key} onClick={() => setMetric(key)}>
                        <i style={{ background: metricColors[key] }} />{metricLabels[key]}
                      </button>
                    ))}
                  </div>
                  {chartDays.length ? (
                    <>
                      <div className="analytics-trend-chart" role="img" aria-label={`${copy.chartDescription} ${metricLabels[metric]}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          {metric === 'total' ? (
                            <AreaChart data={chartDays} margin={{ top: 14, right: 12, bottom: 2, left: 0 }}>
                              <defs><linearGradient id="analytics-total-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metricColors.total} stopOpacity={0.35} /><stop offset="95%" stopColor={metricColors.total} stopOpacity={0.015} /></linearGradient></defs>
                              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} minTickGap={14} />
                              <YAxis allowDecimals={false} width={34} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
                              <Tooltip content={<TrendTooltip copy={copy} language={language} metricLabel={metricLabels[metric]} />} cursor={{ stroke: 'var(--chart-muted)', strokeDasharray: '3 4' }} />
                              <Area type="monotone" dataKey="total" stroke={metricColors.total} strokeWidth={2.5} fill="url(#analytics-total-fill)" dot={{ r: 3, fill: metricColors.total, stroke: 'var(--panel)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                            </AreaChart>
                          ) : (
                            <LineChart data={chartDays} margin={{ top: 14, right: 12, bottom: 2, left: 0 }}>
                              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} minTickGap={14} />
                              <YAxis allowDecimals={false} width={34} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
                              <Tooltip content={<TrendTooltip copy={copy} language={language} metricLabel={metricLabels[metric]} />} cursor={{ stroke: 'var(--chart-muted)', strokeDasharray: '3 4' }} />
                              <Line type="monotone" dataKey={metric} stroke={metricColors[metric]} strokeWidth={2.5} dot={{ r: 3, fill: metricColors[metric], stroke: 'var(--panel)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                      <div className="analytics-chart-footer">
                        <span>{copy.currentSelection}: <strong>{metricLabels[metric]}</strong></span>
                        <span>{copy.dailyAverage}: <strong>{formatNumber(totals.total / chartDays.length, language)}</strong></span>
                      </div>
                    </>
                  ) : (
                    <div className="analytics-chart-empty"><Activity size={25} aria-hidden="true" /><p>{copy.noActivity}</p></div>
                  )}
                </article>

                <article className="panel analytics-severity-panel">
                  <div className="analytics-panel-heading">
                    <div><h2>{copy.severityMix}</h2><p>{copy.severityMixDetail}</p></div>
                    <button
                      type="button"
                      className="analytics-activity-size"
                      aria-label={copy.expandActivity}
                      title={copy.expandActivity}
                      ref={activityTriggerRef}
                      onClick={() => setActivityExpanded(true)}
                    >
                      <Maximize2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <ServerActivityDiagram
                    copy={copy}
                    t={t}
                    language={language}
                    totals={totals}
                    activeTracked={activeTracked}
                    botStatus={botStatus}
                    severityFilter={severityFilter}
                    onSelectSeverity={selectSeverity}
                  />
                  {severityFilter && (
                    <button type="button" className="analytics-clear-filter" onClick={() => setSeverityFilter(null)}>{copy.allSignals}</button>
                  )}
                </article>
              </section>

              {days ? (
                <section className="panel analytics-pulse-panel">
                  <div className="analytics-panel-heading">
                    <div><h2>{copy.activityPulse}</h2><p>{copy.activityPulseDetail}</p></div>
                    <span className="analytics-day-count">{days.length}</span>
                  </div>
                  <div className="analytics-pulse-grid">
                    {days.map((day, index) => {
                      const intensity = highestDay?.total ? day.total / highestDay.total : 0;
                      return (
                        <button
                          type="button"
                          key={day.date}
                          className={`analytics-pulse-day${selectedDayIndex === index ? ' is-selected' : ''}`}
                          style={{ '--pulse-intensity': String(0.12 + intensity * 0.68) }}
                          aria-pressed={selectedDayIndex === index}
                          onClick={() => setSelectedDayIndex((selected) => selected === index ? null : index)}
                        >
                          <span>{formatDashboardChartDate(day.date, language)}</span>
                          <strong>{formatNumber(day.total, language)}</strong>
                          <i aria-hidden="true"><b style={{ width: `${intensity * 100}%` }} /></i>
                          <small>{copy.events}</small>
                        </button>
                      );
                    })}
                  </div>
                  {selectedDay && (
                    <div className="analytics-day-detail" aria-live="polite">
                      <div><span>{copy.dayBreakdown}</span><strong>{formatDashboardChartDate(selectedDay.date, language)}</strong></div>
                      <div><span>{copy.allSignals}</span><strong>{formatNumber(selectedDay.total, language)}</strong></div>
                      <div><span>{t.critical}</span><strong>{formatNumber(selectedDay.critical, language)}</strong></div>
                      <div><span>{t.warning}</span><strong>{formatNumber(selectedDay.warning, language)}</strong></div>
                      <div><span>{t.severityInfo}</span><strong>{formatNumber(selectedDay.info, language)}</strong></div>
                    </div>
                  )}
                </section>
              ) : (
                <p className="live-activity-note"><span><Activity size={15} aria-hidden="true" /></span><span><strong>{copy.noActivity}</strong><small>{copy.noActivityDetail}</small></span></p>
              )}

              <section className="analytics-bottom-grid">
                <article className="panel analytics-events-panel">
                  <div className="analytics-panel-heading">
                    <div><h2>{copy.latestEvents}</h2><p>{copy.eventFeedDetail}</p></div>
                    <button className="text-link analytics-open-link" type="button" onClick={() => onNavigate(`/guilds/${guild.id}/events`)}>{copy.viewEvents}<ArrowUpRight size={14} aria-hidden="true" /></button>
                  </div>
                  {severityFilter && <p className="analytics-filter-note">{copy.currentSelection}: {severityLabels[severityFilter]}</p>}
                  {filteredEvents.length ? <ol className="analytics-signal-list">{filteredEvents.map((event) => <RecentSignal key={event.id} event={event} language={language} copy={copy} t={t} />)}</ol> : <div className="analytics-events-empty"><Shield size={22} aria-hidden="true" /><p>{severityFilter ? copy.noSeverityMatches : copy.noEvents}</p></div>}
                </article>

                <aside className="analytics-insights-column">
                  <article className="analytics-insight-card analytics-peak-card">
                    <span className="analytics-insight-icon"><Activity size={17} aria-hidden="true" /></span>
                    <div><small>{copy.highestDay}</small><strong>{highestDay && highestDay.total > 0 ? formatDashboardChartDate(highestDay.date, language) : '—'}</strong><p>{highestDay ? `${formatNumber(highestDay.total, language)} ${copy.events}` : copy.noDailyEvents}</p></div>
                  </article>
                  <button className="analytics-insight-card analytics-tracking-link" type="button" onClick={() => onNavigate(`/guilds/${guild.id}/tracking`)}>
                    <span className="analytics-insight-icon"><Users size={17} aria-hidden="true" /></span>
                    <div><small>{copy.trackedMembers}</small><strong>{activeTracked === null ? '—' : formatNumber(activeTracked, language)}</strong><p>{copy.viewTracking}</p></div>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                  <p className="analytics-location-note"><MapPinOff size={16} aria-hidden="true" /><span>{copy.noLocation}</span></p>
                </aside>
              </section>

              <table className="sr-only">
                <caption>{copy.chartDescription}</caption>
                <thead><tr><th scope="col">{copy.date}</th><th scope="col">{copy.count}</th><th scope="col">{t.critical}</th><th scope="col">{t.warning}</th><th scope="col">{t.severityInfo}</th></tr></thead>
                <tbody>{days?.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.total}</td><td>{day.critical}</td><td>{day.warning}</td><td>{day.info}</td></tr>)}</tbody>
              </table>
            </>
          )}

          {overview && activityExpanded && (
            <dialog
              ref={activityDialogRef}
              className="analytics-activity-dialog"
              aria-labelledby="analytics-activity-dialog-title"
              onCancel={(event) => { event.preventDefault(); setActivityExpanded(false); }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setActivityExpanded(false);
                }
              }}
              onClick={(event) => { if (event.target === event.currentTarget) setActivityExpanded(false); }}
            >
              <div className="analytics-dialog-topline">
                <div className="analytics-dialog-heading">
                  <span className="analytics-dialog-mark"><Shield size={20} aria-hidden="true" /><Bot size={13} aria-hidden="true" /></span>
                  <div>
                    <span className="analytics-dialog-eyebrow">{copy.activityDialogEyebrow}</span>
                    <h2 id="analytics-activity-dialog-title">{guild.name}</h2>
                  </div>
                </div>
                <button type="button" className="analytics-dialog-close" aria-label={copy.closeActivity} onClick={() => setActivityExpanded(false)}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="analytics-dialog-grid">
                <section className={`analytics-dialog-visual-panel bot-${botStatus}`} aria-label={copy.distributionDescription}>
                  <div className="analytics-dialog-visual-heading">
                    <span><i />{botStatus === 'online' ? copy.dialogOnline : botStatus === 'offline' ? copy.dialogOffline : copy.botUnknown}</span>
                    <span>{copy.range}</span>
                  </div>
                  <ServerActivityDiagram
                    copy={copy}
                    t={t}
                    language={language}
                    totals={totals}
                    activeTracked={activeTracked}
                    botStatus={botStatus}
                    severityFilter={severityFilter}
                    onSelectSeverity={selectSeverity}
                    expanded
                  />
                  <div className="analytics-dialog-visual-caption"><Activity size={13} aria-hidden="true" /><span>{copy.activityDialogHint}</span></div>
                </section>
                <aside className="analytics-dialog-sidebar">
                  <section className="analytics-dialog-summary">
                    <div className="analytics-summary-total">
                      <span>{copy.activityDialogTotal}</span>
                      <strong>{totals ? formatNumber(totals.total, language) : '—'}</strong>
                      <i aria-hidden="true"><b /></i>
                    </div>
                    <div className="analytics-summary-tracked">
                      <span className="analytics-summary-icon"><Users size={16} aria-hidden="true" /></span>
                      <span>{copy.activityDialogTracked}<strong>{activeTracked === null ? '—' : formatNumber(activeTracked, language)}</strong></span>
                    </div>
                    <span className={`analytics-dialog-status ${botStatus}`}><i aria-hidden="true" />{botStatus === 'online' ? copy.online : botStatus === 'offline' ? copy.offline : copy.botUnknown}</span>
                  </section>
                  <section className="analytics-dialog-signals">
                    <div className="analytics-dialog-section-heading"><h3>{copy.dialogSignals}</h3><span>{copy.events}</span></div>
                    {severityData.map((entry) => (
                      <button
                        type="button"
                        key={entry.name}
                        className={`analytics-dialog-signal signal-${entry.name}${severityFilter === entry.name ? ' is-selected' : ''}`}
                        aria-pressed={severityFilter === entry.name}
                        onClick={() => selectSeverity(entry.name)}
                      >
                        <span className="analytics-signal-label"><i /><span>{severityLabels[entry.name]}</span><strong>{formatNumber(entry.value, language)}</strong></span>
                        <i className="analytics-signal-track"><b style={{ width: `${totals?.total ? (entry.value / totals.total) * 100 : 0}%` }} /></i>
                      </button>
                    ))}
                  </section>
                  <section className="analytics-dialog-recent">
                    <div className="analytics-dialog-section-heading"><h3>{copy.dialogRecent}</h3><span>{formatNumber(filteredEvents.length, language)}</span></div>
                    {filteredEvents.length ? (
                      <ol className="analytics-dialog-event-list">
                        {filteredEvents.slice(0, 3).map((event) => <RecentSignal key={event.id} event={event} language={language} copy={copy} t={t} />)}
                      </ol>
                    ) : (
                      <p className="analytics-dialog-no-events">{severityFilter ? copy.noSeverityMatches : copy.dialogNoRecent}</p>
                    )}
                  </section>
                </aside>
              </div>
              {days && (
                <section className="analytics-dialog-timeline" aria-label={copy.dialogTimeline}>
                  <div className="analytics-dialog-section-heading">
                    <h3>{copy.dialogTimeline}</h3>
                    <div className="analytics-timeline-legend">
                      <span className="signal-critical"><i />{t.critical}</span>
                      <span className="signal-warning"><i />{t.warning}</span>
                      <span className="signal-info"><i />{t.severityInfo}</span>
                    </div>
                  </div>
                  <div className="analytics-timeline-chart" role="img" aria-label={copy.chartDescription}>
                    {days.map((day, index) => {
                      const segmentHeight = (value) => `${day.total ? (value / day.total) * 100 : 0}%`;
                      return (
                        <div className="analytics-timeline-day" key={day.date} style={{ '--bar-delay': `${index * 55}ms` }} title={`${formatDashboardChartDate(day.date, language)}: ${formatNumber(day.total, language)} ${copy.events}`}>
                          <strong>{formatNumber(day.total, language)}</strong>
                          <div className="analytics-timeline-bar" style={{ '--bar-height': `${(day.total / timelineMax) * 100}%` }}>
                            <i className="signal-info" style={{ height: segmentHeight(day.info) }} />
                            <i className="signal-warning" style={{ height: segmentHeight(day.warning) }} />
                            <i className="signal-critical" style={{ height: segmentHeight(day.critical) }} />
                          </div>
                          <span>{formatDashboardChartDate(day.date, language)}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              <div className="analytics-dialog-footer">
                <span><i className="analytics-dialog-footer-dot" />{botStatus === 'online' ? copy.dialogOnline : botStatus === 'offline' ? copy.dialogOffline : copy.botUnknown}</span>
                {severityFilter && <button type="button" className="analytics-clear-filter" onClick={() => setSeverityFilter(null)}>{copy.allSignals}</button>}
              </div>
            </dialog>
          )}

          <footer className="page-footer analytics-page-footer"><span><Activity size={14} aria-hidden="true" />{copy.range}</span><span>ARGUS SECURITY · {new Date().getUTCFullYear()}</span></footer>
        </main>
      </div>
    </div>
  );
}
