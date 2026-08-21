import { useState, useCallback } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const FRIENDLY_FUNCTION_ERRORS: Record<string, string> = {
  'encryption key not configured': 'El servidor de pagos no está configurado. Intenta más tarde o paga en efectivo.',
  'server config error': 'Error de configuración del servidor. Intenta más tarde.',
  'no autorizado': 'No autorizado',
  'unauthorized': 'Tu sesión expiró. Vuelve a iniciar sesión.',
  'forbidden': 'Acceso denegado',
  'booking not found': 'Reserva no encontrada',
  'payment intent not found': 'Solicitud de pago no encontrada',
  'missing required fields': 'Completa todos los datos de la tarjeta',
  'missing payment_intent_id': 'Solicitud de pago inválida',
  'invalid body': 'No se pudo procesar la solicitud. Intenta de nuevo.',
  'invalid card number': 'Número de tarjeta inválido',
  'la reserva no está pendiente de pago': 'La reserva ya no está pendiente de pago',
  'esta reserva se paga en efectivo': 'Esta reserva se paga en efectivo',
  'ya existe un pago pendiente para esta reserva': 'Ya existe un pago pendiente para esta reserva',
  'failed to create payment intent': 'No se pudo registrar el pago. Intenta más tarde.',
  'internal server error': 'Error interno del servidor. Intenta más tarde.',
}

async function functionErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof FunctionsHttpError)) return (error as Error).message
  try {
    const context = error.context as { text?: () => Promise<string> } | string | undefined
    const raw = typeof context === 'string'
      ? context
      : typeof context?.text === 'function'
        ? await context.text()
        : ''
    if (!raw) return 'El servidor rechazó el pago. Intenta más tarde.'
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string }
      const serverMessage = parsed.error ?? parsed.message ?? raw
      return FRIENDLY_FUNCTION_ERRORS[serverMessage] ?? serverMessage
    } catch {
      return FRIENDLY_FUNCTION_ERRORS[raw] ?? raw
    }
  } catch {
    return 'Error de conexión con el servidor de pagos'
  }
}

interface PendingPaymentIntent {
  id: number
  booking_id: number
  card_last_four: string
  card_holder: string
  amount: number
  status: string
  expires_at: string
  created_at: string
  brand: string
  model: string
  renter_name: string
  renter_email: string
}

export function usePaymentIntents() {
  const user = useAuthStore((s) => s.session?.user)
  const [intents, setIntents] = useState<PendingPaymentIntent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase.rpc('get_pending_payment_intents')
    if (fetchError) {
      setError(fetchError.message)
      setIntents([])
    } else {
      setIntents((data ?? []) as unknown as PendingPaymentIntent[])
    }
    setLoading(false)
  }, [])

  const approve = useCallback(async (paymentIntentId: number) => {
    if (!user) throw new Error('No autorizado')
    const { data, error } = await supabase.rpc('approve_payment_intent', {
      p_payment_intent_id: paymentIntentId,
    })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('No se pudo aprobar — el intent expiró o ya fue procesado')
    setIntents((prev) => prev.filter((i) => i.id !== paymentIntentId))
  }, [user])

  const decline = useCallback(async (paymentIntentId: number) => {
    if (!user) throw new Error('No autorizado')
    const { data, error } = await supabase.rpc('decline_payment_intent', {
      p_payment_intent_id: paymentIntentId,
    })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('No se pudo rechazar — el intent expiró o ya fue procesado')
    setIntents((prev) => prev.filter((i) => i.id !== paymentIntentId))
  }, [user])

  const getPreview = useCallback(async (paymentIntentId: number) => {
    const { data, error } = await supabase
      .rpc('decrypt_payment_preview', {
        p_payment_intent_id: paymentIntentId,
      })
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as { card_last_four: string; card_holder: string; amount: number; booking_status: string; created_at: string } | null
  }, [])

  const decryptCard = useCallback(async (paymentIntentId: number) => {
    const { data, error } = await supabase.functions.invoke('decrypt-card-info', {
      body: { payment_intent_id: paymentIntentId },
    })
    if (error) {
      const message = await functionErrorMessage(error)
      console.warn('[usePaymentIntents] decrypt-card-info error:', message)
      throw new Error(message)
    }
    if (!data || typeof data !== 'object' || !('card_number' in data)) {
      throw new Error('Acceso denegado')
    }
    return data as { card_number: string; card_holder: string; expiry: string }
  }, [])

  const submitCardPayment = useCallback(async (bookingId: number, cardData: {
    card_number: string
    card_holder: string
    expiry: string
  }) => {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: { booking_id: bookingId, ...cardData },
    })
    if (error) throw new Error(await functionErrorMessage(error))
    return data as { status: string; card_last_four: string }
  }, [])

  return { intents, loading, error, clearError, fetchPending, approve, decline, getPreview, submitCardPayment, decryptCard }
}
