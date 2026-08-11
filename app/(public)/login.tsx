import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ImageBackground } from 'react-native'
import { Text, TextInput, Button, Surface, Dialog, Portal, Snackbar, useTheme } from 'react-native-paper'
import { Link, router, useLocalSearchParams } from 'expo-router'
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
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  useEffect(() => {
    if (!session || !role) return
    if (redirect && redirect.startsWith('/') && !redirect.includes('://')) {
      router.replace(redirect as any)
    } else if (role === 'admin') {
      router.replace('/(admin)')
    } else if (role === 'owner') {
      router.replace('/(owner)')
    } else {
      router.replace('/(renter)')
    }
  }, [session, role, redirect])

  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async ({ email, password }: LoginForm) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('root', { message: signInError.message })
    }
  }

  const isNative = Platform.OS !== 'web'

  const formContent = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
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

          <Button mode="text" onPress={() => { setResetEmail(''); setResetSent(false); setShowReset(true) }} style={{ marginTop: 4 }} compact labelStyle={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
            Olvidé mi contraseña
          </Button>
        </Surface>

        <Portal>
          <Dialog visible={showReset} onDismiss={() => setShowReset(false)} style={{ borderRadius: 16 }}>
            <Dialog.Title style={{ textAlign: 'center' }}>Recuperar contraseña</Dialog.Title>
            <Dialog.Content>
              {resetSent ? (
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
                  Revisa tu correo — te enviamos un enlace para restablecer tu contraseña.
                </Text>
              ) : (
                <TextInput
                  label="Correo electrónico"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  mode="outlined"
                />
              )}
            </Dialog.Content>
            <Dialog.Actions style={{ justifyContent: 'center' }}>
              {resetSent ? (
                <Button onPress={() => setShowReset(false)}>Cerrar</Button>
              ) : (
                <>
                  <Button onPress={() => setShowReset(false)}>Cancelar</Button>
                  <Button
                    mode="contained"
                    disabled={!resetEmail}
                    onPress={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)
                      if (error) {
                        setSnackbar({ visible: true, message: error.message })
                      } else {
                        setResetSent(true)
                      }
                    }}
                  >
                    Enviar
                  </Button>
                </>
              )}
            </Dialog.Actions>
          </Dialog>
        </Portal>

        <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
          {snackbar.message}
        </Snackbar>
      </ScrollView>
    )

  const formArea = (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior="padding"
    >
      {isNative ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {formContent}
        </TouchableWithoutFeedback>
      ) : formContent}
    </KeyboardAvoidingView>
  )

  return (
    <ImageBackground source={require('../../assets/login-background.jpeg')} style={styles.container} resizeMode="cover">
      {formArea}
    </ImageBackground>
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
