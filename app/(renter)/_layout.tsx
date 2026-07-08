import { useEffect } from 'react'
import { Drawer } from 'expo-router/drawer'
import { router } from 'expo-router'
import { Icon, useTheme } from 'react-native-paper'
import { useAuthStore } from '../../src/stores/authStore'
import { AppDrawerContent } from '../../src/components/AppDrawerContent'

export default function RenterLayout() {
  const { colors } = useTheme()
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) return
    if (!session) router.replace('/login')
    else if (role === 'owner') router.replace('/(owner)')
  }, [session, role, initialized])

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.onSurfaceVariant,
        drawerActiveBackgroundColor: colors.primaryContainer,
        drawerStyle: { backgroundColor: colors.surface, width: 280 },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onBackground,
        headerShadowVisible: false,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Pinol-Rent',
          headerTitle: 'Pinol-Rent',
          drawerLabel: 'Buscar autos',
          drawerIcon: ({ color }) => <Icon source="magnify" size={22} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="[id]"
        options={{
          title: 'Detalle del auto',
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Mi perfil',
          drawerLabel: 'Mi perfil',
          drawerIcon: ({ color }) => <Icon source="account" size={22} color={color as string} />,
        }}
      />
    </Drawer>
  )
}