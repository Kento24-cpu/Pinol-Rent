import { useEffect } from 'react'
import { View } from 'react-native'
import { Drawer } from 'expo-router/drawer'
import { router } from 'expo-router'
import { Icon, Badge, useTheme } from 'react-native-paper'
import { useAuthStore } from '../../src/stores/authStore'
import { useChatStore } from '../../src/stores/chatStore'
import { useNotifications } from '../../src/hooks/useNotifications'
import { AppDrawerContent } from '../../src/components/AppDrawerContent'
import { OfflineBanner } from '../../src/components/OfflineBanner'

export default function OwnerLayout() {
  const { colors } = useTheme()
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)
  const unreadTotal = useChatStore((s) => s.unreadTotal)
  const { unreadCount: notifUnread } = useNotifications({ subscribe: false })

  useEffect(() => {
    if (!initialized) return
    if (!role) router.replace('/(public)')
    else if (role === 'renter') router.replace('/(renter)')
  }, [role, initialized])

  return (
    <>
      <OfflineBanner />
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
          drawerLabel: 'Mis autos',
          drawerIcon: ({ color }) => <Icon source="car-multiple" size={22} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="publish"
        options={{
          title: 'Publicar auto',
          drawerLabel: 'Publicar auto',
          drawerIcon: ({ color }) => <Icon source="plus-circle" size={22} color={color as string} />,
          headerTitle: 'Publicar auto',
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
        name="edit/[id]"
        options={{
          title: 'Editar auto',
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="bookings/index"
        options={{
          title: 'Reservas',
          drawerLabel: 'Reservas',
          drawerIcon: ({ color }) => <Icon source="calendar" size={22} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="bookings/[id]"
        options={{
          title: 'Detalle de reserva',
          drawerItemStyle: { display: 'none' },
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
        name="notifications-list"
        options={{
          title: 'Centro de notificaciones',
          drawerLabel: 'Notificaciones',
          drawerIcon: ({ color }) => (
            <View>
              <Icon source="bell-ring" size={22} color={color as string} />
              {notifUnread > 0 && <Badge size={16} style={{ position: 'absolute', top: -6, right: -6 }}>{notifUnread}</Badge>}
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: 'Preferencias',
          drawerLabel: 'Preferencias',
          drawerIcon: ({ color }) => <Icon source="cog" size={22} color={color as string} />,
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
    </>
  )
}