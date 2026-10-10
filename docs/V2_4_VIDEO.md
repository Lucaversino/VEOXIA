# VEOX IA Studio V2.4: vídeo Seedance (teste restrito)

Esta versão evolui a **V2.3 enviada pelo usuário**. Preserva o formulário login por e-mail/senha e o painel existente. O login Google 401 não foi modificado.

## Entregue
- Teste de **texto para vídeo**, Seedance 1.5 Pro, 720p, 5 ou 10 segundos (valide entitlement, parâmetros e preço atual no painel BytePlus).
- A chamada é exclusivamente backend e protegida por **UUID `ADMIN_USER_ID`**; `BYTEPLUS_VIDEO_TEST_ENABLED=false` bloqueia a ferramenta por padrão.
- Job local associado ao personagem, `external_task_id` salvo, consulta manual do estado pelo botão **Verificar vídeo BytePlus** em Histórico.
- Quando sucesso, download do vídeo para Supabase Storage privado e vínculo à Biblioteca.
- Todos os usuários comuns são impedidos de solicitar vídeo, inclusive por API.

## Limitações críticas
- **Gerações pagas**: a BytePlus pode cobrar sempre que a tarefa é criada; não há orçamento financeiro/credit ledger finalizado. Ative apenas num ambiente administrativo controlado e autorize conscientemente cada teste.
- **Sem geração de voz, Fish Audio ou lip sync** no MP4. A seção de prévia Fish Audio ainda existe e opera separadamente.
- **Sem image-to-video**: não há URL de referência de imagem conectada nesta etapa.
- Sem verificação de build de produção neste ambiente; execute `npm run build` antes de implantar.
- O download pelo endpoint da Vercel é limitado a 90 MB e 25 segundos. Para arquivos maiores, use worker assíncrono ou transferência por streaming.
- A rota de status depende de acionamento manual; não há reconciliação cron ainda.
- Não assume suporte para modelos/recursos ainda não verificados. O parâmetro `generate_audio` está explicitamente em false.
- Não libera publicamente até existir crédito atômico, custo e quotas. Geração de imagens da V2.3 também demanda controle de gastos antes da abertura pública.
- Não garante exatidão em caso de falha de rede depois da criação da tarefa externa: confira o painel da BytePlus antes de repetir para evitar custo duplicado.

## Testar SEM chamadas pagas
1. Mantenha `BYTEPLUS_VIDEO_TEST_ENABLED=false` e confira que a API responde 403 ao tentar iniciar vídeo.
2. Certifique que o login por e-mail funciona e permite selecionar um personagem.
3. Confira navegação para History e Library e que as tabelas e bucket `creations` existem.
4. Execute os testes estruturais: `npm test`.

## Testar um vídeo pago (somente quando decidir investir)
1. Confirme que seu projeto BytePlus tem acesso ao `seedance-1-5-pro-251215` e preço atualizado.
2. Vercel env: `ADMIN_USER_ID=<UUID autenticado>` e `BYTEPLUS_VIDEO_TEST_ENABLED=true` (apenas para ensaio autorizado).
3. Faça novo deploy; selecione personagem, vídeo, 5 s, 9:16 e gere UMA tarefa.
4. Confira histórico, pressione **Verificar vídeo BytePlus** até concluir.
5. Confira arquivo na Biblioteca; desative a flag após o teste.

## API externa
- https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api
- https://docs.byteplus.com/pt/docs/modelark/get-video-generation-task-api
