import { VerifyEmailPrompt } from '@/components/auth/VerifyEmailPrompt';

type VerifyPageProps = {
  searchParams?: Promise<{
    email?: string;
  }>;
};

export const metadata = {
  title: 'Verify your email',
};

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const params = (await searchParams) ?? {};
  const email = params.email ?? '';

  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Check your inbox</h1>
        <p className="text-sm text-slate-600">
          We sent a verification link to your email. Follow the link to activate your account,
          then return to sign in. Didn’t receive it? Resend the email below.
        </p>
      </header>

      <VerifyEmailPrompt initialEmail={email} />

      <p className="text-center text-sm text-slate-600">
        Still having trouble? Contact support so we can help you get access.
      </p>
    </div>
  );
}
