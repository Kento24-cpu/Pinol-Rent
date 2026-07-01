import { View, StyleSheet } from 'react-native'
import { Text, FAB, Button, useTheme } from 'react-native-paper'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function OwnerDashboard() {
  const { colors } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
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

      <View style={styles.empty}>
        <Text variant="displayMedium" style={{ textAlign: 'center' }}>🚗</Text>
        <Text variant="bodyLarge" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          Aún no has publicado autos
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
          Toca el botón + para publicar tu primer auto
        </Text>
      </View>

      <FAB
        icon="plus"
        label="Publicar auto"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color="#fff"
        onPress={() => {}}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 80 },
  emptyText: { textAlign: 'center', marginTop: 4 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 16 },
})
