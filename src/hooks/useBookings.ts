import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { BookingWithRelations } from '../types/database.types'
import type { Database } from '../types/database'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'pending_payment'

interface CreateBookingParams {
  carId: number
  startDate: string
  endDate: string
  totalPrice: number
  status?: 'pending_payment'
}

export function useBookings() {
  const user = useAuthStore((s) => s.session?.user)
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const createBooking = useCallback(async ({ carId, startDate, endDate, totalPrice, status }: CreateBookingParams) => {
    if (!user) throw new Error('Debes iniciar sesión')

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        car_id: carId,
        renter_id: user.id,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        status,
      } satisfies Database['public']['Tables']['bookings']['Insert'])
      .select('id')
      .single()

    if (error) {
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
    const { data: booking } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single()
    if (!booking) throw new Error('Reserva no encontrada')
    if (booking.status === 'cancelled') throw new Error('La reserva ya está cancelada')
    if (booking.status === 'completed') throw new Error('No se puede cancelar una reserva completada')
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

    try {
      const { data } = await supabase
        .from('bookings')
        .select('*, car:car_id(brand, model, image_url, price_per_day)')
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false })

      if (gen !== genRef.current) return
      setBookings((data ?? []) as unknown as BookingWithRelations[])
    } catch (e) {
      console.error('Failed to fetch renter bookings', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchOwnerBookings = useCallback(async () => {
    if (!user) return
    const gen = ++genRef.current
    setLoading(true)

    try {
      const { data } = await supabase
        .from('bookings')
        .select('*, car:car_id!inner(brand, model, image_url, price_per_day, owner_id), renter:renter_id(full_name, avatar_url)')
        .eq('car.owner_id', user.id)
        .order('created_at', { ascending: false })

      if (gen !== genRef.current) return
      setBookings((data ?? []) as unknown as BookingWithRelations[])
    } catch (e) {
      console.error('Failed to fetch owner bookings', e)
    } finally {
      setLoading(false)
    }
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
