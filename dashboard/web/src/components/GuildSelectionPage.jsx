import { Activity, ArrowUpRight, Building2, LogOut, RefreshCw } from 'lucide-react';
import { getDashboardCopy } from '../dashboardCopy.js';
import ArgusMark from './ArgusMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { ContentSkeleton } from './LoadingSkeleton.jsx';

const copy = {
  en: {
    eyebrow: 'ARGUS WORKSPACE', title: 'Choose a server', description: 'Servers where your account has access to the Argus dashboard are listed.',
    loading: 'Loading your available servers…', emptyTitle: 'No managed servers found', empty: 'This account has no servers available to manage with Argus.',
    failedTitle: 'Servers could not be loaded', failed: 'Discord server access could not be checked. Try again in a moment.', scopeRequired: 'Sign out and sign in again to allow Argus to verify your server roles.', retry: 'Try again', open: 'Open server',
    signedIn: 'Signed in as', home: 'Argus home', navigation: 'Server selection', language: 'العربية', signOut: 'Sign out', signingOut: 'Signing out…'
  },
  ar: {
    eyebrow: 'مساحة Argus', title: 'اختر سيرفرًا', description: 'تظهر هنا السيرفرات التي يملك حسابك صلاحية الوصول إلى لوحة Argus فيها.',
    loading: 'جارٍ تحميل السيرفرات المتاحة…', emptyTitle: 'لا توجد سيرفرات متاحة', empty: 'لا يملك هذا الحساب سيرفرات يمكنه إدارتها باستخدام Argus.',
    failedTitle: 'تعذر تحميل السيرفرات', failed: 'تعذر التحقق من صلاحية الوصول إلى سيرفرات Discord. حاول مجددًا بعد قليل.', scopeRequired: 'سجّل الخروج ثم ادخل مجددًا للسماح لـ Argus بالتحقق من رتبك في السيرفر.', retry: 'إعادة المحاولة', open: 'فتح السيرفر',
    signedIn: 'مسجل الدخول باسم', home: 'صفحة Argus', navigation: 'اختيار السيرفر', language: 'English', signOut: 'تسجيل الخروج', signingOut: 'جارٍ تسجيل الخروج…'
  }
};

function iconUrl(guild) {
  if (!guild.icon || !/^\d{1,24}$/.test(guild.id) || !/^[a-zA-Z0-9_]+$/.test(guild.icon)) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`;
}

export default function GuildSelectionPage({ language, user, state, authBusy, siteAdmin = false, onSignOut, onLanguageToggle, onRetry, onSelect, onHome, onAdminHealth }) {
  const t = copy[language];
  const adminCopy = getDashboardCopy(language);
  return (
    <main className="guild-selection-page">
      <header className="route-header guild-selection-header">
        <a className="route-brand" href="/" onClick={(event) => { event.preventDefault(); onHome(); }}>
          <span><ArgusMark size={21} /></span>Argus<span className="route-brand-period">.</span>
        </a>
        <nav className="guild-selection-actions" aria-label={t.navigation}>
          <span className="guild-selection-user">{t.signedIn} <strong>{user?.username}</strong></span>
          <ThemeToggle language={language} />
          {siteAdmin && <button type="button" className="route-home-link" onClick={onAdminHealth}><Activity size={14} aria-hidden="true" />{adminCopy.adminDashboard}</button>}
          <button type="button" className="route-language-button" onClick={() => onLanguageToggle(language === 'en' ? 'ar' : 'en')}>{t.language}</button>
          <button type="button" className="route-home-link" onClick={onSignOut} disabled={authBusy}><LogOut size={14} aria-hidden="true" />{authBusy ? t.signingOut : t.signOut}</button>
        </nav>
      </header>
      <section className="guild-selection-content" aria-labelledby="guild-selection-title">
        <p className="landing-eyebrow"><span />{t.eyebrow}</p>
        <h1 id="guild-selection-title">{t.title}</h1>
        <p className="guild-selection-description">{t.description}</p>

        {state.status === 'loading' && <ContentSkeleton variant="cards" label={t.loading} />}
        {state.status === 'empty' && <div className="guild-state"><h2>{t.emptyTitle}</h2><p>{t.empty}</p></div>}
        {state.status === 'error' && (
          <div className="guild-state"><h2>{t.failedTitle}</h2><p>{state.errorCode === 'DISCORD_MEMBER_SCOPE_REQUIRED' ? t.scopeRequired : t.failed}</p><button className="route-home-link" type="button" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" />{t.retry}</button></div>
        )}
        {state.status === 'ready' && (
          <div className="guild-selection-grid">
            {state.items.map((guild) => {
              const src = iconUrl(guild);
              return (
                <button className="guild-card" key={guild.id} type="button" onClick={() => onSelect(guild.id)}>
                  <span className="guild-card-icon">
                    {src ? <img src={src} alt="" loading="lazy" /> : <Building2 size={21} aria-hidden="true" />}
                  </span>
                  <span className="guild-card-copy"><strong>{guild.name}</strong><small>{t.open}</small></span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
