import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, LockKeyhole, LogOut, Menu, Plus, RefreshCw, Save, Search, Shield, Trash2, Users, UserRound } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getGuildAccessPolicy, getGuildMembers, postGuildAction } from '../lib/api.js';
import './GuildPermissionsPage.css';

const PAGE_PERMISSIONS = [
  { key: 'overview.view', group: 'read' },
  { key: 'tracking.view', group: 'read' },
  { key: 'events.view', group: 'read' },
  { key: 'members.view', group: 'read' },
  { key: 'settings.view', group: 'read' },
  { key: 'backups.view', group: 'read' },
  { key: 'tracking.manage', group: 'actions' },
  { key: 'members.kick', group: 'actions' },
  { key: 'members.moderate', group: 'actions' },
  { key: 'backups.create', group: 'actions' },
  { key: 'settings.manage', group: 'configuration' },
  { key: 'protection.manage', group: 'configuration' }
];

const permissionCopyKeys = {
  'overview.view': 'roleView',
  'tracking.view': 'trackingView',
  'events.view': 'eventsView',
  'members.view': 'membersView',
  'settings.view': 'settingsView',
  'backups.view': 'backupsView',
  'tracking.manage': 'trackingManage',
  'members.kick': 'membersKick',
  'members.moderate': 'membersModerate',
  'backups.create': 'backupsCreate',
  'settings.manage': 'settingsManage',
  'protection.manage': 'protectionManage'
};

