import { useEffect, useState, useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Searchbar, Snackbar, useTheme } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { CarCard } from '../../src/components/CarCard'
import { DepartmentPicker } from '../../src/components/DepartmentPicker'
import type { Tables } from '../../src/types/database'
import type { CarWithRelations } from '../../src/types/database.types'
type Department = Tables<'departments'>

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

export default function RenterDashboard() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [cars, setCars] = useState<FlatCar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    supabase.from('departments').select('id, name, slug').order('name').then(({ data }) => {
      if (data) setDepartments(data)
    })
    return () => clearTimeout(debounceRef.current)
  }, [])

  const onChangeText = (text: string) => {
    setRawQuery(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(text), 300)
  }

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    let q = supabase
      .from('cars')
      .select('id, brand, model, year, price_per_day, available, image_url, department:department_id(name), profile:owner_id(full_name, business_name), car_tags(tag:tag_id(name))')
      .eq('available', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .abortSignal(abortRef.current.signal)

    if (departmentId) q = q.eq('department_id', departmentId)
    if (query) {
      const like = `%${query}%`
      q = q.or(`brand.ilike.${like},model.ilike.${like}`)
    }

    const { data, error: fetchError } = await q
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
  }, [departmentId, query])

  useFocusEffect(useCallback(() => {
    fetchCars()
    return () => { abortRef.current?.abort() }
  }, [fetchCars]))

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
          Buscar autos
        </Text>
      </View>

      <View style={styles.filters}>
        <Searchbar
          placeholder="Buscar por marca, modelo..."
          value={rawQuery}
          onChangeText={onChangeText}
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
          <Text variant="displayMedium" style={{ marginBottom: 16 }}>🔍</Text>
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
            <CarCard car={item} onPress={(id) => router.push(`/(renter)/${id}`)} />
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => fetchCars(true)}
        />
      )}
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
  filters: { paddingHorizontal: 16, marginBottom: 8 },
  search: { marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  picker: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  list: { paddingBottom: 32 },
})
