import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'argus-dashboard-theme';

function updateThemeColor(theme) {
  const color = theme === 'dark' ? '#101115' : '#f4f5f7';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.content = color;
  });
}

function readTheme() {
  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch {
    // Use the system appearance when browser storage is unavailable.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, useSystem = false) {
  const root = document.documentElement;
  updateThemeColor(theme);
  if (useSystem) {
    delete root.dataset.theme;
    root.style.removeProperty('color-scheme');
    return;
  }
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export default function ThemeToggle({ language }) {
  const [theme, setTheme] = useState(readTheme);
  const isArabic = language === 'ar';
  const label = theme === 'dark'
    ? (isArabic ? 'التبديل إلى الوضع الفاتح' : 'Switch to light mode')
    : (isArabic ? 'التبديل إلى الوضع الداكن' : 'Switch to dark mode');
  const Icon = theme === 'dark' ? Sun : Moon;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = (event) => {
      try {
        const savedTheme = window.localStorage.getItem(STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') return;
      } catch {
        return;
      }
      setTheme(event.matches ? 'dark' : 'light');
      applyTheme(event.matches ? 'dark' : 'light', true);
    };
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The selected appearance remains active for this session.
    }
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}
