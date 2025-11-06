'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeProviderProps = {
  children: ReactNode;
  /**
   * When provided, the provider behaves as a controlled component. Use this for Storybook.
   */
  forcedTheme?: ThemeMode;
  /**
   * Optional hook for analytics or manual sync once a fully fledged preference pipeline exists.
   */
  onThemeChange?: (mode: ThemeMode, resolvedMode: 'light' | 'dark') => void;
  /**
   * Override the storage key (handy for multi-tenant previews).
   */
  storageKey?: string;
  /**
   * Default theme when nothing is persisted and no forced mode is set.
   */
  defaultMode?: ThemeMode;
};

export type ThemeContextValue = {
  /**
   * Current preference (may be `system`).
   */
  mode: ThemeMode;
  /**
   * Concrete theme applied to the DOM (`light` or `dark`).
   */
  resolvedMode: 'light' | 'dark';
  /**
   * Update theme preference. No-op when `forcedTheme` is provided.
   */
  setMode: (mode: ThemeMode) => void;
  /**
   * Cycle through `light → dark → system`. No-op when `forcedTheme` is provided.
   */
  toggleMode: () => void;
};

const DEFAULT_STORAGE_KEY = 'bb.design-system.theme';
const prefersDarkQuery = '(prefers-color-scheme: dark)';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isBrowser = () => typeof window !== 'undefined';

const readStoredMode = (storageKey: string): ThemeMode | null => {
  if (!isBrowser()) {
    return null;
  }

  const value = window.localStorage.getItem(storageKey);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return null;
};

const resolveSystemMode = (): 'light' | 'dark' => {
  if (!isBrowser()) {
    return 'light';
  }

  return window.matchMedia(prefersDarkQuery).matches ? 'dark' : 'light';
};

const applyDocumentTheme = (mode: 'light' | 'dark') => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
};

export const ThemeProvider = ({
  children,
  forcedTheme,
  onThemeChange,
  storageKey = DEFAULT_STORAGE_KEY,
  defaultMode = 'system',
}: ThemeProviderProps) => {
  const isControlled = forcedTheme !== undefined;
  const [internalMode, setInternalMode] = useState<ThemeMode>(() => {
    if (forcedTheme !== undefined) {
      return forcedTheme;
    }

    const stored = readStoredMode(storageKey);
    return stored ?? defaultMode;
  });

  const activeMode: ThemeMode = forcedTheme ?? internalMode;
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() =>
    activeMode === 'system' ? resolveSystemMode() : activeMode,
  );

  useEffect(() => {
    if (!isControlled || forcedTheme === undefined) {
      return;
    }

    setInternalMode(forcedTheme);
  }, [forcedTheme, isControlled]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    if (isControlled) {
      return;
    }

    const stored = readStoredMode(storageKey);
    if (stored) {
      setInternalMode(stored);
    }
  }, [isControlled, storageKey]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const nextMode = activeMode === 'system' ? resolveSystemMode() : activeMode;
    setResolvedMode(nextMode);
    applyDocumentTheme(nextMode);
    onThemeChange?.(activeMode, nextMode);

    if (!isControlled) {
      if (internalMode === 'system') {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, internalMode);
      }
    }
  }, [activeMode, internalMode, isControlled, onThemeChange, storageKey]);

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }

    if (activeMode !== 'system') {
      return undefined;
    }

    const media = window.matchMedia(prefersDarkQuery);
    const handleChange = (event: MediaQueryListEvent) => {
      const next = event.matches ? 'dark' : 'light';
      setResolvedMode(next);
      applyDocumentTheme(next);
      onThemeChange?.('system', next);
    };

    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [activeMode, onThemeChange]);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      if (isControlled) {
        return;
      }
      setInternalMode(mode);
    },
    [isControlled],
  );

  const toggleMode = useCallback(() => {
    if (isControlled) {
      return;
    }

    setInternalMode((current) => {
      if (current === 'light') {
        return 'dark';
      }
      if (current === 'dark') {
        return 'system';
      }
      return 'light';
    });
  }, [isControlled]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: activeMode,
      resolvedMode,
      setMode,
      toggleMode,
    }),
    [activeMode, resolvedMode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
