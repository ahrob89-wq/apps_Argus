import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, Activity, AlertTriangle, Archive, BadgeCheck, Check, Clipboard, ClipboardCheck, Database, Eye, ExternalLink, Fingerprint, KeyRound, Link2, LockKeyhole, Radio, Settings2, Shield, ShieldAlert, ShieldCheck, Siren, UserPlus, UserRound } from 'lucide-react';
import { publicPagesCopy } from '../publicPagesCopy.js';
import ArgusMark from './ArgusMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const featureIcons = {
  shield: ShieldAlert,
  pulse: Activity,
  user: UserRound,
  link: Link2,
  backup: Archive
};

const privacyIcons = {
  scan: Eye,
  external: ExternalLink,
  member: Fingerprint,
  database: Database
};

const setupIcons = {
  invite: UserPlus,
  permissions: KeyRound,
  configure: Settings2,
  verify: BadgeCheck,
  health: Activity
};

function OrbitingShield({ className = '' }) {
  return (
    <div className={`public-orbit-shield ${className}`} aria-hidden="true">
      <div className="public-orbit-shield-ring public-orbit-shield-ring-one" />
      <div className="public-orbit-shield-ring public-orbit-shield-ring-two" />
      <span className="public-orbit-shield-core"><ShieldCheck size={54} strokeWidth={1.4} /></span>
      <span className="public-orbit public-orbit-one"><span><Eye size={17} /></span></span>
      <span className="public-orbit public-orbit-two"><span><Database size={17} /></span></span>
      <span className="public-orbit public-orbit-three"><span><LockKeyhole size={16} /></span></span>
      <span className="public-orbit public-orbit-four"><span><Siren size={16} /></span></span>
      <span className="public-orbit public-orbit-five"><span><Radio size={16} /></span></span>
    </div>
  );
}

function PublicHeader({ language, copy, onLanguageToggle, onLogin }) {
  return (
    <header className="landing-header">
      <a className="landing-brand" href="/" aria-label="Argus home">
        <span className="landing-brand-mark"><ArgusMark size={22} /></span>
        <span>Argus<span className="landing-brand-period">.</span></span>
      </a>
      <nav className="landing-nav" aria-label={copy.navigation}>
        <a className={copy.currentPage === 'features' ? 'is-current' : ''} href="/features">{copy.featuresLink}</a>
        <a className={copy.currentPage === 'privacy' ? 'is-current' : ''} href="/privacy">{copy.privacyLink}</a>
        <a className={copy.currentPage === 'setup' ? 'is-current' : ''} href="/setup">{copy.setupLink}</a>
      </nav>
      <div className="landing-header-actions">
        <div className="landing-language" role="group" aria-label={copy.language}>
          <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button>
          <button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button>
        </div>
        <ThemeToggle language={language} />
        <button className="landing-login-link" type="button" onClick={onLogin}>{copy.login}</button>
      </div>
    </header>
  );
}

function PageFooter({ copy, language, onLogin }) {
  const DirectionArrow = language === 'ar' ? ArrowUpLeft : ArrowUpRight;
  return (
    <footer className="landing-footer">
      <div className="landing-footer-main">
        <a className="landing-footer-brand" href="/">
          <span className="landing-footer-mark"><ArgusMark size={17} /></span>
          Argus<span className="landing-brand-period">.</span>
        </a>
        <p>{copy.footer}</p>
        <nav className="landing-footer-nav" aria-label={copy.navigation}>
          <a href="/features">{copy.featuresLink}</a>
          <a href="/privacy">{copy.privacyLink}</a>
          <a href="/setup">{copy.setupLink}</a>
        </nav>
        <button className="landing-footer-link" type="button" onClick={onLogin}>{copy.login}<DirectionArrow size={14} aria-hidden="true" /></button>
      </div>
    </footer>
  );
}

