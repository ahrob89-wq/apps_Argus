import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatDashboardChartDate } from '../lib/formatters.js';

function ActivityTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="security-chart-tooltip">
      <strong>{label}</strong>
      <span>{t.eventCount}: {payload[0]?.value ?? 0}</span>
      <span>{t.critical}: {payload[1]?.value ?? 0}</span>
    </div>
  );
}

export default function SecurityActivityChart({ activity, language, t }) {
  const data = Array.isArray(activity?.days) ? activity.days.map((day) => ({
    ...day,
    label: formatDashboardChartDate(day.date, language)
  })) : [];

  return (
    <article className="security-analytics-chart" aria-labelledby="security-activity-heading">
      <div className="panel-heading">
        <div><h3 id="security-activity-heading">{t.securityActivity}</h3><p>{t.securityActivityDetail}</p></div>
        <div className="security-chart-legend" aria-label={t.chartLegend}>
          <span><i className="legend-dot security-total-dot" />{t.eventCount}</span>
          <span><i className="legend-dot security-critical-dot" />{t.critical}</span>
        </div>
      </div>
      <div className="security-chart" role="img" aria-label={t.securityActivityDescription}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 12, bottom: 2, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} minTickGap={18} />
            <YAxis allowDecimals={false} width={36} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
            <Tooltip content={<ActivityTooltip t={t} />} cursor={{ stroke: 'var(--chart-muted)', strokeDasharray: '3 4' }} />
            <Line type="monotone" dataKey="total" name={t.eventCount} stroke="var(--chart-primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--chart-primary)', stroke: 'var(--panel)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="critical" name={t.critical} stroke="var(--chart-danger)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--chart-danger)', stroke: 'var(--panel)', strokeWidth: 2 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
