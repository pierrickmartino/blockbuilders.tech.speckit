import Link from 'next/link';
import type { Route } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Create your account',
};

export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">
          Create your account
        </h1>
        <p className="text-sm text-slate-600">
          Use your work email to sign up. We’ll send a verification link before you can access protected areas.
        </p>
      </header>

      <AuthForm mode="sign-up" />

      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href={'/auth/sign-in' as Route}
          className="font-semibold text-brand-500 hover:text-brand-700"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
