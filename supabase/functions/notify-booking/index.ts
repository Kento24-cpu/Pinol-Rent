import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, corsResponse } from '../_shared/cors.ts'
import { sendPush, pushTokensForUser, ANDROID_CHANNEL_ID } from '../_shared/push.ts'

interface PgNetPayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  schema: string
  record: {
    id: number
    car_id: number
    renter_id: string
    start_date: string
    end_date: string
    total_price: number
    status: string
    payment_method: string
  }
  old_record: { status: string } | null
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

  const { data: car } = await supabase
    .from('cars')
    .select('brand, model, owner_id')
    .eq('id', payload.record.car_id)
    .single()

  if (!car) return corsResponse('car not found', 404)

  const { data: renter } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', payload.record.renter_id)
    .single()

  interface NotificationTarget {
    userId: string
    title: string
    body: string
    data: Record<string, unknown>
  }

  const targets: NotificationTarget[] = []
  let notifyAdmin = false
  let adminTitle = ''
  let adminBody = ''

  if (payload.type === 'INSERT' && payload.record.status === 'pending_payment' && payload.record.payment_method === 'cash') {
    targets.push({
      userId: car.owner_id,
      title: 'Nuevo pago en efectivo',
      body: `${renter?.full_name ?? 'Alguien'} reservó ${car.brand} ${car.model} y te enviará el comprobante por WhatsApp. Confirma al recibirlo.`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
  } else if (payload.type === 'INSERT' && payload.record.status === 'pending_payment') {
    targets.push({
      userId: payload.record.renter_id,
      title: 'Solicitud de pago recibida',
      body: `Tu solicitud para rentar el ${car.brand} ${car.model} está en revisión. Te notificaremos cuando sea aprobada.`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
    notifyAdmin = true
    adminTitle = 'Nuevo pago pendiente'
    adminBody = `${renter?.full_name ?? 'Alguien'} quiere rentar ${car.brand} ${car.model} — revisa el pago`
  } else if (payload.type === 'INSERT') {
    targets.push({
      userId: car.owner_id,
      title: 'Nueva solicitud de reserva',
      body: `${renter?.full_name ?? 'Alguien'} quiere rentar tu ${car.brand} ${car.model}`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
  } else if (payload.record.status === 'confirmed') {
    targets.push({
      userId: payload.record.renter_id,
      title: 'Reserva confirmada',
      body: `Tu reserva del ${car.brand} ${car.model} fue aceptada`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
  } else if (payload.record.status === 'pending') {
    targets.push({
      userId: car.owner_id,
      title: 'Pago aprobado — nueva reserva',
      body: `El pago para ${car.brand} ${car.model} fue aprobado. Revisa la solicitud.`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
    targets.push({
      userId: payload.record.renter_id,
      title: 'Pago aprobado',
      body: `Tu pago para ${car.brand} ${car.model} fue aprobado. Confirma tu reserva.`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
  } else if (payload.record.status === 'cancelled') {
    if (payload.old_record?.status === 'pending_payment') {
      targets.push({
        userId: payload.record.renter_id,
        title: 'Solicitud de pago cerrada',
        body: `Tu solicitud de pago para ${car.brand} ${car.model} fue cancelada o expiró. Si tienes dudas, contacta al equipo de Pinol Rent.`,
        data: { booking_id: payload.record.id, type: 'booking' },
      })
    } else {
      targets.push({
        userId: payload.record.renter_id,
        title: 'Reserva cancelada',
        body: `La reserva del ${car.brand} ${car.model} fue cancelada`,
        data: { booking_id: payload.record.id, type: 'booking' },
      })
    }
  } else if (payload.record.status === 'completed') {
    targets.push({
      userId: payload.record.renter_id,
      title: 'Viaje completado',
      body: `Gracias por rentar el ${car.brand} ${car.model}. ¡Califica tu experiencia!`,
      data: { booking_id: payload.record.id, type: 'booking' },
    })
  } else {
    return corsResponse('no notification needed', 200)
  }

  for (const t of targets) {
    const tokens = await pushTokensForUser(supabase, t.userId, 'booking_push')

    if (tokens.length > 0) {
      await sendPush(
        supabaseUrl, supabaseKey,
        tokens.map((tk: { token: string }) => ({
          to: tk.token,
          sound: 'default' as const,
          title: t.title,
          body: t.body.slice(0, 100),
          channelId: ANDROID_CHANNEL_ID,
          data: t.data,
        })),
      )
    }

    await supabase.from('notifications').insert({
      user_id: t.userId,
      title: t.title,
      body: t.body.slice(0, 200),
      data: t.data,
    }).maybeSingle()
  }

  if (notifyAdmin) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    // Admin deep-link needs the payment_intent_id, not the booking id
    const { data: intent } = await supabase
      .from('payment_intents')
      .select('id')
      .eq('booking_id', payload.record.id)
      .maybeSingle()

    const adminData = intent
      ? { booking_id: payload.record.id, payment_intent_id: intent.id, type: 'admin_review' }
      : { booking_id: payload.record.id, type: 'admin_review' }

    if (admins && admins.length > 0) {
      const { data: adminTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .in('user_id', admins.map((a: { id: string }) => a.id))

      if (adminTokens && adminTokens.length > 0) {
        await sendPush(
          supabaseUrl, supabaseKey,
          adminTokens.map((t: { token: string }) => ({
            to: t.token,
            sound: 'default' as const,
            title: adminTitle,
            body: adminBody.slice(0, 100),
            channelId: ANDROID_CHANNEL_ID,
            data: adminData,
          })),
        )
      }

      for (const admin of admins) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          title: adminTitle,
          body: adminBody.slice(0, 200),
          data: adminData,
        }).maybeSingle()
      }
    }
  }

  return corsResponse('ok', 200)
})