function FeaturesPage({ copy }) {
  const page = copy.features;
  const DirectionArrow = copy.isArabic ? ArrowLeft : ArrowRight;
  const BackArrow = copy.isArabic ? ArrowRight : ArrowLeft;
  return (
    <main className="public-info-main public-features-main">
      <section className="public-info-hero">
        <div className="public-info-hero-copy">
          <a className="public-info-breadcrumb" href="/"><BackArrow size={14} aria-hidden="true" />{copy.home}<span>/</span>{copy.featuresLink}</a>
          <p className="landing-eyebrow"><span />{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="public-info-intro">{page.intro}</p>
          <a className="public-info-hero-link" href="/privacy">{copy.privacyLink}<DirectionArrow size={15} aria-hidden="true" /></a>
        </div>
        <div className="public-info-hero-art" aria-hidden="true">
          <OrbitingShield />
        </div>
      </section>

      <section className="public-info-section" aria-labelledby="public-feature-list-title">
        <div className="public-info-section-heading">
          <p className="landing-eyebrow"><span />{page.label}</p>
          <span className="public-info-section-count">0{page.sections.length}</span>
        </div>
        <h2 className="public-info-visually-hidden" id="public-feature-list-title">{page.label}</h2>
        <div className="public-feature-grid">
          {page.sections.map((section, index) => {
            const Icon = featureIcons[section.icon] || Shield;
            return (
              <article className={`public-feature-card${index === 0 ? ' public-feature-card-featured' : ''}`} key={section.title}>
                <div className="public-info-card-top">
                  <span className="public-info-card-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span className="public-info-card-index">0{index + 1}</span>
                </div>
                <h3>{section.title}</h3>
                <p className="public-info-card-description">{section.description}</p>
                <ul>
                  {section.points.map((point) => <li key={point}><Check size={15} aria-hidden="true" /><span>{point}</span></li>)}
                </ul>
                <span className="public-info-card-tag">{section.tag}</span>
              </article>
            );
          })}
        </div>
        <aside className="public-info-notice">
          <span className="public-info-notice-icon"><AlertTriangle size={19} aria-hidden="true" /></span>
          <div><h3>{page.noteTitle}</h3><p>{page.note}</p></div>
        </aside>
      </section>
    </main>
  );
}

function PrivacyPage({ copy }) {
  const page = copy.privacy;
  const DirectionArrow = copy.isArabic ? ArrowLeft : ArrowRight;
  const BackArrow = copy.isArabic ? ArrowRight : ArrowLeft;
  return (
    <main className="public-info-main public-privacy-main">
      <section className="public-info-hero public-privacy-hero">
        <div className="public-info-hero-copy">
          <a className="public-info-breadcrumb" href="/"><BackArrow size={14} aria-hidden="true" />{copy.home}<span>/</span>{copy.privacyLink}</a>
          <p className="landing-eyebrow"><span />{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="public-info-intro">{page.intro}</p>
          <div className="public-privacy-promise"><ShieldCheck size={18} aria-hidden="true" /><span>{page.promise}</span></div>
        </div>
        <div className="public-privacy-hero-visual" aria-hidden="true">
          <OrbitingShield className="public-orbit-shield-privacy" />
        </div>
      </section>

      <section className="public-info-section public-privacy-details" aria-label={page.eyebrow}>
        <div className="public-info-section-heading">
          <p className="landing-eyebrow"><span />{page.eyebrow}</p>
          <span className="public-info-section-count">0{page.cards.length}</span>
        </div>
        <div className="public-privacy-grid">
          {page.cards.map((card, index) => {
            const Icon = privacyIcons[card.icon] || Database;
            return (
              <article className="public-privacy-card" key={card.title}>
                <div className="public-info-card-top">
                  <span className="public-info-card-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span className="public-info-card-index">0{index + 1}</span>
                </div>
                <h2>{card.title}</h2>
                <p className="public-info-card-description">{card.description}</p>
                <ul>
                  {card.points.map((point) => <li key={point}><Check size={15} aria-hidden="true" /><span>{point}</span></li>)}
                </ul>
              </article>
            );
          })}
        </div>
        <aside className="public-info-notice public-privacy-notice">
          <span className="public-info-notice-icon"><LockKeyhole size={19} aria-hidden="true" /></span>
          <div><h3>{page.noteTitle}</h3><p>{page.note}</p></div>
          <a href="/features">{copy.featuresLink}<DirectionArrow size={14} aria-hidden="true" /></a>
        </aside>
      </section>
    </main>
  );
}

function SetupPage({ copy }) {
  const page = copy.setup;
  const BackArrow = copy.isArabic ? ArrowRight : ArrowLeft;
  const [activeStepIndex, setActiveStepIndex] = useState(2);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const activeStep = page.steps[activeStepIndex];

  const copyCommand = async (command) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopyFeedback({ command, status: 'copied' });
    } catch {
      setCopyFeedback({ command, status: 'error' });
    }
  };

  return (
    <main className="public-info-main public-setup-main">
      <section className="public-info-hero public-setup-hero">
        <div className="public-info-hero-copy">
          <a className="public-info-breadcrumb" href="/"><BackArrow size={14} aria-hidden="true" />{copy.home}<span>/</span>{copy.setupLink}</a>
          <p className="landing-eyebrow"><span />{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="public-info-intro">{page.intro}</p>
          <a
            className="public-info-hero-link public-setup-invite"
            href="https://discord.com/oauth2/authorize?client_id=1562067365305253950"
            target="_blank"
            rel="noreferrer"
          >
            {copy.isArabic ? 'أضف Argus إلى Discord' : 'Add Argus to Discord'}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="public-info-hero-art" aria-hidden="true"><OrbitingShield /></div>
      </section>

      <section className="public-info-section public-setup-section" aria-label={page.eyebrow}>
        <div className="public-info-section-heading">
          <p className="landing-eyebrow"><span />{page.eyebrow}</p>
          <span className="public-info-section-count">0{page.steps.length}</span>
        </div>
        <div className="public-setup-steps" role="group" aria-label={page.stepsLabel}>
          {page.steps.map((step, index) => {
            const Icon = setupIcons[step.icon] || Shield;
            return (
              <button
                className={`public-setup-step${activeStepIndex === index ? ' is-active' : ''}`}
                type="button"
                key={step.title}
                aria-pressed={activeStepIndex === index}
                aria-controls="public-setup-step-content"
                onClick={() => {
                  setActiveStepIndex(index);
                  setCopyFeedback(null);
                }}
              >
                <div className="public-setup-step-marker">
                  <span className="public-info-card-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span className="public-info-card-index">0{index + 1}</span>
                </div>
                <div>
                  <h2>{step.title}</h2>
                  <p className="public-info-card-description">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <section className="public-setup-step-content" id="public-setup-step-content" aria-live="polite">
          <div className="public-setup-step-content-copy">
            <p className="landing-eyebrow"><span />{page.selectedStepLabel} 0{activeStepIndex + 1}</p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.detail}</p>
            {activeStep.command && (
              <div className="public-setup-command">
                <code>{activeStep.command}</code>
                <button type="button" onClick={() => void copyCommand(activeStep.command)}>
                  {copyFeedback && copyFeedback.command === activeStep.command && copyFeedback.status === 'copied'
                    ? <ClipboardCheck size={16} aria-hidden="true" />
                    : <Clipboard size={16} aria-hidden="true" />}
                  {copyFeedback && copyFeedback.command === activeStep.command && copyFeedback.status === 'copied' ? page.copied : page.copyCommand}
                </button>
              </div>
            )}
            {copyFeedback && copyFeedback.command === activeStep.command && (
              <p className={`public-setup-copy-feedback${copyFeedback.status === 'error' ? ' is-error' : ''}`} role="status">
                {copyFeedback.status === 'copied' ? page.copySuccess : page.copyError}
              </p>
            )}
          </div>
          {activeStep.images?.length > 0 && (
            <div className="public-setup-images">
              {activeStep.images.map((image) => (
                <figure className="public-setup-image" key={image.src}>
                  <a href={image.src} target="_blank" rel="noreferrer" aria-label={`${page.openImage}: ${image.caption}`}>
                    <img src={image.src} alt={image.alt} loading="lazy" />
                    <span><ExternalLink size={14} aria-hidden="true" />{page.openImage}</span>
                  </a>
                  <figcaption>{image.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        <aside className="public-setup-needs">
          <div className="public-info-notice-icon"><Check size={19} aria-hidden="true" /></div>
          <div>
            <h2>{page.needsTitle}</h2>
            <ul>
              {page.needs.map((item) => <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>)}
            </ul>
          </div>
        </aside>
        <aside className="public-info-notice public-setup-warning">
          <span className="public-info-notice-icon"><AlertTriangle size={19} aria-hidden="true" /></span>
          <div><h2>{page.warningTitle}</h2><p>{page.warning}</p></div>
        </aside>
      </section>
    </main>
  );
}

export default function PublicInfoPage({ page, language, onLanguageToggle, onLogin }) {
  const translated = publicPagesCopy[language] || publicPagesCopy.en;
  const copy = { ...translated, isArabic: language === 'ar', currentPage: page, language };
  return (
    <div className={`landing-page public-info-page public-info-page-${page}`} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <PublicHeader language={language} copy={copy} onLanguageToggle={onLanguageToggle} onLogin={onLogin} />
      {page === 'privacy' ? <PrivacyPage copy={copy} /> : page === 'setup' ? <SetupPage copy={copy} /> : <FeaturesPage copy={copy} />}
      <PageFooter copy={copy} language={language} onLogin={onLogin} />
    </div>
  );
}
