import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Chip, Snackbar, useTheme, Icon } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useBookings } from '../../../src/hooks/useBookings'
import { useAuthStore } from '../../../src/stores/authStore'
import { supabase } from '../../../src/lib/supabase'
import type { BookingWithRelations } from '../../../src/types/database.types'

export default function OwnerBookingDetailScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id)
  const { id: bookingIdParam } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { fetchBooking, confirmBooking, cancelBooking, completeBooking } = useBookings()
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

  useEffect(() => { load() }, [load])

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

  const statusColor = booking.status === 'pending' ? '#F9A825'
    : booking.status === 'confirmed' ? '#2E7D32'
    : booking.status === 'cancelled' ? '#C62828'
    : '#1565C0'

  const days = Math.round((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Chip
          style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
          textStyle={[styles.statusText, { color: statusColor }]}
        >
          {booking.status === 'pending' ? 'Pendiente'
            : booking.status === 'confirmed' ? 'Confirmada'
            : booking.status === 'cancelled' ? 'Cancelada'
            : 'Completada'}
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

        <Text variant="titleLarge" style={[styles.price, { color: colors.primary }]}>
          ${booking.total_price.toLocaleString('es-NI')}
        </Text>

        {booking.unit_price && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            ${booking.unit_price} × {days} día{days > 1 ? 's' : ''}
          </Text>
        )}
      </Surface>

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
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('car_id', booking.car_id)
            .eq('renter_id', booking.renter_id)
            .maybeSingle()
          if (conv) {
            router.push(`/(owner)/conversations/${conv.id}`)
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
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 12 },
})
