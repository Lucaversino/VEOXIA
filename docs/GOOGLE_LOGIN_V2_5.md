# Login Google - VEOX IA Studio 2.5

## Configuração externa obrigatória (não incluída no ZIP)

1. **Supabase > Authentication > Providers > Google**: ativar Google. Inserir o **Client ID** e **Client Secret** criados no Google Cloud. Salvar.
2. **Supabase > Authentication > URL Configuration**: Site URL `https://veoxia.vercel.app` e Additional Redirect URLs incluindo `https://veoxia.vercel.app/auth/callback` (para previews, adicionar separadamente origens autorizadas, nunca um domínio arbitrário).
3. **Google Cloud > APIs & Services > Credentials > OAuth 2.0 Client IDs**: criar/editar um cliente do tipo **Web application**. Em **Authorized redirect URIs**, incluir exatamente `https://<SEU_PROJECT_REF>.supabase.co/auth/v1/callback`, conforme o endereço mostrado no painel do provedor Google no Supabase. **Não** cadastrar `/auth/callback` da Vercel neste campo: Google devolve ao Supabase, que redireciona para o site.
4. Configure tela de consentimento OAuth no Google Cloud. Se estiver em modo Testing, adicione o endereço que vai fazer login em **Test users**. Em produção, complete os requisitos de publicação/consentimento aplicáveis.
5. **Vercel > Project > Settings > Environment Variables**: garantir `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, para Production (e outros ambientes usados). Fazer **Redeploy** após alterações.

## Fluxo corrigido

Browser -> Supabase OAuth -> Google -> Supabase `/auth/v1/callback` -> VEOX `/auth/callback?code=...` -> troca PKCE e salva cookies na resposta HTTP -> `/`.

## Teste

1. Abrir `https://veoxia.vercel.app` em janela anônima.
2. Clicar em Entrar -> Continuar com Google.
3. Escolher conta de teste autorizada.
4. Confirmar retorno à página principal mostrando e-mail, e entrar em Personagens.
5. Atualizar a página e confirmar que a sessão persiste.
6. Clicar em Sair e confirmar sessão encerrada.

Se falhar, verificar a mensagem na página e os logs de `GET /auth/callback` no Vercel. Nunca publicar Client Secret, service role key nem credenciais no frontend.

**Importante:** o código não consegue ativar automaticamente o provedor nem configurar o projeto de Google Cloud. Essas etapas requerem acesso às respectivas contas.
