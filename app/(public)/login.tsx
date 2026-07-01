import { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper'
import { Link, router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { colors } = useTheme()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    router.replace(profile?.role === 'owner' ? '/(owner)' : '/(renter)')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.scroll}>
        <Surface style={styles.card} elevation={2}>
          <Text variant="headlineLarge" style={[styles.title, { color: colors.primary }]}>
            Pinol-Rent
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Inicia sesión para continuar
          </Text>

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          <TextInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Entrar
          </Button>

          <Link href="/register" style={styles.link}>
            <Text style={{ color: colors.primary, textAlign: 'center' }}>
              ¿No tienes cuenta? Regístrate
            </Text>
          </Link>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { padding: 32, borderRadius: 20, backgroundColor: '#fff' },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 4 },
  subtitle: { textAlign: 'center', marginBottom: 32 },
  input: { marginBottom: 14 },
  button: { marginTop: 8, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  link: { marginTop: 20, alignSelf: 'center' },
  error: { textAlign: 'center', marginBottom: 16, fontWeight: '500' },
})
