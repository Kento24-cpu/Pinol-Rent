import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, corsResponse } from '../_shared/cors.ts'

serve(async (req) => {
  try {
    const corsPreflight = handleCors(req)
    if (corsPreflight) return corsPreflight

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse('unauthorized', 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) return corsResponse('server config error', 500)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return corsResponse('unauthorized', 401)

    const { data: isAdmin } = await userClient.rpc('is_admin')
    if (!isAdmin) return corsResponse('forbidden', 403)

    const { payment_intent_id } = await req.json()
    if (!payment_intent_id) return corsResponse('missing payment_intent_id', 400)

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) return corsResponse('server config error', 500)

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: intent, error: fetchError } = await adminClient
      .from('payment_intents')
      .select('card_encrypted, card_holder')
      .eq('id', payment_intent_id)
      .single()

    if (fetchError || !intent) return corsResponse('payment intent not found', 404)

    const key = Deno.env.get('SP_ENCRYPTION_KEY')
    if (!key || key.length < 32) return corsResponse('encryption key not configured', 500)

    const enc = new TextEncoder()
    const dec = new TextDecoder()

    const combined = Uint8Array.from(atob(intent.card_encrypted), (c) => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    const keyBytes = await crypto.subtle.importKey(
      'raw',
      enc.encode(key).slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )

    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyBytes, ciphertext)
    const { card_number, expiry } = JSON.parse(dec.decode(plaintext))

    return corsResponse(JSON.stringify({
      card_number,
      card_holder: intent.card_holder,
      expiry: expiry ?? '',
    }), 200)
  } catch (err) {
    console.error('decrypt error', err)
    return corsResponse('internal server error', 500)
  }
})
