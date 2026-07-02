import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/stores/authStore'

export default function Index() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) return

    if (!session) {
      router.replace('/login')
    } else if (role === 'owner') {
      router.replace('/(owner)')
    } else {
      router.replace('/(renter)')
    }
  }, [session, role, initialized])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
