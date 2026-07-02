import { View, ScrollView, StyleSheet } from 'react-native'
import { Text, FAB, Button, useTheme } from 'react-native-paper'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

export default function OwnerDashboard() {
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
          Mis autos
        </Text>
        <Button mode="text" onPress={handleLogout} textColor={colors.onSurfaceVariant}>
          Cerrar sesión
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.empty}>
          <Text variant="displayMedium" style={{ textAlign: 'center' }}>🚗</Text>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Aún no has publicado autos
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
            Toca el botón + para publicar tu primer auto
          </Text>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        label="Publicar auto"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={() => {}}
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
  scrollContent: { flexGrow: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: { textAlign: 'center', marginTop: 16, marginBottom: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 16,
  },
})
