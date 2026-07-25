import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { Text, Surface, Switch, Divider, useTheme, Button, Icon, Snackbar } from 'react-native-paper'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../stores/authStore'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs'

export function NotificationsScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useAuthStore((s) => s.session)
  const { prefs, loading, updatePref } = useNotificationPrefs()
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Icon source="bell-lock" size={48} color={colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={{ marginTop: 16, color: colors.onSurface }}>
          Inicia sesión para configurar notificaciones
        </Text>
        <Button mode="contained" onPress={() => router.push('/(public)/login')} style={{ marginTop: 20 }}>
          Iniciar sesión
        </Button>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Text variant="titleMedium" style={[styles.title, { color: colors.primary }]}>Notificaciones</Text>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Mensajes</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Notificaciones push cuando recibas un mensaje
            </Text>
          </View>
          <Switch value={prefs.chat_push} onValueChange={async (v) => {
            try { await updatePref('chat_push', v) }
            catch { setSnackbar({ visible: true, message: 'Error al actualizar preferencia' }) }
          }} color={colors.primary} />
        </View>

        <Divider style={{ backgroundColor: colors.outline }} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Reservas</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Notificaciones sobre cambios en tus reservas
            </Text>
          </View>
          <Switch value={prefs.booking_push} onValueChange={async (v) => {
            try { await updatePref('booking_push', v) }
            catch { setSnackbar({ visible: true, message: 'Error al actualizar preferencia' }) }
          }} color={colors.primary} />
        </View>

        <Divider style={{ backgroundColor: colors.outline }} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Promociones</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Ofertas y novedades de Pinol-Rent
            </Text>
          </View>
          <Switch value={prefs.marketing} onValueChange={async (v) => {
            try { await updatePref('marketing', v) }
            catch { setSnackbar({ visible: true, message: 'Error al actualizar preferencia' }) }
          }} color={colors.primary} />
        </View>
      </Surface>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 16, padding: 24, borderRadius: 20 },
  title: { fontWeight: 'bold', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowText: { flex: 1, marginRight: 16 },
})
