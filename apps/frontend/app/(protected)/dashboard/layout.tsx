import type { ReactNode } from 'react';
import { cookies } from 'next/headers';

import { ChecklistModal } from '@/components/checklist/ChecklistModal';
import { ChecklistProvider } from '@/components/checklist/ChecklistProvider';
import { ChecklistResumeButton } from '@/components/checklist/ChecklistResumeButton';
import { shouldChecklistOpen } from '@/components/checklist/stateMachine';
import { ToastProvider } from '@/components/design-system/Toast';
import { fetchChecklist } from '@/lib/onboarding/api';

const DISMISS_COOKIE = 'onboarding_checklist_dismissed';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const initialChecklist = await fetchChecklist();
  const cookieStore = await cookies();
  const dismissed = cookieStore.get(DISMISS_COOKIE)?.value === '1';
  const initialOpen = shouldChecklistOpen({
    definitionChanged: initialChecklist.definitionChanged,
    dismissed: Boolean(dismissed),
  });

  return (
    <ToastProvider>
      <ChecklistProvider
        initialChecklist={initialChecklist}
        initialOpen={initialOpen}
        initialDismissed={dismissed && !initialChecklist.definitionChanged}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Workspace onboarding</p>
            <h2 className="text-xl font-semibold text-white">Guided checklist</h2>
          </div>
          <ChecklistResumeButton />
        </div>
        {children}
        <ChecklistModal />
      </ChecklistProvider>
    </ToastProvider>
  );
}
