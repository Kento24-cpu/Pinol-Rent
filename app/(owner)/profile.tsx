import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Text, TextInput, Button, Surface, Snackbar, useTheme } from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'

const schema = z.object({
  fullName: z.string().min(2, 'Nombre demasiado corto'),
  businessName: z.string().optional(),
  phone: z.string().optional(),
})

type ProfileForm = z.infer<typeof schema>

export default function OwnerProfileScreen() {
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', businessName: '', phone: '' },
  })

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('full_name, business_name, phone').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          reset({ fullName: data.full_name, businessName: data.business_name ?? '', phone: data.phone ?? '' })
        }
        setLoading(false)
      }, () => setLoading(false))
  }, [user])

  const onSubmit = async (form: ProfileForm) => {
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      full_name: form.fullName,
      business_name: form.businessName || null,
      phone: form.phone || null,
    }).eq('id', user.id)
    if (error) {
      setSnackbar({ visible: true, message: error.message })
    } else {
      await supabase.auth.updateUser({ data: { full_name: form.fullName } })
      setSnackbar({ visible: true, message: 'Perfil actualizado' })
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
          Mi perfil
        </Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Nombre completo" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              error={!!errors.fullName} />
          )}
        />

        <Controller
          control={control}
          name="businessName"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Nombre de la empresa" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting} />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Teléfono de contacto" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              keyboardType="phone-pad" />
          )}
        />

        <Button mode="contained" onPress={handleSubmit(onSubmit)}
          loading={isSubmitting} disabled={isSubmitting} style={styles.button}
          contentStyle={styles.buttonContent}>
          Guardar cambios
        </Button>
      </Surface>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { padding: 24, borderRadius: 20 },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 24 },
  input: { marginBottom: 12 },
  button: { borderRadius: 12, marginTop: 16 },
  buttonContent: { paddingVertical: 6 },
})