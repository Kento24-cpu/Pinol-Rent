import { useState } from 'react'
import { View, Image, StyleSheet, Platform } from 'react-native'
import { DrawerContentScrollView, DrawerItemList } from 'expo-router/drawer'
import { Text, Icon, useTheme, Divider, TouchableRipple, Dialog, Portal, Button } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../stores/authStore'
import { router } from 'expo-router'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AppDrawerContent(props: any) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const userMeta = session?.user?.user_metadata
  const [showLogout, setShowLogout] = useState(false)

  const handleLogout = async () => {
    setShowLogout(false)
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('sb-'))
      keys.forEach((k) => localStorage.removeItem(k))
    }
    useAuthStore.getState().reset()
    router.replace('/login')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.drawerHeader, { backgroundColor: colors.primaryContainer }]}>
        {userMeta?.avatar_url ? (
          <Image source={{ uri: userMeta.avatar_url as string }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
              {(userMeta?.full_name as string)?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <Text variant="titleMedium" style={[styles.name, { color: colors.onPrimaryContainer }]}>
          {(userMeta?.full_name as string) ?? ''}
        </Text>
        <View style={styles.roleRow}>
          <Icon source={role === 'owner' ? 'account-tie' : 'account'} size={14} color={colors.onPrimaryContainer} />
          <Text variant="labelSmall" style={{ color: colors.onPrimaryContainer, marginLeft: 4 }}>
            {role === 'owner' ? 'Dueño de autos' : 'Arrendatario'}
          </Text>
        </View>
      </View>

      <DrawerContentScrollView {...props} style={styles.menu}>
        <DrawerItemList {...props} />
        <Divider style={{ marginVertical: 12, marginHorizontal: 16 }} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Divider style={{ marginBottom: 8 }} />
        <TouchableRipple onPress={() => setShowLogout(true)} rippleColor={colors.error + '20'}>
          <View style={styles.logoutItem}>
            <Icon source="logout" size={22} color={colors.error} />
            <Text variant="bodyLarge" style={{ color: colors.error, marginLeft: 32, fontWeight: '500' }}>
              Cerrar sesión
            </Text>
          </View>
        </TouchableRipple>
      </View>

      <Portal>
        <Dialog visible={showLogout} onDismiss={() => setShowLogout(false)} style={Platform.OS === 'web' ? { maxWidth: 400, alignSelf: 'center', borderRadius: 8 } : { borderRadius: 8 }}>
          <Dialog.Title>Cerrar sesión</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">¿Estás seguro de que quieres cerrar sesión?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogout(false)}>Cancelar</Button>
            <Button onPress={handleLogout} textColor={colors.error}>Salir</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  name: { fontWeight: 'bold' },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  menu: { flex: 1 },
  footer: { paddingHorizontal: 20 },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
})