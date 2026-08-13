import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { Text, TextInput, Button, Surface, Snackbar, useTheme, Icon } from 'react-native-paper'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../lib/supabase'
import { uriToBlob } from '../lib/upload'
import { showAlert } from '../lib/alert'
import { useAuthStore } from '../stores/authStore'
import type { Database } from '../types/database'

interface ProfileScreenProps {
  isOwner?: boolean
}

interface ProfileData {
  fullName: string | null
  businessName: string | null
  businessAddress: string | null
  phone: string
  cedula: string
  avatarUrl: string
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null
}

export function ProfileScreen({ isOwner }: ProfileScreenProps) {
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [avatarError, setAvatarError] = useState(false)
  const [editingAvatarError, setEditingAvatarError] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const schema = z.object({
    fullName: z.string().optional(),
    businessName: z.string().optional(),
    businessAddress: z.string().optional(),
    phone: z.string().min(6, 'Teléfono inválido'),
    cedula: z.string().min(5, 'Cédula inválida'),
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankAccountHolder: z.string().optional(),
  })

  type ProfileForm = z.infer<typeof schema>

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', businessName: '', businessAddress: '', phone: '', cedula: '', bankName: '', bankAccountNumber: '', bankAccountHolder: '' },
  })

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('full_name, business_name, business_address, phone, cedula, avatar_url, bank_name, bank_account_number, bank_account_holder').eq('id', user.id).single()
      .then((res) => {
        const data = res.data as {
          full_name: string | null
          business_name: string | null
          business_address: string | null
          phone: string | null
          cedula: string | null
          avatar_url: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_holder: string | null
        } | null
        if (data) {
          const p: ProfileData = {
            fullName: data.full_name,
            businessName: data.business_name,
            businessAddress: data.business_address,
            phone: data.phone ?? '',
            cedula: data.cedula ?? '',
            avatarUrl: data.avatar_url ?? '',
            bankName: data.bank_name,
            bankAccountNumber: data.bank_account_number,
            bankAccountHolder: data.bank_account_holder,
          }
          setProfile(p)
          setAvatarUrl(p.avatarUrl)
          reset({ fullName: p.fullName ?? '', businessName: p.businessName ?? '', businessAddress: p.businessAddress ?? '', phone: p.phone, cedula: p.cedula, bankName: p.bankName ?? '', bankAccountNumber: p.bankAccountNumber ?? '', bankAccountHolder: p.bankAccountHolder ?? '' })
        }
        setLoading(false)
      }, () => setLoading(false))
  }, [user, reset])

  const pickAndUploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showAlert('Permiso requerido', 'Habilita el acceso a tus fotos para cambiar tu foto de perfil.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })
    if (result.canceled || !user) return

    setUploading(true)
    const file = result.assets[0]!

    let blob: Blob
    try {
      blob = await uriToBlob(file.uri)
    } catch {
      setSnackbar({ visible: true, message: 'Error al leer la imagen' })
      setUploading(false)
      return
    }

    await supabase.storage.from('avatars').remove([`${user.id}/avatar`]).catch(() => {})

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(`${user.id}/avatar`, blob, { contentType: file.mimeType ?? 'image/jpeg', upsert: true })

    if (error) {
      setSnackbar({ visible: true, message: `Error al subir imagen: ${error.message}` })
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  const removeAvatar = () => {
    setAvatarUrl('')
  }

  const onSubmit = async (form: ProfileForm) => {
    if (!user || !profile) return
    const update: Database['public']['Tables']['profiles']['Update'] = {
      phone: form.phone || null,
      cedula: form.cedula || null,
      avatar_url: avatarUrl || null,
    }
    if (isOwner) {
      update.business_name = form.businessName || null
      update.business_address = form.businessAddress || null
      update.bank_name = form.bankName || null
      update.bank_account_number = form.bankAccountNumber || null
      update.bank_account_holder = form.bankAccountHolder || null
    } else {
      update.full_name = form.fullName || null
    }

    const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
    if (error) {
      setSnackbar({ visible: true, message: error.message })
    } else {
      if (profile.avatarUrl && !avatarUrl) {
        supabase.storage.from('avatars').remove([`${user.id}/avatar`]).catch((e) => console.warn('Failed to remove old avatar', e))
      }
      await supabase.auth.updateUser({
        data: {
          full_name: form.fullName || null,
          avatar_url: avatarUrl || null,
        },
      })
      const updatedSession = (await supabase.auth.getSession()).data.session
      if (updatedSession) {
        useAuthStore.getState().setSession(updatedSession)
      }
      setProfile({
        fullName: isOwner ? null : (form.fullName ?? null),
        businessName: isOwner ? (form.businessName ?? null) : null,
        businessAddress: isOwner ? (form.businessAddress ?? null) : null,
        phone: form.phone ?? '',
        cedula: form.cedula ?? '',
        avatarUrl,
        bankName: isOwner ? (form.bankName ?? null) : null,
        bankAccountNumber: isOwner ? (form.bankAccountNumber ?? null) : null,
        bankAccountHolder: isOwner ? (form.bankAccountHolder ?? null) : null,
      })
      setEditing(false)
      setSnackbar({ visible: true, message: 'Perfil actualizado' })
    }
  }

  const startEditing = () => {
    if (profile) {
      setAvatarUrl(profile.avatarUrl)
      reset({ fullName: profile.fullName ?? '', businessName: profile.businessName ?? '', businessAddress: profile.businessAddress ?? '', phone: profile.phone, cedula: profile.cedula, bankName: profile.bankName ?? '', bankAccountNumber: profile.bankAccountNumber ?? '', bankAccountHolder: profile.bankAccountHolder ?? '' })
    }
    setEditing(true)
  }

  const cancelEditing = () => {
    if (profile) {
      setAvatarUrl(profile.avatarUrl)
      reset({ fullName: profile.fullName ?? '', businessName: profile.businessName ?? '', businessAddress: profile.businessAddress ?? '', phone: profile.phone, cedula: profile.cedula, bankName: profile.bankName ?? '', bankAccountNumber: profile.bankAccountNumber ?? '', bankAccountHolder: profile.bankAccountHolder ?? '' })
    }
    setEditing(false)
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon source="account-lock" size={48} color={colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={{ marginTop: 16, color: colors.onSurface }}>
          Inicia sesión para ver tu perfil
        </Text>
        <Button mode="contained" onPress={() => router.push('/(public)/login')} style={{ marginTop: 20 }}>
          Iniciar sesión
        </Button>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!editing) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.avatarSection}>
            {profile?.avatarUrl && !avatarError ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} onError={() => setAvatarError(true)} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                  {isOwner
                    ? (profile?.businessName?.[0]?.toUpperCase() ?? '?')
                    : (profile?.fullName?.[0]?.toUpperCase() ?? '?')}
                </Text>
              </View>
            )}
          </View>

          <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
            Mi perfil
          </Text>

          {isOwner ? (
            <View style={styles.fieldRow}>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Empresa</Text>
              <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.businessName || '-'}</Text>
            </View>
          ) : (
            <View style={styles.fieldRow}>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Nombre completo</Text>
              <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.fullName || '-'}</Text>
            </View>
          )}

          {isOwner && (
            <View style={styles.fieldRow}>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Dirección</Text>
              <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.businessAddress || '-'}</Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Cédula</Text>
            <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.cedula || '-'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Teléfono</Text>
            <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.phone || '-'}</Text>
          </View>

          {isOwner && (
            <>
              <View style={styles.fieldRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Banco</Text>
                <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.bankName || '-'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Número de cuenta</Text>
                <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.bankAccountNumber || '-'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Titular de la cuenta</Text>
                <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.bankAccountHolder || '-'}</Text>
              </View>
            </>
          )}

          <Button mode="contained" icon="pencil" onPress={startEditing} style={styles.button} contentStyle={styles.buttonContent}>
            Editar perfil
          </Button>
        </Surface>

        <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
          {snackbar.message}
        </Snackbar>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
          Editar perfil
        </Text>

        <View style={styles.avatarEditSection}>
          {avatarUrl && !editingAvatarError ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} onError={() => setEditingAvatarError(true)} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                {(isOwner ? profile?.businessName?.[0] : profile?.fullName?.[0])?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.avatarActions}>
            <Button mode="outlined" icon="camera" onPress={pickAndUploadAvatar} loading={uploading} disabled={uploading} compact labelStyle={{ fontSize: 13 }}>
              {avatarUrl ? 'Cambiar' : 'Subir foto'}
            </Button>
            {avatarUrl && (
              <Button mode="text" icon="close" onPress={removeAvatar} disabled={uploading} compact labelStyle={{ fontSize: 13 }}>
                Quitar
              </Button>
            )}
          </View>
        </View>

        {isOwner ? (
          <>
            <Controller
              control={control}
              name="businessName"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Nombre de la empresa" value={value ?? ''} onChangeText={onChange}
                  mode="outlined" style={styles.input} disabled={isSubmitting}
                  error={!!errors.businessName} />
              )}
            />
            {errors.businessName ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.businessName.message}</Text> : null}

            <Controller
              control={control}
              name="businessAddress"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Dirección de la empresa" value={value ?? ''} onChangeText={onChange}
                  mode="outlined" style={styles.input} disabled={isSubmitting}
                  error={!!errors.businessAddress} />
              )}
            />
            {errors.businessAddress ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.businessAddress.message}</Text> : null}
          </>
        ) : (
          <>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Nombre completo" value={value ?? ''} onChangeText={onChange}
                  mode="outlined" style={styles.input} disabled={isSubmitting}
                  error={!!errors.fullName} />
              )}
            />
            {errors.fullName ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.fullName.message}</Text> : null}
          </>
        )}

        <Controller
          control={control}
          name="cedula"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Cédula de identidad" value={value ?? ''} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              error={!!errors.cedula} />
          )}
        />
        {errors.cedula ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.cedula.message}</Text> : null}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Teléfono" value={value ?? ''} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              keyboardType="phone-pad" error={!!errors.phone} />
          )}
        />
        {errors.phone ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.phone.message}</Text> : null}

        {isOwner && (
          <>
            <Text variant="bodyMedium" style={styles.bankSectionLabel}>Cuenta bancaria para recibir depósitos en efectivo</Text>
            <Controller
              control={control}
              name="bankName"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Banco" value={value ?? ''} onChangeText={onChange}
                  mode="outlined" style={styles.input} disabled={isSubmitting} />
              )}
            />
            <Controller
              control={control}
              name="bankAccountNumber"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Número de cuenta" value={value ?? ''} onChangeText={onChange}
                  mode="outlined" style={styles.input} disabled={isSubmitting}
                  keyboardType="number-pad" />
              )}
            />
            <Controller
              control={control}
              name="bankAccountHolder"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Titular de la cuenta" value={value ?? ''} onChangeText={onChange}
                  mode="outlined" style={styles.input} disabled={isSubmitting} />
              )}
            />
          </>
        )}

        <View style={styles.actionRow}>
          <Button mode="outlined" onPress={cancelEditing} style={styles.halfBtn} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleSubmit(onSubmit)}
            loading={isSubmitting} disabled={isSubmitting || uploading} style={styles.halfBtn}
            contentStyle={styles.buttonContent}>
            Guardar
          </Button>
        </View>
      </Surface>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { padding: 24, borderRadius: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarEditSection: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold' },
  avatarActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 24 },
  fieldRow: { marginBottom: 16 },
  fieldError: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  input: { marginBottom: 12 },
  bankSectionLabel: { fontWeight: 'bold', marginBottom: 4, marginTop: 8 },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  halfBtn: { flex: 1, borderRadius: 12 },
})
