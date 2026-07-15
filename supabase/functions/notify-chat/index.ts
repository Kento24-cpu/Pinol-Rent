import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  const raw = await req.json()
  const payload: PgNetPayload = raw.type ? raw : raw.body

  if (!payload.record) {
    return new Response('bad payload', { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response('server config error', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: conv } = await supabase
    .from('conversations')
    .select('renter_id, owner_id')
    .eq('id', payload.record.conversation_id)
    .single()

  if (!conv) return new Response('not found', { status: 404 })

  const receiverId = conv.renter_id === payload.record.sender_id
    ? conv.owner_id
    : conv.renter_id

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', receiverId)

  if (!tokens || tokens.length === 0) {
    return new Response('no tokens', { status: 200 })
  }

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default' as const,
    title: 'Nuevo mensaje',
    body: (payload.record.content ?? '').slice(0, 100),
    data: {
      conversation_id: payload.record.conversation_id,
      type: 'chat',
    },
  }))

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  return new Response('ok', { status: 200 })
})
