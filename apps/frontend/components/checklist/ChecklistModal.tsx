'use client';

import { useEffect, useMemo, useState } from 'react';

import { markOverrideAction } from '@/app/(protected)/dashboard/onboarding/actions';
import { Button } from '@/components/design-system/Button';
import { Modal } from '@/components/design-system/Modal';
import { cn } from '@/lib/cn';
import type { ChecklistStep, StepStatusPayload } from '@/lib/onboarding/types';

import { DisclosurePanel } from './DisclosurePanel';
import { StepProgressTracker } from './StepProgressTracker';
import { TemplateStep } from './TemplateStep';
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
    overridePending,
    refresh,
    recordBacktestSuccess,
    selectTemplate,
  } = useChecklist();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [confirmImpact, setConfirmImpact] = useState(false);
  const [confirmAuthority, setConfirmAuthority] = useState(false);
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(() => {
    const defaultStep =
      checklist.steps.find((step) => step.status !== 'COMPLETED') ?? checklist.steps[0];
    return defaultStep?.stepId ?? null;
  });

  useEffect(() => {
    if (checklist.steps.length === 0) {
      setActiveStepId(null);
      return;
    }

    if (activeStepId) {
      const stillExists = checklist.steps.some((step) => step.stepId === activeStepId);
      if (!stillExists) {
        const fallback =
          checklist.steps.find((step) => step.status !== 'COMPLETED') ?? checklist.steps[0];
        setActiveStepId(fallback?.stepId ?? null);
        return;
      }

      const currentStep = checklist.steps.find((step) => step.stepId === activeStepId);
      if (currentStep?.status === 'COMPLETED') {
        const nextIncomplete = checklist.steps.find((step) => step.status !== 'COMPLETED');
        if (nextIncomplete && nextIncomplete.stepId !== currentStep.stepId) {
          setActiveStepId(nextIncomplete.stepId);
        }
      }
      return;
    }

    const defaultStep =
      checklist.steps.find((step) => step.status !== 'COMPLETED') ?? checklist.steps[0];
    setActiveStepId(defaultStep?.stepId ?? null);
  }, [activeStepId, checklist.steps]);

  const incompleteCount = useMemo(
    () => checklist.steps.filter((step) => step.status !== 'COMPLETED').length,
    [checklist.steps],
  );
  const localeApproval = checklist.localeApproval;
  const pendingLocaleApproval = Boolean(localeApproval && localeApproval.approved === false);
  const localeEvidenceLink = localeApproval?.evidenceLink ?? '/docs/qa/onboarding-checklist.md';
  const activeStep = useMemo(() => {
    if (!activeStepId) {
      return checklist.steps[0] ?? null;
    }
    return checklist.steps.find((step) => step.stepId === activeStepId) ?? checklist.steps[0] ?? null;
  }, [activeStepId, checklist.steps]);
  const activeStepIndex = activeStep
    ? checklist.steps.findIndex((step) => step.stepId === activeStep.stepId)
    : -1;

  const handleResolveStep = (step: ChecklistStep) => {
    if (pendingLocaleApproval) {
      return;
    }
    const payload: StepStatusPayload = {
      status: 'COMPLETED',
    };

    if (step.requiresDisclosure) {
      payload.acknowledgementToken = step.disclosure?.acknowledgementToken ?? null;
    }

    completeStep(step.stepId, payload);
  };

  const canSubmitOverride =
    overrideReason.trim().length >= 12 && confirmImpact && confirmAuthority;

  const handleSubmitOverride = async () => {
    if (!canSubmitOverride) {
      return;
    }

    setOverrideBusy(true);
    setOverrideError(null);
    try {
      await markOverrideAction({
        reason: overrideReason.trim(),
        confirmationToken: 'override.confirmed.v1',
      });
      setOverrideOpen(false);
      setOverrideReason('');
      setConfirmAuthority(false);
      setConfirmImpact(false);
      refresh();
    } catch (exc) {
      setOverrideError(exc instanceof Error ? exc.message : 'Override failed. Try again.');
    } finally {
      setOverrideBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => setOpen(next)}
      title="Finish setting up your workspace"
      description="Complete the onboarding checklist to unlock starter templates, disclosures, and your first backtest."
      testId="onboarding-checklist-modal"
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500" aria-live="polite">
            {incompleteCount === 0
              ? 'All steps are complete.'
              : `${incompleteCount} ${incompleteCount === 1 ? 'step' : 'steps'} remaining`}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={dismiss}>
              Dismiss checklist
            </Button>
            <Button variant="secondary" onClick={refresh}>
              Reload latest steps
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
        <aside className="space-y-4">
          <StepProgressTracker steps={checklist.steps} />

          {checklist.steps.length > 0 ? (
            <section className="rounded-xl border border-slate-100 bg-white/70 p-4" aria-label="Checklist steps">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Steps</p>
                  <p className="text-xs text-slate-500">Choose a step to focus its details.</p>
                </div>
                <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {activeStepIndex >= 0
                    ? `Step ${activeStepIndex + 1} of ${checklist.steps.length}`
                    : `${checklist.steps.length} total`}
                </p>
              </div>
              <ol className="mt-4 space-y-2 lg:max-h-[60vh] lg:overflow-y-auto">
                {checklist.steps.map((step, index) => {
                  const selected = activeStep?.stepId === step.stepId;
                  return (
                    <li key={step.stepId}>
                      <button
                        type="button"
                        className={cn(
                          'w-full rounded-lg border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          selected
                            ? 'border-slate-900 bg-white shadow-sm'
                            : 'border-transparent bg-slate-100/70 hover:border-slate-200',
                        )}
                        onClick={() => setActiveStepId(step.stepId)}
                        aria-current={selected ? 'true' : undefined}
                        data-testid={`step-nav-${step.stepId}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-widest text-slate-400">
                              Step {index + 1}
                            </p>
                            <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-2 py-1 text-[11px] font-semibold whitespace-nowrap',
                              STATUS_COLORS[step.status],
                            )}
                            data-testid={`step-${step.stepId}-status`}
                          >
                            {STATUS_LABELS[step.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{step.description}</p>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No onboarding steps are defined for this workspace.
            </section>
          )}
        </aside>

        <section className="space-y-4">
          {definitionChanged ? (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              role="status"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>Checklist definition updated. Reload to ensure progress reflects the latest flow.</p>
                <Button size="sm" variant="secondary" onClick={refresh}>
                  Reload checklist
                </Button>
              </div>
            </div>
          ) : null}

          {overridePending ? (
            <div
              className="rounded-md border border-fuchsia-300 bg-fuchsia-50 p-4 text-sm text-fuchsia-900"
              role="status"
              aria-label="Override status"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Override pending</p>
                  <p className="text-xs text-fuchsia-800">
                    Activation metrics will update once a successful backtest is recorded.
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={recordBacktestSuccess}>
                  Record backtest success
                </Button>
              </div>
            </div>
          ) : null}

          {pendingLocaleApproval ? (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              role="alert"
              data-testid="locale-approval-alert"
            >
              <p className="font-semibold">Copy pending approval</p>
              <p className="mt-1">
                Locale {localeApproval?.locale ?? 'current'} is awaiting legal approval. Disclosures cannot be completed
                until compliance records the review.{' '}
                <a className="underline" href={localeEvidenceLink} target="_blank" rel="noreferrer">
                  View QA evidence
                </a>
                .
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          {activeStep ? (
            <section
              className="rounded-xl border border-slate-100 bg-white/70 p-4 shadow-sm"
              data-testid={`checklist-step-${activeStep.stepId}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Step {activeStepIndex + 1}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">{activeStep.title}</h3>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
                    STATUS_COLORS[activeStep.status],
                  )}
                >
                  {STATUS_LABELS[activeStep.status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{activeStep.description}</p>

              {activeStep.disclosure ? <DisclosurePanel text={activeStep.disclosure.text} /> : null}

              {activeStep.overrideReason ? (
                <p className="mt-2 text-xs text-amber-600" role="note">
                  Completed via override ({activeStep.overrideActorRole ?? 'teammate'}): {activeStep.overrideReason}
                </p>
              ) : null}

              {activeStep.requiresTemplateEdit ? (
                <div className="mt-4">
                  <TemplateStep
                    step={activeStep}
                    busy={busyStepId === activeStep.stepId}
                    disabled={activeStep.status === 'COMPLETED' || pendingLocaleApproval}
                    onSelectTemplate={selectTemplate}
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => handleResolveStep(activeStep)}
                    disabled={activeStep.status === 'COMPLETED' || pendingLocaleApproval}
                    loading={busyStepId === activeStep.stepId}
                    variant={activeStep.status === 'COMPLETED' ? 'ghost' : 'primary'}
                  >
                    {activeStep.status === 'COMPLETED'
                      ? `${activeStep.title} complete`
                      : `Mark ${activeStep.title} as done`}
                  </Button>
                  {activeStep.requiresDisclosure ? (
                    <p className="text-xs text-slate-500">
                      Selecting this button acknowledges the disclosure copy above.
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Checklist steps will appear here once defined.
            </section>
          )}

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
            {overrideOpen ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Request checklist override</p>
                    <p className="text-xs text-slate-500">
                      Overrides require dual confirmation and will remain pending until a successful backtest is recorded.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setOverrideOpen(false)}>
                    Cancel
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500" htmlFor="override-reason">
                    Override reason
                  </label>
                  <textarea
                    id="override-reason"
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Provide context for audit logs (min 12 characters)."
                  />
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={confirmImpact}
                      onChange={(event) => setConfirmImpact(event.target.checked)}
                    />
                    I understand the activation impact of marking onboarding complete without a backtest.
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={confirmAuthority}
                      onChange={(event) => setConfirmAuthority(event.target.checked)}
                    />
                    I am authorized to override requirements on behalf of this workspace.
                  </label>
                  {overrideError ? (
                    <p className="text-sm text-rose-600" role="alert">
                      {overrideError}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="primary"
                      onClick={() => {
                        void handleSubmitOverride();
                      }}
                      disabled={!canSubmitOverride || overrideBusy || pendingLocaleApproval}
                      loading={overrideBusy}
                    >
                      Confirm override
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Need to mark onboarding as done?</p>
                  <p className="text-xs text-slate-500">
                    Any teammate can request an override after acknowledging the activation impact.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setOverrideOpen(true)} disabled={pendingLocaleApproval}>
                  Request checklist override
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
};
