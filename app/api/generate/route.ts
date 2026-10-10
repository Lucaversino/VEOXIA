import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/supabase-server';
import { adminDb } from '@/lib/supabase-admin';
import { BytePlusProvider } from '@/lib/byteplus';
import { handleError, jsonError, rateGate } from '@/lib/api';

const Schema = z.object({
  influencerId: z.string().uuid(),
  type: z.enum(['image', 'video']),
  prompt: z.string().trim().min(10).max(1800),
  ratio: z.enum(['9:16', '1:1', '16:9']),
  voiceId: z.string().uuid().optional(),
  script: z.string().trim().max(1200).optional(),
  quality: z.enum(['standard', 'upscaled_4k']).default('standard'),
}).refine(x => x.type !== 'video' || Boolean(x.script && x.voiceId), {
  message: 'Para vídeo com voz, selecione a voz e escreva a fala.',
});

const allowed = rateGate(8, 60_000);

function inferContentType(buffer: Buffer) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return { mime: 'image/png', ext: 'png' };
}

async function getBytePlusImageBytes(prompt: string, quality: 'standard' | 'upscaled_4k') {
  const provider = new BytePlusProvider();
  const result = await provider.createImage({
    prompt,
    size: quality === 'upscaled_4k' ? '4K' : '2K',
  });
  const first = result.data?.[0];
  if (!first) throw new Error('BytePlus não retornou imagem.');

  if (first.b64_json) {
    return Buffer.from(first.b64_json, 'base64');
  }

  if (first.url) {
    const res = await fetch(first.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Falha ao baixar imagem da BytePlus (HTTP ${res.status}).`);
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes;
  }

  throw new Error('Resposta da BytePlus sem URL nem imagem em base64.');
}

async function completeBytePlusImageJob(jobId: string, userId: string, influencerId: string, prompt: string, quality: 'standard' | 'upscaled_4k') {
  const admin = adminDb();
  await admin.from('generation_jobs').update({ status: 'processing', error_message: null }).eq('id', jobId);

  try {
    const bytes = await getBytePlusImageBytes(prompt, quality);
    const { mime, ext } = inferContentType(bytes);
    const storagePath = `${userId}/${jobId}.${ext}`;

    const upload = await admin.storage.from('creations').upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upload.error) throw upload.error;

    const inserted = await admin.from('assets').insert({
      user_id: userId,
      influencer_id: influencerId,
      job_id: jobId,
      kind: 'image',
      storage_path: storagePath,
    });
    if (inserted.error) throw inserted.error;

    const updated = await admin.from('generation_jobs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', jobId);
    if (updated.error) throw updated.error;

    return { storagePath };
  } catch (error) {
    await admin.from('generation_jobs').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 500) : 'Falha ao gerar imagem na BytePlus.',
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { db, user, error } = await requireUser();
    if (!db || !user) return jsonError(error || 'Não autorizado', 401);
    if (!allowed(user.id)) return jsonError('Muitas solicitações. Aguarde um minuto.', 429);

    const input = Schema.parse(await req.json());

    const { data: influencer } = await db
      .from('influencers')
      .select('id,name')
      .eq('id', input.influencerId)
      .eq('user_id', user.id)
      .single();
    if (!influencer) return jsonError('Personagem não encontrado.', 404);

    if (input.type === 'video') {
      return jsonError('Vídeo com voz ainda não está conectado nesta etapa. Vamos ativar primeiro a geração de imagens BytePlus.', 501);
    }

    const { data: job, error: jobError } = await db
      .from('generation_jobs')
      .insert({
        user_id: user.id,
        influencer_id: input.influencerId,
        type: input.type,
        status: 'queued',
        payload: {
          ...input,
          provider: process.env.BYTEPLUS_GENERATION_ENABLED === 'true' ? 'byteplus' : 'gpu-queue',
        },
      })
      .select('id')
      .single();
    if (jobError || !job) throw jobError || new Error('Job não foi criado');

    if (process.env.BYTEPLUS_GENERATION_ENABLED === 'true') {
      await completeBytePlusImageJob(job.id, user.id, input.influencerId, input.prompt, input.quality);
      return NextResponse.json({
        jobId: job.id,
        status: 'completed',
        provider: 'byteplus',
        message: 'Imagem gerada pela BytePlus e salva na sua biblioteca.',
      }, { status: 201 });
    }

    if (process.env.GPU_QUEUE_ENABLED === 'true') {
      if (input.quality === 'upscaled_4k') {
        return jsonError('Upscale 4K ainda não está configurado no worker. Selecione qualidade padrão.', 501);
      }
      return NextResponse.json({
        jobId: job.id,
        status: 'queued',
        provider: 'gpu-queue',
        message: 'Job enviado para a fila da GPU.',
      }, { status: 202 });
    }

    const admin = adminDb();
    await admin.from('generation_jobs').update({
      status: 'failed',
      error_message: 'Nenhum provedor de imagem ativo. Ative BYTEPLUS_GENERATION_ENABLED=true ou GPU_QUEUE_ENABLED=true.',
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    return jsonError('Nenhum provedor de imagem ativo. Ative BYTEPLUS_GENERATION_ENABLED=true para usar a BytePlus.', 503);
  } catch (e) {
    return handleError(e);
  }
}
