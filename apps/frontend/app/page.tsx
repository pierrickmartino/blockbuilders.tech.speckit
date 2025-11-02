import type { Route } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import {
  SMOKE_FALLBACK_TEST_SUITE,
  loadBuildMetadata,
} from '@/lib/build-metadata';

export default async function HomePage() {
  const requestHeaders = await headers();
  const testSuiteHeader =
    requestHeaders.get('x-test-suite')?.toLowerCase() ?? '';
  const metadata = await loadBuildMetadata({
    forceFallback: testSuiteHeader === SMOKE_FALLBACK_TEST_SUITE,
  });

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-3xl font-semibold text-slate-900">
          Your mono-repo is ready to build.
        </h2>
        <p className="mt-4 text-base text-slate-600">
          This baseline Next.js application surfaces build provenance so smoke
          tests and stakeholders can verify deployments instantly.
        </p>
        <p className="mt-6 text-sm text-slate-500">
          Version: <strong>{metadata.version}</strong> • Commit:{' '}
          <strong>{metadata.commit}</strong> • Environment:{' '}
          <strong>{metadata.environment}</strong>
        </p>
      </article>

      <article className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:grid-cols-2">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Next steps</h3>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-600">
            <li>Run <code className="rounded bg-slate-100 px-1">pnpm dev</code> to start the client.</li>
            <li>Follow the quickstart docs to orchestrate the stack.</li>
            <li>Keep the build metadata helper in sync with shared tooling.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Helpful links</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <Link
                className="text-brand-700 hover:text-brand-500"
                href={'/docs/quickstart' as Route}
              >
                Quickstart guide
              </Link>
            </li>
            <li>
              <Link className="text-brand-700 hover:text-brand-500" href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
                Next.js documentation
              </Link>
            </li>
            <li>
              <Link className="text-brand-700 hover:text-brand-500" href="https://playwright.dev/docs/intro" target="_blank" rel="noreferrer">
                Playwright smoke testing
              </Link>
            </li>
          </ul>
        </div>
      </article>
    </section>
  );
}
