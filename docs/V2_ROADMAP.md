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
