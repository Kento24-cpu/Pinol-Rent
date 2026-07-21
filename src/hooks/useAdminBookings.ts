import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

export function useAdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_all_bookings')
    if (error) {
      console.error('fetch all bookings error', error)
      setBookings([])
    } else {
      setBookings((data ?? []) as unknown as AdminBooking[])
    }
    setLoading(false)
  }, [])

  return { bookings, loading, fetchAll }
}
