'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';
import { Modal } from '../Modal';
import { ToastProvider, useToast } from '../Toast';

const options = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Destructive', value: 'destructive' },
];

const FoundationPreview = () => {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('primary');

  return (
    <section className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-6 shadow-[var(--shadow-elevation-low)]">
        <h2 className="text-xl font-semibold text-[color:var(--color-content-primary)]">
          Buttons
        </h2>
        <p className="text-sm text-slate-600">
          Every variant shares focus and announcement tokens so accessibility audits can trace coverage.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-6 shadow-[var(--shadow-elevation-low)]">
        <h2 className="text-xl font-semibold text-[color:var(--color-content-primary)]">
          Form controls
        </h2>
        <div className="mt-4 space-y-4">
          <Input label="Project name" placeholder="Foundation rollout" />
          <Select
            label="Variant"
            value={selectedVariant}
            onValueChange={setSelectedVariant}
            options={options}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            showToast({
              tone: 'success',
              title: 'Toast triggered',
              description: 'Live region broadcasts status updates automatically.',
            })
          }
        >
          Send toast
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Foundation modal"
        description="Focus stays trapped until you submit or cancel."
        footer={
          <>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Submit feedback
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <Input label="Full name" placeholder="Grace Hopper" />
        <Input label="Email" placeholder="grace@example.com" helperText="We respond within two business days." />
      </Modal>
    </section>
  );
};

const meta: Meta<typeof FoundationPreview> = {
  title: 'Design System/Components/Foundation',
  component: FoundationPreview,
  parameters: {
    layout: 'fullscreen',
    controls: { hideNoControlsWarning: true },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <ToastProvider>
      <FoundationPreview />
    </ToastProvider>
  ),
};
