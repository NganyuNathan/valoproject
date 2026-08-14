import { useEffect, useState } from 'react';

/** Light/dark theme toggle, persisted to localStorage and applied via [data-theme]. */
export default function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('internpath-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('internpath-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return { theme, toggleTheme };
}
