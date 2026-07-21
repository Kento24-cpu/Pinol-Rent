import { useEffect, useState, useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Searchbar, Snackbar, Chip, useTheme, Icon } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { CarCard } from '../../src/components/CarCard'
import { DepartmentPicker } from '../../src/components/DepartmentPicker'
import { FilterModal } from '../../src/components/FilterModal'
import { useCars } from '../../src/hooks/useCars'
import { useAuthStore } from '../../src/stores/authStore'
import type { Tables } from '../../src/types/database'
type Department = Tables<'departments'>
type Tag = Tables<'tags'>

interface FilterValues {
  priceMin: string
  priceMax: string
  tagIds: number[]
  sortBy: 'newest' | 'price_asc' | 'price_desc'
  location: string
}

const EMPTY_FILTERS: FilterValues = { priceMin: '', priceMax: '', tagIds: [], sortBy: 'newest', location: '' }

export default function RenterDashboard() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useAuthStore((s) => s.session)
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const { cars, loading, refreshing, error, fetchCars, loadMore, cancel, clearError } = useCars({
    departmentId,
    searchQuery: query || undefined,
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    tagIds: filters.tagIds.length ? filters.tagIds : undefined,
    sortBy: filters.sortBy !== 'newest' ? filters.sortBy : undefined,
    location: filters.location || undefined,
  })

  useEffect(() => {
    supabase.from('departments').select('id, name, slug').order('name').then(({ data }) => {
      if (data) setDepartments(data)
    })
    supabase.from('tags').select('id, name, slug').order('name').then(({ data }) => {
      if (data) setTags(data)
    })
    return () => clearTimeout(debounceRef.current)
  }, [])

  const onChangeText = (text: string) => {
    setRawQuery(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(text), 300)
  }

  useFocusEffect(useCallback(() => {
    if (departmentId !== undefined) fetchCars()
    return cancel
  }, [fetchCars, cancel, departmentId]))

  const activeFilterCount = [
    filters.priceMin || filters.priceMax,
    filters.tagIds.length > 0,
    filters.sortBy !== 'newest',
    filters.location,
    departmentId,
  ].filter(Boolean).length

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
          Buscar autos
        </Text>
        <View style={styles.headerActions}>
          {session ? (
            <Button mode="text" icon="account" onPress={() => router.push('/(renter)/profile')} compact>
              Perfil
            </Button>
          ) : (
            <>
              <Button mode="text" onPress={() => router.push('/(public)/login')} compact>
                Iniciar sesión
              </Button>
              <Button mode="contained" onPress={() => router.push('/(public)/register')} compact>
                Registro
              </Button>
            </>
          )}
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Buscar por marca, modelo..."
            value={rawQuery}
            onChangeText={onChangeText}
            style={[styles.search, { backgroundColor: colors.surface, flex: 1 }]}
            inputStyle={{ color: colors.onBackground }}
          />
          <Button
            mode="outlined"
            icon="tune"
            onPress={() => setShowFilters(true)}
            style={styles.filterBtn}
          >
            {activeFilterCount > 0 ? `${activeFilterCount}` : ''}
          </Button>
        </View>

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

        {activeFilterCount > 0 && (
          <View style={styles.chipRow}>
            {filters.priceMin && (
              <Chip style={styles.activeChip} onClose={() => setFilters((f) => ({ ...f, priceMin: '' }))} compact>
                Min ${filters.priceMin}
              </Chip>
            )}
            {filters.priceMax && (
              <Chip style={styles.activeChip} onClose={() => setFilters((f) => ({ ...f, priceMax: '' }))} compact>
                Max ${filters.priceMax}
              </Chip>
            )}
            {filters.sortBy !== 'newest' && (
              <Chip style={styles.activeChip} onClose={() => setFilters((f) => ({ ...f, sortBy: 'newest' }))} compact>
                {filters.sortBy === 'price_asc' ? 'Precio ↑' : 'Precio ↓'}
              </Chip>
            )}
            {filters.location && (
              <Chip style={styles.activeChip} onClose={() => setFilters((f) => ({ ...f, location: '' }))} compact>
                {filters.location}
              </Chip>
            )}
          </View>
        )}
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
            {query || departmentId || activeFilterCount > 0
              ? 'Intenta con otros filtros'
              : 'No hay autos disponibles aún'}
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 16 }} /> : null}
        />
      )}

      <FilterModal
        visible={showFilters}
        onDismiss={() => setShowFilters(false)}
        current={filters}
        onApply={(f) => { setFilters(f); setShowFilters(false) }}
        tags={tags}
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
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filters: { paddingHorizontal: 16, marginBottom: 8 },
  search: { marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterBtn: { borderRadius: 12, minWidth: 48, justifyContent: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  picker: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  activeChip: { height: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  list: { paddingBottom: 32 },
})
