'use client';

import type { ChecklistStep } from '@/lib/onboarding/types';
import { cn } from '@/lib/cn';

interface StepProgressTrackerProps {
  steps: ChecklistStep[];
}

export const StepProgressTracker = ({ steps }: StepProgressTrackerProps) => {
  const total = steps.length;
  const completed = steps.filter((step) => step.status === 'COMPLETED').length;
  const remaining = total - completed;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section
      className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3"
      role="status"
      aria-label="Checklist progress"
      data-testid="checklist-progress"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Progress</p>
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-1 text-slate-900">
          <span className="text-2xl font-bold">{progressPercent}%</span>
          <span className="text-xs text-slate-500">complete</span>
        </div>
        <div className="flex-1 rounded-full bg-white/80">
          <div
            className={cn('h-2 rounded-full bg-emerald-500 transition-[width]')}
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {remaining === 0
          ? 'All steps are complete.'
          : `${remaining} ${remaining === 1 ? 'step' : 'steps'} remaining`}
      </p>
    </section>
  );
};
