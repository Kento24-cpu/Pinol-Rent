import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/stores/authStore'

export default function PublicLayout() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) return
    if (session) {
      router.replace(role === 'owner' ? '/(owner)' : '/(renter)')
    }
  }, [session, role, initialized])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}