const copyByLanguage = {
  en: {
    title: 'Dashboard permissions',
    subtitle: 'Choose which server roles and members can access Argus, and what they can do.',
    breadcrumb: 'Permissions',
    loading: 'Loading access settings…',
    retry: 'Retry',
    unavailable: 'Access settings could not be loaded. Try again.',
    denied: 'Only the Discord server owner can manage Argus dashboard access.',
    modeTitle: 'Custom dashboard access',
    enabled: 'Use custom access',
    disabled: 'Use Discord access',
    modeEnabled: 'When enabled, only the server owner and the grants below can use the dashboard.',
    modeDisabled: 'When disabled, the current Discord Administrator / Manage Server access rules continue to apply.',
    boundary: 'These grants apply only inside Argus. They do not change Discord roles or native server permissions. The bot still checks its own Discord permissions and role hierarchy before actions.',
    addTitle: 'Add a role or member',
    roles: 'Server role',
    chooseRole: 'Choose a role…',
    addRole: 'Add role',
    searchUsers: 'Search server members by name or ID',
    search: 'Search',
    noUsers: 'No matching members found.',
    addMember: 'Add member',
    grants: 'Access grants',
    noGrants: 'No roles or members have been added yet.',
    role: 'Role',
    member: 'Member',
    memberId: 'Discord user ID',
    remove: 'Remove grant',
    read: 'View pages',
    actions: 'Actions',
    configuration: 'Configuration',
    save: 'Save permissions',
    saving: 'Saving…',
    saved: 'Permissions saved.',
    dirty: 'You have unsaved changes.',
    saveFailed: (code) => `Could not save permissions (${code}).`,
    optionsUnavailable: 'Discord member and role options could not be loaded. Refresh and try again.',
    roleView: 'View overview and analytics',
    trackingView: 'View member tracking',
    eventsView: 'View security events',
    membersView: 'View and search server members',
    settingsView: 'View Argus settings',
    backupsView: 'View server backups',
    trackingManage: 'Manage tracking entries',
    membersKick: 'Kick members',
    membersModerate: 'Apply or release timeouts',
    backupsCreate: 'Create server backups',
    settingsManage: 'Change Argus settings',
    protectionManage: 'Manage protection and lockdown controls',
    ownerOnly: 'Server owner only',
    defaultPolicy: 'Custom permissions do not grant Discord permissions. High-impact backup restoration and backup deletion remain restricted to the server owner.',
    refresh: 'Refresh',
    accessSaved: 'Saved',
    close: 'Close'
  },
  ar: {
    title: 'صلاحيات لوحة التحكم',
    subtitle: 'حدد الرتب والأعضاء الذين يمكنهم دخول Argus وما يمكنهم فعله.',
    breadcrumb: 'الصلاحيات',
    loading: 'جارٍ تحميل إعدادات الوصول…',
    retry: 'إعادة المحاولة',
    unavailable: 'تعذر تحميل إعدادات الوصول. حاول مرة أخرى.',
    denied: 'مالك سيرفر Discord فقط يستطيع إدارة صلاحيات لوحة Argus.',
    modeTitle: 'صلاحيات مخصصة للوحة Argus',
    enabled: 'تفعيل الصلاحيات المخصصة',
    disabled: 'استخدام صلاحيات Discord',
    modeEnabled: 'عند التفعيل، يقتصر دخول اللوحة على مالك السيرفر والمنح الموضحة أدناه.',
    modeDisabled: 'عند الإيقاف، تستمر قواعد الوصول الحالية لصلاحيات Administrator أو Manage Server في Discord.',
    boundary: 'تسري هذه المنح داخل Argus فقط، ولا تغيّر رتب Discord أو صلاحيات السيرفر الأصلية. ويتحقق البوت أيضًا من صلاحياته وتسلسل الرتب قبل تنفيذ الإجراءات.',
    addTitle: 'إضافة رتبة أو عضو',
    roles: 'رتبة السيرفر',
    chooseRole: 'اختر رتبة…',
    addRole: 'إضافة رتبة',
    searchUsers: 'ابحث عن عضو بالاسم أو المعرّف',
    search: 'بحث',
    noUsers: 'لم يتم العثور على أعضاء مطابقين.',
    addMember: 'إضافة عضو',
    grants: 'المنح الحالية',
    noGrants: 'لم تتم إضافة رتب أو أعضاء بعد.',
    role: 'رتبة',
    member: 'عضو',
    memberId: 'معرّف Discord',
    remove: 'إزالة المنح',
    read: 'عرض الصفحات',
    actions: 'الإجراءات',
    configuration: 'الإعدادات',
    save: 'حفظ الصلاحيات',
    saving: 'جارٍ الحفظ…',
    saved: 'تم حفظ الصلاحيات.',
    dirty: 'لديك تغييرات غير محفوظة.',
    saveFailed: (code) => `تعذر حفظ الصلاحيات (${code}).`,
    optionsUnavailable: 'تعذر تحميل أعضاء السيرفر ورتبه. حدّث الصفحة وحاول مرة أخرى.',
    roleView: 'عرض الملخص والتحليلات',
    trackingView: 'عرض تتبع الأعضاء',
    eventsView: 'عرض الأحداث الأمنية',
    membersView: 'عرض أعضاء السيرفر والبحث عنهم',
    settingsView: 'عرض إعدادات Argus',
    backupsView: 'عرض النسخ الاحتياطية',
    trackingManage: 'إدارة سجلات التتبع',
    membersKick: 'طرد الأعضاء',
    membersModerate: 'تطبيق العزل المؤقت أو إلغاؤه',
    membersBan: 'حظر الأعضاء',
    backupsCreate: 'إنشاء نسخ احتياطية للسيرفر',
    settingsManage: 'تغيير إعدادات Argus',
    protectionManage: 'إدارة الحماية وأوضاع القفل',
    ownerOnly: 'للمالك فقط',
    defaultPolicy: 'الصلاحيات المخصصة لا تمنح صلاحيات Discord. استعادة النسخ الاحتياطية وحذفها يظلان متاحين لمالك السيرفر فقط.',
    refresh: 'تحديث',
    accessSaved: 'تم الحفظ',
    close: 'إغلاق'
  }
};

function subjectKey(subjectType, subjectId) {
  return `${subjectType}:${subjectId}`;
}

function getSubjectName(entry, roles, members, copy) {
  if (entry.subjectType === 'role') {
    const role = roles.find((item) => item.id === entry.subjectId);
    return role?.name || `${copy.role} · ${entry.subjectId}`;
  }
  const member = members.find((item) => item.id === entry.subjectId);
  return member?.displayName || member?.username || `${copy.member} · ${entry.subjectId}`;
}

