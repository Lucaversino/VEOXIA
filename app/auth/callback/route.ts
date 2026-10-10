import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase-server';
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  if (error) return NextResponse.redirect(new URL('/?auth_error=oauth', origin));
  if (!code) return NextResponse.redirect(new URL('/?auth_error=callback', origin));
  try {
    const db = await serverDb();
    const { error: sessionError } = await db.auth.exchangeCodeForSession(code);
    if (sessionError) return NextResponse.redirect(new URL('/?auth_error=callback', origin));
    return NextResponse.redirect(new URL('/', origin));
  } catch {
    return NextResponse.redirect(new URL('/?auth_error=callback', origin));
  }
}
