'use client';

import { useCallback, useState } from 'react';

import { useSupabaseSession } from '@/lib/auth/useSupabaseSession';

export const SignOutButton = () => {
  const { signOut, status } = useSupabaseSession();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = useCallback(() => {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    void signOut().finally(() => {
      setIsProcessing(false);
    });
  }, [isProcessing, signOut]);

  const isDisabled = isProcessing || status === 'loading';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isProcessing ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
          Signing out…
        </span>
      ) : (
        'Sign out'
      )}
    </button>
  );
};