export default function GuildPermissionsPage({
  t, language, guild, user, siteAdmin, onNavigate, onSwitchServer,
  onSignOut, authBusy, onLanguageToggle, onSessionExpired
}) {
  const copy = copyByLanguage[language === 'ar' ? 'ar' : 'en'];
  const [policy, setPolicy] = useState({ enabled: false, entries: [] });
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [roleChoice, setRoleChoice] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberMatches, setMemberMatches] = useState([]);
  const [pageState, setPageState] = useState('loading');
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState('');
  const [dirty, setDirty] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const handledExpiry = useRef(false);

  const loadPolicy = useCallback(async (signal) => {
    setPageState('loading');
    setErrorCode('');
    const policyRequest = getGuildAccessPolicy(guild.id, signal);
    const optionsRequest = getGuildMembers(guild.id, { type: 'all', limit: 25 }, signal);
    const [policyResult, optionsResult] = await Promise.allSettled([policyRequest, optionsRequest]);

    if (signal.aborted) return;
    if (policyResult.status === 'rejected') {
      const error = policyResult.reason;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      if (error.message === 'GUILD_OWNER_REQUIRED') {
        setPageState('denied');
        return;
      }
      setErrorCode(error.message || 'ACCESS_POLICY_UNAVAILABLE');
      setPageState('error');
      return;
    }

    const loadedPolicy = policyResult.value?.policy;
    setPolicy({
      enabled: loadedPolicy?.enabled === true,
      entries: Array.isArray(loadedPolicy?.entries) ? loadedPolicy.entries : []
    });
    setDirty(false);
    setSaveState('');
    if (optionsResult.status === 'fulfilled') {
      const data = optionsResult.value;
      setRoles(Array.isArray(data.availableRoles) ? data.availableRoles.filter((role) => role.id !== guild.id) : []);
      setMembers(Array.isArray(data.members) ? data.members : []);
      setOptionsFailed(false);
    } else if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(optionsResult.reason?.message) && !handledExpiry.current) {
      handledExpiry.current = true;
      onSessionExpired();
      return;
    } else {
      setOptionsFailed(true);
    }
    setPageState('ready');
  }, [guild.id, onSessionExpired, refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPolicy(controller.signal);
    return () => controller.abort();
  }, [loadPolicy]);

  const onSearchMembers = async (event) => {
    event.preventDefault();
    const query = memberQuery.trim();
    if (!query) {
      setMemberSearch('');
      setMemberMatches([]);
      return;
    }
    setSearching(true);
    setMemberSearch(query);
    try {
      const data = await getGuildMembers(guild.id, { type: 'all', search: query, limit: 25 });
      setMemberMatches(Array.isArray(data.members) ? data.members : []);
      setMembers((current) => {
        const merged = new Map(current.map((member) => [member.id, member]));
        for (const member of data.members || []) merged.set(member.id, member);
        return [...merged.values()];
      });
      setOptionsFailed(false);
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setErrorCode(error.message || 'MEMBER_LIST_UNAVAILABLE');
      setOptionsFailed(true);
    } finally {
      setSearching(false);
    }
  };

  const addEntry = (subjectType, item) => {
    const entry = {
      subjectType,
      subjectId: item.id,
      permissions: []
    };
    setPolicy((current) => ({
      ...current,
      entries: [...current.entries, entry]
    }));
    setSaveState('');
    setDirty(true);
  };

  const togglePermission = (entryKey, permission, checked) => {
    setPolicy((current) => ({
      ...current,
      entries: current.entries.map((entry) => {
        if (subjectKey(entry.subjectType, entry.subjectId) !== entryKey) return entry;
        const nextPermissions = checked
          ? [...entry.permissions, permission]
          : entry.permissions.filter((value) => value !== permission);
        return { ...entry, permissions: nextPermissions };
      })
    }));
    setSaveState('');
    setDirty(true);
  };

  const removeEntry = (entryKey) => {
    setPolicy((current) => ({
      ...current,
      entries: current.entries.filter((entry) => subjectKey(entry.subjectType, entry.subjectId) !== entryKey)
    }));
    setSaveState('');
    setDirty(true);
  };

  const savePolicy = async () => {
    setSaving(true);
    setSaveState('');
    setErrorCode('');
    try {
      await postGuildAction(guild.id, {
        action: 'access-policy-save',
        accessPolicyEnabled: policy.enabled,
        accessPolicyEntries: policy.entries
      });
      setDirty(false);
      setSaveState('saved');
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setErrorCode(error.message || 'ACCESS_POLICY_SAVE_FAILED');
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  const showLoading = pageState === 'loading';
  const isArabic = language === 'ar';

  return (
    <div className={`dashboard-shell${isArabic ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar t={t} guild={guild} user={user} siteAdmin={siteAdmin} selectedPage="permissions"
        mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)}
        onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }}
        onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }}
        onSignOut={onSignOut} authBusy={authBusy} />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => setMobileMenuOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu}
            aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}>
            <Menu size={20} />
          </button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{copy.breadcrumb}</strong></nav>
          <div className="topbar-actions live-topbar-actions">
            <span className="live-user-name">{user?.globalName || user?.username}</span>
            <div className="language-toggle" role="group" aria-label={t.language}>
              <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button>
              <button type="button" aria-pressed={isArabic} onClick={() => onLanguageToggle('ar')}>عربي</button>
            </div>
            <ThemeToggle language={language} />
            <button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={t.signOut}>
              <LogOut size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="page-content live-permissions-page">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />ARGUS WORKSPACE</div>
              <h1>{copy.title}</h1>
              <p>{guild.name} · {copy.subtitle}</p>
            </div>
            <div className="heading-actions">
              <button className="refresh-button" type="button" onClick={() => setRefreshToken((value) => value + 1)} disabled={showLoading}>
                <RefreshCw size={14} aria-hidden="true" /><span>{copy.refresh}</span>
              </button>
            </div>
          </div>

          {pageState === 'loading' && <div className="permissions-state panel" role="status">{copy.loading}</div>}
          {pageState === 'error' && <div className="permissions-state panel" role="alert">
            <AlertCircle size={19} /><span>{copy.unavailable} {errorCode && <small>{errorCode}</small>}</span>
            <button className="refresh-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>{copy.retry}</button>
          </div>}
          {pageState === 'denied' && <div className="permissions-state panel" role="alert"><LockKeyhole size={20} /><span>{copy.denied}</span></div>}

          {pageState === 'ready' && <>
            <section className="permissions-notice panel">
              <Shield size={21} aria-hidden="true" />
              <div><strong>{copy.modeTitle}</strong><p>{copy.boundary}</p></div>
            </section>

            <section className="permissions-mode panel">
              <div><strong>{copy.modeTitle}</strong><p>{policy.enabled ? copy.modeEnabled : copy.modeDisabled}</p></div>
              <label className="permissions-toggle">
                <input type="checkbox" checked={policy.enabled} onChange={(event) => {
                  setPolicy((current) => ({ ...current, enabled: event.target.checked }));
                  setSaveState('');
                  setDirty(true);
                }} />
                <span className="permissions-toggle-track" aria-hidden="true" />
                <span>{policy.enabled ? copy.enabled : copy.disabled}</span>
              </label>
            </section>

            <section className="permissions-add panel">
              <div className="permissions-section-heading"><div><h2>{copy.addTitle}</h2><p>{copy.defaultPolicy}</p></div></div>
              {optionsFailed && <div className="permissions-inline-warning" role="alert"><AlertCircle size={16} />{copy.optionsUnavailable}</div>}
              <div className="permissions-add-grid">
                <div className="permissions-add-card">
                  <label htmlFor="permissions-role-select">{copy.roles}</label>
                  <div className="permissions-add-control">
                    <select id="permissions-role-select" value={roleChoice} onChange={(event) => setRoleChoice(event.target.value)}>
                      <option value="">{copy.chooseRole}</option>
                      {roles.filter((role) => !policy.entries.some((entry) => entry.subjectType === 'role' && entry.subjectId === role.id))
                        .map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                    <button type="button" className="permissions-secondary-button" disabled={!roleChoice || optionsFailed}
                      onClick={() => {
                        const role = roles.find((item) => item.id === roleChoice);
                        if (role) addEntry('role', role);
                        setRoleChoice('');
                      }}><Plus size={15} />{copy.addRole}</button>
                  </div>
                </div>
                <div className="permissions-add-card">
                  <form onSubmit={onSearchMembers}>
                    <label htmlFor="permissions-member-search">{copy.searchUsers}</label>
                    <div className="permissions-add-control">
                      <div className="permissions-search-field"><Search size={15} /><input id="permissions-member-search" type="search" maxLength={80}
                        value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder={copy.searchUsers} /></div>
                      <button type="submit" className="permissions-secondary-button" disabled={searching || !memberQuery.trim()}>
                        <Search size={15} />{searching ? '…' : copy.search}
                      </button>
                    </div>
                  </form>
                  {memberSearch && <div className="permissions-member-results" aria-live="polite">
                    {memberMatches.length === 0 && !searching && <span>{copy.noUsers}</span>}
                    {memberMatches.map((member) => {
                      const exists = policy.entries.some((entry) => entry.subjectType === 'user' && entry.subjectId === member.id);
                      return <button key={member.id} type="button" disabled={exists || optionsFailed}
                        onClick={() => addEntry('user', member)}>
                        <span className="permissions-result-avatar">{member.displayName?.slice(0, 1) || <UserRound size={14} />}</span>
                        <span><strong>{member.displayName || member.username}</strong><small>{member.id}</small></span>
                        {exists ? <Check size={16} /> : <Plus size={16} />}
                      </button>;
                    })}
                  </div>}
                </div>
              </div>
            </section>

            <section className="permissions-grants">
              <div className="permissions-section-heading"><div><h2>{copy.grants}</h2><p>{policy.entries.length} · {policy.enabled ? copy.enabled : copy.disabled}</p></div></div>
              {policy.entries.length === 0 && <div className="permissions-empty panel">{copy.noGrants}</div>}
              <div className="permissions-grant-list">
                {policy.entries.map((entry) => {
                  const key = subjectKey(entry.subjectType, entry.subjectId);
                  return <article key={key} className="permissions-grant panel">
                    <div className="permissions-grant-header">
                      <div className="permissions-grant-identity">
                        <span className={`permissions-subject-icon ${entry.subjectType}`}>
                          {entry.subjectType === 'role' ? <Users size={17} /> : <UserRound size={17} />}
                        </span>
                        <div><strong>{getSubjectName(entry, roles, members, copy)}</strong>
                          <small>{entry.subjectType === 'role' ? copy.role : copy.member} · {entry.subjectId}</small>
                        </div>
                      </div>
                      <button type="button" className="permissions-remove-button" onClick={() => removeEntry(key)} aria-label={`${copy.remove}: ${entry.subjectId}`}>
                        <Trash2 size={16} /><span>{copy.remove}</span>
                      </button>
                    </div>
                    <div className="permissions-groups">
                      {['read', 'actions', 'configuration'].map((group) => <fieldset key={group} className="permissions-group">
                        <legend>{copy[group]}</legend>
                        {PAGE_PERMISSIONS.filter((permission) => permission.group === group).map(({ key: permission }) =>
                          <label key={permission} className="permissions-check">
                            <input type="checkbox" checked={entry.permissions.includes(permission)}
                              onChange={(event) => togglePermission(key, permission, event.target.checked)} />
                            <span className="permissions-check-box"><Check size={12} /></span>
                            <span>{copy[permissionCopyKeys[permission]] || permission}</span>
                          </label>
                        )}
                      </fieldset>)}
                    </div>
                  </article>;
                })}
              </div>
            </section>

            <div className="permissions-save-bar panel">
              <div aria-live="polite">
                {saveState === 'saved' ? <span className="permissions-saved"><Check size={16} />{copy.saved}</span>
                  : saveState === 'error' ? <span className="permissions-save-error">{copy.saveFailed(errorCode)}</span>
                    : dirty ? <span className="permissions-save-hint">{copy.dirty}</span> : null}
              </div>
              <button type="button" className="permissions-primary-button" onClick={savePolicy} disabled={saving || showLoading}>
                <Save size={16} />{saving ? copy.saving : copy.save}
              </button>
            </div>
          </>}
        </main>
      </div>
    </div>
  );
}
