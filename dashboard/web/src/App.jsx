import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { checkGuildAccess, getAuthSession, getGuilds, logoutFromDashboard } from './lib/api.js';
import { resolveRoute } from './lib/routes.js';
import { translations } from './i18n.js';

const LandingPage = lazy(() => import('./components/LandingPage.jsx'));
const PublicInfoPage = lazy(() => import('./components/PublicInfoPage.jsx'));
const RoutePage = lazy(() => import('./components/RoutePage.jsx'));
const GuildSelectionPage = lazy(() => import('./components/GuildSelectionPage.jsx'));
const GuildOverviewPage = lazy(() => import('./components/GuildOverviewPage.jsx'));
const GuildAnalyticsPage = lazy(() => import('./components/GuildAnalyticsPage.jsx'));
const GuildTrackingPage = lazy(() => import('./components/GuildTrackingPage.jsx'));
const GuildEventsPage = lazy(() => import('./components/GuildEventsPage.jsx'));
const GuildReadOnlyPage = lazy(() => import('./components/GuildReadOnlyPage.jsx'));
const AdminHealthPage = lazy(() => import('./components/AdminHealthPage.jsx'));
const AdminControlPage = lazy(() => import('./components/AdminControlPage.jsx'));

function PageLoading() {
  const isArabic = document.documentElement.lang === 'ar';
  return <main className="page-loading" role="status" aria-busy="true">{isArabic ? 'جارٍ تحميل Argus…' : 'Loading Argus…'}</main>;
}

