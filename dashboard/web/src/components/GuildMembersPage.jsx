import { useEffect, useRef, useState } from 'react';
import { Bot, CalendarDays, ChevronLeft, ChevronRight, Clock3, Copy, Filter, LogOut, Menu, RefreshCw, Search, ShieldAlert, UserRound, UsersRound, X } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { ContentSkeleton } from './LoadingSkeleton.jsx';
import { getGuildMembers, postGuildAction } from '../lib/api.js';

const PAGE_LIMITS = [25, 50, 100];

const pageCopy = {
  en: {
    subtitle: 'Browse server members, review their roles, and take moderation actions.',
    all: 'Everyone', humans: 'People', bots: 'Bots', search: 'Search by name, username, or ID',
    role: 'Filter by role', anyRole: 'Every role', limit: 'Members per page',
    refresh: 'Refresh', loading: 'Loading Discord members…', retry: 'Retry',
    unavailable: 'Discord could not load the member list. Check the connection and try again.',
    denied: 'Manage Server permission is required to view server members.',
    noMembers: 'No members found', noMatches: 'No members match these filters.',
    noMembersDescription: 'This server does not have any members in this category.',
    showing: (count, total) => `Showing ${count} on this page · ${total} total members`,
    page: (number) => `Page ${number}`, previous: 'Previous', next: 'Next',
    bot: 'Bot', member: 'Member', owner: 'Owner', id: 'User ID',
    joined: 'Joined', joinedUnknown: 'Join date unavailable', noRoles: 'No assigned roles',
    roleIds: 'Role IDs', copyId: 'Copy ID', copied: 'Copied to clipboard.',
    copyFailed: 'Could not copy the ID. Check clipboard access.',
    activeTimeout: 'Timeout active', searchLimit: 'Discord search returns up to 100 matching members.',
    kick: 'Kick', timeout: 'Timeout', release: 'Release timeout',
    actionReason: 'Reason (required)', timeoutDuration: 'Timeout duration',
    submitKick: 'Confirm kick', submitTimeout: 'Apply timeout',
    submitRelease: 'Release timeout', cancel: 'Cancel',
    reasonRequired: 'Enter a reason of at least 3 characters.',
    confirmKick: (name) => `Kick ${name} from this server? This cannot be undone.`,
    confirmTimeout: (name) => `Apply a Discord timeout to ${name}?`,
    confirmRelease: (name) => `Remove the active timeout for ${name}?`,
    actionBusy: 'Sending action to Discord…', actionDone: 'The moderation action completed.',
    actionFailed: (code) => `Action failed (${code}). Refresh the member list before retrying.`,
    durationHours: 'hours', breadcrumb: 'Members', listLabel: 'Server members',
    auditNote: 'Every moderation action requires a reason, is checked against Discord permissions and role hierarchy, and is recorded in the security audit log.',
    actionPartial: 'Discord applied the action, but audit logging did not finish. Verify the member before taking any action again.'
  },
  ar: {
    subtitle: 'استعرض أعضاء السيرفر ورتبهم ونفّذ إجراءات الإشراف المسموح بها.',
    all: 'الكل', humans: 'الأشخاص', bots: 'البوتات', search: 'ابحث بالاسم أو اسم المستخدم أو المعرّف',
    role: 'تصفية حسب الرتبة', anyRole: 'كل الرتب', limit: 'عدد الأعضاء في الصفحة',
    refresh: 'تحديث', loading: 'جارٍ تحميل أعضاء Discord…', retry: 'إعادة المحاولة',
    unavailable: 'تعذر تحميل قائمة الأعضاء من Discord. تحقق من الاتصال ثم أعد المحاولة.',
    denied: 'تحتاج إلى صلاحية إدارة السيرفر لعرض الأعضاء.',
    noMembers: 'لم يتم العثور على أعضاء', noMatches: 'لا يوجد أعضاء يطابقون عوامل التصفية.',
    noMembersDescription: 'لا يوجد أعضاء في هذه الفئة داخل السيرفر.',
    showing: (count, total) => `المعروض في هذه الصفحة ${count} · إجمالي أعضاء السيرفر ${total}`,
    page: (number) => `الصفحة ${number}`, previous: 'السابقة', next: 'التالية',
    bot: 'بوت', member: 'عضو', owner: 'المالك', id: 'معرّف العضو',
    joined: 'تاريخ الانضمام', joinedUnknown: 'تاريخ الانضمام غير متاح', noRoles: 'لا توجد رتب مضافة',
    roleIds: 'معرّفات الرتب', copyId: 'نسخ المعرّف', copied: 'تم نسخ المعرّف.',
    copyFailed: 'تعذر نسخ المعرّف. تحقق من صلاحية الحافظة.',
    activeTimeout: 'عليه عزل مؤقت', searchLimit: 'بحث Discord يعرض حتى 100 نتيجة مطابقة.',
    kick: 'طرد', timeout: 'عزل مؤقت', release: 'إلغاء العزل',
    actionReason: 'السبب (مطلوب)', timeoutDuration: 'مدة العزل',
    submitKick: 'تأكيد الطرد', submitTimeout: 'تطبيق العزل',
    submitRelease: 'إلغاء العزل', cancel: 'إلغاء',
    reasonRequired: 'اكتب سببًا لا يقل عن 3 أحرف.',
    confirmKick: (name) => `هل تريد طرد ${name} من السيرفر؟ لا يمكن التراجع عن ذلك.`,
    confirmTimeout: (name) => `هل تريد تطبيق العزل المؤقت في Discord على ${name}؟`,
    confirmRelease: (name) => `هل تريد إلغاء العزل المؤقت النشط عن ${name}؟`,
    actionBusy: 'جارٍ إرسال الإجراء إلى Discord…', actionDone: 'اكتمل إجراء الإشراف.',
    actionFailed: (code) => `فشل الإجراء (${code}). حدّث قائمة الأعضاء قبل إعادة المحاولة.`,
    durationHours: 'ساعة', breadcrumb: 'الأعضاء', listLabel: 'أعضاء السيرفر',
    auditNote: 'كل إجراء إشرافي يتطلب سببًا، ويتحقق من صلاحيات Discord وتسلسل الرتب، ويُسجل في سجل الأمان.',
    actionPartial: 'نفّذ Discord الإجراء، لكن تعذر إكمال تسجيل التدقيق. تحقق من حالة العضو قبل أي إجراء آخر.'
  }
};

