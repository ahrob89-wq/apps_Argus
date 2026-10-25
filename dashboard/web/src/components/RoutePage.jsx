import { ArrowUpRight, Building2, Home, LogOut, Shield } from 'lucide-react';
import ArgusMark from './ArgusMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const messages = {
  en: {
    navigation: 'Page navigation', language: 'العربية', signOut: 'Sign out', signingOut: 'Signing out…',
    login: { title: 'Sign in to Argus', description: 'Continue securely with your Discord account.' },
    loginChecking: { title: 'Checking your session', description: 'Argus is checking whether you are already signed in.' },
    loginUnavailable: { title: 'Sign-in service unavailable', description: 'The dashboard API could not be reached. You can retry Discord sign-in.' },
    signedIn: { title: 'Discord account connected', description: 'Your session is active. Server selection will be available in the next step.' },
    signedInWithUser: (username) => `Signed in as ${username}. Server selection will be available in the next step.`,
    accessChecking: { title: 'Checking server access', description: 'Argus is verifying that this Discord account can manage the selected server.' },
    accessDenied: { title: 'Server access denied', description: 'This account is not authorized to open this server in Argus.' },
    accessUnavailable: { title: 'Server access could not be checked', description: 'The API could not confirm access right now. No server data has been loaded.' },
    accessRequired: { title: 'Sign-in required', description: 'Sign in with Discord before opening a server page.' },
    serverReady: (name) => `Access confirmed for ${name}. Page data will be connected in its planned step.`,
    guilds: { title: 'Choose a server', description: 'Your available Discord servers will appear here after sign-in.' },
    guild: { title: 'Server dashboard', description: 'Server pages will appear here after sign-in and access checks.' },
    page: { title: 'This page is not connected yet', description: 'The route is ready. Its data and controls will be added in its planned frontend step.' },
    notFound: { title: 'Page not found', description: 'The address may be incorrect, or this page may not be part of Argus.' },
    notices: { denied: 'Discord sign-in was canceled.', error: 'Sign-in could not be completed. Please try again.', logout: 'You have signed out.', logoutError: 'Sign-out could not be confirmed. Please retry.', expired: 'Your session expired. Sign in again to continue.' },
    signIn: 'Continue with Discord', checking: 'Checking…', unavailable: 'Discord sign-in is not configured.', continue: 'Continue to servers', switchServer: 'Switch server', retry: 'Check again', home: 'Back to Argus home'
  },
  ar: {
    navigation: 'التنقل بين الصفحات', language: 'English', signOut: 'تسجيل الخروج', signingOut: 'جارٍ تسجيل الخروج…',
    login: { title: 'تسجيل الدخول إلى Argus', description: 'تابع بأمان باستخدام حساب Discord.' },
    loginChecking: { title: 'جارٍ التحقق من الجلسة', description: 'يتحقق Argus مما إذا كنت مسجلًا للدخول.' },
    loginUnavailable: { title: 'خدمة تسجيل الدخول غير متاحة', description: 'تعذر الاتصال بواجهة الخادم. يمكنك إعادة محاولة تسجيل الدخول عبر Discord.' },
    signedIn: { title: 'تم ربط حساب Discord', description: 'جلستك نشطة. ستتوفر خطوة اختيار السيرفر لاحقًا.' },
    signedInWithUser: (username) => `تم تسجيل الدخول باسم ${username}. ستتوفر خطوة اختيار السيرفر لاحقًا.`,
    accessChecking: { title: 'جارٍ التحقق من صلاحية السيرفر', description: 'يتحقق Argus من صلاحية هذا الحساب لإدارة السيرفر المحدد.' },
    accessDenied: { title: 'لا تملك صلاحية الوصول', description: 'هذا الحساب غير مخوّل لفتح هذا السيرفر في Argus.' },
    accessUnavailable: { title: 'تعذر التحقق من الصلاحية', description: 'لم يتمكن API من تأكيد الوصول الآن. لم يتم تحميل بيانات السيرفر.' },
    accessRequired: { title: 'تسجيل الدخول مطلوب', description: 'سجّل الدخول عبر Discord قبل فتح صفحة السيرفر.' },
    serverReady: (name) => `تم تأكيد صلاحية الوصول إلى ${name}. ستتم إضافة بيانات الصفحة في خطوتها ضمن الخطة.`,
    guilds: { title: 'اختر سيرفرًا', description: 'ستظهر هنا سيرفرات Discord المتاحة بعد تسجيل الدخول.' },
    guild: { title: 'لوحة السيرفر', description: 'ستظهر صفحات السيرفر بعد تسجيل الدخول والتحقق من الصلاحيات.' },
    page: { title: 'هذه الصفحة غير مربوطة بعد', description: 'المسار جاهز، وستتم إضافة بيانات الصفحة ووظائفها في خطوتها ضمن الخطة.' },
    notFound: { title: 'الصفحة غير موجودة', description: 'قد يكون العنوان غير صحيح أو أن الصفحة ليست ضمن لوحة Argus.' },
    notices: { denied: 'تم إلغاء تسجيل الدخول عبر Discord.', error: 'تعذر إكمال تسجيل الدخول. حاول مرة أخرى.', logout: 'تم تسجيل الخروج.', logoutError: 'تعذر تأكيد تسجيل الخروج. حاول مرة أخرى.', expired: 'انتهت جلستك. سجّل الدخول مجددًا للمتابعة.' },
    signIn: 'المتابعة عبر Discord', checking: 'جارٍ التحقق…', unavailable: 'تسجيل الدخول عبر Discord غير مُعدّ.', continue: 'المتابعة إلى السيرفرات', switchServer: 'تبديل السيرفر', retry: 'إعادة التحقق', home: 'العودة إلى صفحة Argus'
  }
};

