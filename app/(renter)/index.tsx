import { useEffect, useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Searchbar, Button, useTheme } from 'react-native-paper'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { CarCard } from '../../src/components/CarCard'
import { DepartmentPicker } from '../../src/components/DepartmentPicker'
import type { Department } from '../../src/types/database.types'

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

export default function RenterDashboard() {
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [cars, setCars] = useState<FlatCar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('departments' as any).select('id, name, slug').order('name' as any).then(({ data }: any) => {
      if (data) setDepartments(data)
    })
  }, [])

  const fetchCars = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('cars')
      .select('id, brand, model, year, price_per_day, available, department:department_id(name), profile:owner_id(full_name, business_name), car_tags(tag:tag_id(name))')
      .eq('available', true)
      .order('created_at', { ascending: false }) as any

    if (departmentId) q = q.eq('department_id', departmentId)
    if (query) {
      const like = `%${query}%`
      q = q.or(`brand.ilike.${like},model.ilike.${like}`)
    }

    const { data } = await q
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
  }, [departmentId, query])

  useEffect(() => { fetchCars() }, [fetchCars])

  const handleLogout = async () => {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/login')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
          Buscar autos
        </Text>
        <Button mode="text" onPress={handleLogout} textColor={colors.onSurfaceVariant}>
          Cerrar sesión
        </Button>
      </View>

      <View style={styles.filters}>
        <Searchbar
          placeholder="Buscar por marca, modelo..."
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: colors.surface }]}
          inputStyle={{ color: colors.onBackground }}
        />
        <View style={styles.pickerRow}>
          <View style={styles.picker}>
            <DepartmentPicker
              departments={departments}
              value={departmentId}
              onChange={(id) => setDepartmentId(id)}
            />
          </View>
          {departmentId && (
            <Button icon="close" onPress={() => setDepartmentId(null)} compact>
              Quitar
            </Button>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : cars.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>
            No se encontraron autos
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            {query || departmentId ? 'Intenta con otros filtros' : 'No hay autos disponibles aún'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={cars}
          renderItem={({ item }) => (
            <CarCard car={item} onPress={(id) => router.push(`/(renter)/${id}` as any)} />
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
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
    paddingTop: 60,
    paddingBottom: 16,
  },
  filters: { paddingHorizontal: 16, marginBottom: 8 },
  search: { marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  picker: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  list: { paddingBottom: 32 },
})
