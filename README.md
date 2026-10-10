# VEOX IA Studio 2.0 - Fundamentos

# VEOX IA Studio 2.0 - Migration and delivery status

This revision is **Phase 1, foundations**, not a completed commercial platform.

## Delivered in this ZIP
- Preserves V1.5 AI Influencer pages, Supabase auth, Fish Audio voice preview and ComfyUI worker source.
- Adds the `BytePlusProvider` server module (image/video create and video polling) based on official ModelArk endpoints.
- Adds a protected provider configuration status endpoint (does NOT charge anything).
- Adds additive SQL migration for role, model catalog, prices, credits reservations, payments ledger groundwork, user limits and costs.
- Updates the public brand direction to violet/blue with no subscriptions advertised.
- Keeps the existing GPU generation behind GPU_QUEUE_ENABLED=false until worker is operational.

## NOT delivered or NOT functional yet
- BytePlus paid generation routes, UI calling BytePlus, automatic billing, Mercado Pago Pix and webhooks.
- Character swap and motion control: must validate entitlement and exact request schema for LAS operator.
- Admin financial dashboard and cost reconciliation worker.
- Production-ready credits atomic reserve/capture/release mechanism.
- 4K video pipeline, LoRA training and lip sync of Fish Audio with a video character.
- No paid provider calls were made.

## Essential safety decisions
1. Keep BYTEPLUS_GENERATION_ENABLED=false until pricing, caps and idempotency are tested.
2. Never provision admin by client-supplied email; only verified Supabase Auth user UUID can be granted server-side.
3. Run migration 003 on a staging project first. Back up the production database.
4. The BytePlus API requires server-side API key. The database defaults all models disabled.
5. Keep payment webhooks disabled until signatures and remote transaction checks are implemented.

## Required environment additions
BYTEPLUS_API_KEY=   # server secret
BYTEPLUS_GENERATION_ENABLED=false
BYTEPLUS_REGION=ap-southeast
# Optional legacy ComfyUI as before: GPU_QUEUE_ENABLED=false

## Official API docs
- https://docs.byteplus.com/en/docs/ModelArk/image-generation-api
- https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api
- https://docs.byteplus.com/pt/docs/modelark/get-video-generation-task-api
- https://docs.byteplus.com/en/docs/Byteplus_LAS/Enhanced_video_editing


## V1.5 base

# VEOX AI Influencer Studio v1.0

Projeto Next.js + Supabase + Fish Audio com interface inspirada visualmente na referência enviada. A imagem usada como referência de design está em `public/design-reference.png` (não é integrada como UI estática).

## O que está pronto

- Interface responsiva, dark premium e neon, com navegação operacional entre Explorar, Criar, Personagens, Biblioteca, Histórico e Vozes.
- Login com Google (Supabase OAuth), callback e sessão persistente, condicionado à configuração.
- Criação de perfis de influencers no banco, listagem, escolha e busca por usuário.
- Galeria de inspiração editorial, identificada explicitamente como *não gerada*. As fotos são URLs externas de exemplo e não são identidades IA.
- API real Fish Audio `/v1/tts` para geração e reprodução de prévia da voz, condicionada à chave e a uma referência aprovada no catálogo.
- Criação/consulta de jobs reais no banco, sincronização periódica do histórico e galeria de arquivos privados com URLs assinadas.
- Esquema SQL com RLS, buckets privados, constraints e tabelas de controle financeiro preparadas.
- Worker Python de **imagem** usando ComfyUI, executável em GPU externa (exige workflow API configurado).
- SEO técnico base: HTML pt-BR, metadata, OpenGraph, Twitter, robots, sitemap e URLs canônicas por implantação.
- Feedback explícito para integrações ausentes. Nenhum botão promete ter criado vídeos quando um pipeline não está conectado.

## O que AINDA NÃO está pronto

- Treinamento LoRA, upload da foto de referência e controle de identidade facial.
- Pipeline de **vídeo** com MuseTalk/geração de movimento, TTS no worker e exportação FFmpeg.
- Upscaling 4K real (opção de solicitação pronta; processamento adicional precisa ser implementado no worker).
- Pagamentos e créditos transacionais: tabelas preparadas, mas **não há cobrança, reserva de créditos ou checkout**.
- Moderação automática, revisão legal e sistema de consentimento; necessários para lançamento público.
- Multi-worker, entrega com garantias de fila, tolerância a falhas e observabilidade de produção.
- Testes end-to-end reais e homologação sob carga. NÃO alegar pronto para empresa grande sem isso.

## Instalação do painel

