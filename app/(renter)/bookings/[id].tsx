import { useState, useEffect, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Chip, Snackbar, useTheme, Icon, TextInput, Portal, Dialog } from 'react-native-paper'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useResponsive } from '../../../src/hooks/useResponsive'
import { contentMaxWidth } from '../../../src/lib/theme'
import { useBookings } from '../../../src/hooks/useBookings'
import { useReviews } from '../../../src/hooks/useReviews'
import { RatingInput } from '../../../src/components/RatingInput'
import { STATUS_COLORS, STATUS_LABELS } from '../../../src/lib/bookingStatus'
import { RENTER_FEE, renterFeeAmount } from '../../../src/lib/commission'
import { findOrCreateConversation } from '../../../src/lib/chat'
import { useAuthStore } from '../../../src/stores/authStore'
import { supabase } from '../../../src/lib/supabase'
import type { BookingWithRelations } from '../../../src/types/database.types'

export default function RenterBookingDetailScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id)
  const { id: bookingIdParam } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { isDesktop } = useResponsive()
  const { fetchBooking, cancelBooking } = useBookings()
  const { fetchBookingReview, createReview } = useReviews()
  const [booking, setBooking] = useState<BookingWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentDeadline, setPaymentDeadline] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [review, setReview] = useState<{ id?: number; rating: number; comment: string } | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })
  const userInitiatedRef = useRef(false)

  const bookingId = Number(bookingIdParam)

  const load = useCallback(async () => {
    const data = await fetchBooking(bookingId)
    setBooking(data)
    if (data && data.status === 'pending_payment') {
      const { data: deadline } = await supabase.rpc('get_payment_deadline', { p_booking_id: bookingId })
      setPaymentDeadline(deadline ?? null)
    } else {
      setPaymentDeadline(null)
    }
    if (data && data.status === 'completed') {
      const existing = await fetchBookingReview(bookingId)
      if (existing) {
        setReview({ id: existing.id, rating: existing.rating, comment: existing.comment ?? '' })
      }
    }
    setLoading(false)
  }, [bookingId, fetchBooking, fetchBookingReview])

  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      }, (payload) => {
        const newStatus = (payload.new as { status?: string }).status
        const oldStatus = (payload.old as { status?: string }).status
        if (newStatus && newStatus !== oldStatus) {
          load()
          if (userInitiatedRef.current) {
            userInitiatedRef.current = false
            return
          }
          const label = newStatus === 'confirmed' ? 'confirmada'
            : newStatus === 'cancelled' ? 'cancelada'
            : newStatus === 'completed' ? 'completada'
            : newStatus === 'pending' ? 'pendiente de confirmación'
            : newStatus
          setSnackbar({ visible: true, message: `Reserva ${label}` })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId, load])

  const handleCancel = async () => {
    userInitiatedRef.current = true
    setUpdating(true)
    try {
      await cancelBooking(bookingId)
      setBooking((prev) => prev ? { ...prev, status: 'cancelled' } : null)
      setSnackbar({ visible: true, message: 'Reserva cancelada' })
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge">Reserva no encontrada</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 16 }}>Volver</Button>
      </View>
    )
  }

  const statusColor = STATUS_COLORS[booking.status] ?? colors.onSurfaceVariant

  const parseDate = (s: string) => { const [y, m, d] = s.split('-'); return new Date(Number(y), Number(m) - 1, Number(d)) }
  const days = Math.round((parseDate(booking.end_date).getTime() - parseDate(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={isDesktop ? styles.centeredContainer : undefined}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Chip
          style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
          textStyle={[styles.statusText, { color: statusColor }]}
        >
          {STATUS_LABELS[booking.status] ?? booking.status}
        </Chip>

        <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginTop: 12 }}>
          {booking.car?.brand} {booking.car?.model}
        </Text>

        <View style={styles.detailRow}>
          <Icon source="calendar" size={20} color={colors.primary} />
          <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
            {booking.start_date} → {booking.end_date}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon source="calendar-range" size={20} color={colors.primary} />
          <Text variant="bodyMedium" style={{ marginLeft: 8 }}>{days} día{days > 1 ? 's' : ''}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.outline }]} />

        {booking.unit_price ? (
          <>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              ${booking.unit_price} × {days} día{days > 1 ? 's' : ''} = ${(booking.unit_price * days).toLocaleString()}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              + {Math.round(RENTER_FEE * 100)}% servicio = ${(booking.renter_service_fee ?? renterFeeAmount(booking.unit_price, days)).toLocaleString()}
            </Text>
            <Text variant="titleLarge" style={[styles.price, { color: colors.primary }]}>
              ${booking.total_price.toLocaleString()}
            </Text>
          </>
        ) : (
          <Text variant="titleLarge" style={[styles.price, { color: colors.primary }]}>
            ${booking.total_price.toLocaleString()}
          </Text>
        )}
      </Surface>

      {booking.status === 'pending_payment' && (
        <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 12, color: colors.onSurfaceVariant }}>
            {booking.payment_method === 'cash' ? (
              <>
                Deposita el monto total a la cuenta del arrendador y envíale el comprobante por{' '}
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: colors.onSurface }}>
                  WhatsApp
                </Text>
                . Él confirmará tu reserva al recibir el pago.
              </>
            ) : paymentDeadline ? (
              <>
                Tu pago está siendo revisado. Debes completarlo antes del{' '}
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: colors.onSurface }}>
                  {new Date(paymentDeadline).toLocaleString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>.
              </>
            ) : (
              'Tu pago está siendo revisado. Si no completaste el pago, puedes reintentarlo.'
            )}
          </Text>
          <Button
            mode="contained"
            icon={booking.payment_method === 'cash' ? 'whatsapp' : 'credit-card'}
            onPress={() => router.push(`/(renter)/book/${booking.car_id}?existingBookingId=${booking.id}`)}
            style={styles.retryBtn}
          >
            {booking.payment_method === 'cash' ? 'Pagar en efectivo' : 'Reintentar pago'}
          </Button>
          <Button
            mode="outlined"
            icon="close"
            textColor={colors.error}
            onPress={handleCancel}
            loading={updating}
            disabled={updating}
            style={styles.cancelBtn}
          >
            Cancelar solicitud
          </Button>
        </Surface>
      )}

      {booking.status === 'pending' && (
        <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 12, color: colors.onSurfaceVariant }}>
            ¿Necesitas cancelar esta reserva?
          </Text>
          <Button
            mode="outlined"
            icon="close"
            textColor={colors.error}
            onPress={handleCancel}
            loading={updating}
            disabled={updating}
            style={styles.cancelBtn}
          >
            Cancelar reserva
          </Button>
        </Surface>
      )}

      {booking.status === 'completed' && (
        <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
          {review ? (
            <View style={{ alignItems: 'center' }}>
              <Text variant="bodyMedium" style={{ marginBottom: 8, color: colors.onSurfaceVariant }}>Tu reseña</Text>
              <RatingInput value={review.rating} onChange={() => {}} size={24} disabled />
              {review.comment && (
                <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>{review.comment}</Text>
              )}
            </View>
          ) : (
            <>
              <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 12, color: colors.onSurfaceVariant }}>
                ¿Cómo fue tu experiencia?
              </Text>
              <Button mode="contained" icon="star" onPress={() => setShowReviewDialog(true)} style={styles.ratingBtn}>
                Calificar
              </Button>
            </>
          )}
        </Surface>
      )}

      <Portal>
        <Dialog visible={showReviewDialog} onDismiss={() => setShowReviewDialog(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title style={{ textAlign: 'center' }}>Califica tu experiencia</Dialog.Title>
          <Dialog.Content>
            <RatingInput value={reviewRating} onChange={setReviewRating} size={36} />
            <TextInput
              label="Comentario (opcional)"
              value={reviewComment}
              onChangeText={setReviewComment}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={{ marginTop: 16 }}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', gap: 8 }}>
            <Button onPress={() => setShowReviewDialog(false)}>Cancelar</Button>
            <Button mode="contained" onPress={async () => {
              if (!booking) return
              setSubmittingReview(true)
              try {
                await createReview(booking.id, booking.car_id, reviewRating, reviewComment)
                setReview({ rating: reviewRating, comment: reviewComment })
                setShowReviewDialog(false)
                setSnackbar({ visible: true, message: 'Reseña publicada' })
              } catch (e) {
                setSnackbar({ visible: true, message: (e as Error).message })
              }
              setSubmittingReview(false)
            }} loading={submittingReview} disabled={submittingReview}>
              Publicar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Button mode="text" icon="forum" onPress={async () => {
        if (!userId || !booking?.car_id) return
        const { data: car } = await supabase.from('cars').select('owner_id').eq('id', booking.car_id).single()
        if (!car) return
        try {
          const convId = await findOrCreateConversation(booking.car_id, car.owner_id, userId)
          router.push(`/(renter)/conversations/${convId}`)
        } catch (e) {
          setSnackbar({ visible: true, message: (e as Error).message })
        }
      }} style={{ margin: 16 }}>
        Contactar al arrendador
      </Button>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { maxWidth: contentMaxWidth.form, alignSelf: 'center', width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 16, padding: 24, borderRadius: 20 },
  actionsCard: { margin: 16, padding: 20, borderRadius: 16, marginTop: 0 },
  statusBadge: { alignSelf: 'flex-start', height: 28 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  divider: { height: 1, marginVertical: 16 },
  price: { fontWeight: 'bold' },
  cancelBtn: { borderRadius: 12, borderColor: '#C62828', marginTop: 12 },
  retryBtn: { borderRadius: 12 },
  ratingBtn: { borderRadius: 12 },
})
