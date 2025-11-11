import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';
import { SupabaseSessionProvider } from '@/components/auth/SupabaseSessionProvider';
import { ThemeProvider } from '@/components/design-system/ThemeProvider';
import {
  SMOKE_FALLBACK_TEST_SUITE,
  loadBuildMetadata,
  metadataToAttributes,
} from '@/lib/build-metadata';

export const metadata: Metadata = {
  title: 'Blockbuilders Mono-Repo Skeleton',
  description:
    'Baseline Next.js client exposing build metadata for smoke validation.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const requestHeaders = await headers();
  const testSuiteHeader =
    requestHeaders.get('x-test-suite')?.toLowerCase() ?? '';
  const snapshot = await loadBuildMetadata({
    forceFallback: testSuiteHeader === SMOKE_FALLBACK_TEST_SUITE,
  });
  const bodyAttributes = metadataToAttributes(snapshot);

  return (
    <html lang="en">
      <body
        {...bodyAttributes}
        className="min-h-screen bg-slate-50 text-slate-900 antialiased"
      >
        <SupabaseSessionProvider>
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <header className="border-b border-slate-200 bg-white/75 backdrop-blur">
              <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    Build snapshot
                  </p>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Blockbuilders Mono-Repo Skeleton
                  </h1>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">Version</dt>
                    <dd
                      data-testid="metadata-version"
                      className="font-medium text-slate-900"
                    >
                      {snapshot.labels.version}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Commit</dt>
                    <dd
                      data-testid="metadata-commit"
                      className="font-medium text-slate-900"
                    >
                      {snapshot.labels.commit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Environment</dt>
                    <dd
                      data-testid="metadata-environment"
                      className="font-medium text-slate-900"
                    >
                      {snapshot.labels.environment}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Timestamp</dt>
                    <dd
                      data-testid="metadata-timestamp"
                      className="font-medium text-slate-900"
                    >
                      {snapshot.labels.timestamp}
                    </dd>
                  </div>
                </dl>
              </div>
            </header>
            <main className="flex-1">{children}</main>
              <footer className="border-t border-slate-200 bg-white/60 py-4 text-center text-xs text-slate-500">
                <p>
                  Node.js 20 • Next.js 15 • React 19 • Fast API Skeleton – generated{' '}
                  {snapshot.labels.timestamp}
                </p>
              </footer>
            </div>
          </ThemeProvider>
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}
