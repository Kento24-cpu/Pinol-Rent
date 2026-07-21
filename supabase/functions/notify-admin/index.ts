import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, corsResponse } from '../_shared/cors.ts'
import { sendPush } from '../_shared/push.ts'

serve(async (req) => {
  const corsPreflight = handleCors(req)
  if (corsPreflight) return corsPreflight

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    return corsResponse('server config error', 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { title, body, data: extraData } = await req.json()

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (!admins || admins.length === 0) {
    return corsResponse('no admins', 200)
  }

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', admins.map((a: { id: string }) => a.id))

  if (!tokens || tokens.length === 0) {
    return corsResponse('no admin tokens', 200)
  }

  await sendPush(
    supabaseUrl, supabaseKey,
    tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default' as const,
      title: title ?? 'Notificación de administración',
      body: (body ?? '').slice(0, 100),
      data: extraData ?? {},
    })),
  )

  return corsResponse('ok', 200)
})
