import type { ChecklistResponse, ChecklistStep } from '@/lib/onboarding/types';

export const hasIncompleteSteps = (steps: ChecklistStep[]): boolean =>
  steps.some((step) => step.status !== 'COMPLETED');

export const determineNextIncompleteStep = (
  checklist: ChecklistResponse | ChecklistStep[],
): string | undefined => {
  const steps = Array.isArray(checklist) ? checklist : checklist.steps;
  const next = steps.find((step) => step.status !== 'COMPLETED');
  return next?.stepId;
};

export const shouldChecklistOpen = ({
  definitionChanged,
  dismissed,
}: {
  definitionChanged: boolean;
  dismissed: boolean;
}): boolean => {
  if (definitionChanged) {
    return true;
  }
  return !dismissed;
};
