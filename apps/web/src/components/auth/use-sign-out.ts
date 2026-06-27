'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { createClient } from '../../lib/supabase/client';

/**
 * Sign out in the **browser** (not a server action) so the Supabase client fires `onAuthStateChange`
 * and the navbar's AuthProvider clears immediately — no manual reload. Then navigate home and refresh
 * server components so any auth-gated server render re-evaluates.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  return useCallback(async () => {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }, [router]);
}