function displayDate(value, language, fallback) {
  if (!value || Number.isNaN(Date.parse(value))) return fallback;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function MemberCard({ member, actorId, capabilities, copy, language, selectedAction, onSelectAction, onCopy, copiedId, busy, actionError, actionState, reason, setReason, durationHours, setDurationHours, onSubmitAction, onCancelAction }) {
  const timedOut = member.timedOutUntil && Date.parse(member.timedOutUntil) > Date.now();
  const selected = selectedAction?.memberId === member.id ? selectedAction.action : null;
  const actionTitle = selected === 'kick' ? copy.kick : selected === 'timeout' ? copy.timeout : copy.release;
  const confirmationText = selected === 'kick' ? copy.confirmKick(member.displayName)
    : selected === 'timeout' ? copy.confirmTimeout(member.displayName)
      : copy.confirmRelease(member.displayName);

  return (
    <article className={`members-card${member.bot ? ' is-bot' : ''}`}>
      <div className="members-card-main">
        <div className="members-avatar">
          {member.avatarUrl ? <img src={member.avatarUrl} alt="" loading="lazy" /> : <span>{member.displayName?.slice(0, 1) || '?'}</span>}
          {member.bot && <span className="members-bot-avatar-mark" aria-label={copy.bot}><Bot size={12} /></span>}
        </div>
        <div className="members-identity">
          <div className="members-name-line">
            <strong>{member.displayName}</strong>
            {member.bot && <span className="members-type-badge bot"><Bot size={12} />{copy.bot}</span>}
            {member.owner && <span className="members-type-badge owner">{copy.owner}</span>}
            {timedOut && <span className="members-type-badge timeout"><Clock3 size={12} />{copy.activeTimeout}</span>}
          </div>
          <span className="members-username">@{member.username}</span>
          <button className="members-id-copy" type="button" onClick={() => onCopy(member.id)} title={`${copy.copyId}: ${member.id}`}>
            <code dir="ltr">{member.id}</code><Copy size={12} aria-hidden="true" /><span className="sr-only">{copy.copyId}</span>
          </button>
        </div>
        <div className="members-joined">
          <span><CalendarDays size={13} aria-hidden="true" />{copy.joined}</span>
          <time dateTime={member.joinedAt || undefined}>{displayDate(member.joinedAt, language, copy.joinedUnknown)}</time>
        </div>
        {!member.owner && member.id !== actorId && ((capabilities.moderate && (timedOut || !member.bot)) || capabilities.kick) && (
          <div className="members-actions">
            {capabilities.moderate && (timedOut || !member.bot) && <button type="button" className="members-action-button timeout" onClick={() => onSelectAction(member, timedOut ? 'release' : 'timeout')} disabled={busy}>
              {timedOut ? <X size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}
              {timedOut ? copy.release : copy.timeout}
            </button>}
            {capabilities.kick && <button type="button" className="members-action-button kick" onClick={() => onSelectAction(member, 'kick')} disabled={busy}>
              <UserRound size={14} aria-hidden="true" />{copy.kick}
            </button>}
          </div>
        )}
      </div>

      <div className="members-roles">
        <span className="members-roles-label"><ShieldAlert size={13} aria-hidden="true" />{copy.role}</span>
        {member.roles.length ? (
          <div className="members-role-list">
            {member.roles.slice(0, 5).map((role) => (
              <span key={role.id} className="members-role-chip" style={role.color ? { '--role-color': `#${role.color.toString(16).padStart(6, '0')}` } : undefined} title={role.id}>
                {role.name}
              </span>
            ))}
            {member.roles.length > 5 && <span className="members-role-more">+{member.roles.length - 5}</span>}
          </div>
        ) : <span className="members-no-roles">{copy.noRoles}</span>}
        {member.roles.length > 0 && (
          <details className="members-role-ids">
            <summary>{copy.roleIds}</summary>
            <div className="members-role-id-list">
              {member.roles.map((role) => <div key={role.id}><span>{role.name}</span><code dir="ltr">{role.id}</code><button type="button" aria-label={`${copy.copyId}: ${role.name}`} onClick={() => onCopy(role.id)}><Copy size={12} /></button></div>)}
            </div>
          </details>
        )}
      </div>

      {(copiedId === member.id || member.roles.some((role) => role.id === copiedId)) && <p className="members-copy-feedback" role="status">{copy.copied}</p>}

      {selected && (
        <form className="members-action-form" onSubmit={(event) => { event.preventDefault(); onSubmitAction(member, selected); }}>
          <div className="members-action-form-heading">
            <div><strong>{actionTitle} · {member.displayName}</strong><p>{copy.auditNote}</p></div>
            <button type="button" className="members-close-action" aria-label={copy.cancel} onClick={onCancelAction}><X size={16} /></button>
          </div>
          {selected === 'timeout' && <label><span>{copy.timeoutDuration}</span><select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}><option value={1}>1 {copy.durationHours}</option><option value={24}>24 {copy.durationHours}</option><option value={168}>7 × 24 {copy.durationHours}</option><option value={672}>28 × 24 {copy.durationHours}</option></select></label>}
          <label><span>{copy.actionReason}</span><textarea required minLength={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} /></label>
          {actionError && <p className="members-action-error" role="alert">{actionError.partial ? copy.actionPartial : copy.actionFailed(actionError.code)}</p>}
          {actionState?.memberId === member.id && actionState.status === 'pending' && <p className="members-action-progress" role="status">{copy.actionBusy}</p>}
          <div className="members-action-form-buttons">
            <button type="button" className="tracking-reset-button" onClick={onCancelAction} disabled={busy}>{copy.cancel}</button>
            <button type="submit" className={`members-action-button ${selected === 'kick' ? 'kick' : 'timeout'}`} disabled={busy || reason.trim().length < 3}>
              {busy ? copy.actionBusy : selected === 'kick' ? copy.submitKick : selected === 'timeout' ? copy.submitTimeout : copy.submitRelease}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export default function GuildMembersPage({ t, language, guild, user, siteAdmin, onNavigate, onSwitchServer, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const copy = pageCopy[language === 'ar' ? 'ar' : 'en'];
  const [type, setType] = useState('all');
  const [roleId, setRoleId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(25);
  const [pageCursors, setPageCursors] = useState([null]);
  const [result, setResult] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [state, setState] = useState('loading');
  const [errorCode, setErrorCode] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionState, setActionState] = useState(null);
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [copiedId, setCopiedId] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const handledExpiry = useRef(false);
  const resultRef = useRef(null);
  const cursor = pageCursors[pageCursors.length - 1] || null;

  useEffect(() => {
    const controller = new AbortController();
    const hasResult = Boolean(resultRef.current);
    setState(hasResult ? 'refreshing' : 'loading');
    getGuildMembers(guild.id, { type, search, cursor, roleId: roleId || null, limit }, controller.signal).then((data) => {
      resultRef.current = data;
      setResult(data);
      setAvailableRoles(Array.isArray(data.availableRoles) ? data.availableRoles : []);
      setState('ready');
      setErrorCode('');
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      if (['ACTION_PERMISSION_REQUIRED', 'GUILD_NOT_AVAILABLE', 'GUILD_ACCESS_DENIED'].includes(error.message)) {
        setState('denied');
        return;
      }
      setErrorCode(error.message || 'MEMBER_LIST_UNAVAILABLE');
      setState(hasResult ? 'stale-error' : 'error');
    });
    return () => controller.abort();
  }, [cursor, guild.id, limit, onSessionExpired, refreshToken, roleId, search, type]);

  const resetPagination = () => {
    setPageCursors([null]);
    resultRef.current = null;
    setResult(null);
    setErrorCode('');
    setSelectedAction(null);
    setActionState(null);
  };

  const onSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    resetPagination();
  };

  const onCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      setCopyFailed(false);
      window.setTimeout(() => setCopiedId(''), 2200);
    } catch {
      setCopyFailed(true);
    }
  };

  const onSubmitAction = async (member, action) => {
    if (reason.trim().length < 3) return;
    const message = action === 'kick' ? copy.confirmKick(member.displayName)
      : action === 'timeout' ? copy.confirmTimeout(member.displayName)
        : copy.confirmRelease(member.displayName);
    if (!window.confirm(message)) return;
    setActionState({ memberId: member.id, status: 'pending' });
    setErrorCode('');
    try {
      const bridgeAction = action === 'timeout' ? 'member-timeout'
        : action === 'release' ? 'member-release' : 'kick';
      await postGuildAction(guild.id, {
        action: bridgeAction,
        targetId: member.id,
        reason: reason.trim(),
        ...(action === 'timeout' ? { durationHours } : {})
      });
      setActionState({ memberId: member.id, status: 'success' });
      setSelectedAction(null);
      setReason('');
      setPageCursors([null]);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setActionState({
        memberId: member.id,
        status: 'error',
        error: { code: error.message, partial: error.message === 'AUDIT_RECONCILIATION_REQUIRED' }
      });
    }
  };

  const currentPage = pageCursors.length;
  const members = Array.isArray(result?.members) ? result.members : [];
  const showLoading = ['loading', 'refreshing'].includes(state);

  return (
    <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar t={t} guild={guild} user={user} siteAdmin={siteAdmin} selectedPage="members" mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }} onSignOut={onSignOut} authBusy={authBusy} />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => setMobileMenuOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{copy.breadcrumb}</strong></nav>
          <div className="topbar-actions live-topbar-actions">
            <span className="live-user-name">{user?.globalName || user?.username}</span>
            <div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div>
            <ThemeToggle language={language} />
            <button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button>
          </div>
        </header>

        <main className="page-content live-members-page">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />ARGUS WORKSPACE</div><h1>{copy.breadcrumb}</h1><p>{guild.name} · {copy.subtitle}</p></div>
            <div className="heading-actions"><span className="connection-badge"><UsersRound size={14} aria-hidden="true" />{Number.isInteger(result?.totalMembers) ? result.totalMembers.toLocaleString(language === 'ar' ? 'ar' : 'en') : '—'}</span><button className="refresh-button members-refresh" type="button" onClick={() => setRefreshToken((value) => value + 1)} disabled={showLoading}><RefreshCw size={14} aria-hidden="true" /><span>{copy.refresh}</span></button></div>
          </div>

          <div className="members-toolbar panel">
            <div className="members-tabs" role="tablist" aria-label={copy.listLabel}>
              {['all', 'humans', 'bots'].map((value) => <button key={value} type="button" role="tab" aria-selected={type === value} className={type === value ? 'selected' : ''} onClick={() => { setType(value); resetPagination(); }}><span>{value === 'all' ? <UsersRound size={15} /> : value === 'bots' ? <Bot size={15} /> : <UserRound size={15} />}</span>{copy[value]}</button>)}
            </div>
            <form className="members-filters" onSubmit={onSearch}>
              <label className="members-search"><span className="sr-only">{copy.search}</span><Search size={15} aria-hidden="true" /><input type="search" value={searchInput} maxLength={80} placeholder={copy.search} onChange={(event) => setSearchInput(event.target.value)} /><button type="submit" aria-label={copy.search}><Filter size={14} /></button></label>
              <label><span className="sr-only">{copy.role}</span><select aria-label={copy.role} value={roleId} onChange={(event) => { setRoleId(event.target.value); resetPagination(); }}><option value="">{copy.anyRole}</option>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <label><span className="sr-only">{copy.limit}</span><select aria-label={copy.limit} value={limit} onChange={(event) => { setLimit(Number(event.target.value)); resetPagination(); }}>{PAGE_LIMITS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            </form>
          </div>

          {state === 'loading' && <ContentSkeleton variant="list" label={copy.loading} />}
          {state === 'refreshing' && <p className="live-stale-state" role="status">{copy.loading}</p>}
          {['error', 'stale-error'].includes(state) && <div className="live-error-state" role="alert"><p>{copy.unavailable}{errorCode ? ` (${errorCode})` : ''}</p><button className="tracking-reset-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>{copy.retry}</button></div>}
          {state === 'denied' && <div className="tracking-empty panel" role="alert"><ShieldAlert size={21} aria-hidden="true" /><h2>{copy.denied}</h2><button className="tracking-reset-button" type="button" onClick={() => onNavigate('/guilds')}>{t.switchServer}</button></div>}
          {copyFailed && <p className="members-copy-feedback" role="alert">{copy.copyFailed}</p>}

          {['ready', 'refreshing', 'stale-error'].includes(state) && (
            <>
              {result?.searchLimited && <p className="members-search-note" role="status">{copy.searchLimit}</p>}
              <div className="members-list-heading"><div><h2>{copy.listLabel}</h2><p>{copy.showing(members.length, result?.totalMembers || 0)}</p></div><span className="live-event-count">{members.length}</span></div>
              {members.length === 0 ? (
                <div className="tracking-empty panel"><UsersRound size={21} aria-hidden="true" /><h2>{search || roleId ? copy.noMatches : copy.noMembers}</h2><p>{search || roleId ? copy.noMatches : copy.noMembersDescription}</p></div>
              ) : (
                <section className="members-list" aria-label={copy.listLabel}>
                  {members.map((member) => <MemberCard key={member.id} member={member} actorId={user?.id} capabilities={result?.capabilities || {}} copy={copy} language={language} selectedAction={selectedAction} onSelectAction={(item, action) => { setSelectedAction({ memberId: item.id, action }); setActionState(null); setReason(''); }} onCopy={onCopy} copiedId={copiedId} busy={actionState?.status === 'pending'} actionError={actionState?.memberId === member.id ? actionState.error : null} actionState={actionState} reason={reason} setReason={setReason} durationHours={durationHours} setDurationHours={setDurationHours} onSubmitAction={onSubmitAction} onCancelAction={() => { setSelectedAction(null); setActionState(null); setReason(''); }} />)}
                </section>
              )}
              {(currentPage > 1 || result?.hasMore) && <nav className="tracking-pagination" aria-label={copy.listLabel}><button type="button" className="tracking-reset-button" disabled={currentPage <= 1 || showLoading} onClick={() => { setPageCursors((values) => values.slice(0, -1)); setResult(null); }}><ChevronLeft size={14} aria-hidden="true" />{copy.previous}</button><span>{copy.page(currentPage)}</span><button type="button" className="tracking-reset-button" disabled={!result?.hasMore || !result.nextCursor || showLoading} onClick={() => { if (result.nextCursor) setPageCursors((values) => [...values, result.nextCursor]); setResult(null); }}>{copy.next}<ChevronRight size={14} aria-hidden="true" /></button></nav>}
            </>
          )}
          <footer className="members-footer">{copy.auditNote}</footer>
        </main>
      </div>
    </div>
  );
}
