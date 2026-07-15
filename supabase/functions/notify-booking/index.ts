import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  }
  old_record: { status: string } | null
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

  const { data: car } = await supabase
    .from('cars')
    .select('brand, model, owner_id')
    .eq('id', payload.record.car_id)
    .single()

  if (!car) return new Response('car not found', { status: 404 })

  const { data: renter } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', payload.record.renter_id)
    .single()

  let receiverId: string
  let title: string
  let body: string
  let data: Record<string, unknown>

  if (payload.type === 'INSERT') {
    receiverId = car.owner_id
    title = 'Nueva solicitud de reserva'
    body = `${renter?.full_name ?? 'Alguien'} quiere rentar tu ${car.brand} ${car.model}`
    data = { booking_id: payload.record.id, type: 'booking' }
  } else if (payload.record.status === 'confirmed') {
    receiverId = payload.record.renter_id
    title = 'Reserva confirmada'
    body = `Tu reserva del ${car.brand} ${car.model} fue aceptada`
    data = { booking_id: payload.record.id, type: 'booking' }
  } else if (payload.record.status === 'cancelled') {
    receiverId = payload.record.renter_id
    title = 'Reserva cancelada'
    body = `La reserva del ${car.brand} ${car.model} fue cancelada`
    data = { booking_id: payload.record.id, type: 'booking' }
  } else if (payload.record.status === 'completed') {
    receiverId = payload.record.renter_id
    title = 'Viaje completado'
    body = `Gracias por rentar el ${car.brand} ${car.model}. ¡Califica tu experiencia!`
    data = { booking_id: payload.record.id, type: 'booking' }
  } else {
    return new Response('no notification needed', { status: 200 })
  }

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
    title,
    body: body.slice(0, 100),
    data,
  }))

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  return new Response('ok', { status: 200 })
})
