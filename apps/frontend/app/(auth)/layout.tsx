import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthStatusProvider, AuthStatusToaster } from '@/components/auth/AuthStatusToaster';

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthStatusProvider>
      <div className="flex min-h-full flex-col bg-slate-50">
        <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          <header className="mb-12 flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-semibold text-brand-500 hover:text-brand-700"
            >
              ← Back to home
            </Link>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Secure Supabase authentication
            </p>
          </header>
          <AuthStatusToaster />
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
            {children}
          </div>
        </div>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          Protected by Supabase • Passwords meet 12-character complexity policy
        </footer>
      </div>
    </AuthStatusProvider>
  );
}
