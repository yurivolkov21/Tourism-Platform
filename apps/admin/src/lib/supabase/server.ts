import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client (Server Components, Server Actions, route handlers). Reads/writes the
 * session cookies via `next/headers`. The `setAll` try/catch is the documented pattern: writes from a
 * Server Component throw, and that's fine — middleware refreshes the session on the next request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware handles the refresh.
          }
        },
      },
    },
  );
}
