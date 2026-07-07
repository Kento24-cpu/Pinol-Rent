import { useState, useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, FAB, Snackbar, useTheme } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { CarCard } from '../../src/components/CarCard'
import type { CarWithRelations } from '../../src/types/database.types'

interface FlatCar {
  id: number
  brand: string
  model: string
  year: number
  price_per_day: number
  available: boolean
  department_name: string
  business_name: string | null
  owner_full_name: string
  tags: { name: string }[]
  image_url?: string | null
}

export default function OwnerDashboard() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.session?.user)
  const [cars, setCars] = useState<FlatCar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { data, error: fetchError } = await supabase
      .from('cars')
      .select('id, brand, model, year, price_per_day, available, image_url, description, department:department_id(name), profile:owner_id(full_name, business_name), car_tags(tag:tag_id(name))')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .abortSignal(abortRef.current.signal)

    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      setError(null)
      setCars((data as unknown as CarWithRelations[]).map((c) => ({
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price_per_day: c.price_per_day,
        available: c.available ?? true,
        department_name: c.department?.name ?? '',
        business_name: c.profile?.business_name ?? null,
        owner_full_name: c.profile?.full_name ?? '',
        tags: c.car_tags?.map((ct) => ({ name: ct.tag.name })) ?? [],
        image_url: c.image_url,
      })))
    }
    setLoading(false)
    setRefreshing(false)
  }, [user])

  useFocusEffect(useCallback(() => {
    fetchCars()
    return () => { abortRef.current?.abort() }
  }, [fetchCars]))

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

      <Snackbar visible={!!error} onDismiss={() => setError(null)} action={{ label: 'OK', onPress: () => setError(null) }}>
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
