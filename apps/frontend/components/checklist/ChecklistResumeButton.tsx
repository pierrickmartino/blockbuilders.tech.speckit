'use client';

import { Button } from '@/components/design-system/Button';

import { useChecklist } from './ChecklistProvider';

export const ChecklistResumeButton = () => {
  const { dismissed, resume, resumeAvailable, definitionChanged, setOpen } = useChecklist();

  if (!resumeAvailable && !definitionChanged) {
    return null;
  }

  if (!dismissed || definitionChanged) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {definitionChanged ? 'Checklist updated – review' : 'View onboarding checklist'}
      </Button>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={resume}>
      Resume onboarding
    </Button>
  );
};
