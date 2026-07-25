import { useEffect } from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../src/stores/authStore'

export default function Index() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const initialized = useAuthStore((s) => s.initialized)
  const profileError = useAuthStore((s) => s.profileError)

  useEffect(() => {
    if (!initialized) return
    if (!session) {
      router.replace('/(public)/login')
      return
    }
    if (!role || profileError) return
    if (role === 'admin') {
      router.replace('/(admin)')
    } else if (role === 'owner') {
      router.replace('/(owner)')
    } else {
      router.replace('/(renter)')
    }
  }, [session, role, initialized, profileError])

  if (!initialized || (session && !role && !profileError)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (profileError && session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Error al cargar perfil</Text>
        <Text style={styles.errorMessage}>No se pudo verificar tu información de usuario.</Text>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', opacity: 0.6 },
})
