import type { SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

export interface SupabaseAuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at?: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: 'bearer';
  email_confirmed: boolean;
  user: SupabaseAuthUser;
}
