import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Customer-web proxy (Next 16's `middleware` convention is `proxy` here). The public site is fully
 * static/ISR, so — unlike the admin app — this does NOT wrap every route. The matcher below scopes it
 * to `/account*` only: it refreshes the Supabase session (official `@supabase/ssr` pattern) and
 * redirects an unauthenticated visitor to `/login?redirect=<path>`. Public pages never run this, so
 * they stay statically optimised.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

// Scope to the account area only — the rest of the site is public + static.
export const config = {
  matcher: ['/account/:path*'],
};
