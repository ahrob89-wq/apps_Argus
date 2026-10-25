const timestampFormatters = new Map();
const chartDateFormatters = new Map();

function localeFor(language) {
  return language === 'ar' ? 'ar' : 'en';
}

export function formatDashboardTimestamp(value, language, fallback) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return fallback;

  const locale = localeFor(language);
  let formatter = timestampFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC'
    });
    timestampFormatters.set(locale, formatter);
  }
  return `${formatter.format(date)} UTC`;
}

export function formatDashboardChartDate(value, language) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value ?? '');

  const locale = localeFor(language);
  let formatter = chartDateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    });
    chartDateFormatters.set(locale, formatter);
  }
  return formatter.format(date);
}
