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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return corsResponse('server config error', 500)
    }

    // verify_jwt = true: authenticate the caller before accepting card data
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return corsResponse('no autorizado', 401)
    }

    // userClient: only to validate the caller's JWT. The user Authorization
    // header must NOT leak into the service-role client below — PostgREST
    // takes the role from the Bearer token, so every query would otherwise
    // run as `authenticated` and RLS (payment_intents has no policies by
    // design) would block the insert with 42501.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) {
      return corsResponse('no autorizado', 401)
    }

    // adminClient: service_role bypasses RLS. Booking ownership is still
    // enforced manually against user.id below.
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    let body: { booking_id?: unknown; card_number?: unknown; card_holder?: unknown; expiry?: unknown }
    try {
      body = await req.json()
    } catch {
      return corsResponse('invalid body', 400)
    }

    const bookingId = Number(body.booking_id)
    const rawCardNumber = typeof body.card_number === 'string' ? body.card_number : ''
    const cardHolder = typeof body.card_holder === 'string' ? body.card_holder.trim() : ''
    const expiry = typeof body.expiry === 'string' ? body.expiry.trim() : ''
    const cardNumber = rawCardNumber.replace(/\D/g, '')

    if (!Number.isInteger(bookingId)) {
      return corsResponse('missing required fields', 400)
    }
    if (!cardHolder) {
      return corsResponse('missing required fields', 400)
    }
    if (cardNumber.length < 4 || cardNumber.length > 19) {
      return corsResponse('invalid card number', 400)
    }

    const lastFour = cardNumber.slice(-4)

    const enc = new TextEncoder()
    const keyBytes = await crypto.subtle.importKey(
      'raw',
      enc.encode(key).slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = enc.encode(JSON.stringify({ card_number: cardNumber, card_holder: cardHolder, expiry }))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyBytes, plaintext)

    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)

    let binary = ''
    for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i])
    const encryptedB64 = btoa(binary)

    const { data: booking } = await adminClient
      .from('bookings')
      .select('id, renter_id, status, total_price, payment_method')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return corsResponse('booking not found', 404)
    }
    if (booking.renter_id !== user.id) {
      return corsResponse('no autorizado para esta reserva', 403)
    }
    if (booking.status !== 'pending_payment') {
      return corsResponse('la reserva no está pendiente de pago', 409)
    }
    if (booking.payment_method === 'cash') {
      return corsResponse('esta reserva se paga en efectivo', 409)
    }

    const { error } = await adminClient
      .from('payment_intents')
      .insert({
        booking_id: bookingId,
        card_encrypted: encryptedB64,
        card_last_four: lastFour,
        card_holder: cardHolder,
        amount: booking.total_price,
      })

    if (error) {
      if (error.code === '23505') {
        return corsResponse('ya existe un pago pendiente para esta reserva', 409)
      }
      console.error('insert error', error)
      return corsResponse('failed to create payment intent', 500)
    }

    return corsResponse(JSON.stringify({ status: 'pending_review', card_last_four: lastFour }), 200)
  } catch (err) {
    console.error('unhandled error', err)
    return corsResponse('internal server error', 500)
  }
})
