import { useEffect, useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Chip, useTheme, Icon, Searchbar } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAdminBookings } from '../../src/hooks/useAdminBookings'

const STATUS_COLORS: Record<string, string> = {
  pending: '#F57F17',
  pending_payment: '#1565C0',
  confirmed: '#2E7D32',
  completed: '#1B5E20',
  cancelled: '#C62828',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Esperando pago',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export default function AdminBookingsScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { bookings, loading, fetchAll } = useAdminBookings()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }, [fetchAll])

  const filtered = search.trim()
    ? bookings.filter((b) =>
        `${b.car_brand} ${b.car_model}`.toLowerCase().includes(search.toLowerCase()) ||
        b.renter_name?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings

  const renderItem = ({ item }: { item: typeof bookings[0] }) => {
    const statusColor = STATUS_COLORS[item.status] ?? colors.onSurfaceVariant
    const paymentStatus = item.payment_status

    return (
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              {item.car_brand} {item.car_model}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
              {item.renter_name} — {item.renter_email}
            </Text>
          </View>
          <Chip style={{ backgroundColor: statusColor + '20' }} textStyle={{ fontSize: 11, color: statusColor, fontWeight: 'bold' }}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Chip>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Icon source="calendar" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
              {item.start_date} → {item.end_date}
            </Text>
          </View>
          <View style={styles.row}>
            <Icon source="currency-usd" size={16} color={colors.primary} />
            <Text variant="bodyMedium" style={{ marginLeft: 6, fontWeight: 'bold', color: colors.primary }}>
              ${Number(item.total_price).toLocaleString('es-NI')}
            </Text>
          </View>
          {paymentStatus && (
            <View style={styles.row}>
              <Icon source="credit-card" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ marginLeft: 6, color: colors.onSurfaceVariant }}>
                Pago: {paymentStatus === 'pending' ? 'Pendiente de revisión' : paymentStatus}
              </Text>
            </View>
          )}
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
            Creado: {new Date(item.created_at).toLocaleString('es-NI')}
          </Text>
        </View>
      </Surface>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
          Historial de reservas
        </Text>
        <Button mode="contained" icon="refresh" onPress={handleRefresh} loading={refreshing} compact>
          Recargar
        </Button>
      </View>

      <Searchbar
        placeholder="Buscar por auto o cliente..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {loading && filtered.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Icon source="calendar-remove" size={64} color={colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
            {search ? 'Sin resultados' : 'No hay reservas'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  search: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  card: { margin: 16, padding: 20, borderRadius: 16, marginBottom: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardBody: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  list: { paddingBottom: 32 },
})
