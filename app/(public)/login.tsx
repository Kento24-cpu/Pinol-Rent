import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof schema>

export default function LoginScreen() {
  const { colors } = useTheme()

  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async ({ email, password }: LoginForm) => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('root', { message: signInError.message })
      return
    }

    const session = data.session
    if (!session) {
      setError('root', { message: 'Error al iniciar sesión. Intenta de nuevo.' })
      return
    }

    let role = 'renter'
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (profile) role = profile.role
    } catch {
      // fallback to renter if profile fetch fails
    }

    useAuthStore.getState().setRole(role as 'owner' | 'renter')
    router.replace(role === 'owner' ? '/(owner)' : '/(renter)')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.scroll}>
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
          <Text variant="headlineLarge" style={[styles.title, { color: colors.primary }]}>
            Pinol-Rent
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Inicia sesión para continuar
          </Text>

          {errors.root ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.root.message}</Text>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Correo electrónico"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                mode="outlined"
                style={styles.input}
                disabled={isSubmitting}
                error={!!errors.email}
              />
            )}
          />
          {errors.email ? (
            <Text style={[styles.fieldError, { color: colors.error }]}>{errors.email.message}</Text>
          ) : null}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Contraseña"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                mode="outlined"
                style={styles.input}
                disabled={isSubmitting}
                error={!!errors.password}
              />
            )}
          />
          {errors.password ? (
            <Text style={[styles.fieldError, { color: colors.error }]}>{errors.password.message}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting}
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
  card: { padding: 32, borderRadius: 20 },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 4 },
  subtitle: { textAlign: 'center', marginBottom: 32 },
  input: { marginBottom: 4 },
  button: { marginTop: 12, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  link: { marginTop: 20, alignSelf: 'center' },
  error: { textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  fieldError: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
})
