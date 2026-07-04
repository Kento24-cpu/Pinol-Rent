import { useEffect, useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, FAB, Button, useTheme } from 'react-native-paper'
import { router } from 'expo-router'
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
}

export default function OwnerDashboard() {
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const [cars, setCars] = useState<FlatCar[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCars = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('cars')
      .select('id, brand, model, year, price_per_day, available, department:department_id(name), profile:owner_id(full_name, business_name), car_tags(tag:tag_id(name))')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }) as any

    if (data) {
      setCars(data.map((c: any) => ({
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price_per_day: c.price_per_day,
        available: c.available,
        department_name: c.department?.name ?? '',
        business_name: c.profile?.business_name ?? null,
        owner_full_name: c.profile?.full_name ?? '',
        tags: c.car_tags?.map((ct: any) => ({ name: ct.tag.name })) ?? [],
      })))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCars() }, [fetchCars])

  const handleLogout = async () => {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/login')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
          Mis autos
        </Text>
        <Button mode="text" onPress={handleLogout} textColor={colors.onSurfaceVariant}>
          Cerrar sesión
        </Button>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : cars.length === 0 ? (
        <View style={styles.center}>
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
            <CarCard car={item} onPress={() => {}} />
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB
        icon="plus"
        label="Publicar auto"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={() => router.push('/(owner)/publish' as any)}
      />
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
    paddingTop: 60,
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
