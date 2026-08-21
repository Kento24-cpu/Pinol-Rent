import { useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { parseRows } from '../lib/supabaseParse'

interface AdminBooking {
  id: number
  start_date: string
  end_date: string
  status: string
  total_price: number
  created_at: string
  car_brand: string
  car_model: string
  car_id: number
  renter_id: string
  renter_name: string
  renter_email: string
  renter_phone: string | null
  payment_intent_id: number | null
  payment_status: string | null
}

const adminBookingSchema = z.custom<AdminBooking>((v) => {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return typeof r.id === 'number' && typeof r.car_id === 'number' && typeof r.renter_id === 'string'
})

export function useAdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(false)
  const genRef = useRef(0)

  const fetchAll = useCallback(async () => {
    const gen = ++genRef.current
    setLoading(true)
    const { data, error } = await supabase.rpc('get_all_bookings')
    if (gen !== genRef.current) return
    if (error) {
      console.error('fetch all bookings error', error)
      setBookings([])
    } else {
      setBookings(parseRows(data, adminBookingSchema))
    }
    setLoading(false)
  }, [])

  return { bookings, loading, fetchAll }
}
