'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@/components/icons';
import { cx } from '@/components/ui';

const STORAGE_KEY = 'fboms.theme';

/**
 * Light/dark toggle.
 *
 * The stored choice is applied by an inline script in the root layout, before
 * first paint — reading it here in an effect instead would flash the wrong theme
 * on every load. This component only renders the control and writes the change.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;

    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Until mounted we do not know the theme, so the label would be a guess.
      aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Theme'}
      title={mounted ? (isDark ? 'Light theme' : 'Dark theme') : undefined}
      className={cx(
        'grid h-8 w-8 place-items-center rounded-lg text-content-muted transition',
        'hover:bg-surface-sunken hover:text-content',
      )}
    >
      {mounted && isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
