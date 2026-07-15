import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { BookingWithRelations } from '../types/database.types'
import type { Database } from '../types/database'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

interface CreateBookingParams {
  carId: number
  startDate: string
  endDate: string
}

export function useBookings() {
  const user = useAuthStore((s) => s.session?.user)
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const createBooking = useCallback(async ({ carId, startDate, endDate }: CreateBookingParams) => {
    if (!user) throw new Error('Debes iniciar sesión')

    type BookingInsert = Database['public']['Tables']['bookings']['Insert']
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        car_id: carId,
        renter_id: user.id,
        start_date: startDate,
        end_date: endDate,
        total_price: 0,
      } satisfies BookingInsert)
      .select('id')
      .single()

    if (error) {
      if (error.message.includes('El auto no está disponible')) {
        throw new Error(error.message)
      }
      throw new Error(error.message)
    }

    return data.id
  }, [user])

  const updateBookingStatus = useCallback(async (bookingId: number, status: BookingStatus) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (error) throw new Error('Error al actualizar la reserva')

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    )
  }, [])

  const cancelBooking = useCallback(async (bookingId: number) => {
    await updateBookingStatus(bookingId, 'cancelled')
  }, [updateBookingStatus])

  const confirmBooking = useCallback(async (bookingId: number) => {
    await updateBookingStatus(bookingId, 'confirmed')
  }, [updateBookingStatus])

  const completeBooking = useCallback(async (bookingId: number) => {
    await updateBookingStatus(bookingId, 'completed')
  }, [updateBookingStatus])

  const fetchMyBookings = useCallback(async () => {
    if (!user) return
    const gen = ++genRef.current
    setLoading(true)

    const { data } = await supabase
      .from('bookings')
      .select('*, car:car_id(brand, model, image_url, price_per_day)')
      .eq('renter_id', user.id)
      .order('created_at', { ascending: false })

    if (gen !== genRef.current) return
    setBookings((data ?? []) as unknown as BookingWithRelations[])
    setLoading(false)
  }, [user])

  const fetchOwnerBookings = useCallback(async () => {
    if (!user) return
    const gen = ++genRef.current
    setLoading(true)

    const { data } = await supabase
      .from('bookings')
      .select('*, car:car_id!inner(brand, model, image_url, price_per_day, owner_id), renter:renter_id(full_name, avatar_url)')
      .eq('car.owner_id', user.id)
      .order('created_at', { ascending: false })

    if (gen !== genRef.current) return
    const typed = (data ?? []) as unknown as BookingWithRelations[]
    setBookings(typed.map((b) => ({ ...b, owner: null })))
    setLoading(false)
  }, [user])

  const fetchBooking = useCallback(async (bookingId: number) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, car:car_id(brand, model, image_url, price_per_day), renter:renter_id(full_name, avatar_url)')
      .eq('id', bookingId)
      .single()

    return (data ?? null) as BookingWithRelations | null
  }, [])

  const checkAvailability = useCallback(async (carId: number, startDate: string, endDate: string) => {
    const { data, error: rpcError } = await supabase
      .rpc('is_car_available', {
        p_car_id: carId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
    if (rpcError) throw new Error(rpcError.message)
    return data ?? true
  }, [])

  return {
    bookings,
    loading,
    createBooking,
    cancelBooking,
    confirmBooking,
    completeBooking,
    fetchMyBookings,
    fetchOwnerBookings,
    fetchBooking,
    checkAvailability,
  }
}
