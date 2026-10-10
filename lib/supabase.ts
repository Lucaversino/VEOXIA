import { createBrowserClient } from '@supabase/ssr';
export { configured } from './supabase-config';
import { configured } from './supabase-config';
export const browserDb = () => {if(!configured()) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)};
