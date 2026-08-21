import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { ReviewWithRelations } from '../types/database.types'

export function useReviews() {
  const user = useAuthStore((s) => s.session?.user)
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const genRef = useRef(0)

  const clearError = () => setError(null)

  const fetchCarReviews = useCallback(async (carId: number) => {
    const gen = ++genRef.current
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select('*, renter:renter_id(full_name, avatar_url)')
        .eq('car_id', carId)
        .order('created_at', { ascending: false })
      if (gen !== genRef.current) return []
      if (fetchError) { setError(fetchError.message); return [] }
      if (data) setReviews(data as unknown as ReviewWithRelations[])
      return (data ?? []) as ReviewWithRelations[]
    } catch (e) {
      setError((e as Error).message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBookingReview = useCallback(async (bookingId: number) => {
    const { data, error: fetchError } = await supabase
      .from('reviews')
      .select('*, renter:renter_id(full_name, avatar_url)')
      .eq('booking_id', bookingId)
      .single()
    if (fetchError) { setError(fetchError.message); return null }
    return (data ?? null) as ReviewWithRelations | null
  }, [])

  const createReview = useCallback(async (
    bookingId: number,
    carId: number,
    rating: number,
    comment: string,
  ) => {
    if (!user) throw new Error('Debes iniciar sesión')
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        car_id: carId,
        renter_id: user.id,
        rating,
        comment: comment.trim() || null,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  }, [user])

  const updateReview = useCallback(async (
    reviewId: number,
    rating: number,
    comment: string,
  ) => {
    const { error } = await supabase
      .from('reviews')
      .update({ rating, comment: comment.trim() || null })
      .eq('id', reviewId)
    if (error) throw new Error(error.message)
  }, [])

  const deleteReview = useCallback(async (reviewId: number) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (error) throw new Error(error.message)
  }, [])

  return { reviews, loading, error, clearError, fetchCarReviews, fetchBookingReview, createReview, updateReview, deleteReview }
}
