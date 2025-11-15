import { describe, expect, it } from 'vitest';

import type { ChecklistResponse } from '@/lib/onboarding/types';

import {
  determineNextIncompleteStep,
  hasIncompleteSteps,
  shouldChecklistOpen,
} from '../stateMachine';

const buildChecklist = (statuses: Array<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>): ChecklistResponse => ({
  checklistId: 'abc',
  version: 1,
  definitionChanged: false,
  steps: statuses.map((status, index) => ({
    stepId: `step-${index + 1}`,
    title: `Step ${index + 1}`,
    description: 'Mock',
    requiresDisclosure: index === 0,
    requiresTemplateEdit: index === 2,
    status,
    disclosure: index === 0 ? { text: 'Disclosure', acknowledgementToken: 'ack-token' } : undefined,
    templateId: null,
  })),
});

describe('checklist state machine helpers', () => {
  it('detects the next incomplete step', () => {
    const checklist = buildChecklist(['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED']);
    expect(determineNextIncompleteStep(checklist)).toEqual('step-2');
  });

  it('returns undefined when all steps are complete', () => {
    const checklist = buildChecklist(['COMPLETED', 'COMPLETED']);
    expect(determineNextIncompleteStep(checklist)).toBeUndefined();
  });

  it('flags when incomplete steps remain', () => {
    expect(hasIncompleteSteps(buildChecklist(['COMPLETED']).steps)).toBe(false);
    expect(hasIncompleteSteps(buildChecklist(['COMPLETED', 'NOT_STARTED']).steps)).toBe(true);
  });

  it('forces the modal open when the definition changed regardless of dismissal', () => {
    expect(
      shouldChecklistOpen({
        definitionChanged: true,
        dismissed: true,
      }),
    ).toBe(true);
  });

  it('respects dismissal when the definition is unchanged', () => {
    expect(
      shouldChecklistOpen({
        definitionChanged: false,
        dismissed: true,
      }),
    ).toBe(false);
    expect(
      shouldChecklistOpen({
        definitionChanged: false,
        dismissed: false,
      }),
    ).toBe(true);
  });
});
