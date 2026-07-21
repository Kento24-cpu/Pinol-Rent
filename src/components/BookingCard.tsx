import { View, Image, StyleSheet } from 'react-native'
import { Text, Card, Chip, Icon, useTheme } from 'react-native-paper'

interface BookingCardBooking {
  id: number
  start_date: string
  end_date: string
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'pending_payment'
  car: { brand: string; model: string; image_url: string | null } | null
  renter?: { full_name: string | null } | null
  owner?: { full_name: string | null } | null
}

interface BookingCardProps {
  booking: BookingCardBooking
  onPress: (id: number) => void
  showUser?: 'renter' | 'owner'
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F9A825',
  pending_payment: '#E65100',
  confirmed: '#2E7D32',
  cancelled: '#C62828',
  completed: '#1565C0',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

export function BookingCard({ booking, onPress, showUser }: BookingCardProps) {
  const { colors } = useTheme()
  const statusColor = STATUS_COLORS[booking.status] ?? colors.onSurfaceVariant

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => onPress(booking.id)}
      mode="elevated"
      elevation={2}
    >
      <View style={styles.row}>
        {booking.car?.image_url ? (
          <Image source={{ uri: booking.car.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryContainer }]}>
            <Icon source="car" size={28} color={colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.content}>
          <Text variant="titleSmall" style={{ fontWeight: 'bold' }} numberOfLines={1}>
            {booking.car?.brand} {booking.car?.model}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
            {booking.start_date} → {booking.end_date}
          </Text>
          <Text variant="titleSmall" style={[styles.price, { color: colors.primary }]}>
            ${booking.total_price.toLocaleString('es-NI')}
          </Text>
          {showUser === 'renter' && booking.renter && (
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {booking.renter.full_name}
            </Text>
          )}
        </View>
        <Chip
          style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
          textStyle={[styles.statusText, { color: statusColor }]}
        >
          {STATUS_LABELS[booking.status] ?? booking.status}
        </Chip>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6, borderRadius: 16, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  image: { width: 64, height: 64, borderRadius: 12 },
  imagePlaceholder: { width: 64, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, marginLeft: 12 },
  price: { fontWeight: 'bold', marginTop: 2 },
  statusChip: { height: 28, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
})
