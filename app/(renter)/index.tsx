import { View, StyleSheet } from 'react-native'
import { Text, Searchbar, Button, useTheme } from 'react-native-paper'
import { useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function RenterDashboard() {
  const [query, setQuery] = useState('')
  const { colors } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
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
        style={[styles.search, { backgroundColor: '#fff' }]}
        inputStyle={{ color: colors.onBackground }}
      />

      <View style={styles.empty}>
        <Text variant="displayMedium" style={{ textAlign: 'center' }}>🔍</Text>
        <Text variant="bodyLarge" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          Busca autos disponibles cerca de ti
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
          Explora vehículos y encuentra el perfecto para tu viaje
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8 },
  search: { marginBottom: 20, borderRadius: 12, elevation: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 4 },
})
