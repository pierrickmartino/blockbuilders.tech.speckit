export interface SupabaseSessionMetricSnapshot {
  generatedAt: string;
  navigationTimings: {
    timeToFirstByte: number;
    largestContentfulPaint: number;
  };
  api: {
    supabaseLatencyP95: number;
  };
}

export interface SupabaseSessionTestHooks {
  forceSessionRefresh: () => Promise<void> | void;
  setCookiesEnabled: (enabled: boolean) => void;
  getStorageMode: () => 'cookies' | 'memory';
  freezeTime?: (durationMs: number) => void;
  collectMetrics?: () => Promise<SupabaseSessionMetricSnapshot> | SupabaseSessionMetricSnapshot;
  logMetrics?: (snapshot: SupabaseSessionMetricSnapshot) => void;
  getLastMetrics?: () => SupabaseSessionMetricSnapshot | null | undefined;
}

declare global {
  interface Window {
    __supabaseSessionTestHooks?: SupabaseSessionTestHooks;
  }
}

export {};
