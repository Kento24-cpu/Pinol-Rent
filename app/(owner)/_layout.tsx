import { useEffect } from 'react'
import { Text } from 'react-native'
import { Tabs } from 'expo-router'
import { router } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { useAuthStore } from '../../src/stores/authStore'

export default function OwnerLayout() {
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
          title: 'Mis autos',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🚗</Text>
          ),
        }}
      />
    </Tabs>
  )
}
