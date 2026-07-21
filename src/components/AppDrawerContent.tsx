import { useState, useEffect } from 'react'
import { View, Image, StyleSheet, Platform } from 'react-native'
import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from 'expo-router/drawer'
import { Text, Icon, useTheme, Divider, TouchableRipple, Dialog, Portal, Button } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { router } from 'expo-router'

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    supabase.from('profiles').select('full_name, business_name, avatar_url').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (!data) return
        if (role === 'owner') setDisplayName(data.business_name ?? '')
        else if (role === 'admin') setDisplayName('Administrador')
        else setDisplayName(data.full_name ?? '')
        setAvatarUrl(data.avatar_url ?? '')
      })
  }, [session?.user, role])

  const handleLogout = async () => {
    setShowLogout(false)
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Logout error', e)
    } finally {
      router.replace('/(public)')
    }
  }

  const roleLabel = role === 'owner' ? 'Dueño de autos'
    : role === 'admin' ? 'Administrador'
    : 'Arrendatario'

  const roleIcon = role === 'owner' ? 'account-tie'
    : role === 'admin' ? 'shield-account'
    : 'account'

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {session ? (
        <View style={[styles.drawerHeader, { backgroundColor: colors.primaryContainer }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                {(displayName?.[0]?.toUpperCase() ?? '?')}
              </Text>
            </View>
          )}
          <Text variant="titleMedium" style={[styles.name, { color: colors.onPrimaryContainer }]}>
            {displayName}
          </Text>
          <View style={styles.roleRow}>
            <Icon source={roleIcon} size={14} color={colors.onPrimaryContainer} />
            <Text variant="labelSmall" style={{ color: colors.onPrimaryContainer, marginLeft: 4 }}>
              {roleLabel}
            </Text>
          </View>
        </View>
      ) : (
        <TouchableRipple
          onPress={() => router.push('/(public)/login')}
          style={[styles.drawerHeader, { backgroundColor: colors.surfaceVariant }]}
        >
          <View style={styles.loginPrompt}>
            <Icon source="account" size={32} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
              Iniciar sesión
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
              Accede a tus reservas y mensajes
            </Text>
          </View>
        </TouchableRipple>
      )}

      <DrawerContentScrollView {...props} style={styles.menu}>
        <DrawerItemList {...props} />
        <Divider style={{ marginVertical: 12, marginHorizontal: 16 }} />
      </DrawerContentScrollView>

      {session && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Divider style={{ marginBottom: 8 }} />
          <TouchableRipple onPress={() => setShowLogout(true)} rippleColor={colors.error + '20'} accessibilityLabel="Cerrar sesión">
            <View style={styles.logoutItem}>
              <Icon source="logout" size={22} color={colors.error} />
              <Text variant="bodyLarge" style={{ color: colors.error, marginLeft: 32, fontWeight: '500' }}>
                Cerrar sesión
              </Text>
            </View>
          </TouchableRipple>
        </View>
      )}

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
  loginPrompt: { alignItems: 'center', paddingVertical: 8 },
  menu: { flex: 1 },
  footer: { paddingHorizontal: 20 },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
})
