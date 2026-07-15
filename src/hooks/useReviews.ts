import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { ReviewWithRelations } from '../types/database.types'

export function useReviews() {
  const user = useAuthStore((s) => s.session?.user)
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCarReviews = useCallback(async (carId: number) => {
    setLoading(true)
    const { data } = await supabase
      .from('reviews')
      .select('*, renter:renter_id(full_name, avatar_url)')
      .eq('car_id', carId)
      .order('created_at', { ascending: false })
    if (data) setReviews(data as unknown as ReviewWithRelations[])
    setLoading(false)
    return data as unknown as ReviewWithRelations[]
  }, [])

  const fetchBookingReview = useCallback(async (bookingId: number) => {
    const { data } = await supabase
      .from('reviews')
      .select('*, renter:renter_id(full_name, avatar_url)')
      .eq('booking_id', bookingId)
      .single()
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

  return { reviews, loading, fetchCarReviews, fetchBookingReview, createReview, updateReview, deleteReview }
}