export default function RoutePage({ route, language, auth, authNotice, authBusy, guildAccess, onAccessRetry, onSignIn, onSignOut, onGuilds, onLoginPage, onHome, onLanguageToggle }) {
  const copy = messages[language];
  let content = route.name === 'login' ? copy.login
    : route.name === 'guilds' ? copy.guilds
      : route.name === 'guild' ? copy.guild
        : route.name === 'guild-page' ? copy.page
          : copy.notFound;
  if (route.name === 'login') {
    if (auth.status === 'checking') content = copy.loginChecking;
    else if (auth.status === 'authenticated') content = copy.signedIn;
    else if (auth.status === 'unavailable') content = copy.loginUnavailable;
  }
  if (route.name === 'guilds' && auth.status === 'authenticated') {
    content = { ...copy.signedIn, description: auth.user?.username ? copy.signedInWithUser(auth.user.username) : copy.signedIn.description };
  }
  if (route.name === 'guilds' && auth.status === 'checking') content = copy.loginChecking;
  if (route.name === 'guilds' && auth.status === 'unavailable') content = copy.loginUnavailable;
  if (guildAccess) {
    if (guildAccess.status === 'loading') content = copy.accessChecking;
    else if (guildAccess.status === 'denied') content = copy.accessDenied;
    else if (guildAccess.status === 'error') content = copy.accessUnavailable;
    else if (guildAccess.status === 'unauthenticated') content = copy.accessRequired;
    else if (guildAccess.status === 'authorized') {
      content = { title: route.name === 'guild' ? guildAccess.guild?.name || copy.guild.title : copy.page.title,
        description: copy.serverReady(guildAccess.guild?.name || '') };
    }
  }

  return (
    <main className="route-page">
      <header className="route-header">
        <a className="route-brand" href="/" onClick={(event) => { event.preventDefault(); onHome(); }}>
          <span><ArgusMark size={21} /></span>Argus<span className="route-brand-period">.</span>
        </a>
        <nav aria-label={copy.navigation}>
          <ThemeToggle language={language} />
          <button type="button" className="route-language-button" onClick={() => onLanguageToggle(language === 'en' ? 'ar' : 'en')}>
            {copy.language}
          </button>
          {auth.status === 'authenticated' && (
            <button type="button" className="route-home-link" onClick={onSignOut} disabled={authBusy}>
              <LogOut size={14} aria-hidden="true" />{authBusy ? copy.signingOut : copy.signOut}
            </button>
          )}
          {guildAccess?.status === 'authorized' && (
            <button type="button" className="route-home-link route-server-switch" onClick={onGuilds}>
              <Building2 size={14} aria-hidden="true" /><span>{guildAccess.guild?.name}</span><small>{copy.switchServer}</small>
            </button>
          )}
          <button type="button" className="route-home-link" onClick={onHome}><Home size={15} aria-hidden="true" />{copy.home}</button>
        </nav>
      </header>
      <section className="route-message" aria-labelledby="route-title">
        <span className="route-message-icon"><Shield size={22} aria-hidden="true" /></span>
        <h1 id="route-title">{content.title}</h1>
        <p>{content.description}</p>
        {authNotice && copy.notices[authNotice] && <p className="route-notice" role="status">{copy.notices[authNotice]}</p>}
        {guildAccess?.status === 'denied' ? (
          <button type="button" className="landing-primary-button" onClick={onGuilds}>{copy.switchServer}<ArrowUpRight size={15} aria-hidden="true" /></button>
        ) : guildAccess?.status === 'error' ? (
          <button type="button" className="landing-primary-button" onClick={onAccessRetry}>{copy.retry}<ArrowUpRight size={15} aria-hidden="true" /></button>
        ) : guildAccess?.status === 'unauthenticated' ? (
          <button type="button" className="landing-primary-button" onClick={onLoginPage}>{copy.signIn}<ArrowUpRight size={15} aria-hidden="true" /></button>
        ) : route.name === 'login' && auth.status !== 'authenticated' ? (
          <div className="route-actions">
            <button type="button" className="landing-primary-button" onClick={onSignIn} disabled={authBusy || auth.status === 'checking' || !auth.loginAvailable}>
              {authBusy ? copy.checking : copy.signIn}<ArrowUpRight size={15} aria-hidden="true" />
            </button>
            {!auth.loginAvailable && <span className="route-unavailable">{copy.unavailable}</span>}
          </div>
        ) : route.name === 'login' && auth.status === 'authenticated' ? (
          <button type="button" className="landing-primary-button" onClick={onGuilds}>
            {copy.continue}<ArrowUpRight size={15} aria-hidden="true" />
          </button>
        ) : route.name === 'guilds' && auth.status !== 'authenticated' ? (
          <button type="button" className="landing-primary-button" onClick={onLoginPage}>{copy.signIn}<ArrowUpRight size={15} aria-hidden="true" /></button>
        ) : (
          <button type="button" className="landing-primary-button" onClick={onHome}>
            {copy.home}<ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
      </section>
    </main>
  );
}
