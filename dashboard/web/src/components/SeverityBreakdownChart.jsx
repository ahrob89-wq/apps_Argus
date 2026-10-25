import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatDashboardChartDate } from '../lib/formatters.js';

function SeverityTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry.value]));
  return (
    <div className="security-chart-tooltip">
      <strong>{label}</strong>
      <span className="severity-tooltip-info">{t.severityInfo}: {values.info ?? 0}</span>
      <span className="severity-tooltip-warning">{t.warning}: {values.warning ?? 0}</span>
      <span className="severity-tooltip-critical">{t.critical}: {values.critical ?? 0}</span>
    </div>
  );
}

export default function SeverityBreakdownChart({ activity, language, t }) {
  const data = Array.isArray(activity?.days) ? activity.days.map((day) => ({
    ...day,
    label: formatDashboardChartDate(day.date, language)
  })) : [];

  return (
    <article className="security-analytics-chart" aria-labelledby="severity-breakdown-heading">
      <div className="panel-heading">
        <div><h3 id="severity-breakdown-heading">{t.severityBreakdown}</h3><p>{t.severityBreakdownDetail}</p></div>
        <div className="security-chart-legend" aria-label={t.chartLegend}>
          <span><i className="legend-dot severity-info-dot" />{t.severityInfo}</span>
          <span><i className="legend-dot severity-warning-dot" />{t.warning}</span>
          <span><i className="legend-dot severity-critical-dot" />{t.critical}</span>
        </div>
      </div>
      <div className="security-chart" role="img" aria-label={t.severityBreakdownDescription}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 12, bottom: 2, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} minTickGap={18} />
            <YAxis allowDecimals={false} width={36} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
            <Tooltip content={<SeverityTooltip t={t} />} cursor={{ fill: 'var(--chart-hover)' }} />
            <Bar dataKey="info" name={t.severityInfo} stackId="severity" fill="var(--chart-info)" />
            <Bar dataKey="warning" name={t.warning} stackId="severity" fill="var(--chart-warning)" />
            <Bar dataKey="critical" name={t.critical} stackId="severity" fill="var(--chart-danger)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
