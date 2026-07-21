import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, corsResponse } from '../_shared/cors.ts'

serve(async (req) => {
  try {
    const corsPreflight = handleCors(req)
    if (corsPreflight) return corsPreflight

    const key = Deno.env.get('SP_ENCRYPTION_KEY')
    if (!key || key.length < 32) {
      return corsResponse('encryption key not configured', 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      return corsResponse('server config error', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { booking_id, card_number, card_holder, expiry } = await req.json()

    if (!booking_id || !card_number || !card_holder) {
      return corsResponse('missing required fields', 400)
    }

    const lastFour = card_number.slice(-4)

    const enc = new TextEncoder()
    const keyBytes = await crypto.subtle.importKey(
      'raw',
      enc.encode(key).slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = enc.encode(JSON.stringify({ card_number, card_holder, expiry }))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyBytes, plaintext)

    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)

    let binary = ''
    for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i])
    const encryptedB64 = btoa(binary)

    const { data: booking } = await supabase
      .from('bookings')
      .select('total_price')
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return corsResponse('booking not found', 404)
    }

    const { error } = await supabase
      .from('payment_intents')
      .insert({
        booking_id,
        card_encrypted: encryptedB64,
        card_last_four: lastFour,
        card_holder,
        amount: booking.total_price,
      })

    if (error) {
      console.error('insert error', error)
      return corsResponse('failed to create payment intent', 500)
    }

    return corsResponse(JSON.stringify({ status: 'pending_review', card_last_four: lastFour }), 200)
  } catch (err) {
    console.error('unhandled error', err)
    return corsResponse('internal server error', 500)
  }
})
