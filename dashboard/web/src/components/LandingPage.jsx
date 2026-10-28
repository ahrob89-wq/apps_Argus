import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowUpLeft, ArrowUpRight, BellRing, Bird, Database, Eye, Fingerprint, Link2, LockKeyhole, Radio, Shield, ShieldAlert, ShieldCheck, Siren, TriangleAlert, Users } from 'lucide-react';
import { A11y, Autoplay, Keyboard } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { landingCopy } from '../landingCopy.js';
import ArgusMark from './ArgusMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const featureIcons = [ShieldAlert, Activity, Users, Link2, Database];
const floatingSecurityIcons = [
  { Icon: ShieldCheck, position: 'one' },
  { Icon: Eye, position: 'two' },
  { Icon: Bird, position: 'three' },
  { Icon: Siren, position: 'four' },
  { Icon: Fingerprint, position: 'five' },
  { Icon: TriangleAlert, position: 'six' },
  { Icon: Radio, position: 'seven' },
  { Icon: BellRing, position: 'eight' },
  { Icon: LockKeyhole, position: 'nine' },
  { Icon: ShieldAlert, position: 'ten' },
  { Icon: Activity, position: 'eleven' },
  { Icon: Database, position: 'twelve' }
];

export default function LandingPage({ language, authenticated, onLanguageToggle, onLogin }) {
  const copy = landingCopy[language];
  const accountButton = authenticated ? copy.dashboardButton : copy.loginButton;
  const DirectionArrow = language === 'ar' ? ArrowUpLeft : ArrowUpRight;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [featureCarousel, setFeatureCarousel] = useState(null);
  const floatingIconRefs = useRef([]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(preference.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!featureCarousel?.autoplay) return;
    if (prefersReducedMotion) {
      featureCarousel.autoplay.stop();
      return;
    }
    const startTimer = window.setTimeout(() => featureCarousel.autoplay.start(), 700);
    return () => window.clearTimeout(startTimer);
  }, [featureCarousel, prefersReducedMotion]);

  const repelFloatingIcons = (event) => {
    if (prefersReducedMotion) return;
    const radius = 125;
    floatingIconRefs.current.forEach((element, index) => {
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const dx = bounds.left + bounds.width / 2 - event.clientX;
      const dy = bounds.top + bounds.height / 2 - event.clientY;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) {
        element.style.setProperty('--escape-x', '0px');
        element.style.setProperty('--escape-y', '0px');
        return;
      }
      const angle = distance < 1 ? index * 2.4 : Math.atan2(dy, dx);
      const proximity = 1 - distance / radius;
      const force = 36 * proximity * proximity;
      element.style.setProperty('--escape-x', `${Math.cos(angle) * force}px`);
      element.style.setProperty('--escape-y', `${Math.sin(angle) * force}px`);
    });
  };

  const resetFloatingIcons = () => {
    floatingIconRefs.current.forEach((element) => {
      if (!element) return;
      element.style.setProperty('--escape-x', '0px');
      element.style.setProperty('--escape-y', '0px');
    });
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Argus home">
          <span className="landing-brand-mark"><ArgusMark size={22} /></span>
          <span>Argus<span className="landing-brand-period">.</span></span>
        </a>

        <nav className="landing-nav" aria-label={copy.navigation}>
          <a href="/features">{copy.featuresLink}</a>
          <a href="/privacy">{copy.privacyLink}</a>
          <a href="/setup">{copy.setupLink}</a>
        </nav>

        <div className="landing-header-actions">
          <div className="landing-language" role="group" aria-label={copy.language}>
            <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button>
            <button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button>
          </div>
          <ThemeToggle language={language} />
          <button className="landing-login-link" type="button" onClick={onLogin}>{accountButton}</button>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title" onPointerMove={repelFloatingIcons} onPointerLeave={resetFloatingIcons}>
          {!prefersReducedMotion && <div className="landing-floating-security" aria-hidden="true">
            {floatingSecurityIcons.map(({ Icon, position }, index) => (
              <span className={`landing-floating-icon ${position}`} key={position} ref={(element) => { floatingIconRefs.current[index] = element; }}>
                <span className="landing-floating-glyph" style={{ animationDelay: `${index * -0.85}s`, animationDuration: `${6.5 + (index % 4)}s` }}>
                  <Icon size={index % 3 === 0 ? 29 : 25} strokeWidth={1.6} />
                </span>
              </span>
            ))}
          </div>}
          <div className="landing-hero-copy">
            <p className="landing-eyebrow"><span />{copy.eyebrow}</p>
            <h1 id="landing-title">{copy.title}</h1>
            <p className="landing-lede">{copy.description}</p>
            <div className="landing-hero-actions">
              <a className="landing-primary-button" href="https://discord.com/oauth2/authorize?client_id=1562067365305253950" target="_blank" rel="noreferrer">
                {copy.addBot}<DirectionArrow size={16} aria-hidden="true" />
              </a>
              <a className="landing-secondary-button" href={authenticated ? '/guilds' : '/login'}>{accountButton}</a>
            </div>
            <p className="landing-promise">{copy.promise}</p>
          </div>

          <aside className="landing-model" aria-label={copy.modelTitle}>
            <div className="landing-model-heading">
              <span className="landing-model-icon"><Shield size={19} aria-hidden="true" /></span>
              <div><p>{copy.modelLabel}</p><h2>{copy.modelTitle}</h2></div>
            </div>
            <ul>
              {copy.modelSteps.map((step, index) => (
                <li key={step.title}>
                  <span className="landing-step-number">0{index + 1}</span>
                  <span><strong>{step.title}</strong><small>{step.description}</small></span>
                </li>
              ))}
            </ul>
            <p className="landing-model-footnote">{copy.modelFootnote}</p>
          </aside>
        </section>

        <section className="landing-features" id="features" aria-labelledby="features-title">
          <div className="landing-section-heading">
            <div><p className="landing-eyebrow"><span />{copy.featuresEyebrow}</p><h2 id="features-title">{copy.featuresTitle}</h2></div>
            <div className="landing-section-summary"><p>{copy.featuresDescription}</p><a href="/features">{copy.featuresDetails}<DirectionArrow size={14} aria-hidden="true" /></a></div>
          </div>
          <div className="landing-feature-viewport">
            <Swiper
              key={language}
              className="landing-feature-swiper"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              modules={[A11y, Autoplay, Keyboard]}
              slidesPerView="auto"
              centeredSlides
              spaceBetween={18}
              loop
              initialSlide={copy.features.length}
              speed={7300}
              autoplay={prefersReducedMotion ? false : { enabled: false, delay: 0, disableOnInteraction: false, pauseOnMouseEnter: false, waitForTransition: true }}
              keyboard={{ enabled: true, onlyInViewport: true }}
              a11y={{ prevSlideMessage: copy.previousFeature, nextSlideMessage: copy.nextFeature }}
              onSwiper={setFeatureCarousel}
            >
              {[0, 1, 2].flatMap((cycle) => copy.features.map((feature, index) => {
                const Icon = featureIcons[index];
                return (
                  <SwiperSlide key={`${cycle}-${feature.title}`} aria-hidden={cycle !== 1}>
                    <article className="landing-feature-card">
                      <span className="landing-feature-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </article>
                  </SwiperSlide>
                );
              }))}
            </Swiper>
          </div>
        </section>

        <section className="landing-privacy" id="privacy" aria-labelledby="privacy-title">
          <div className="landing-privacy-copy">
            <p className="landing-eyebrow"><span />{copy.privacyEyebrow}</p>
            <h2 id="privacy-title">{copy.privacyTitle}</h2>
            <p className="landing-privacy-description">{copy.privacyDescription}</p>
            <div className="landing-privacy-points">
              <span><Eye size={15} aria-hidden="true" />{copy.privacyPointOne}</span>
              <span><Database size={15} aria-hidden="true" />{copy.privacyPointTwo}</span>
            </div>
            <a className="landing-privacy-more" href="/privacy">{copy.privacyDetails}<DirectionArrow size={14} aria-hidden="true" /></a>
          </div>
          <div className="landing-privacy-visual" aria-hidden="true">
            <div className="landing-privacy-orbit landing-privacy-orbit-outer" />
            <div className="landing-privacy-orbit landing-privacy-orbit-inner" />
            <span className="landing-privacy-icon"><ShieldCheck size={34} strokeWidth={1.5} /></span>
            <span className="landing-privacy-orbiter landing-privacy-orbiter-one">
              <span className="landing-privacy-signal"><Eye size={15} /></span>
            </span>
            <span className="landing-privacy-orbiter landing-privacy-orbiter-two">
              <span className="landing-privacy-signal"><LockKeyhole size={14} /></span>
            </span>
            <span className="landing-privacy-note">{copy.privacyNote}</span>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <a className="landing-footer-brand" href="/"><span className="landing-footer-mark"><ArgusMark size={17} /></span>Argus<span className="landing-brand-period">.</span></a>
          <p>{copy.footer}</p>
          <nav className="landing-footer-nav" aria-label={copy.navigation}>
            <a href="/features">{copy.featuresLink}</a>
            <a href="/privacy">{copy.privacyLink}</a>
            <a href="/setup">{copy.setupLink}</a>
          </nav>
          <button className="landing-footer-link" type="button" onClick={onLogin}>{copy.loginButton}<DirectionArrow size={14} aria-hidden="true" /></button>
        </div>
        <div className="landing-footer-bottom"><span>{copy.footerNote}</span><span className="landing-footer-status"><i />{copy.footerStatus}</span></div>
      </footer>
    </div>
  );
}
