import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-600">
          Enter your email and password to continue. Accounts require verified email addresses.
        </p>
      </header>

      <AuthForm mode="sign-in" />

      <div className="space-y-2 text-center text-sm text-slate-600">
        <p>
          New here?{' '}
          <Link
            href="/auth/sign-up"
            className="font-semibold text-brand-500 hover:text-brand-700"
          >
            Create an account
          </Link>
          .
        </p>
        <p>
          Missing the verification email?{' '}
          <Link
            href="/auth/verify"
            className="font-semibold text-brand-500 hover:text-brand-700"
          >
            Resend verification
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
