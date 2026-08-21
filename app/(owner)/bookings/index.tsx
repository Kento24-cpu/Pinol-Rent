import { useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { Text, useTheme, Icon } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useBookings } from '../../../src/hooks/useBookings'
import { BookingCard } from '../../../src/components/BookingCard'
import { ScreenContainer } from '../../../src/components/ScreenContainer'

export default function OwnerBookingsScreen() {
  const { colors } = useTheme()
  const { bookings, loading, fetchOwnerBookings } = useBookings()

  useFocusEffect(useCallback(() => { fetchOwnerBookings() }, [fetchOwnerBookings]))

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenContainer style={{ flex: 1 }}>
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BookingCard booking={item} onPress={(id) => router.push(`/(owner)/bookings/${id}`)} showUser="renter" />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOwnerBookings} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon source="calendar-remove" size={48} color={colors.onSurfaceVariant} />
              <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
                No hay reservas en tus autos
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                Cuando alguien reserve un auto, aparecerá aquí
              </Text>
            </View>
          }
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.list}
          style={{ flex: 1 }}
        />
      </ScreenContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyContainer: { flex: 1 },
})
