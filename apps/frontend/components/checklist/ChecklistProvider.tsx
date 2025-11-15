'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import type { ReactNode } from 'react';

import {
  dismissChecklistAction,
  loadChecklistAction,
  recordTelemetryEventAction,
  resetChecklistDismissalAction,
  updateStepStatusAction,
} from '@/app/(protected)/dashboard/onboarding/actions';
import type {
  ChecklistResponse,
  OnboardingTelemetryEvent,
  StepStatusPayload,
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
  refresh: () => void;
  dismiss: () => void;
  resume: () => void;
  setOpen: (next: boolean) => void;
  completeStep: (stepId: string, payload: StepStatusPayload) => void;
  emitEvent: (event: OnboardingTelemetryEvent) => void;
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

  const resumeAvailable = useMemo(
    () => hasIncompleteSteps(checklist.steps),
    [checklist.steps],
  );

  const emitEvent = useCallback((event: OnboardingTelemetryEvent) => {
    void recordTelemetryEventAction(event);
  }, []);

  useEffect(() => {
    emitEvent({
      eventType: 'viewed',
      stepId: determineNextIncompleteStep(checklist),
    });
  }, [checklist, emitEvent]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const latest = await loadChecklistAction();
        setChecklist(latest);
        if (latest.definitionChanged) {
          setDismissed(false);
          setOpen(true);
        }
      } catch (exc) {
        setError(formatError(exc));
      }
    });
  }, []);

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

  const value = useMemo<ChecklistContextValue>(
    () => ({
      checklist,
      open,
      dismissed,
      busyStepId,
      error,
      resumeAvailable,
      definitionChanged: checklist.definitionChanged,
      refresh,
      dismiss,
      resume,
      setOpen,
      completeStep,
      emitEvent,
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
      completeStep,
      emitEvent,
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
