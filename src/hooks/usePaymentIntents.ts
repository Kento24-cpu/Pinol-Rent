import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

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

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_pending_payment_intents')
    if (error) {
      console.error('fetch pending intents error', error)
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
      p_admin_id: user.id,
    })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('No se pudo aprobar — el intent expiró o ya fue procesado')
    setIntents((prev) => prev.filter((i) => i.id !== paymentIntentId))
  }, [user])

  const decline = useCallback(async (paymentIntentId: number) => {
    if (!user) throw new Error('No autorizado')
    const { data, error } = await supabase.rpc('decline_payment_intent', {
      p_payment_intent_id: paymentIntentId,
      p_admin_id: user.id,
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
      console.warn('[usePaymentIntents] decrypt-card-info error:', error.message)
      throw new Error(error.message)
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
    if (error) throw new Error(error.message)
    return data as { status: string; card_last_four: string }
  }, [])

  return { intents, loading, fetchPending, approve, decline, getPreview, submitCardPayment, decryptCard }
}
