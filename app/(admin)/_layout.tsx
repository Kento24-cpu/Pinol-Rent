import { useEffect } from 'react'
import { View } from 'react-native'
import { Drawer } from 'expo-router/drawer'
import { router } from 'expo-router'
import { Icon, Badge, useTheme } from 'react-native-paper'
import { useAuthStore } from '../../src/stores/authStore'
import { useNotifications } from '../../src/hooks/useNotifications'
import { useResponsive } from '../../src/hooks/useResponsive'
import { AppDrawerContent } from '../../src/components/AppDrawerContent'
import { OfflineBanner } from '../../src/components/OfflineBanner'

export default function AdminLayout() {
  const { colors } = useTheme()
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)
  const { unreadCount: notifUnread } = useNotifications({ subscribe: false })
  const { isDesktop } = useResponsive()

  useEffect(() => {
    if (!initialized) return
    if (!role) router.replace('/(public)')
    else if (role === 'renter') router.replace('/(renter)')
    else if (role === 'owner') router.replace('/(owner)')
  }, [role, initialized])

  return (
    <>
      <OfflineBanner />
      <Drawer
        drawerContent={(props) => <AppDrawerContent {...props} />}
        screenOptions={{
          drawerType: isDesktop ? 'permanent' : 'front',
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
            title: 'Panel Admin',
            headerTitle: 'Panel Admin',
            drawerLabel: 'Pagos pendientes',
            drawerIcon: ({ color }) => <Icon source="credit-card" size={22} color={color as string} />,
          }}
        />
        <Drawer.Screen
          name="bookings"
          options={{
            title: 'Reservas',
            headerTitle: 'Historial de reservas',
            drawerLabel: 'Reservas',
            drawerIcon: ({ color }) => <Icon source="calendar" size={22} color={color as string} />,
          }}
        />
        <Drawer.Screen
          name="payments/[id]"
          options={{
            title: 'Detalle de pago',
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
      </Drawer>
    </>
  )
}
