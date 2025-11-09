'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { getCssVariableWithFallback } from '@/lib/design-system/tokens';
import { cn } from '@/lib/cn';

export type ToastTone = 'info' | 'success' | 'error';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const AUTO_DISMISS_MS = 4500;

const slotMap: Record<ToastTone, { surface: string; border: string; text: string }> = {
  info: {
    surface: 'color.surface.card',
    border: 'color.border.emphasis',
    text: 'color.content.primary',
  },
  success: {
    surface: 'color.state.success.background',
    border: 'color.state.success.border',
    text: 'color.state.success.content',
  },
  error: {
    surface: 'color.state.error.background',
    border: 'color.state.error.border',
    text: 'color.state.error.content',
  },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      setToasts((current) => [
        ...current,
        { ...toast, id: crypto.randomUUID() },
      ]);
    },
    [],
  );

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, dismissToast]);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3"
        aria-live="polite"
        aria-label="Component status"
      >
        {toasts.map((toast) => {
          const slots = slotMap[toast.tone];
          const styleWithVars: CSSProperties & Record<string, string> = {
            '--ds-toast-surface': getCssVariableWithFallback(slots.surface),
            '--ds-toast-border': getCssVariableWithFallback(slots.border),
            '--ds-toast-text': getCssVariableWithFallback(slots.text),
          };
          return (
            <li
              key={toast.id}
              role="status"
              aria-live="polite"
              aria-label="Component status"
              className={cn(
                'pointer-events-auto rounded-[var(--radii-sm)] border border-[color:var(--ds-toast-border)] bg-[color:var(--ds-toast-surface)] p-4 text-sm text-[color:var(--ds-toast-text)] shadow-[var(--shadow-elevation-low)]',
              )}
              data-slot-surface={slots.surface}
              data-slot-border={slots.border}
              data-slot-text={slots.text}
              style={styleWithVars}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-xs font-medium text-[color:var(--ds-toast-text)] underline"
                >
                  Dismiss
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
