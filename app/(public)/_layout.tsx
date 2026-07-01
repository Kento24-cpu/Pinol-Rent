import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function PublicLayout() {
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      router.replace(profile?.role === 'owner' ? '/(owner)' : '/(renter)')
    })
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}
