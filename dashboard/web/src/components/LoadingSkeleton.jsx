function Block({ className = '' }) {
  return <span className={`skeleton-block ${className}`} aria-hidden="true" />;
}

function MetricSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-metrics">
      {Array.from({ length: count }, (_, index) => (
        <article className="panel skeleton-metric" key={index}>
          <Block className="skeleton-line skeleton-label" />
          <Block className="skeleton-line skeleton-value" />
          <Block className="skeleton-line skeleton-detail" />
        </article>
      ))}
    </div>
  );
}

function RowSkeleton({ count = 5 }) {
  return (
    <div className="panel skeleton-rows">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <Block className="skeleton-avatar" />
          <div className="skeleton-row-copy">
            <Block className="skeleton-line skeleton-row-title" />
            <Block className="skeleton-line skeleton-row-detail" />
          </div>
          <Block className="skeleton-action" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="panel skeleton-chart-panel">
      <div className="skeleton-chart-heading">
        <div><Block className="skeleton-line skeleton-row-title" /><Block className="skeleton-line skeleton-row-detail" /></div>
        <Block className="skeleton-action" />
      </div>
      <div className="skeleton-chart">
        {Array.from({ length: 12 }, (_, index) => <Block className="skeleton-chart-bar" key={index} />)}
      </div>
    </div>
  );
}

function SkeletonShape({ variant }) {
  if (variant === 'cards') {
    return (
      <div className="skeleton-guild-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="panel skeleton-guild-card" key={index}>
            <Block className="skeleton-avatar skeleton-guild-avatar" />
            <div className="skeleton-row-copy"><Block className="skeleton-line skeleton-row-title" /><Block className="skeleton-line skeleton-row-detail" /></div>
            <Block className="skeleton-action" />
          </article>
        ))}
      </div>
    );
  }

  if (variant === 'overview') {
    return <><MetricSkeleton /><ChartSkeleton /><div className="skeleton-two-panels"><RowSkeleton count={3} /><RowSkeleton count={3} /></div></>;
  }

  if (variant === 'analytics') {
    return <><MetricSkeleton /><ChartSkeleton /><div className="skeleton-two-panels"><ChartSkeleton /><ChartSkeleton /></div></>;
  }

  if (variant === 'chart') return <ChartSkeleton />;

  if (variant === 'panel') {
    return <div className="panel skeleton-status-panel"><Block className="skeleton-line skeleton-row-title" /><Block className="skeleton-line skeleton-detail" /><div className="skeleton-status-grid">{Array.from({ length: 4 }, (_, index) => <Block className="skeleton-status-card" key={index} />)}</div></div>;
  }

  return <RowSkeleton />;
}

export function ContentSkeleton({ variant = 'list', label }) {
  return (
    <div className="skeleton-content" role="status" aria-busy="true">
      <span className="sr-only">{label || 'Loading content…'}</span>
      <SkeletonShape variant={variant} />
    </div>
  );
}

export function FullPageSkeleton({ language }) {
  const label = language === 'ar' ? 'جارٍ تحميل الصفحة' : 'Loading page';
  return (
    <main className={`skeleton-full-page${language === 'ar' ? ' rtl' : ''}`} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <aside className="skeleton-full-sidebar" aria-hidden="true">
        <Block className="skeleton-brand" />
        <Block className="skeleton-server" />
        <Block className="skeleton-nav" />
        <Block className="skeleton-nav" />
        <Block className="skeleton-nav" />
        <Block className="skeleton-nav" />
        <Block className="skeleton-profile" />
      </aside>
      <section className="skeleton-full-main" aria-hidden="true">
        <header className="skeleton-full-topbar"><Block className="skeleton-line skeleton-breadcrumb" /><Block className="skeleton-avatar" /><Block className="skeleton-action" /></header>
        <div className="skeleton-full-content">
          <Block className="skeleton-line skeleton-page-eyebrow" />
          <Block className="skeleton-line skeleton-page-title" />
          <Block className="skeleton-line skeleton-page-subtitle" />
          <SkeletonShape variant="overview" />
        </div>
      </section>
    </main>
  );
}
