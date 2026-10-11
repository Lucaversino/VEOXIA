import 'server-only';
import {requireUser} from './supabase-server';
export const ADMIN_EMAIL='brendaelucas.765@gmail.com';
export async function requireAdmin(){
 const session=await requireUser();
 const verified=session.user?.email?.toLowerCase()===ADMIN_EMAIL && !!session.user?.email_confirmed_at;
 if(!verified || (process.env.ADMIN_USER_ID && session.user?.id!==process.env.ADMIN_USER_ID)) return {...session,isAdmin:false};
 return {...session,isAdmin:true};
}
