import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native'
import { Text, TextInput, Button, Surface, Snackbar, useTheme } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../lib/supabase'
import { uriToBlob } from '../lib/upload'
import { useAuthStore } from '../stores/authStore'
import type { Database } from '../types/database'

interface ProfileScreenProps {
  showBusinessName?: boolean
}

interface ProfileData {
  fullName: string
  businessName: string
  phone: string
  avatarUrl: string
}

export function ProfileScreen({ showBusinessName }: ProfileScreenProps) {
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const schema = z.object({
    fullName: z.string().min(2, 'Nombre demasiado corto'),
    businessName: z.string().optional(),
    phone: z.string().optional(),
  })

  type ProfileForm = z.infer<typeof schema>

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', businessName: '', phone: '' },
  })

  useEffect(() => {
    if (!user) return
    const fields = showBusinessName ? 'full_name, business_name, phone, avatar_url' : 'full_name, phone, avatar_url'
    supabase.from('profiles').select(fields).eq('id', user.id).single()
      .then((res) => {
        const data = res.data as {
          full_name: string
          business_name?: string | null
          phone: string | null
          avatar_url: string | null
        } | null
        if (data) {
          const p: ProfileData = {
            fullName: data.full_name,
            businessName: data.business_name ?? '',
            phone: data.phone ?? '',
            avatarUrl: data.avatar_url ?? '',
          }
          setProfile(p)
          setAvatarUrl(p.avatarUrl)
          reset(p)
        }
        setLoading(false)
      }, () => setLoading(false))
  }, [user, showBusinessName])

  const pickAndUploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Habilita el acceso a tus fotos para cambiar tu foto de perfil.')
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
    const file = result.assets[0]

    let blob: Blob
    try {
      blob = await uriToBlob(file.uri)
    } catch {
      setSnackbar({ visible: true, message: 'Error al leer la imagen' })
      setUploading(false)
      return
    }

    await supabase.storage.from('avatars').remove([`${user.id}/avatar`])

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
      full_name: form.fullName,
      phone: form.phone || null,
      avatar_url: avatarUrl || null,
    }
    if (showBusinessName) update.business_name = form.businessName || null

    const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
    if (error) {
      setSnackbar({ visible: true, message: error.message })
    } else {
      if (profile.avatarUrl && !avatarUrl) {
        supabase.storage.from('avatars').remove([`${user.id}/avatar`]).catch(() => {})
      }
      await supabase.auth.updateUser({
        data: {
          full_name: form.fullName,
          avatar_url: avatarUrl || null,
        },
      })
      const updatedSession = (await supabase.auth.getSession()).data.session
      if (updatedSession) {
        useAuthStore.getState().setSession(updatedSession)
      }
      setProfile({ fullName: form.fullName, businessName: form.businessName ?? '', phone: form.phone ?? '', avatarUrl })
      setEditing(false)
      setSnackbar({ visible: true, message: 'Perfil actualizado' })
    }
  }

  const startEditing = () => {
    if (profile) {
      setAvatarUrl(profile.avatarUrl)
      reset(profile)
    }
    setEditing(true)
  }

  const cancelEditing = () => {
    if (profile) {
      setAvatarUrl(profile.avatarUrl)
      reset(profile)
    }
    setEditing(false)
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
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                  {profile?.fullName?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>

          <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
            Mi perfil
          </Text>

          <View style={styles.fieldRow}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Nombre completo</Text>
            <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.fullName || '-'}</Text>
          </View>

          {showBusinessName && (
            <View style={styles.fieldRow}>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Empresa</Text>
              <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.businessName || '-'}</Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Teléfono</Text>
            <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{profile?.phone || '-'}</Text>
          </View>

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
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                {(profile?.fullName ?? '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarActions}>
            <Button mode="outlined" icon="camera" onPress={pickAndUploadAvatar} loading={uploading} disabled={uploading} compact>
              <Text>{avatarUrl ? 'Cambiar' : 'Subir foto'}</Text>
            </Button>
            {avatarUrl && (
              <Button mode="text" icon="close" onPress={removeAvatar} disabled={uploading} compact>
                <Text>Quitar</Text>
              </Button>
            )}
          </View>
        </View>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Nombre completo" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              error={!!errors.fullName} />
          )}
        />

        {showBusinessName && (
          <Controller
            control={control}
            name="businessName"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Nombre de la empresa" value={value} onChangeText={onChange}
                mode="outlined" style={styles.input} disabled={isSubmitting} />
            )}
          />
        )}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <TextInput label={showBusinessName ? 'Teléfono de contacto' : 'Teléfono'} value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              keyboardType="phone-pad" />
          )}
        />

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
  input: { marginBottom: 12 },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  halfBtn: { flex: 1, borderRadius: 12 },
})
