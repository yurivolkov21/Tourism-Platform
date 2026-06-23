import { redirect } from 'next/navigation';

import { createClient } from '../supabase/server';

/**
 * Returns the signed-in Supabase user, or redirects to `/login`. Use at the top of protected
 * server components. (The ADMIN-role gate itself is enforced by the API — sign-in calls
 * `/auth/admin/sync`, which 403s non-allowlisted emails — so a present session here means admin.)
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}
