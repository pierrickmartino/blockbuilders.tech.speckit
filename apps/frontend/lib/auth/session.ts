import type { Session, User } from '@supabase/supabase-js';

import type { SupabaseAuthSession } from '@/lib/supabase/types';

export const toAuthSession = (
  session: Session | null,
  user: User | null,
): SupabaseAuthSession | null => {
  if (!session || !user) {
    return null;
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? '',
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000),
    token_type: (session.token_type ?? 'bearer') as SupabaseAuthSession['token_type'],
    email_confirmed: Boolean(user.email_confirmed_at),
    user: {
      id: user.id,
      email: user.email ?? '',
      email_confirmed_at: user.email_confirmed_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
      app_metadata: user.app_metadata ?? {},
      user_metadata: user.user_metadata ?? {},
    },
  };
};
