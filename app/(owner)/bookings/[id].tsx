import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Chip, Snackbar, useTheme, Icon } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useBookings } from '../../../src/hooks/useBookings'
import { STATUS_COLORS, STATUS_LABELS } from '../../../src/lib/bookingStatus'
import { OWNER_COMMISSION } from '../../../src/lib/commission'
import { useAuthStore } from '../../../src/stores/authStore'
import { findOrCreateConversation } from '../../../src/lib/chat'
import { supabase } from '../../../src/lib/supabase'
import type { BookingWithRelations } from '../../../src/types/database.types'

export default function OwnerBookingDetailScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id)
  const { id: bookingIdParam } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { fetchBooking, confirmBooking, cancelBooking, completeBooking, confirmCashBooking } = useBookings()
  const [booking, setBooking] = useState<BookingWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const bookingId = Number(bookingIdParam)

  const load = useCallback(async () => {
    const data = await fetchBooking(bookingId)
    setBooking(data)
    setLoading(false)
  }, [bookingId, fetchBooking])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load on mount
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`owner-booking-${bookingId}`)
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
          const label = newStatus === 'confirmed' ? 'confirmada'
            : newStatus === 'cancelled' ? 'cancelada'
            : newStatus === 'completed' ? 'completada'
            : newStatus
          setSnackbar({ visible: true, message: `Reserva ${label}` })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId, load])

  const updateStatus = async (status: 'confirmed' | 'cancelled' | 'completed') => {
    setUpdating(true)
    try {
      if (status === 'confirmed') await confirmBooking(bookingId)
      else if (status === 'cancelled') await cancelBooking(bookingId)
      else await completeBooking(bookingId)
      setBooking((prev) => prev ? { ...prev, status } : null)
      setSnackbar({ visible: true, message: 'Reserva actualizada' })
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
    setUpdating(false)
  }

  const handleConfirmCash = async () => {
    setUpdating(true)
    try {
      await confirmCashBooking(bookingId)
      setBooking((prev) => prev ? { ...prev, status: 'confirmed' } : null)
      setSnackbar({ visible: true, message: 'Pago recibido — reserva confirmada' })
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
  const days = (() => {
    if (!booking.start_date || !booking.end_date) return 0
    const diff = Math.round((parseDate(booking.end_date).getTime() - parseDate(booking.start_date).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff + 1)
  })()

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
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

        {booking.renter && (
          <View style={styles.detailRow}>
            <Icon source="account" size={20} color={colors.primary} />
            <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
              {booking.renter.full_name}
            </Text>
          </View>
        )}

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

        {booking.payment_method === 'cash' ? (
          <>
            <Text variant="titleLarge" style={[styles.price, { color: colors.primary }]}>
              ${booking.total_price.toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Monto depositado por el arrendatario
            </Text>
            {booking.car && 'deposit' in booking.car && booking.car.deposit ? (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                + ${booking.car.deposit.toLocaleString()} de depósito por reserva (se devuelve al finalizar)
              </Text>
            ) : null}
            <View style={styles.netRow}>
              <Icon source="minus-circle" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 6 }}>
                -{OWNER_COMMISSION * 100}% comisión (${(booking.owner_commission ?? 0).toLocaleString()}) — informe
              </Text>
            </View>
          </>
        ) : booking.unit_price ? (
          <>
            <View style={styles.netRow}>
              <Icon source="minus-circle" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginLeft: 6 }}>
                -{OWNER_COMMISSION * 100}% comisión (${(booking.owner_commission ?? 0).toLocaleString()})
              </Text>
            </View>
            <Text variant="titleLarge" style={[styles.price, { color: colors.primary }]}>
              ${(booking.owner_net_total ?? booking.total_price).toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Total recibido
            </Text>
          </>
        ) : (
          <Text variant="titleLarge" style={[styles.price, { color: colors.primary }]}>
            ${booking.total_price.toLocaleString()}
          </Text>
        )}
      </Surface>

      {booking.status === 'pending_payment' && booking.payment_method === 'cash' && (
        <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 12, color: colors.onSurfaceVariant }}>
            El arrendatario está realizando el depósito a tu cuenta. Al recibir el comprobante por WhatsApp, confirma el pago para aceptar la reserva.
          </Text>
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              icon="close"
              textColor={colors.error}
              onPress={() => updateStatus('cancelled')}
              loading={updating}
              disabled={updating}
              style={[styles.actionBtn, { borderColor: '#C62828' }]}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              icon="check"
              onPress={handleConfirmCash}
              loading={updating}
              disabled={updating}
              style={styles.actionBtn}
            >
              Confirmar pago recibido
            </Button>
          </View>
        </Surface>
      )}

      {booking.status === 'pending_payment' && booking.payment_method !== 'cash' && (
        <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>
            El pago del arrendatario está siendo verificado por el equipo de Pinol Rent. Recibirás una notificación cuando sea aprobado.
          </Text>
        </Surface>
      )}

      {booking.status === 'pending' && (
        <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 12, color: colors.onSurfaceVariant }}>
            ¿Qué deseas hacer con esta solicitud?
          </Text>
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              icon="close"
              textColor={colors.error}
              onPress={() => updateStatus('cancelled')}
              loading={updating}
              disabled={updating}
              style={[styles.actionBtn, { borderColor: '#C62828' }]}
            >
              Rechazar
            </Button>
            <Button
              mode="contained"
              icon="check"
              onPress={() => updateStatus('confirmed')}
              loading={updating}
              disabled={updating}
              style={styles.actionBtn}
            >
              Aceptar
            </Button>
          </View>
        </Surface>
      )}

      {booking.status === 'confirmed' && (
        <Button
          mode="contained"
          icon="check-circle"
          onPress={() => updateStatus('completed')}
          loading={updating}
          disabled={updating}
          style={{ margin: 16, borderRadius: 12 }}
        >
        Marcar como completada
          </Button>
        )}

      {booking.status !== 'cancelled' && (
        <Button mode="text" icon="forum" onPress={async () => {
          if (!userId || !booking?.car_id) return
          try {
            const convId = await findOrCreateConversation(booking.car_id, userId, booking.renter_id)
            router.push(`/(owner)/conversations/${convId}`)
          } catch (e) {
            setSnackbar({ visible: true, message: (e as Error).message })
          }
        }} style={{ margin: 16 }}>
          Ver conversación
        </Button>
      )}

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 16, padding: 24, borderRadius: 20 },
  actionsCard: { margin: 16, padding: 20, borderRadius: 16, marginTop: 0 },
  statusBadge: { alignSelf: 'flex-start', height: 28 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  divider: { height: 1, marginVertical: 16 },
  price: { fontWeight: 'bold' },
  netRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 12 },
})
