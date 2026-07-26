import { createContext, useContext, useEffect, useState } from 'react';

const initialState = {
  theme: 'dark',
  setTheme: () => null,
};

const ThemeProviderContext = createContext(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'vite-ui-theme',
  ...props
}) {
  const [theme, setThemeState] = useState(() => {
    return (localStorage.getItem(storageKey) || localStorage.getItem('ds_ai_theme') || defaultTheme);
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    root.classList.remove('light', 'dark', 'light-theme');
    body.classList.remove('light', 'dark', 'light-theme');

    let effectiveTheme = (typeof theme === 'string' && ['light', 'dark', 'system'].includes(theme)) ? theme : 'dark';
    if (effectiveTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    if (effectiveTheme === 'light' || effectiveTheme === 'dark') {
      root.classList.add(effectiveTheme);
      body.classList.add(effectiveTheme);
    }

    if (effectiveTheme === 'light') {
      root.classList.add('light-theme');
      body.classList.add('light-theme');
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme) => {
      setThemeState((prevTheme) => {
        const resolvedTheme = typeof newTheme === 'function' ? newTheme(prevTheme) : newTheme;
        const validTheme = (typeof resolvedTheme === 'string' && ['light', 'dark', 'system'].includes(resolvedTheme)) ? resolvedTheme : 'dark';
        try {
          localStorage.setItem(storageKey, validTheme);
          localStorage.setItem('ds_ai_theme', validTheme);
        } catch {}
        return validTheme;
      });
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