1. `npm install`
2. Crie `.env.local` a partir de `.env.example`.
3. Crie um projeto no Supabase; execute `supabase/migrations/001_init.sql` no SQL Editor.
4. Em Authentication > Providers, ative Google. No Google Cloud, configure o URL de callback do Supabase indicado pelo painel. Em Authentication > URL Configuration adicione `https://SEU_DOMINIO/auth/callback` nas redirect URLs.
5. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `FISH_AUDIO_API_KEY` no local certo (Vercel Project > Settings > Environment Variables). Nunca exponha Fish Audio nem service_role como `NEXT_PUBLIC_*`.
6. `npm run dev` ou faça deploy do repositório no Vercel.
7. Registre no banco `voice_catalog` APENAS vozes para as quais você possui direitos comerciais: `name`, `reference_id`, `language`, `commercial_allowed=true`, `enabled=true`.

## Worker de imagens (GPU)

1. Em uma máquina GPU, instale Python, ComfyUI, um checkpoint SDXL ou outro modelo licenciado e exporte seu workflow no formato API para `workers/workflow_api.json`.
2. Consulte `workers/.env.example`; configure `COMFYUI_PROMPT_NODE_ID` com ID do nó de prompt e `COMFYUI_OUTPUT_NODE_ID` com ID do SaveImage.
3. Inicie ComfyUI na rede interna (nunca coloque serviço sem autenticação na internet).
4. Instale `pip install -r workers/requirements.txt` e execute `python workers/worker.py` com ambiente configurado.
5. O worker acessa Supabase com SERVICE_ROLE_KEY e registra imagens no bucket privado; o front recebe os arquivos na biblioteca.
6. Execute **apenas um worker** com a implementação atual. Para múltiplas GPUs, implemente reivindicação atômica por fila (ex: Supabase Queues/PGMQ).

**Importante:** as variáveis `GPU_WORKER_URL` e `GPU_WORKER_SECRET` na API do painel atualmente agem como proteção de pré-requisito de geração. O worker Python fornecido é um *poller* do banco e não recebe chamadas HTTP. Não há consumo real dessas duas variáveis pelo worker. Para operar o modo imagem, configure ambas na Vercel com referências da sua infraestrutura privada, configure o poller e a integração ComfyUI. Para vídeo será necessário um worker adicional. As variáveis sozinhas não disponibilizam GPU.

## Principais riscos antes de comercializar

- Revisar licenças dos pesos e LoRA, direitos de imagem, direitos de voz, transparência sobre conteúdo sintético e LGPD.
- A galeria usa imagens demonstrativas publicamente acessíveis no Unsplash. Substitua por conteúdo próprio autorizado na versão comercial.
- Aplicar proteção de quotas persistente (rate limit local em memória não é proteção distribuída forte).
- A tabela `generation_jobs` permite inserções com payload client-side via RLS. Para produto público, migrar inserção para função SECURITY DEFINER validada e fila atômica, com cobrança transacional.
- Monitorar custo de TTS e GPU por usuário, impor limite de dados, abuse prevention e timeouts.

## Fontes técnicas
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://fish.audio/pt/text-to-speech-api/
- https://docs.comfy.org/development/comfyui-server/comms_routes

Nenhuma chave real é distribuída neste projeto.


## v1.4: RunPod + ComfyUI
Consulte `workers/RUNPOD_SETUP.md`. Execute a migração `supabase/migrations/002_worker_claim.sql` e mantenha `GPU_QUEUE_ENABLED=false` até ligar o Pod. O projeto contém o ComfyUI fornecido pelo usuário em `workers/ComfyUI-master.zip`, mas **não contém checkpoints SDXL nem GPU provisionada**. Esta versão não produz vídeo nem faz LoRA.


## V2.1: BytePlus image generation connected
- `app/api/generate/route.ts` now supports **direct image generation via BytePlus** when `BYTEPLUS_GENERATION_ENABLED=true`.
- The route creates a job, calls BytePlus on the server, downloads the generated image, uploads it to the private `creations` bucket and inserts an `assets` row.
- `SUPABASE_SERVICE_ROLE_KEY` is now required server-side for this direct save flow.
- If `BYTEPLUS_GENERATION_ENABLED=false`, the route still falls back to the legacy GPU queue (`GPU_QUEUE_ENABLED=true`).
- Video generation remains disabled in this step.


## Ajustes do login (v2.2)
- Modal de autenticação com Google ou e-mail/senha.
- Recuperação de senha no endereço `/auth/reset`.
- Tratamento de falhas no callback OAuth.
- **Importante:** o erro 401 `invalid_client` é retornado pelo Google antes de concluir o fluxo. Esta versão mantém o OAuth, mas não altera nem pode validar o Client ID configurado no serviço remoto.
- Ative Email em Supabase > Authentication > Sign In / Providers e adicione `https://veoxia.vercel.app/auth/reset` em Authentication > URL Configuration > Redirect URLs.
- A conta já existente precisa definir senha pelo link de recuperação se tiver sido cadastrada sem senha.
- Este pacote não atribui privilégios de administrador. Isso exige controle de permissões no servidor/banco.
