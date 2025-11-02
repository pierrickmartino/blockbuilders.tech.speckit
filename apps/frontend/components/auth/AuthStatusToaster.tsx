'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type ToastStatus = 'idle' | 'success' | 'error' | 'info';

type AuthToast = {
  status: ToastStatus;
  message: string;
  redirect?: string | null;
};

type AuthStatusContextValue = {
  toast: AuthToast;
  notify: (toast: AuthToast) => void;
  clear: () => void;
};

const defaultToast: AuthToast = {
  status: 'idle',
  message: '',
};

const AuthStatusContext = createContext<AuthStatusContextValue>({
  toast: defaultToast,
  notify: () => undefined,
  clear: () => undefined,
});

const AUTO_DISMISS_MS = 5_000;

export const AuthStatusProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<AuthToast>(defaultToast);
  const router = useRouter();

  const notify = useCallback((nextToast: AuthToast) => {
    setToast(nextToast);
  }, []);

  const clear = useCallback(() => {
    setToast(defaultToast);
  }, []);

  useEffect(() => {
    if (toast.status === 'idle') {
      return;
    }

    const timer = setTimeout(() => {
      if (toast.redirect) {
        router.push(toast.redirect);
      }
      clear();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [toast, router, clear]);

  const value = useMemo<AuthStatusContextValue>(
    () => ({
      toast,
      notify,
      clear,
    }),
    [toast, notify, clear],
  );

  return (
    <AuthStatusContext.Provider value={value}>
      {children}
    </AuthStatusContext.Provider>
  );
};

export const useAuthStatus = () => useContext(AuthStatusContext);

const STATUS_STYLES: Record<Exclude<ToastStatus, 'idle'>, string> = {
  success: 'border border-emerald-300 bg-emerald-50 text-emerald-900',
  error: 'border border-rose-300 bg-rose-50 text-rose-900',
  info: 'border border-slate-300 bg-slate-50 text-slate-900',
};

export const AuthStatusToaster = () => {
  const { toast, clear } = useAuthStatus();

  if (toast.status === 'idle') {
    return null;
  }

  const variant = toast.status === 'idle' ? 'info' : toast.status;
  const className = STATUS_STYLES[variant] ?? STATUS_STYLES.info;

  return (
    <div
      role="status"
      className={`sr-only sm:not-sr-only sm:mx-auto sm:mt-6 sm:max-w-md sm:rounded-lg sm:px-4 sm:py-3 sm:shadow-md ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold uppercase tracking-wide text-slate-500 underline underline-offset-2"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
