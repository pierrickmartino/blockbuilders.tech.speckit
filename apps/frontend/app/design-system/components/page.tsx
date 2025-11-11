'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Input,
  Modal,
  Select,
  ToastProvider,
  useToast,
} from '@/components/design-system';
import type { ToastTone } from '@/components/design-system/Toast';
import { useTheme } from '@/components/design-system/ThemeProvider';

const languageOptions = [
  { label: 'TypeScript', value: 'ts' },
  { label: 'Python', value: 'py' },
  { label: 'Go', value: 'go' },
];

const ThemeAwareContent = () => {
  const searchParams = useSearchParams();
  const { setMode } = useTheme();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [language, setLanguage] = useState('ts');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const requested = searchParams.get('theme');
    if (requested === 'light' || requested === 'dark') {
      setMode(requested);
    }
  }, [searchParams, setMode]);

  const triggerToast = (tone: ToastTone) => {
    showToast({
      tone,
      title: tone === 'success' ? 'Toast ready' : 'Attention required',
      description:
        tone === 'success'
          ? 'Foundation components announce their status via live regions.'
          : 'Review the component guidance before continuing.',
    });
  };

  const submitFeedback = () => {
    if (!email.trim()) {
      setError('Email is required so we can respond.');
      return;
    }
    setModalOpen(false);
    setError(undefined);
    triggerToast('success');
  };

  const componentTokens = useMemo(
    () => [
      { label: 'Background', value: 'color.surface.card' },
      { label: 'Border', value: 'color.border.emphasis' },
      { label: 'Focus', value: 'color.focus.ring' },
      { label: 'Success', value: 'color.state.success.background' },
    ],
    [],
  );

  return (
    <section
      className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10"
      data-testid="foundation-components-demo"
    >
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Design System
        </p>
        <h1 className="text-3xl font-semibold text-[color:var(--color-content-primary)]">
          Foundation components ready for handoff
        </h1>
        <p className="text-base text-slate-600">
          Buttons, inputs, selects, modals, and toasts inherit the shared tokens so teams can quickly
          prototype accessible flows in both light and dark themes.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-6 shadow-[var(--shadow-elevation-low)]">
          <h2 className="text-lg font-semibold text-[color:var(--color-content-primary)]">
            Buttons
          </h2>
          <p className="text-sm text-slate-600">
            Each variant maps directly to design tokens for background, border, focus, and progress indicators.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button data-testid="foundation-button-primary">Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </article>
        <article className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-6 shadow-[var(--shadow-elevation-low)]">
          <h2 className="text-lg font-semibold text-[color:var(--color-content-primary)]">
            Form controls
          </h2>
          <p className="text-sm text-slate-600">
            Inputs and selects broadcast their active tokens so audits can trace exactly which values render.
          </p>
          <div className="mt-4 space-y-4">
            <Input label="Project name" placeholder="Design system launch" helperText="Tokens populate Tailwind automatically." />
            <Select
              label="Language"
              options={languageOptions}
              value={language}
              placeholder="Choose an option"
              onValueChange={setLanguage}
            />
          </div>
        </article>
      </div>

      <div className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Token coverage
        </p>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
          {componentTokens.map((token) => (
            <div key={token.value}>
              <dt className="text-xs text-slate-500">{token.label}</dt>
              <dd className="font-mono text-sm">{token.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open feedback modal
        </Button>
        <Button variant="ghost" onClick={() => triggerToast('success')}>
          Send toast
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Foundation feedback modal"
        description="Demonstrates keyboard traps, focus restoration, and toast handoff."
        testId="foundation-modal"
        footer={
          <>
            <Button variant="primary" onClick={submitFeedback}>
              Submit feedback
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <Input label="Full name" placeholder="Ada Lovelace" helperText="Visible focus outlines remain WCAG compliant." />
        <Input
          label="Email"
          placeholder="ada@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          helperText="We only use this for follow-ups."
          error={error}
        />
        <Select
          label="Component"
          value={language}
          onValueChange={setLanguage}
          options={languageOptions}
          placeholder="Choose a component"
        />
      </Modal>
    </section>
  );
};

export default function FoundationComponentsPage() {
  return (
    <ToastProvider>
      <ThemeAwareContent />
    </ToastProvider>
  );
}
