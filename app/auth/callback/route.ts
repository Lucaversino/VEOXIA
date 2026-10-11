import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// OAuth PKCE exchange must write cookies to the response returned to the browser.
// Writing only to next/headers cookies() can lose the new session on redirects.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appOrigin = url.origin;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/?auth_error=${reason}`, appOrigin));
  if (url.searchParams.has('error')) {
    console.error('[oauth callback] Google/Supabase returned an error:', url.searchParams.get('error'));
    return fail('oauth');
  }
  const code = url.searchParams.get('code');
  if (!code) return fail('missing_code');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return fail('config');

  const response = NextResponse.redirect(new URL('/?auth_success=1', appOrigin));
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[oauth callback] PKCE session exchange failed:', error.message);
      return fail('exchange');
    }
    return response;
  } catch (error) {
    console.error('[oauth callback] unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    return fail('exchange');
  }
}
