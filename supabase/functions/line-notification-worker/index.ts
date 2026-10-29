import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { formatLineReport, pushLineMessage, type LineReportPayload } from '../_shared/line-api.ts'

interface ClaimedJob {
  job_id: string
  line_user_id: string
  report_type: 'CLOSING' | 'PERIODIC'
  payload: LineReportPayload
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const workerSecret = Deno.env.get('LINE_WORKER_SECRET')
  const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  const projectSecretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
  const suppliedApiKey = request.headers.get('apikey')
  const suppliedBearer = request.headers.get('authorization')
  const validServiceKey = Boolean(suppliedApiKey) && [projectSecretKeys.default, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')]
    .filter(Boolean).includes(suppliedApiKey!)
  const validWorkerSecret = Boolean(workerSecret) && suppliedBearer === `Bearer ${workerSecret}`
  if (!channelAccessToken) return new Response('LINE_CHANNEL_ACCESS_TOKEN is not configured.', { status: 500 })
  if (!validServiceKey && !validWorkerSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await supabase.rpc('claim_line_notification_jobs', { batch_size: 20 })
  if (error) throw error

  let sent = 0
  let failed = 0
  for (const job of (data ?? []) as ClaimedJob[]) {
    try {
      await pushLineMessage(channelAccessToken, job.line_user_id, formatLineReport(job.payload), job.job_id)
      const { error: completeError } = await supabase.rpc('complete_line_notification_job', {
        target_job_id: job.job_id, delivered: true, delivery_error: null,
      })
      if (completeError) throw completeError
      sent += 1
    } catch (deliveryError) {
      failed += 1
      await supabase.rpc('complete_line_notification_job', {
        target_job_id: job.job_id,
        delivered: false,
        delivery_error: deliveryError instanceof Error ? deliveryError.message : 'LINE delivery failed.',
      })
    }
  }
  return Response.json({ claimed: data?.length ?? 0, sent, failed })
})
