import { NextRequest,NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase';
export async function GET(request:NextRequest){const url=new URL(request.url);const code=url.searchParams.get('code');if(code){const db=await serverDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/',request.url))}return NextResponse.redirect(new URL('/?auth_error=1',request.url))}
