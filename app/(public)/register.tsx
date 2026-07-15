import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, Surface, SegmentedButtons, useTheme } from 'react-native-paper'
import { Link } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../src/lib/supabase'

const schema = z.object({
  fullName: z.string().min(2, 'Nombre demasiado corto'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['owner', 'renter']),
  businessName: z.string().optional(),
})

type RegisterForm = z.infer<typeof schema>

export default function RegisterScreen() {
  const { colors } = useTheme()

  const { control, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', role: 'renter', businessName: '' },
  })

  const role = watch('role')

  const onSubmit = async ({ fullName, email, password, role, businessName }: RegisterForm) => {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, business_name: businessName || null } },
    })
    if (signUpError) {
      setError('root', { message: signUpError.message })
      return
    }

    if (data.session) {
      // Navigation handled by index.tsx via auth store
    } else {
      setError('root', { message: `Revisa tu correo ${email} — te enviamos un enlace de confirmación.` })
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.scroll}>
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
          <Text variant="headlineMedium" style={[styles.title, { color: colors.primary }]}>
            Crear cuenta
          </Text>

          {errors.root ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.root.message}</Text>
          ) : null}

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Nombre completo"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                disabled={isSubmitting}
                error={!!errors.fullName}
              />
            )}
          />
          {errors.fullName ? (
            <Text style={[styles.fieldError, { color: colors.error }]}>{errors.fullName.message}</Text>
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

          {role === 'owner' && (
            <>
              <Controller
                control={control}
                name="businessName"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Nombre de la empresa"
                    value={value ?? ''}
                    onChangeText={onChange}
                    mode="outlined"
                    style={styles.input}
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.businessName ? (
                <Text style={[styles.fieldError, { color: colors.error }]}>{errors.businessName.message}</Text>
              ) : null}
            </>
          )}

          <Text variant="bodyMedium" style={styles.roleLabel}>
            ¿Qué tipo de cuenta quieres?
          </Text>

          <Controller
            control={control}
            name="role"
            render={({ field: { value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={(v) => setValue('role', v as 'owner' | 'renter')}
                buttons={[
                  { value: 'owner', label: 'Publicar autos' },
                  { value: 'renter', label: 'Rentar autos' },
                ]}
                style={styles.segment}
              />
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting}
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
  card: { padding: 28, borderRadius: 20 },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 20 },
  input: { marginBottom: 4 },
  fieldError: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  roleLabel: { marginBottom: 10, textAlign: 'center', fontWeight: '500', marginTop: 8 },
  segment: { marginBottom: 20 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  link: { marginTop: 20, alignSelf: 'center' },
  error: { textAlign: 'center', marginBottom: 16, fontWeight: '500' },
})
