const savedTheme = (() => {
  try {
    const value = window.localStorage.getItem('argus-dashboard-theme');
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
})();

const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const themeColor = initialTheme === 'dark' ? '#101115' : '#f4f5f7';
document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
  meta.content = themeColor;
});

if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
  document.documentElement.style.colorScheme = savedTheme;
}
