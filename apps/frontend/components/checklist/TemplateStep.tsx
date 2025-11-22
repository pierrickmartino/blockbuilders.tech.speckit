'use client';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { TemplateCanvas } from '@/components/templates/TemplateCanvas';
import { cn } from '@/lib/cn';
import type {
  ChecklistStep,
  StarterTemplate,
  TemplateSelectionPayload,
} from '@/lib/onboarding/types';

interface TemplateStepProps {
  step: ChecklistStep;
  busy: boolean;
  disabled: boolean;
  onSelectTemplate: (payload: TemplateSelectionPayload) => void | Promise<void>;
}

type ParameterValues = Record<string, string>;

export const TemplateStep = ({ step, busy, disabled, onSelectTemplate }: TemplateStepProps) => {
  const templates = useMemo(() => step.templates ?? [], [step.templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.templateId ?? null);
  const [draftName, setDraftName] = useState('');
  const [parameterValues, setParameterValues] = useState<ParameterValues>({});
  const [error, setError] = useState<string | null>(null);

  const activeTemplate = templates.find((template) => template.templateId === selectedTemplateId) ?? null;

  useEffect(() => {
    if (!activeTemplate) {
      setParameterValues({});
      return;
    }
    const defaults = normaliseParameters(activeTemplate.defaultParameters);
    setParameterValues(defaults);
    setError(null);
  }, [activeTemplate]);

  if (!step.templatesAvailable || templates.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold">Templates are temporarily unavailable.</p>
        <p className="mt-1">
          Explore the documented playbooks while we restore curated templates.
          <a
            className="ml-2 text-primary underline"
            href="/docs/templates/strategy-library.md"
            target="_blank"
            rel="noreferrer"
          >
            Explore the strategy library
          </a>
        </p>
      </div>
    );
  }

  const handleTemplateSelect = (template: StarterTemplate) => {
    setSelectedTemplateId(template.templateId);
    setDraftName(`${template.title} draft`);
  };

  const handleParameterChange = (key: string, value: string) => {
    setParameterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!activeTemplate) {
      return;
    }
    setError(null);
    try {
      const diff = computeParameterDiff(activeTemplate.defaultParameters, parameterValues);
      await onSelectTemplate({
        templateId: activeTemplate.templateId,
        parameterChanges: diff,
        draftName: draftName.trim() || `${activeTemplate.title} draft`,
        canvasContext: activeTemplate.reactFlow,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save template selection.';
      setError(message);
    }
  };

  const parameterKeys = Object.keys(activeTemplate?.defaultParameters ?? {});
  const hasChanges = activeTemplate ? hasParameterChanges(activeTemplate.defaultParameters, parameterValues) : false;
  const disableSubmit = disabled || busy || !activeTemplate || !hasChanges;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <button
            type="button"
            key={template.templateId}
            className={cn(
              'rounded-xl border p-4 text-left transition',
              selectedTemplateId === template.templateId
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
            onClick={() => handleTemplateSelect(template)}
            disabled={disabled}
          >
            <p className="text-xs uppercase tracking-widest text-slate-400">Starter template</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{template.title}</p>
            <p className="mt-2 text-sm text-slate-600">{template.description}</p>
            <p className="mt-3 text-xs text-slate-500">Estimated run time: {template.estimatedRunTime}</p>
            <span className="sr-only">Use {template.title}</span>
          </button>
        ))}
      </div>

      {activeTemplate ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{activeTemplate.title}</p>
              <p className="text-xs text-slate-500">Edit at least one parameter before saving the draft.</p>
            </div>
            <label className="flex flex-col text-xs text-slate-500">
              Draft name
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="mt-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., Momentum kickstart"
                disabled={disabled}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {parameterKeys.map((key) => (
              <label key={key} className="text-sm text-slate-700">
                {formatParameterLabel(key)}
                <input
                  type={typeof activeTemplate.defaultParameters[key] === 'number' ? 'number' : 'text'}
                  value={parameterValues[key] ?? ''}
                  onChange={(event) => handleParameterChange(key, event.target.value)}
                  aria-label={formatParameterLabel(key)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={disabled}
                />
              </label>
            ))}
          </div>

          <TemplateCanvas schema={activeTemplate.reactFlow} />

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSubmit} disabled={disableSubmit} loading={busy} variant="primary">
              Save template & continue
            </Button>
            <p className="text-xs text-slate-500">
              Completion unlocks the backtest step and records a template_selected event.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const computeParameterDiff = (
  defaults: Record<string, unknown>,
  nextValues: Record<string, unknown>,
): Record<string, unknown> => {
  if (Object.getPrototypeOf(nextValues) !== Object.prototype) {
    throw new Error('Invalid parameter payload');
  }
  Object.keys(nextValues).forEach((key) => {
    if (key === '__proto__' || key === 'constructor') {
      throw new Error('Invalid parameter key');
    }
    if (!(key in defaults)) {
      throw new Error(`Invalid parameter key: ${key}`);
    }
  });

  const sanitized: Record<string, unknown> = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!(key in nextValues)) {
      continue;
    }
    const proposed = nextValues[key];
    const normalised = coerceValue(defaultValue, proposed);
    if (!isEqual(normalised, defaultValue)) {
      sanitized[key] = normalised;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new Error('Parameter changes required before saving the template');
  }

  return sanitized;
};

const hasParameterChanges = (
  defaults: Record<string, unknown>,
  nextValues: Record<string, unknown>,
): boolean => {
  try {
    computeParameterDiff(defaults, nextValues);
    return true;
  } catch {
    return false;
  }
};

const normaliseParameters = (params: Record<string, unknown>): ParameterValues => {
  return Object.entries(params).reduce<ParameterValues>((acc, [key, value]) => {
    acc[key] = value === undefined || value === null ? '' : String(value);
    return acc;
  }, {});
};

const formatParameterLabel = (key: string): string => {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
};

const coerceValue = (expected: unknown, provided: unknown): unknown => {
  if (typeof expected === 'number') {
    const numeric = typeof provided === 'number' ? provided : Number(provided);
    if (Number.isNaN(numeric)) {
      throw new Error('Parameter value must be numeric');
    }
    return expected % 1 === 0 ? Math.trunc(numeric) : Number(numeric);
  }

  if (typeof expected === 'string') {
    if (typeof provided !== 'string') {
      throw new Error('Parameter value must be text');
    }
    return provided.trim();
  }

  if (typeof expected === 'boolean') {
    if (typeof provided === 'boolean') {
      return provided;
    }
    if (typeof provided === 'string') {
      const lowered = provided.toLowerCase();
      if (['true', '1', 'yes'].includes(lowered)) {
        return true;
      }
      if (['false', '0', 'no'].includes(lowered)) {
        return false;
      }
    }
    throw new Error('Parameter value must be a boolean');
  }

  if (typeof provided === 'object') {
    throw new Error('Complex parameter payloads are not supported');
  }

  return provided;
};

const isEqual = (next: unknown, current: unknown): boolean => {
  if (typeof next !== typeof current) {
    return false;
  }
  if (typeof next === 'number' && typeof current === 'number') {
    return Number(next) === Number(current);
  }
  return next === current;
};
