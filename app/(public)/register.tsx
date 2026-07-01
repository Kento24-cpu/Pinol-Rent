import { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, Surface, SegmentedButtons, useTheme } from 'react-native-paper'
import { Link, router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'owner' | 'renter'>('renter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { colors } = useTheme()

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role,
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
    }

    router.replace(role === 'owner' ? '/(owner)' : '/(renter)')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.scroll}>
        <Surface style={styles.card} elevation={2}>
          <Text variant="headlineMedium" style={[styles.title, { color: colors.primary }]}>
            Crear cuenta
          </Text>

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          <TextInput
            label="Nombre completo"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
          />
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

          <Text variant="bodyMedium" style={styles.roleLabel}>
            ¿Qué tipo de cuenta quieres?
          </Text>
          <SegmentedButtons
            value={role}
            onValueChange={(v) => setRole(v as 'owner' | 'renter')}
            buttons={[
              { value: 'owner', label: 'Publicar autos' },
              { value: 'renter', label: 'Rentar autos' },
            ]}
            style={styles.segment}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Registrarse
          </Button>

          <Link href="/login" style={styles.link}>
            <Text style={{ color: colors.primary, textAlign: 'center' }}>
              ¿Ya tienes cuenta? Inicia sesión
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
  card: { padding: 28, borderRadius: 20, backgroundColor: '#fff' },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 20 },
  input: { marginBottom: 14 },
  roleLabel: { marginBottom: 10, textAlign: 'center', fontWeight: '500' },
  segment: { marginBottom: 20 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  link: { marginTop: 20, alignSelf: 'center' },
  error: { textAlign: 'center', marginBottom: 16, fontWeight: '500' },
})
