import { useSupabaseSessionContext } from '@/components/auth/SupabaseSessionProvider';

export const useSupabaseSession = () => {
  const context = useSupabaseSessionContext();

  if (!context) {
    throw new Error('useSupabaseSession must be used within a SupabaseSessionProvider.');
  }

  return context;
};
