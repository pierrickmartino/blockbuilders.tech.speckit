export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemePreferencePayload {
  mode: ThemeMode;
}

export interface ThemePreferenceResponse extends ThemePreferencePayload {
  source: 'cookie' | 'fallback';
  updatedAt: string;
}
