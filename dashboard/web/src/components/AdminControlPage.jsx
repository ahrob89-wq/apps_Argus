import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowUpRight, Bot, ChevronDown, Layers, LogOut, Menu, RefreshCw, ScrollText, Server, Shield, SlidersHorizontal } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getAdminControl, saveAdminControl } from '../lib/api.js';
import { formatDashboardTimestamp } from '../lib/formatters.js';
import { getDashboardCopy } from '../dashboardCopy.js';

const features = [
  ['antiNuke', 'Anti-Nuke', 'مكافحة التخريب'], ['raidDefense', 'Raid defense', 'حماية الغارات'],
  ['tracking', 'Member tracking', 'تتبع الأعضاء'], ['linkScanning', 'Link scanning', 'فحص الروابط'],
  ['verification', 'Verification', 'التحقق'], ['backups', 'Backups', 'النسخ الاحتياطي'], ['alerts', 'Security alerts', 'التنبيهات الأمنية']
];

export default function AdminControlPage({ section = 'overview', t, language, user, onNavigate, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const ar = language === 'ar';
  const copy = getDashboardCopy(language);
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [serverPage, setServerPage] = useState(1);
  const [selected, setSelected] = useState('');
  const [expandedPlanGuildId, setExpandedPlanGuildId] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const handledExpiry = useRef(false);
  const labels = ar ? {
    subtitle: 'إدارة وضع التشغيل والخدمات والخطط لكل خوادم Argus.', global: 'تحكم عام', maintenance: 'وضع الصيانة',
    maintenanceHelp: 'يوقف ميزات البوت مع إبقاء البوت متصلًا وفحص الصحة ومسارات الاستعادة متاحة.', on: 'مفعل', off: 'متوقف',
    servers: 'الخوادم المسجلة', search: 'ابحث عن خادم بالاسم أو المعرف', plan: 'الخطة', enable: 'تفعيل Argus لهذا الخادم',
    overrides: 'الميزات لهذا الخادم', inherit: 'حسب الخطة', free: 'مجانية', paid: 'مدفوعة', audit: 'سجل التغييرات',
    noServers: 'لا توجد خوادم مطابقة.', loadError: 'تعذر تحميل إعدادات التحكم. تأكد من تطبيق ترحيل قاعدة البيانات ثم أعد المحاولة.',
    saved: 'تم حفظ التغيير.', confirmGlobal: 'تأكيد تغيير وضع الصيانة؟ قد تتوقف الحماية في جميع الخوادم.', all: 'كل الخوادم',
    refresh: 'تحديث', feature: 'الخدمة', value: 'الحالة', action: 'التغيير', emptyAudit: 'لا توجد تغييرات مسجلة بعد.',
    freeNote: 'الخطة الافتراضية الجديدة مجانية. الخطة المدفوعة تُعيّن يدويًا؛ لا توجد فوترة آلية.', planFeatures: 'ميزات الخطط الافتراضية', previous: 'السابق', next: 'التالي',
    sections: { overview: 'نظرة عامة', servers: 'الخوادم', plans: 'الخطط', services: 'الخدمات', audit: 'سجل التدقيق' },
    overviewSubtitle: 'حالة التشغيل وروابط مباشرة لإدارة أجزاء النظام.', currentState: 'حالة التشغيل', running: 'يعمل', maintenanceState: 'في وضع الصيانة',
    heartbeat: 'نبضة البوت', registered: 'إجمالي الخوادم المسجلة', servicesCount: 'الخدمات القابلة للتحكم', open: 'فتح الصفحة',
    deliveryApplied: 'أكد البوت تطبيق آخر إعدادات التحكم', deliveryPending: 'حُفظت الإعدادات لكن البوت لم يؤكد استلامها؛ سيواصل استخدام آخر إعدادات وصلته حتى يتصل.', deliveryUnconfigured: 'اتصال التحكم غير مضبوط. أضف رابط التحكم والرمز المشترك في إعدادات API والبوت.',
    heartbeatOffline: 'لا توجد نبضة حديثة من البوت؛ قد لا تصل التغييرات إلى عملية البوت الحالية.',
    planDescription: 'اربط كل خادم بالخطة المناسبة واضبط ميزات الخطط الافتراضية.', serverDescription: 'استعرض الخوادم المسجلة ومعرّفاتها وحالتها.', servicesDescription: 'خصص تشغيل Argus والخدمات لكل خادم بشكل مستقل.',
    auditDescription: 'آخر 30 تغييرًا مع هوية المسؤول ونطاق التغيير ووقته.', latestChanges: 'أحدث التغييرات', searchPage: 'بحث في جميع الخوادم بالاسم أو المعرف',
    planWarning: 'سيتم نقل هذه الميزة إلى الخطة المختارة وإيقافها في الخطة الأخرى، مما يؤثر على الخوادم التي ترث إعدادات الخطط.', confirmGuildDisable: 'سيتم إيقاف خدمات Argus في هذا الخادم. هل تريد المتابعة؟', confirmFeatureDisable: 'سيتم إيقاف هذه الخدمة لهذا الخادم. هل تريد المتابعة؟'
  } : {
    subtitle: 'Manage operating mode, services, and plans across every Argus server.', global: 'Global controls', maintenance: 'Maintenance mode',
    maintenanceHelp: 'Pauses bot features while keeping the bot connected, health checks, and recovery paths available.', on: 'Enabled', off: 'Disabled',
    servers: 'Registered servers', search: 'Search server name or ID', plan: 'Plan', enable: 'Enable Argus for this server',
    overrides: 'Features for this server', inherit: 'Use plan default', free: 'Free', paid: 'Paid', audit: 'Change history',
    noServers: 'No matching servers.', loadError: 'Could not load control settings. Apply the database migration, then retry.',
    saved: 'Change saved.', confirmGlobal: 'Confirm maintenance mode change? Protection may pause across all servers.', all: 'All servers',
    refresh: 'Refresh', feature: 'Service', value: 'State', action: 'Change', emptyAudit: 'No changes recorded yet.',
    freeNote: 'New servers default to Free. Paid plans are assigned manually; automated billing is not configured.', planFeatures: 'Plan feature defaults', previous: 'Previous', next: 'Next',
    sections: { overview: 'Overview', servers: 'Servers', plans: 'Plans', services: 'Services', audit: 'Audit log' },
    overviewSubtitle: 'Operating status and direct paths to each control area.', currentState: 'Operating state', running: 'Running', maintenanceState: 'Maintenance mode',
    heartbeat: 'Bot heartbeat', registered: 'Registered servers', servicesCount: 'Configurable services', open: 'Open page',
    deliveryApplied: 'The bot confirmed the latest control settings', deliveryPending: 'Settings are saved, but the bot has not confirmed receipt; it keeps using its previous settings until it reconnects.', deliveryUnconfigured: 'Control delivery is not configured. Set the matching control URL and shared token in the API and bot environments.',
    heartbeatOffline: 'No recent bot heartbeat; changes may not reach the running bot process.',
    planDescription: 'Choose exactly one plan, Free or Paid, for each server.', serverDescription: 'Browse registered servers, their IDs, and their status.', servicesDescription: 'Control Argus and customize services for each server.',
    auditDescription: 'The latest 30 changes with the administrator, scope, and timestamp.', latestChanges: 'Latest changes', searchPage: 'Search all servers by name or ID',
    planWarning: 'This moves the feature to the selected plan and turns it off in the other plan, affecting servers that inherit those defaults.', confirmGuildDisable: 'Argus services will be paused in this server. Continue?', confirmFeatureDisable: 'This service will be paused for this server. Continue?'
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { setServerPage(1); setSearch(query.trim()); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const load = useCallback((signal) => getAdminControl(signal, serverPage, search), [search, serverPage]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then((value) => {
      setData(value); setState('ready');
      setSelected((current) => value.guilds?.some((guild) => guild.guildId === current) ? current : value.guilds?.[0]?.guildId || '');
    }).catch((e) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(e.message) && !handledExpiry.current) { handledExpiry.current = true; onSessionExpired(); return; }
      setError(labels.loadError); setState('error');
    });
    return () => controller.abort();
  }, [load, onSessionExpired, reload, serverPage]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setReload((value) => value + 1); };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const selectedGuild = data?.guilds?.find((guild) => guild.guildId === selected);
  const visibleGuilds = useMemo(() => data?.guilds || [], [data]);

  async function save(change) {
    setBusy(true); setError('');
    try {
      await saveAdminControl(change);
      const fresh = await load(); setData(fresh); setState('ready');
    } catch (e) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(e.message)) onSessionExpired();
      else setError(e.message === 'CONTROL_AUDIT_FAILED' ? (ar ? 'تم الحفظ لكن تعذر تأكيد سجل التدقيق. حدّث الصفحة قبل أي تغيير آخر.' : 'Saved, but audit confirmation failed. Refresh before making another change.') : (ar ? 'تعذر حفظ التغيير.' : 'The change could not be saved.'));
    } finally { setBusy(false); }
  }

  function toggleMaintenance() {
    if (!window.confirm(labels.confirmGlobal)) return;
    void save({ scope: 'global', targetId: 'global', changes: { maintenanceMode: !data.global?.maintenance_mode } });
  }

  function effective(feature) {
    const override = selectedGuild?.control?.feature_overrides?.[feature];
    if (typeof override === 'boolean') return override;
    const selectedPlan = selectedGuild?.control?.feature_plans?.[feature] || selectedGuild?.control?.plan || 'free';
    return data?.plans?.find((plan) => plan.plan === selectedPlan)?.features?.[feature] !== false;
  }

  const sectionTitle = section === 'planFeatures' ? copy.sitePlanFeatures : labels.sections[section] || labels.sections.overview;
  const sectionPaths = { overview: '/admin/control', servers: '/admin/control/servers', plans: '/admin/control/plans', planFeatures: '/admin/control/plan-features', services: '/admin/control/services', audit: '/admin/control/audit' };
  const selectedAdminPage = ({ overview: 'siteControl', servers: 'siteServers', plans: 'sitePlans', planFeatures: 'sitePlanFeatures', services: 'siteServices', audit: 'siteAudit' })[section] || 'siteControl';

  const planMatrix = section === 'planFeatures' && <div className="admin-plan-grid">{['free', 'paid'].map((planKey) => {
    const plan = data?.plans?.find((entry) => entry.plan === planKey);
    return <section className="admin-plan-card" key={planKey}><header><div><span>{planKey === 'free' ? labels.free : labels.paid}</span><p>{planKey === 'free' ? labels.freeNote : (ar ? 'حدد الخدمات المتاحة ضمن الخطة المدفوعة.' : 'Select the services included in the Paid plan.')}</p></div><Layers size={18} aria-hidden="true" /></header>
      {features.map(([key, en, arLabel]) => <label className="admin-control-row" key={key}><span>{ar ? arLabel : en}</span><input type="checkbox" checked={plan?.features?.[key] !== false} disabled={busy} onChange={(e) => {
        if (!window.confirm(labels.planWarning)) { e.target.checked = plan?.features?.[key] !== false; return; }
        void save({ scope: 'plan', targetId: planKey, changes: { exclusiveFeature: key, enabled: e.target.checked } });
      }} /></label>)}
    </section>;
  })}</div>;

  const serverRows = <div className="admin-server-list" aria-label={labels.servers}>{visibleGuilds.map((guild) => { const enabled = guild.control?.enabled !== false; return <button key={guild.guildId} type="button" className={`admin-server-item${selected === guild.guildId ? ' selected' : ''}`} aria-pressed={selected === guild.guildId} onClick={() => setSelected(guild.guildId)}><span className="admin-server-icon"><Server size={17} /></span><span className="admin-server-copy"><strong>{guild.name}</strong><small>{guild.guildId}</small></span><span className="admin-server-meta"><small>{guild.control?.plan === 'paid' ? labels.paid : labels.free}</small><span className={`admin-server-state${enabled ? ' online' : ''}`}>{enabled ? labels.on : labels.off}</span></span></button>; })}</div>;

  const serverPlanRows = <div className="admin-server-plan-list">{visibleGuilds.map((guild) => {
    const expanded = expandedPlanGuildId === guild.guildId;
    const planKey = guild.control?.plan || 'free';
    const planFeatures = data?.plans?.find((plan) => plan.plan === planKey)?.features;
    return <article className={`admin-server-plan-row${expanded ? ' expanded' : ''}`} key={guild.guildId}>
      <span className="admin-server-copy"><strong>{guild.name}</strong><small>{guild.guildId}</small></span>
      <fieldset className="admin-plan-choice" disabled={busy}><legend className="sr-only">{`${labels.plan}: ${guild.name}`}</legend>{[['free', labels.free], ['paid', labels.paid]].map(([choice, title]) => <label key={choice} className={planKey === choice ? 'selected' : ''}><input type="radio" name={`server-plan-${guild.guildId}`} value={choice} checked={planKey === choice} onChange={() => void save({ scope: 'guild', targetId: guild.guildId, changes: { plan: choice } })} /><span>{title}</span></label>)}</fieldset>
      <button className="admin-plan-expand" type="button" aria-label={`${expanded ? (ar ? 'إغلاق ميزات' : 'Close features for') : (ar ? 'إدارة ميزات' : 'Manage features for')} ${guild.name}`} aria-expanded={expanded} aria-controls={`plan-features-${guild.guildId}`} onClick={() => setExpandedPlanGuildId((current) => current === guild.guildId ? '' : guild.guildId)}><ChevronDown size={17} aria-hidden="true" /></button>
      {expanded && <section className="admin-plan-guild-features" id={`plan-features-${guild.guildId}`}><header><strong>{ar ? 'ميزات هذا الخادم' : 'Features for this server'}</strong><small>{ar ? `الخطة الأساسية: ${planKey === 'paid' ? labels.paid : labels.free}. اختر لكل ميزة الخطة التي تُحتسب عليها.` : `Base plan: ${planKey === 'paid' ? labels.paid : labels.free}. Choose which plan each feature belongs to.`}</small></header>{features.map(([key, en, arLabel]) => {
        const selectedPlan = guild.control?.feature_plans?.[key] || planKey;
        const inherited = !guild.control?.feature_plans?.[key];
        const serviceOverride = guild.control?.feature_overrides?.[key];
        const featureEnabled = typeof serviceOverride === 'boolean' ? serviceOverride : (selectedPlan === 'paid' ? data?.plans?.find((plan) => plan.plan === 'paid')?.features : planFeatures)?.[key] !== false;
        return <div className="admin-plan-feature-row" key={key}><span><strong>{ar ? arLabel : en}</strong><small>{`${selectedPlan === 'paid' ? labels.paid : labels.free}${inherited ? (ar ? ' · حسب الخطة الأساسية' : ' · base plan') : ''} · ${featureEnabled ? labels.on : labels.off}`}</small></span><fieldset className="admin-feature-tier" disabled={busy || guild.control?.enabled === false}><legend className="sr-only">{`${ar ? arLabel : en}: ${labels.paid} / ${labels.free}`}</legend>{[['paid', labels.paid], ['free', labels.free]].map(([tier, title]) => <label className={selectedPlan === tier ? 'selected' : ''} key={tier}><input type="radio" name={`guild-feature-tier-${guild.guildId}-${key}`} value={tier} checked={selectedPlan === tier} onChange={() => void save({ scope: 'guild', targetId: guild.guildId, changes: { featurePlan: { key, plan: tier } } })} /><span>{title}</span></label>)}</fieldset></div>;
      })}</section>}
    </article>;
  })}</div>;

  const guildEditor = selectedGuild ? <section className="admin-guild-editor panel">
    <header className="admin-guild-title"><div><span className="eyebrow">{ar ? 'إعدادات الخادم' : 'SERVER SETTINGS'}</span><h2>{selectedGuild.name}</h2><code>{selectedGuild.guildId}</code></div><span className={`health-status-pill ${selectedGuild.control?.enabled === false ? 'neutral' : 'green'}`}>{selectedGuild.control?.enabled === false ? labels.off : labels.on}</span></header>
    <label className="admin-control-row"><span>{labels.enable}<small>{ar ? 'يوقف جميع خدمات Argus لهذا الخادم' : 'Pauses every Argus service for this server'}</small></span><input type="checkbox" checked={selectedGuild.control?.enabled !== false} disabled={busy} onChange={(e) => { if (!e.target.checked && !window.confirm(labels.confirmGuildDisable)) { e.target.checked = selectedGuild.control?.enabled !== false; return; } void save({ scope: 'guild', targetId: selectedGuild.guildId, changes: { enabled: e.target.checked } }); }} /></label>
    <div className="admin-feature-list"><div className="admin-list-heading"><div><h3>{labels.overrides}</h3><p>{ar ? 'اختر تخصيصًا لهذا السيرفر أو ارجع إلى الخطة.' : 'Choose a server override or return to the plan default.'}</p></div></div>{features.map(([key, en, arLabel]) => {
      const override = selectedGuild.control?.feature_overrides?.[key];
      return <label className="admin-control-row" key={key}><span>{ar ? arLabel : en}<small>{typeof override === 'boolean' ? (ar ? 'تخصيص خاص' : 'Server override') : labels.inherit}</small></span><select aria-label={ar ? arLabel : en} value={typeof override === 'boolean' ? String(override) : 'inherit'} disabled={busy || selectedGuild.control?.enabled === false} onChange={(e) => { const previous = typeof override === 'boolean' ? String(override) : 'inherit'; if (e.target.value === 'false' && !window.confirm(labels.confirmFeatureDisable)) { e.target.value = previous; return; } void save({ scope: 'guild', targetId: selectedGuild.guildId, changes: { feature: { key, value: e.target.value === 'inherit' ? null : e.target.value === 'true' } } }); }}><option value="inherit">{labels.inherit} ({effective(key) ? labels.on : labels.off})</option><option value="true">{labels.on}</option><option value="false">{labels.off}</option></select></label>;
    })}</div>
  </section> : <p className="live-empty-state">{labels.noServers}</p>;

  const auditList = data?.audit?.length ? <div className="admin-audit-list" role="table" aria-label={labels.audit}>{data.audit.map((entry) => <article className="admin-audit-row" role="row" key={entry.id}><span className="admin-audit-scope">{entry.scope}</span><strong>{entry.target_id}</strong><span>{entry.action} · {entry.actor_id}</span><time>{formatDashboardTimestamp(entry.created_at, language, t.timestampInvalid)}</time></article>)}</div> : <p className="live-empty-state">{labels.emptyAudit}</p>;

  return <div className={`dashboard-shell${ar ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
    <AppSidebar t={t} user={user} selectedPage={selectedAdminPage} adminMode siteAdmin mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSignOut={onSignOut} authBusy={authBusy} />
    {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => setMobileMenuOpen(false)} />}
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu icon-button" type="button" aria-label={t.menu} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
        <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{copy.siteAdministration}</span><span className="breadcrumb-separator">/</span><strong>{copy.siteControl}</strong><span className="breadcrumb-separator">/</span><strong>{sectionTitle}</strong></nav>
        <div className="topbar-actions live-topbar-actions"><span className="live-user-name">{user?.globalName || user?.username}</span><div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={!ar} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={ar} onClick={() => onLanguageToggle('ar')}>عربي</button></div><ThemeToggle language={language} /><button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={t.signOut}><LogOut size={15} /></button></div>
      </header>
      <main className="page-content live-read-page">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />ARGUS ADMINISTRATION</div><h1>{sectionTitle}</h1><p>{section === 'overview' ? labels.overviewSubtitle : section === 'services' ? labels.servicesDescription : section === 'servers' ? labels.serverDescription : section === 'plans' ? labels.planDescription : section === 'planFeatures' ? (ar ? 'اختر لكل ميزة خطة واحدة فقط: مجانية أو مدفوعة.' : 'Assign each feature to Free or Paid; never both.') : labels.auditDescription}</p></div><div className="heading-actions"><button className="tracking-reset-button" type="button" onClick={() => setReload((v) => v + 1)} disabled={busy}><RefreshCw size={15} /> {labels.refresh}</button></div></div>
        {state === 'loading' && <p className="live-loading-state" role="status">{t.loadingPage(sectionTitle)}</p>}
        {error && <div className="live-error-state" role="alert"><p>{error}</p><button className="tracking-reset-button" type="button" onClick={() => setReload((v) => v + 1)}>{t.retry}</button></div>}
        {data && <>
          <p className={`admin-control-delivery ${data.botControlDelivery?.status === 'applied' ? 'applied' : 'pending'}`} role="status"><span className={`status-indicator ${data.botControlDelivery?.status === 'applied' ? 'online' : 'muted'}`} />{!data.botControlConfigured || data.botControlDelivery?.status === 'unconfigured' ? labels.deliveryUnconfigured : data.botControlDelivery?.status === 'applied' ? `${labels.deliveryApplied}${data.botControlDelivery.acknowledgedAt ? ` · ${formatDashboardTimestamp(data.botControlDelivery.acknowledgedAt, language, t.timestampInvalid)}` : ''}` : labels.deliveryPending}</p>
          {data.botHeartbeat?.status === 'offline' && <p className="live-stale-state" role="status">{labels.heartbeatOffline}</p>}
          {section === 'overview' && <>
            <section className="read-info-card panel admin-global-card"><div className="read-section-heading"><div><h2>{labels.global}</h2><p>{labels.maintenanceHelp}</p></div><Activity size={17} /></div>
              <div className="health-status-list"><article className="health-status-card"><span className="health-status-icon"><Shield size={17} /></span><div><h2>{labels.maintenance}</h2><p>{data.global?.updated_at ? formatDashboardTimestamp(data.global.updated_at, language, t.timestampInvalid) : labels.off}</p></div><button className="tracking-reset-button" type="button" onClick={toggleMaintenance} disabled={busy} aria-pressed={data.global?.maintenance_mode === true}>{data.global?.maintenance_mode ? labels.maintenanceState : labels.running}</button></article></div>
            </section>
            <section className="admin-overview-grid" aria-label={labels.currentState}>
              <article className="admin-overview-card panel"><span className="admin-overview-icon"><Bot size={19} /></span><div><small>{labels.heartbeat}</small><strong>{data.botHeartbeat?.status === 'online' ? labels.running : data.botHeartbeat?.status === 'offline' ? labels.off : (ar ? 'غير معروف' : 'Unknown')}</strong><p>{data.botHeartbeat?.lastHeartbeatAt ? formatDashboardTimestamp(data.botHeartbeat.lastHeartbeatAt, language, t.timestampInvalid) : (ar ? 'لا توجد نبضة حديثة' : 'No recent heartbeat')}</p></div></article>
              <article className="admin-overview-card panel"><span className="admin-overview-icon"><Server size={19} /></span><div><small>{labels.registered}</small><strong>{data.serverPage?.total ?? 0}</strong><p>{ar ? 'معرّفات محفوظة في Argus' : 'Guild IDs registered with Argus'}</p></div></article>
              <article className="admin-overview-card panel"><span className="admin-overview-icon"><SlidersHorizontal size={19} /></span><div><small>{labels.servicesCount}</small><strong>{features.length}</strong><p>{ar ? 'قابلة للتحكم بالخطة أو لكل خادم' : 'Managed by plan or server override'}</p></div></article>
            </section>
            <section className="admin-destination-grid">{[
              ['servers', Server, labels.sections.servers, labels.serverDescription], ['plans', Layers, labels.sections.plans, labels.planDescription], ['planFeatures', Layers, copy.sitePlanFeatures, ar ? 'اربط كل ميزة بخطة واحدة فقط.' : 'Assign each feature to one plan only.'], ['services', Bot, labels.sections.services, labels.servicesDescription], ['audit', ScrollText, labels.latestChanges, labels.auditDescription]
            ].map(([key, Icon, title, description]) => <a className="admin-destination-card panel" key={key} href={sectionPaths[key]} onClick={(event) => { event.preventDefault(); onNavigate(sectionPaths[key]); }}><span className="admin-overview-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>)}</section>
            <section className="read-info-card panel"><div className="read-section-heading"><div><h2>{labels.latestChanges}</h2><p>{data.audit?.length || 0} · {labels.auditDescription}</p></div><ScrollText size={17} /></div>{data.audit?.length ? <div className="admin-audit-list">{data.audit.slice(0, 5).map((entry) => <article className="admin-audit-row compact" key={entry.id}><span className="admin-audit-scope">{entry.scope}</span><strong>{entry.target_id}</strong><span>{entry.action} · {entry.actor_id}</span><time>{formatDashboardTimestamp(entry.created_at, language, t.timestampInvalid)}</time></article>)}</div> : <p className="live-empty-state">{labels.emptyAudit}</p>}</section>
          </>}
          {section === 'servers' && <section className="admin-servers-page"><div className="admin-server-toolbar"><label className="admin-search-field"><span className="sr-only">{labels.searchPage}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.searchPage} aria-label={labels.searchPage} /></label><span className="admin-server-total">{data.serverPage?.total ?? 0} {labels.servers}</span></div>
            <div className="admin-server-layout"><div className="admin-server-picker">{serverRows}{!visibleGuilds.length && <p className="live-empty-state">{labels.noServers}</p>}{data.serverPage?.total > data.serverPage?.pageSize && <div className="admin-pagination"><button className="tracking-reset-button" type="button" disabled={busy || serverPage <= 1} onClick={() => { setSelected(''); setServerPage((page) => Math.max(1, page - 1)); }}>{labels.previous}</button><span>{serverPage} / {Math.ceil(data.serverPage.total / data.serverPage.pageSize)}</span><button className="tracking-reset-button" type="button" disabled={busy || serverPage >= Math.ceil(data.serverPage.total / data.serverPage.pageSize)} onClick={() => { setSelected(''); setServerPage((page) => page + 1); }}>{labels.next}</button></div>}</div>
              {selectedGuild ? <section className="admin-server-summary panel"><span className="eyebrow">{ar ? 'معلومات الخادم' : 'SERVER DETAILS'}</span><h2>{selectedGuild.name}</h2><code>{selectedGuild.guildId}</code><div className="admin-server-summary-grid"><span>{ar ? 'حالة التسجيل' : 'Registration'}<strong>{selectedGuild.active ? labels.on : labels.off}</strong></span><span>{labels.plan}<strong>{selectedGuild.control?.plan === 'paid' ? labels.paid : labels.free}</strong></span><span>{ar ? 'خدمات Argus' : 'Argus services'}<strong>{selectedGuild.control?.enabled === false ? labels.off : labels.on}</strong></span></div><div className="admin-server-summary-actions"><a className="tracking-reset-button" href={sectionPaths.plans} onClick={(event) => { event.preventDefault(); onNavigate(sectionPaths.plans); }}>{ar ? 'إدارة الخطة' : 'Manage plan'}</a><a className="tracking-reset-button" href={sectionPaths.services} onClick={(event) => { event.preventDefault(); onNavigate(sectionPaths.services); }}>{ar ? 'إدارة الخدمات' : 'Manage services'}</a></div></section> : <p className="live-empty-state">{labels.noServers}</p>}</div>
          </section>}
          {section === 'plans' && <section className="admin-plans-page"><p className="admin-note">{ar ? 'اختر خطة لكل خادم، ثم افتح السهم لتخصيص ميزاته وحده.' : 'Choose a plan for each server, then expand its row to customize individual features.'}</p><section className="read-info-card panel"><div className="read-section-heading"><div><h2>{ar ? 'ربط الخوادم بالخطط' : 'Assign server plans'}</h2><p>{ar ? 'اختر الخطة المجانية أو المدفوعة لكل خادم.' : 'Choose a Free or Paid plan for each server.'}</p></div><Layers size={17} /></div><div className="admin-server-toolbar"><label className="admin-search-field"><span className="sr-only">{labels.searchPage}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.searchPage} aria-label={labels.searchPage} /></label><span className="admin-server-total">{data.serverPage?.total ?? 0} {labels.servers}</span></div>{serverPlanRows}{!visibleGuilds.length && <p className="live-empty-state">{labels.noServers}</p>}{data.serverPage?.total > data.serverPage?.pageSize && <div className="admin-pagination"><button className="tracking-reset-button" type="button" disabled={busy || serverPage <= 1} onClick={() => setServerPage((page) => Math.max(1, page - 1))}>{labels.previous}</button><span>{serverPage} / {Math.ceil(data.serverPage.total / data.serverPage.pageSize)}</span><button className="tracking-reset-button" type="button" disabled={busy || serverPage >= Math.ceil(data.serverPage.total / data.serverPage.pageSize)} onClick={() => setServerPage((page) => page + 1)}>{labels.next}</button></div>}</section><h2 className="admin-page-subheading">{labels.planFeatures}</h2>{planMatrix}</section>}
          {section === 'services' && <section className="admin-servers-page"><div className="admin-server-toolbar"><label className="admin-search-field"><span className="sr-only">{labels.searchPage}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.searchPage} aria-label={labels.searchPage} /></label><span className="admin-server-total">{data.serverPage?.total ?? 0} {labels.servers}</span></div><div className="admin-server-layout"><div className="admin-server-picker">{serverRows}{!visibleGuilds.length && <p className="live-empty-state">{labels.noServers}</p>}{data.serverPage?.total > data.serverPage?.pageSize && <div className="admin-pagination"><button className="tracking-reset-button" type="button" disabled={busy || serverPage <= 1} onClick={() => setServerPage((page) => Math.max(1, page - 1))}>{labels.previous}</button><span>{serverPage} / {Math.ceil(data.serverPage.total / data.serverPage.pageSize)}</span><button className="tracking-reset-button" type="button" disabled={busy || serverPage >= Math.ceil(data.serverPage.total / data.serverPage.pageSize)} onClick={() => setServerPage((page) => page + 1)}>{labels.next}</button></div>}</div>{guildEditor}</div></section>}
          {section === 'audit' && <section className="read-info-card panel"><div className="read-section-heading"><div><h2>{labels.audit}</h2><p>{data.audit?.length || 0} / 30 · {labels.auditDescription}</p></div><ScrollText size={17} /></div>{auditList}</section>}
          {section === 'planFeatures' && <section className="admin-plans-page"><p className="admin-note">{ar ? 'كل ميزة تتبع خطة واحدة فقط. تفعيلها في خطة يطفئها تلقائيًا في الخطة الأخرى؛ وإطفاؤها يزيلها من الخطتين.' : 'Each feature belongs to one plan only. Enabling it in one plan turns it off in the other; disabling it removes it from both.'}</p>{planMatrix}</section>}
        </>}
        <footer className="page-footer"><span><Shield size={14} />{copy.adminHealthNote}</span><span>ARGUS SECURITY · {new Date().getUTCFullYear()}</span></footer>
      </main>
    </div>
  </div>;
}
