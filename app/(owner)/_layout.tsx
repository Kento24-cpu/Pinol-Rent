import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { router } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { supabase } from '../../lib/supabase'

export default function OwnerLayout() {
  const { colors } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
    })
  }, [])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { borderTopColor: colors.outline, backgroundColor: '#fff' },
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

import { Text } from 'react-native'
