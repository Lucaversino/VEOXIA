# VEOX + ComfyUI no RunPod — preparação antes de comprar créditos

## Estado atual
- O usuário forneceu `ComfyUI-master.zip` (código do motor, **não** pesos de modelo).
- O VEOX usa **polling privado do Supabase**, e não um endpoint HTTP GPU.
- Esta versão implementa somente **texto → imagem** por SDXL base usando o workflow de exemplo. Não treina LoRA, não anima vídeos, não entrega 4K.
- Para conseguir manter o mesmo rosto será preciso depois incluir treinamento LoRA e workflow próprio de inferência.

## Preparação (não gera custos de GPU até iniciar Pod)
1. Supabase SQL Editor: execute `supabase/migrations/002_worker_claim.sql`. Isso cria uma função para reclamar jobs atomicamente, acessível apenas por `service_role`.
2. Na Vercel mantenha `GPU_QUEUE_ENABLED=false` até o Pod estar operacional; depois altere para `true` e faça redeploy.
3. Guarde o ZIP do ComfyUI, o diretório `workers/` e um checkpoint SDXL autorizado para o Pod. **O ZIP do ComfyUI não contém pesos do SDXL**.
4. Não exponha chave de serviço do Supabase nem porta 8188 publicamente. A porta 8188 só deve aceitar chamadas locais.

## Quando houver créditos RunPod
1. Crie um **GPU Pod** baseado em template PyTorch/CUDA oficial (CUDA suportada pela GPU escolhida) com volume persistente em `/workspace`. Faça upload de `ComfyUI-master.zip` para `/workspace/`.
2. Copie o conteúdo da pasta `workers/` para `/workspace/veox-worker/`. Execute `bash /workspace/veox-worker/runpod-setup.sh`.
3. Baixe, obedecendo a licença do modelo, o arquivo `sd_xl_base_1.0.safetensors` para `/workspace/ComfyUI-master/models/checkpoints/`. Confirme o nome e configure `COMFYUI_CHECKPOINT`.
4. Crie `/workspace/veox-worker/.env` com os valores de `workers/.env.example`; a service-role fica **somente no Pod**, nunca no GitHub, Vercel pública, ou cliente.
5. Rode `bash /workspace/veox-worker/start-comfy.sh` e em outro terminal `bash /workspace/veox-worker/start-worker.sh`.
6. No Supabase confira tabela `generation_jobs`. Na Vercel ative `GPU_QUEUE_ENABLED=true`. Cadastre uma influencer, envie **imagem** e verifique status `completed` e um arquivo no bucket privado `creations`.
7. Se o Pod estiver desligado, **desative** `GPU_QUEUE_ENABLED`, ou os novos jobs continuarão pendentes.

## Limitações e riscos
- A própria GPU, o armazenamento, e a licença do checkpoint precisam ser selecionados e validados antes do uso comercial.
- A fila tem **claim atômico** por SQL, mas não possui lease nem reprocessamento automático de jobs órfãos após queda de Pod. Faça administração manual de casos presos em `processing` antes de operar com clientes pagantes.
- Há apenas um worker polling com limite de 4 minutos por imagem, sem treinamento LoRA e sem pipeline MuseTalk/Fish Audio → vídeo.
- `GPU_QUEUE_ENABLED` é habilitação manual. A chave `RUNPOD_API_KEY` não é consumida pelo worker polling, portanto não é necessária nesta integração inicial.
