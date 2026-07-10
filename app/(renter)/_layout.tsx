import { useEffect } from 'react'
import { View } from 'react-native'
import { Drawer } from 'expo-router/drawer'
import { router } from 'expo-router'
import { Icon, Badge, useTheme } from 'react-native-paper'
import { useAuthStore } from '../../src/stores/authStore'
import { useChatStore } from '../../src/stores/chatStore'
import { AppDrawerContent } from '../../src/components/AppDrawerContent'

export default function RenterLayout() {
  const { colors } = useTheme()
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)
  const unreadTotal = useChatStore((s) => s.unreadTotal)

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
        name="conversations/index"
        options={{
          title: 'Mensajes',
          drawerLabel: 'Mensajes',
          drawerIcon: ({ color }) => (
            <View>
              <Icon source="forum" size={22} color={color as string} />
              {unreadTotal > 0 && <Badge size={16} style={{ position: 'absolute', top: -6, right: -6 }}>{unreadTotal}</Badge>}
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="conversations/[id]"
        options={{
          title: 'Chat',
          drawerItemStyle: { display: 'none' },
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