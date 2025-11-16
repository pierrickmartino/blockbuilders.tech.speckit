import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChecklistStep, StarterTemplate } from '@/lib/onboarding/types';

import { TemplateStep } from '../TemplateStep';

const buildTemplates = (): StarterTemplate[] => [
  {
    templateId: '00000000-0000-0000-0000-00000000a11a',
    title: 'Momentum Starter',
    description: 'Follows short-term momentum with guard rails.',
    estimatedRunTime: '≤5 min',
    defaultParameters: {
      riskTolerance: 'low',
      capitalAllocation: 25,
    },
    reactFlow: {
      nodes: [
        {
          id: 'source',
          type: 'input',
          position: { x: 0, y: 0 },
          data: { label: 'Source' },
        },
        {
          id: 'momentum',
          position: { x: 200, y: 100 },
          data: { label: 'Momentum filter' },
        },
      ],
      edges: [
        { id: 'source-momentum', source: 'source', target: 'momentum' },
      ],
    },
  },
];

const buildStep = (overrides: Partial<ChecklistStep> = {}): ChecklistStep => ({
  stepId: 'select_template',
  title: 'Choose a starter template',
  description: 'Pick a curated template and edit a parameter.',
  requiresDisclosure: false,
  requiresTemplateEdit: true,
  status: 'NOT_STARTED',
  templates: buildTemplates(),
  templatesAvailable: true,
  ...overrides,
});

describe('TemplateStep', () => {
  it('submits the parameter diff and canvas context when a template is edited', () => {
    const onSelect = vi.fn().mockResolvedValue(undefined);
    render(
      <TemplateStep
        step={buildStep()}
        busy={false}
        disabled={false}
        onSelectTemplate={onSelect}
      />,
    );

    const useButton = screen.getByRole('button', { name: /Use Momentum Starter/i });
    fireEvent.click(useButton);

    const riskInput = screen.getByLabelText(/Risk tolerance/i);
    fireEvent.change(riskInput, { target: { value: 'balanced' } });

    const saveButton = screen.getByRole('button', { name: /Save template & continue/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [sampleTemplate] = buildTemplates();
    if (!sampleTemplate) {
      throw new Error('No template available in fixture');
    }

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: sampleTemplate.templateId,
        parameterChanges: { riskTolerance: 'balanced' },
        canvasContext: sampleTemplate.reactFlow,
      }),
    );
  });

  it('disables the save control until at least one parameter changes', () => {
    const onSelect = vi.fn().mockResolvedValue(undefined);
    render(
      <TemplateStep
        step={buildStep()}
        busy={false}
        disabled={false}
        onSelectTemplate={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Use Momentum Starter/i }));

    const saveButton = screen.getByRole('button', { name: /Save template & continue/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Capital allocation/i), { target: { value: '35' } });
    expect(saveButton).not.toBeDisabled();
  });

  it('renders the fallback CTA when templates are unavailable', () => {
    const onSelect = vi.fn().mockResolvedValue(undefined);
    render(
      <TemplateStep
        step={buildStep({ templates: [], templatesAvailable: false })}
        busy={false}
        disabled={false}
        onSelectTemplate={onSelect}
      />,
    );

    expect(screen.getByText(/Templates are temporarily unavailable/i)).toBeVisible();
    const fallbackLink = screen.getByRole('link', { name: /Explore the strategy library/i });
    expect(fallbackLink).toHaveAttribute('href', '/docs/templates/strategy-library.md');
  });
});
