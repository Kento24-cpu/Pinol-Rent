import { useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, FAB, Snackbar, useTheme } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/stores/authStore'
import { CarCard } from '../../src/components/CarCard'
import { useCars } from '../../src/hooks/useCars'

export default function OwnerDashboard() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.session?.user)
  const { cars, loading, refreshing, error, fetchCars, cancel, clearError } = useCars({ ownerId: user?.id })

  useFocusEffect(useCallback(() => {
    fetchCars()
    return cancel
  }, [fetchCars, cancel]))

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
          Mis autos
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : cars.length === 0 ? (
        <View style={styles.center}>
          <Text variant="displayMedium" style={{ marginBottom: 16 }}>🚗</Text>
          <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>
            Aún no has publicado autos
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            Toca el botón + para publicar tu primer auto
          </Text>
        </View>
      ) : (
        <FlatList
          data={cars}
          renderItem={({ item }) => (
            <CarCard car={item} onPress={(id) => router.push(`/(owner)/${id}`)} />
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => fetchCars(true)}
        />
      )}

      <FAB
        icon="plus"
        label="Publicar auto"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={() => router.push('/(owner)/publish')}
      />

      <Snackbar visible={!!error} onDismiss={clearError} action={{ label: 'OK', onPress: clearError }}>
        {error}
      </Snackbar>
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
    paddingBottom: 16,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  list: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 16,
  },
})
