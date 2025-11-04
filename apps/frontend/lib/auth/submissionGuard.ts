const SUBMISSION_WINDOW_MS = 5_000;
const REGISTRY_CAPACITY = 500;

type Timestamp = number;

const submissionRegistry = new Map<string, Timestamp>();

const pruneRegistry = (now: number) => {
  if (submissionRegistry.size < REGISTRY_CAPACITY) {
    return;
  }

  for (const [key, timestamp] of submissionRegistry.entries()) {
    if (now - timestamp > SUBMISSION_WINDOW_MS) {
      submissionRegistry.delete(key);
    }
  }
};

export const registerSubmission = (key: string | null | undefined): boolean => {
  if (!key) {
    return true;
  }

  const now = Date.now();
  pruneRegistry(now);

  const lastSeen = submissionRegistry.get(key);
  if (lastSeen && now - lastSeen < SUBMISSION_WINDOW_MS) {
    return false;
  }

  submissionRegistry.set(key, now);
  return true;
};

export const getSubmissionWindowMs = () => SUBMISSION_WINDOW_MS;
