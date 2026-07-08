import { useEffect, useState, useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Searchbar, Snackbar, useTheme } from 'react-native-paper'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { CarCard } from '../../src/components/CarCard'
import { DepartmentPicker } from '../../src/components/DepartmentPicker'
import { useCars } from '../../src/hooks/useCars'
import type { Tables } from '../../src/types/database'
type Department = Tables<'departments'>

export default function RenterDashboard() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const { cars, loading, refreshing, error, fetchCars, cancel, clearError } = useCars({ departmentId, searchQuery: query || undefined })
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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

  useFocusEffect(useCallback(() => {
    if (departmentId !== undefined) fetchCars()
    return cancel
  }, [fetchCars, cancel, departmentId]))

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
  filters: { paddingHorizontal: 16, marginBottom: 8 },
  search: { marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  picker: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  list: { paddingBottom: 32 },
})
