import { useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { Text, Button, useTheme, Icon } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../../src/stores/authStore'
import { useBookings } from '../../../src/hooks/useBookings'
import { BookingCard } from '../../../src/components/BookingCard'
import { LIST_MAX_WIDTH } from '../../../src/lib/responsive'

export default function RenterBookingsScreen() {
  const { colors } = useTheme()
  const session = useAuthStore((s) => s.session)
  const { bookings, loading, fetchMyBookings } = useBookings()

  useFocusEffect(useCallback(() => { fetchMyBookings() }, [fetchMyBookings]))

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon source="calendar-lock" size={48} color={colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={{ marginTop: 16, color: colors.onSurface }}>
          Inicia sesión para ver tus reservas
        </Text>
        <Button mode="contained" onPress={() => router.push('/(public)/login')} style={{ marginTop: 20 }}>
          Iniciar sesión
        </Button>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <BookingCard booking={item} onPress={(id) => router.push(`/(renter)/bookings/${id}`)} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMyBookings} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="calendar-remove" size={48} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
              No tienes reservas
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Explora autos disponibles para rentar
            </Text>
          </View>
        }
        contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 12 },
  cell: { width: '100%', maxWidth: LIST_MAX_WIDTH, alignSelf: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyContainer: { flex: 1 },
})
