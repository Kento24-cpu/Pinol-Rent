import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, corsResponse } from '../_shared/cors.ts'
import { sendPush, pushTokensForUser, ANDROID_CHANNEL_ID } from '../_shared/push.ts'

interface PgNetPayload {
  type: 'INSERT'
  table: string
  schema: string
  record: {
    id: number
    conversation_id: number
    sender_id: string
    content: string
    attachment_url: string | null
    created_at: string
  }
  old_record: null
}

serve(async (req) => {
  const corsPreflight = handleCors(req)
  if (corsPreflight) return corsPreflight

  const raw = await req.json()
  const payload: PgNetPayload = raw.type ? raw : raw.body

  if (!payload.record) {
    return corsResponse('bad payload', 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return corsResponse('server config error', 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: conv } = await supabase
    .from('conversations')
    .select('renter_id, owner_id')
    .eq('id', payload.record.conversation_id)
    .single()

  if (!conv) return corsResponse('not found', 404)

  const receiverId = conv.renter_id === payload.record.sender_id
    ? conv.owner_id
    : conv.renter_id

  const tokens = await pushTokensForUser(supabase, receiverId, 'chat_push')

  if (tokens.length === 0) {
    return corsResponse('no tokens', 200)
  }

  await sendPush(
    supabaseUrl, supabaseKey,
    tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default' as const,
      title: 'Nuevo mensaje',
      body: (payload.record.content ?? '').slice(0, 100),
      channelId: ANDROID_CHANNEL_ID,
      data: {
        conversation_id: payload.record.conversation_id,
        type: 'chat',
      },
    })),
  )

  return corsResponse('ok', 200)
})
