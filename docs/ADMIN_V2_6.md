# VEOX 2.6: Painel administrativo

1. Execute `supabase/migrations/004_admin_credits.sql` no SQL Editor do mesmo projeto Supabase da Vercel. A migração inicial `001_init.sql` deve ter sido executada anteriormente.
2. Mantenha `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no ambiente de servidor da Vercel. Configure `ADMIN_USER_ID` com o UUID do usuário autenticado de `brendaelucas.765@gmail.com`. O servidor verifica ambos UUID (quando fornecido) e e-mail confirmado. **Não compartilhe a chave service role.**
3. Faça deploy e acesse `/admin` autenticado. Apenas a conta permitida acessa as APIs de administração; outros usuários recebem 403.
4. O campo de quantidade de crédito aceita inteiros positivos (adicionar) ou negativos (remover), com justificativa e histórico. Não há pagamento Pix nesta versão.
5. `VEOX_IMAGE_CREDIT_PRICE=1` define o custo em **créditos internos** de cada imagem. A geração BytePlus exige saldo e reserva os créditos com função SQL atômica. Em falha, tenta estornar. Verifique manualmente possíveis casos em que a API faturou mas o download falhou, ou o estorno falhou. Uma trava financeira mais completa ainda depende de reconciliação e orçamento.
6. `VEOX_PUBLIC_GENERATION_ENABLED=false` (padrão) mantém a geração real restrita à conta do administrador. Mesmo admin precisa de créditos adicionados no painel. Para abrir a outros usuários é necessário implementar orçamento/limites por período, monitoramento e pagamentos; não habilite `true` antes disso.
7. Seedance está bloqueado, independentemente da configuração antiga de vídeo.
8. Total de tokens/custos de API **não disponível** para históricos antigos. O painel exibe o estado real dos jobs e declara a falta de dados. A carteira não equivale a custos reais da BytePlus.
9. Exibição limitada à primeira página de 1000 usuários, últimas 300 gerações e 100 transações; indique paginação futura se necessário.
10. Se a API administrativa falhar com função inexistente, execute a migração SQL antes do uso.
