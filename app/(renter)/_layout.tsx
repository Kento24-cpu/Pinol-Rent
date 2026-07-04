import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { router } from 'expo-router'
import { Icon, useTheme } from 'react-native-paper'
import { useAuthStore } from '../../src/stores/authStore'

export default function RenterLayout() {
  const { colors } = useTheme()
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) return
    if (!session) router.replace('/login')
  }, [session, initialized])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { borderTopColor: colors.outline, backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buscar autos',
          tabBarIcon: ({ color }) => (
            <Icon source="magnify" size={24} color={color as string} />
          ),
        }}
      />
    </Tabs>
  )
}
