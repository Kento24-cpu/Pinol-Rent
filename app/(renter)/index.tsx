import { View, ScrollView, StyleSheet } from 'react-native'
import { Text, Searchbar, Button, useTheme } from 'react-native-paper'
import { useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

export default function RenterDashboard() {
  const [query, setQuery] = useState('')
  const { colors } = useTheme()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // session signOut failed, redirect anyway
    }
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

      <Searchbar
        placeholder="Buscar por marca, modelo..."
        value={query}
        onChangeText={setQuery}
        style={[styles.search, { backgroundColor: colors.surface }]}
        inputStyle={{ color: colors.onBackground }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.empty}>
          <Text variant="displayMedium" style={{ textAlign: 'center' }}>🔍</Text>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Busca autos disponibles cerca de ti
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
            Explora vehículos y encuentra el perfecto para tu viaje
          </Text>
        </View>
      </ScrollView>
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
  search: { marginHorizontal: 20, marginBottom: 16 },
  scrollContent: { flexGrow: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: { textAlign: 'center', marginTop: 16, marginBottom: 8 },
})