function DashboardApp() {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('argus-dashboard-language') === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [auth, setAuth] = useState({ status: 'checking', user: null, loginAvailable: true });
  const [authNotice, setAuthNotice] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [guildList, setGuildList] = useState({ status: 'idle', userId: null, items: [] });
  const [guildAccess, setGuildAccess] = useState({ status: 'idle', guildId: null, guild: null });
  const [guildListReload, setGuildListReload] = useState(0);
  const [guildAccessReload, setGuildAccessReload] = useState(0);
  const authBootstrapStarted = useRef(false);
  const route = resolveRoute(pathname);
  const isGuildRoute = route.name === 'guild' || route.name === 'guild-page';
  const currentUserId = auth.user?.id || null;

  const changeLanguage = useCallback((nextLanguage) => {
    const safeLanguage = nextLanguage === 'ar' ? 'ar' : 'en';
    setLanguage(safeLanguage);
    try {
      localStorage.setItem('argus-dashboard-language', safeLanguage);
    } catch {
      // Language still changes for this session when storage is unavailable.
    }
  }, []);

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (window.location.pathname !== path) {
      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({}, '', path);
    }
    setPathname(path);
    window.scrollTo(0, 0);
  }, []);

  const expireSession = useCallback(() => {
    setAuth({ status: 'unauthenticated', user: null, loginAvailable: true });
    setGuildList({ status: 'idle', userId: null, items: [] });
    setGuildAccess({ status: 'idle', guildId: null, guild: null });
    setAuthNotice('expired');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPathname);
    return () => window.removeEventListener('popstate', syncPathname);
  }, []);

  useEffect(() => {
    if (authBootstrapStarted.current) return;
    authBootstrapStarted.current = true;

    const loadSession = async () => {
      try {
        const session = await getAuthSession();
        setAuth({
          status: session.authenticated ? 'authenticated' : 'unauthenticated',
          user: session.user || null,
          loginAvailable: Boolean(session.loginAvailable),
          siteAdmin: session.siteAdmin === true
        });
        return session;
      } catch {
        setAuth({ status: 'unavailable', user: null, loginAvailable: true });
        return null;
      }
    };

    const callbackResult = new URL(window.location.href).searchParams.get('auth');
    if (!['complete', 'error', 'denied'].includes(callbackResult)) {
      void loadSession();
      return;
    }

    const callbackUrl = new URL(window.location.href);
    callbackUrl.searchParams.delete('auth');
    window.history.replaceState({}, '', `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);

    if (callbackResult === 'denied') {
      setAuthNotice('denied');
      void loadSession();
      navigate('/login');
      return;
    }

    void loadSession().then((session) => {
      if (callbackResult === 'complete' && session?.authenticated) {
        setAuthNotice('complete');
        navigate('/guilds');
      } else {
        setAuthNotice('error');
        navigate('/login');
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!['guilds', 'guild', 'admin-health', 'admin-control'].includes(route.name) && !isGuildRoute) return;
    if (auth.status === 'unauthenticated') {
      navigate('/login');
    }
  }, [auth.status, isGuildRoute, navigate, route.name]);

  useEffect(() => {
    if (['admin-health', 'admin-control'].includes(route.name) && auth.status === 'authenticated' && !auth.siteAdmin) navigate('/guilds', { replace: true });
  }, [auth.siteAdmin, auth.status, navigate, route.name]);

  useEffect(() => {
    if (route.name !== 'guilds' || auth.status !== 'authenticated' || !currentUserId) return undefined;
    const controller = new AbortController();
    setGuildList({ status: 'loading', userId: currentUserId, items: [] });
    getGuilds(controller.signal).then((result) => {
      const items = Array.isArray(result.guilds) ? result.guilds : [];
      setGuildList({ status: items.length ? 'ready' : 'empty', userId: currentUserId, items });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error.message === 'AUTHENTICATION_REQUIRED' || error.message === 'SESSION_EXPIRED') {
        expireSession();
        return;
      }
      setGuildList({ status: 'error', userId: currentUserId, items: [] });
    });
    return () => controller.abort();
  }, [auth.status, currentUserId, expireSession, guildListReload, navigate, route.name]);

  useEffect(() => {
    if (!isGuildRoute || auth.status !== 'authenticated' || !route.guildId) return undefined;
    const controller = new AbortController();
    setGuildAccess({ status: 'loading', guildId: route.guildId, guild: null });
    checkGuildAccess(route.guildId, controller.signal).then((result) => {
      setGuildAccess({ status: 'authorized', guildId: route.guildId, guild: result.guild });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error.message === 'AUTHENTICATION_REQUIRED' || error.message === 'SESSION_EXPIRED') {
        expireSession();
        return;
      }
      setGuildAccess({
        status: error.message === 'GUILD_ACCESS_DENIED' ? 'denied' : 'error',
        guildId: route.guildId,
        guild: null
      });
    });
    return () => controller.abort();
  }, [auth.status, expireSession, guildAccessReload, isGuildRoute, route.guildId]);

  const beginDiscordLogin = useCallback(() => {
    setAuthBusy(true);
    window.location.assign('/api/v1/auth/discord');
  }, []);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await logoutFromDashboard();
      setAuth({ status: 'unauthenticated', user: null, loginAvailable: true });
      setGuildList({ status: 'idle', userId: null, items: [] });
      setGuildAccess({ status: 'idle', guildId: null, guild: null });
      setAuthNotice('logout');
      navigate('/login');
    } catch {
      setAuthNotice('logoutError');
    } finally {
      setAuthBusy(false);
    }
  }, [navigate]);

  if (route.name === 'landing') {
    return <LandingPage language={language} onLanguageToggle={changeLanguage} onLogin={() => navigate('/login')} />;
  }
  if (route.name === 'public-page') {
    return <PublicInfoPage page={route.page} language={language} onLanguageToggle={changeLanguage} onLogin={() => navigate('/login')} />;
  }

  if (route.name === 'guilds' && auth.status === 'authenticated') {
    const state = guildList.userId === currentUserId && guildList.status !== 'idle'
      ? guildList
      : { status: 'loading', userId: currentUserId, items: [] };
      return <GuildSelectionPage language={language} user={auth.user} state={state} authBusy={authBusy} siteAdmin={auth.siteAdmin} onAdminHealth={() => navigate('/admin/health')} onSignOut={signOut} onLanguageToggle={changeLanguage} onRetry={() => setGuildListReload((value) => value + 1)} onSelect={(guildId) => navigate(`/guilds/${guildId}/overview`)} onHome={() => navigate('/')} />;
  }

  const defaultAccessStatus = auth.status === 'unavailable' ? 'error' : auth.status === 'unauthenticated' ? 'unauthenticated' : 'loading';
  const accessForRoute = guildAccess.guildId === route.guildId ? guildAccess : { status: defaultAccessStatus, guildId: route.guildId, guild: null };
  if (isGuildRoute && accessForRoute.status === 'authorized' && (!route.page || route.page === 'overview')) {
    return <GuildOverviewPage key={route.guildId} t={translations[language]} language={language} guild={accessForRoute.guild} user={auth.user} siteAdmin={auth.siteAdmin} onNavigate={navigate} onSwitchServer={() => navigate('/guilds')} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  if (isGuildRoute && route.page === 'tracking' && accessForRoute.status === 'authorized') {
    return <GuildTrackingPage key={route.guildId} t={translations[language]} language={language} guild={accessForRoute.guild} user={auth.user} siteAdmin={auth.siteAdmin} onNavigate={navigate} onSwitchServer={() => navigate('/guilds')} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  if (isGuildRoute && route.page === 'analytics' && accessForRoute.status === 'authorized') {
    return <GuildAnalyticsPage key={route.guildId} t={translations[language]} language={language} guild={accessForRoute.guild} user={auth.user} siteAdmin={auth.siteAdmin} onNavigate={navigate} onSwitchServer={() => navigate('/guilds')} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  if (isGuildRoute && route.page === 'events' && accessForRoute.status === 'authorized') {
    return <GuildEventsPage key={route.guildId} t={translations[language]} language={language} guild={accessForRoute.guild} user={auth.user} siteAdmin={auth.siteAdmin} onNavigate={navigate} onSwitchServer={() => navigate('/guilds')} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  if (isGuildRoute && ['settings', 'backups'].includes(route.page) && accessForRoute.status === 'authorized') {
    return <GuildReadOnlyPage key={`${route.guildId}-${route.page}`} page={route.page} t={translations[language]} language={language} guild={accessForRoute.guild} user={auth.user} siteAdmin={auth.siteAdmin} onNavigate={navigate} onSwitchServer={() => navigate('/guilds')} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  if (route.name === 'admin-health' && auth.status === 'authenticated' && auth.siteAdmin) {
    return <AdminHealthPage t={translations[language]} language={language} user={auth.user} onNavigate={navigate} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  if (route.name === 'admin-control' && auth.status === 'authenticated' && auth.siteAdmin) {
    return <AdminControlPage section={route.section || 'overview'} t={translations[language]} language={language} user={auth.user} onNavigate={navigate} onSignOut={signOut} authBusy={authBusy} onLanguageToggle={changeLanguage} onSessionExpired={expireSession} />;
  }
  return <RoutePage route={route} language={language} auth={auth} authNotice={authNotice} authBusy={authBusy} guildAccess={isGuildRoute ? accessForRoute : null} onAccessRetry={() => setGuildAccessReload((value) => value + 1)} onSignIn={beginDiscordLogin} onSignOut={signOut} onGuilds={() => navigate('/guilds')} onLoginPage={() => navigate('/login')} onHome={() => navigate('/')} onLanguageToggle={changeLanguage} />;
}

export default function App() {
  return <Suspense fallback={<PageLoading />}><DashboardApp /></Suspense>;
}
