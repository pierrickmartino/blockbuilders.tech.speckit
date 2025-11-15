'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Modal } from '@/components/design-system/Modal';
import { cn } from '@/lib/cn';
import type { ChecklistStep, StepStatusPayload } from '@/lib/onboarding/types';

import { useChecklist } from './ChecklistProvider';

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-slate-200 text-slate-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-900',
  COMPLETED: 'bg-emerald-100 text-emerald-900',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

export const ChecklistModal = () => {
  const {
    checklist,
    open,
    setOpen,
    dismiss,
    completeStep,
    busyStepId,
    error,
    definitionChanged,
    refresh,
  } = useChecklist();
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});

  const incompleteCount = useMemo(
    () => checklist.steps.filter((step) => step.status !== 'COMPLETED').length,
    [checklist.steps],
  );

  const handleDismiss = () => {
    dismiss();
    setOpen(false);
  };

  const handleTemplateChange = (stepId: string, value: string) => {
    setTemplateDrafts((prev) => ({
      ...prev,
      [stepId]: value,
    }));
  };

  const handleResolveStep = (step: ChecklistStep) => {
    const payload: StepStatusPayload = {
      status: 'COMPLETED',
    };

    if (step.requiresDisclosure) {
      payload.acknowledgementToken = step.disclosure?.acknowledgementToken ?? null;
    }

    if (step.requiresTemplateEdit) {
      const diffValue = templateDrafts[step.stepId];
      payload.templateDiff = diffValue ? { note: diffValue } : { note: 'parameter-updated' };
    }

    completeStep(step.stepId, payload);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => setOpen(next)}
      title="Finish setting up your workspace"
      description="Complete the onboarding checklist to unlock starter templates, disclosures, and your first backtest."
      testId="onboarding-checklist-modal"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {incompleteCount === 0
              ? 'All steps are complete.'
              : `${incompleteCount} ${incompleteCount === 1 ? 'step' : 'steps'} remaining`}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleDismiss}>
              Dismiss
            </Button>
            <Button variant="secondary" onClick={refresh}>
              Reload latest steps
            </Button>
          </div>
        </div>
      }
    >
      {definitionChanged ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Checklist definition updated. Reload required to ensure progress reflects the new flow.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <ol className="space-y-4">
        {checklist.steps.map((step, index) => {
          const templateRequiresDiff = step.requiresTemplateEdit;
          const templateNotes = templateDrafts[step.stepId] ?? '';
          const disabled =
            step.status === 'COMPLETED' ||
            (templateRequiresDiff && templateNotes.trim().length === 0);

          return (
            <li
              key={step.stepId}
              className="rounded-xl border border-slate-100 bg-white/50 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Step {index + 1}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    STATUS_COLORS[step.status],
                  )}
                >
                  {STATUS_LABELS[step.status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{step.description}</p>

              {step.disclosure ? (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                  {step.disclosure.text}
                </div>
              ) : null}

              {templateRequiresDiff ? (
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor={`${step.stepId}-diff`}
                    className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                  >
                    Parameter edits
                  </label>
                  <textarea
                    id={`${step.stepId}-diff`}
                    className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Describe at least one parameter change before marking this template complete."
                    value={templateNotes}
                    onChange={(event) => handleTemplateChange(step.stepId, event.target.value)}
                    rows={3}
                    disabled={step.status === 'COMPLETED'}
                  />
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleResolveStep(step)}
                  disabled={disabled}
                  loading={busyStepId === step.stepId}
                  variant={step.status === 'COMPLETED' ? 'ghost' : 'primary'}
                >
                  {step.status === 'COMPLETED' ? 'Completed' : 'Mark as done'}
                </Button>
                {step.requiresDisclosure ? (
                  <p className="text-xs text-slate-500">
                    Selecting this button acknowledges the disclosure copy above.
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Modal>
  );
};
