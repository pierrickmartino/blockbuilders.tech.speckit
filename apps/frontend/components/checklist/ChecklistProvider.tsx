'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { ReactNode } from 'react';

import {
  dismissChecklistAction,
  loadChecklistAction,
  recordTelemetryEventAction,
  resetChecklistDismissalAction,
  selectTemplateAction,
  updateStepStatusAction,
} from '@/app/(protected)/dashboard/onboarding/actions';
import { useToast } from '@/components/design-system/Toast';
import { createOnboardingAnalytics } from '@/lib/analytics/onboarding';
import type {
  ChecklistResponse,
  OnboardingTelemetryEvent,
  StepStatusPayload,
  TemplateSelectionPayload,
} from '@/lib/onboarding/types';
import { determineNextIncompleteStep, hasIncompleteSteps } from './stateMachine';

interface ChecklistProviderProps {
  initialChecklist: ChecklistResponse;
  initialOpen: boolean;
  initialDismissed: boolean;
  children: ReactNode;
}

export interface ChecklistContextValue {
  checklist: ChecklistResponse;
  open: boolean;
  dismissed: boolean;
  busyStepId: string | null;
  error: string | null;
  resumeAvailable: boolean;
  definitionChanged: boolean;
  overridePending: boolean;
  refresh: () => void;
  dismiss: () => void;
  resume: () => void;
  recordBacktestSuccess: () => void;
  setOpen: (next: boolean) => void;
  completeStep: (stepId: string, payload: StepStatusPayload) => void;
  selectTemplate: (payload: TemplateSelectionPayload) => void;
}

const ChecklistContext = createContext<ChecklistContextValue | undefined>(undefined);

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Something went wrong while updating the checklist.';
};

export function ChecklistProvider({
  children,
  initialChecklist,
  initialOpen,
  initialDismissed,
}: ChecklistProviderProps) {
  const [checklist, setChecklist] = useState<ChecklistResponse>(initialChecklist);
  const [open, setOpen] = useState<boolean>(initialOpen);
  const [dismissed, setDismissed] = useState<boolean>(initialDismissed);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { showToast } = useToast();
  const analyticsRef = useRef(createOnboardingAnalytics((event: OnboardingTelemetryEvent) => recordTelemetryEventAction(event)));

  const resumeAvailable = useMemo(
    () => hasIncompleteSteps(checklist.steps),
    [checklist.steps],
  );

  const emitEvent = useCallback(
    (event: OnboardingTelemetryEvent) => {
      void analyticsRef.current.emit(event).catch((exc: unknown) => {
        setError(formatError(exc));
      });
    },
    [setError],
  );

  useEffect(() => {
    emitEvent({
      eventType: 'viewed',
      stepId: determineNextIncompleteStep(checklist),
    });
  }, [checklist, emitEvent]);

  useEffect(() => {
    analyticsRef.current.reset();
  }, [checklist.version]);

  const loadLatestChecklist = useCallback(async () => {
    const latest = await loadChecklistAction();
    setChecklist(latest);
    if (latest.definitionChanged) {
      setDismissed(false);
      setOpen(true);
      showToast({
        tone: 'info',
        title: 'Checklist updated',
        description: 'Step definitions changed. Please review the latest requirements.',
      });
    }
  }, [showToast]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        await loadLatestChecklist();
      } catch (exc) {
        setError(formatError(exc));
      }
    });
  }, [loadLatestChecklist]);

  const completeStep = useCallback(
    (stepId: string, payload: StepStatusPayload) => {
      startTransition(async () => {
        setBusyStepId(stepId);
        try {
          const updated = await updateStepStatusAction(stepId, payload);
          setChecklist(updated);
          setOpen(true);
          setError(null);

          if (payload.status === 'COMPLETED') {
            emitEvent({ eventType: 'step_complete', stepId });
            if (payload.acknowledgementToken) {
              emitEvent({ eventType: 'disclosure_ack', stepId });
            }
          } else if (payload.status === 'IN_PROGRESS') {
            emitEvent({ eventType: 'step_start', stepId });
          }
        } catch (exc) {
          setError(formatError(exc));
        } finally {
          setBusyStepId(null);
        }
      });
    },
    [emitEvent],
  );

  const selectTemplate = useCallback(
    (payload: TemplateSelectionPayload) => {
      startTransition(async () => {
        setBusyStepId('select_template');
        try {
          await selectTemplateAction(payload);
          await loadLatestChecklist();
          setOpen(true);
          setError(null);
          emitEvent({ eventType: 'template_selected', stepId: 'select_template', templateId: payload.templateId });
          emitEvent({ eventType: 'step_complete', stepId: 'select_template' });
        } catch (exc) {
          setError(formatError(exc));
        } finally {
          setBusyStepId(null);
        }
      });
    },
    [emitEvent, loadLatestChecklist],
  );

  const dismiss = useCallback(() => {
    startTransition(async () => {
      setOpen(false);
      setDismissed(true);
      try {
        await dismissChecklistAction();
      } catch (exc) {
        setError(formatError(exc));
      }
    });
  }, []);

  const resume = useCallback(() => {
    startTransition(async () => {
      try {
        await resetChecklistDismissalAction();
        setDismissed(false);
        setOpen(true);
        const nextStepId = determineNextIncompleteStep(checklist);
        if (nextStepId) {
          emitEvent({ eventType: 'step_start', stepId: nextStepId });
        }
      } catch (exc) {
        setError(formatError(exc));
      }
    });
  }, [checklist, emitEvent]);

  const recordBacktestSuccess = useCallback(() => {
    startTransition(async () => {
      try {
        await analyticsRef.current.emit({ eventType: 'backtest_success', stepId: 'run_backtest' });
        await analyticsRef.current.emit({ eventType: 'override_pending_cleared', stepId: 'run_backtest' });
        showToast({
          tone: 'success',
          title: 'Override pending cleared',
          description: 'We recorded the first backtest and updated activation metrics.',
        });
        await loadLatestChecklist();
      } catch (exc) {
        setError(formatError(exc));
      }
    });
  }, [loadLatestChecklist, showToast]);

  const value = useMemo<ChecklistContextValue>(
    () => ({
      checklist,
      open,
      dismissed,
      busyStepId,
      error,
      resumeAvailable,
      definitionChanged: checklist.definitionChanged,
      overridePending: checklist.overridePending,
      refresh,
      dismiss,
      resume,
      recordBacktestSuccess,
      setOpen,
      completeStep,
      selectTemplate,
    }),
    [
      checklist,
      open,
      dismissed,
      busyStepId,
      error,
      resumeAvailable,
      refresh,
      dismiss,
      resume,
      recordBacktestSuccess,
      completeStep,
    ],
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

export const useChecklist = (): ChecklistContextValue => {
  const context = useContext(ChecklistContext);
  if (!context) {
    throw new Error('useChecklist must be used within a ChecklistProvider.');
  }
  return context;
};
