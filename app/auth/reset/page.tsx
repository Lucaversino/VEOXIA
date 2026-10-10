'use client';
import { useEffect, useState } from 'react';
import { browserDb, configured } from '@/lib/supabase';
export default function ResetPassword() {
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!configured()){setMessage('Supabase não configurado.');return;}
    const db=browserDb();
    db.auth.getSession().then(({data})=>setReady(Boolean(data.session)));
    const {data:listener}=db.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'||session)setReady(true)});
    return ()=>listener.subscription.unsubscribe();
  },[]);
  async function changePassword(e:React.FormEvent){e.preventDefault();if(password.length<8){setMessage('A senha deve ter pelo menos 8 caracteres.');return;}const {error}=await browserDb().auth.updateUser({password});if(error){setMessage(error.message);return;}setMessage('Senha atualizada. Volte à página inicial para entrar.');}
  return <main style={{maxWidth:440,margin:'10vh auto',padding:24,color:'white'}}><h1>Redefinir senha</h1><p>Abra esta página pelo link enviado ao seu e-mail.</p><form onSubmit={changePassword} style={{display:'grid',gap:12}}><input type="password" aria-label="Nova senha" autoComplete="new-password" placeholder="Nova senha (mín. 8 caracteres)" value={password} onChange={e=>setPassword(e.target.value)} required/><button disabled={!ready} type="submit">Salvar nova senha</button></form><p role="status">{message||(!ready?'Aguardando confirmação do link...':'')}</p><a href="/">Voltar ao VEOX IA</a></main>;
}
