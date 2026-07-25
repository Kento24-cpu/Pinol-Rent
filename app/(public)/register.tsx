import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native'
import { useEffect } from 'react'
import { Text, TextInput, Button, Surface, SegmentedButtons, useTheme } from 'react-native-paper'
import { Link } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../src/lib/supabase'

const baseSchema = {
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  adminCode: z.string().optional(),
}

const renterSchema = z.object({
  ...baseSchema,
  role: z.literal('renter'),
  fullName: z.string().min(2, 'Nombre demasiado corto'),
  cedula: z.string().min(5, 'Cédula inválida'),
  phone: z.string().min(6, 'Teléfono inválido'),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
})

const ownerSchema = z.object({
  ...baseSchema,
  role: z.literal('owner'),
  fullName: z.string().optional(),
  cedula: z.string().min(5, 'Cédula inválida'),
  phone: z.string().min(6, 'Teléfono inválido'),
  businessName: z.string().min(2, 'Nombre de empresa requerido'),
  businessAddress: z.string().min(2, 'Dirección requerida'),
})

const adminSchema = z.object({
  ...baseSchema,
  role: z.literal('admin'),
  fullName: z.string().optional(),
  cedula: z.string().optional(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
})

const schema = z.discriminatedUnion('role', [renterSchema, ownerSchema, adminSchema])

type RegisterForm = z.infer<typeof schema>

export default function RegisterScreen() {
  const { colors } = useTheme()

  const { control, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'renter', email: '', password: '', fullName: '', cedula: '', phone: '', businessName: '', businessAddress: '', adminCode: '' } as any,
  })

  const role = watch('role')
  const adminCode = watch('adminCode')
  const isAdminMode = (adminCode?.length ?? 0) > 0

  useEffect(() => {
    if (isAdminMode && watch('role') !== 'admin') {
      setValue('role', 'admin')
    }
  }, [isAdminMode])

  const onSubmit = async (form: RegisterForm) => {
    const effectiveRole = form.adminCode ? 'admin' : form.role
    const meta: Record<string, string | null | undefined> = {
      role: effectiveRole,
      admin_code: form.adminCode || undefined,
    }
    if (effectiveRole === 'renter') {
      meta.cedula = form.cedula
      meta.phone = form.phone
      meta.full_name = form.fullName
    } else if (effectiveRole === 'owner') {
      meta.cedula = form.cedula
      meta.phone = form.phone
      meta.business_name = form.businessName
      meta.business_address = form.businessAddress
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: meta },
    })
    if (signUpError) {
      setError('root', { message: signUpError.message })
      return
    }

    if (data.session) {
      // Navigation handled by index.tsx via auth store
    } else {
      setError('root', { message: `Revisa tu correo ${form.email} — te enviamos un enlace de confirmación.` })
    }
  }

  const isNative = Platform.OS !== 'web'

  const formContent = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.primary }]}>
          Crear cuenta
        </Text>

        {errors.root ? (
          <Text style={[styles.error, { color: colors.error }]}>{errors.root.message}</Text>
        ) : null}

        {!isAdminMode && (
          <>
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
          </>
        )}

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

        {!isAdminMode && (
          <>
            <Controller
              control={control}
              name="cedula"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Cédula de identidad"
                  value={value ?? ''}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  disabled={isSubmitting}
                  error={!!errors.cedula}
                />
              )}
            />
            {errors.cedula ? (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.cedula.message}</Text>
            ) : null}

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Teléfono"
                  value={value ?? ''}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  disabled={isSubmitting}
                  keyboardType="phone-pad"
                  error={!!errors.phone}
                />
              )}
            />
            {errors.phone ? (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.phone.message}</Text>
            ) : null}

            {role === 'renter' && (
              <>
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Nombre completo"
                      value={value ?? ''}
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
              </>
            )}

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
                      error={!!errors.businessName}
                    />
                  )}
                />
                {errors.businessName ? (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.businessName.message}</Text>
                ) : null}

                <Controller
                  control={control}
                  name="businessAddress"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Dirección de la empresa"
                      value={value ?? ''}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      disabled={isSubmitting}
                      error={!!errors.businessAddress}
                    />
                  )}
                />
                {errors.businessAddress ? (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.businessAddress.message}</Text>
                ) : null}
              </>
            )}
          </>
        )}

        <Controller
          control={control}
          name="adminCode"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Código de administrador (opcional)"
              value={value ?? ''}
              onChangeText={onChange}
              mode="outlined"
              style={styles.input}
              disabled={isSubmitting}
              secureTextEntry
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
    </ScrollView>
  )

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {isNative ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {formContent}
        </TouchableWithoutFeedback>
      ) : formContent}
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
