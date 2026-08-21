import { useState, useEffect, useRef } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Image, Keyboard, TouchableWithoutFeedback } from 'react-native'
import { Text, TextInput, Button, Surface, Switch, Snackbar, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/stores/authStore'
import { mimeToExt, uriToBlob } from '../../../src/lib/upload'
import { showAlert } from '../../../src/lib/alert'
import { DepartmentPicker } from '../../../src/components/DepartmentPicker'
import { TagSelector } from '../../../src/components/TagSelector'
import { DETAIL_MAX } from '../../../src/lib/responsive'
import type { Tables } from '../../../src/types/database'
import type { CarWithRelations } from '../../../src/types/database.types'
type Department = Tables<'departments'>
type Tag = Tables<'tags'>

const schema = z.object({
  brand: z.string().min(1, 'Requerido'),
  model: z.string().min(1, 'Requerido'),
  year: z.string().refine(
    (v) => { const n = parseInt(v, 10); return !isNaN(n) && n >= 2000 && n <= 2030 },
    'Año inválido (2000-2030)'
  ),
  color: z.string().optional(),
  price_per_day: z.string().refine(
    (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 },
    'Precio inválido'
  ),
  deposit: z.string().optional().refine(
    (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    'Depósito inválido'
  ),
  location: z.string().optional(),
  description: z.string().optional(),
})

type CarForm = z.infer<typeof schema>

export default function EditCarScreen() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.session?.user)
  const [departments, setDepartments] = useState<Department[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [available, setAvailable] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })
  const previousImageUrl = useRef<string | null>(null)

  const carId = Number(id)

  const { control, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<CarForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand: '', model: '', year: String(new Date().getFullYear()),
      color: '', price_per_day: '', deposit: '', description: '', location: '',
    },
  })

  useEffect(() => {
    if (isNaN(carId)) { router.back(); return }
    const load = async () => {
      const [carRes, deptRes, tagsRes] = await Promise.all([
        supabase.from('cars').select('*, department:department_id(name), profile:owner_id(full_name, business_name, phone), car_tags(tag:tag_id(name, slug))').eq('id', carId).single(),
        supabase.from('departments').select('id, name, slug').order('name'),
        supabase.from('tags').select('id, name, slug').order('name'),
      ])
      if (deptRes.data) setDepartments(deptRes.data)
      if (tagsRes.data) setTags(tagsRes.data)
      if (carRes.error || !carRes.data) { router.back(); return }
      const car = carRes.data as unknown as CarWithRelations
      reset({
        brand: car.brand,
        model: car.model,
        year: String(car.year),
        color: car.color ?? '',
        price_per_day: String(car.price_per_day),
        deposit: car.deposit ? String(car.deposit) : '',
        location: car.location ?? '',
        description: car.description ?? '',
      })
      setDepartmentId(car.department_id)
      setSelectedTags(car.car_tags?.map((ct) => {
        const tag = tagsRes.data?.find((t) => t.slug === ct.tag.slug)
        return tag ? tag.id : -1
      }).filter((id) => id > 0) ?? [])
      setAvailable(car.available ?? true)
      setImageUrl(car.image_url)
      previousImageUrl.current = car.image_url
      setLoading(false)
    }
    load()
  }, [carId, reset])

  const pickAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showAlert('Permiso requerido', 'Habilita el acceso a tus fotos en Configuración para subir una imagen.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })
    if (result.canceled || !user) return

    setUploading(true)
    const file = result.assets[0]!
    const ext = mimeToExt(file.mimeType) ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`

    let blob: Blob
    try {
      blob = await uriToBlob(file.uri)
    } catch {
      setError('root', { message: 'Error al leer la imagen' })
      setUploading(false)
      return
    }

    const { data, error } = await supabase.storage
      .from('car-images')
      .upload(path, blob, { contentType: file.mimeType ?? 'image/jpeg' })

    if (error) {
      setError('root', { message: error.message })
      setSnackbar({ visible: true, message: `Error al subir imagen: ${error.message}` })
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('car-images').getPublicUrl(data.path)
    setImageUrl(publicUrl)
    setUploading(false)
  }

  const onSubmit = async (form: CarForm) => {
    if (!departmentId) {
      setError('root', { message: 'Selecciona un departamento' })
      return
    }
    if (!user) return

    const year = parseInt(form.year, 10)
    const price_per_day = parseFloat(form.price_per_day)
    const deposit = form.deposit ? parseFloat(form.deposit) : null

    const { error: rpcError } = await supabase.rpc('update_car', {
      p_car_id: carId,
      p_brand: form.brand,
      p_model: form.model,
      p_year: year,
      p_color: form.color || null,
      p_price_per_day: price_per_day,
      p_deposit: deposit,
      p_description: form.description || null,
      p_location: form.location || null,
      p_department_id: departmentId,
      p_available: available,
      p_image_url: imageUrl,
      p_tag_ids: selectedTags,
    })

    if (rpcError) { setError('root', { message: rpcError.message }); return }

    // Clean up the previous image from storage if it was replaced or removed
    if (previousImageUrl.current && previousImageUrl.current !== imageUrl) {
      try {
        const path = previousImageUrl.current.split('/car-images/')[1]
        if (path) await supabase.storage.from('car-images').remove([decodeURIComponent(path)])
      } catch {
        // best-effort cleanup
      }
    }

    setSnackbar({ visible: true, message: 'Auto actualizado exitosamente' })
    setTimeout(() => router.back(), 1500)
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge">Cargando...</Text>
      </View>
    )
  }

  const isNative = Platform.OS !== 'web'

  const formContent = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(40, insets.bottom + 16), maxWidth: DETAIL_MAX, alignSelf: 'center', width: '100%' }]}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
          Editar auto
        </Text>

        {errors.root ? (
          <Text style={[styles.error, { color: colors.error }]}>{errors.root.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="brand"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Marca" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              error={!!errors.brand} />
          )}
        />

        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Modelo" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              error={!!errors.model} />
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="year"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Año" value={value} onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
                mode="outlined" style={[styles.input, styles.half]} disabled={isSubmitting}
                keyboardType="number-pad" error={!!errors.year} />
            )}
          />
          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Color (opcional)" value={value} onChangeText={onChange}
                mode="outlined" style={[styles.input, styles.half]} disabled={isSubmitting} />
            )}
          />
        </View>

        <Controller
          control={control}
          name="price_per_day"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Precio por día ($)" value={value} onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ''))}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              keyboardType="decimal-pad" error={!!errors.price_per_day} />
          )}
        />

        <Controller
          control={control}
          name="deposit"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Depósito por reserva ($) (opcional)" value={value ?? ''} onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ''))}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              keyboardType="decimal-pad" />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Ubicación (ej. Managua, Masaya)" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting} />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Descripción (opcional)" value={value} onChangeText={onChange}
              mode="outlined" style={styles.input} disabled={isSubmitting}
              multiline numberOfLines={3} />
          )}
        />

        <Text variant="bodyMedium" style={styles.sectionLabel}>Foto</Text>
        {imageUrl ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUrl }} style={styles.imagePreviewImg} />
            <View style={styles.imageActions}>
              <Button mode="text" onPress={pickAndUploadImage} disabled={uploading} compact labelStyle={{ fontSize: 13 }}>
                Cambiar
              </Button>
              <Button mode="text" onPress={() => setImageUrl(null)} compact labelStyle={{ fontSize: 13 }}>
                Quitar
              </Button>
            </View>
          </View>
        ) : (
          <Button
            mode="outlined"
            icon="camera"
            onPress={pickAndUploadImage}
            loading={uploading}
            disabled={uploading}
            style={styles.input}
          >
            {uploading ? 'Subiendo...' : 'Seleccionar foto'}
          </Button>
        )}

        <Text variant="bodyMedium" style={styles.sectionLabel}>Ubicación</Text>
        <DepartmentPicker
          departments={departments}
          value={departmentId}
          onChange={(id) => setDepartmentId(id)}
        />

        {tags.length > 0 && (
          <>
            <Text variant="bodyMedium" style={styles.sectionLabel}>Características</Text>
            <TagSelector tags={tags} selected={selectedTags} onChange={setSelectedTags} />
          </>
        )}

        <View style={styles.switchRow}>
          <Text variant="bodyMedium">Disponible para rentar</Text>
          <Switch value={available} onValueChange={setAvailable} color={colors.primary} />
        </View>

        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => router.back()} style={styles.actionBtn}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={() => handleSubmit(onSubmit)()}
            loading={isSubmitting} disabled={isSubmitting || uploading} style={styles.actionBtn}>
            Guardar cambios
          </Button>
        </View>

        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: '' })}
          duration={3000}
        >
          {snackbar.message}
        </Snackbar>
      </Surface>
    </ScrollView>
  )

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { padding: 24, borderRadius: 20 },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 24 },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  sectionLabel: { fontWeight: 'bold', marginBottom: 8, marginTop: 8 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 8,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, borderRadius: 12 },
  error: { textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  imagePreview: { alignItems: 'center', marginBottom: 12 },
  imagePreviewImg: { width: '100%', height: 160, borderRadius: 12, marginBottom: 8 },
  imageActions: { flexDirection: 'row', gap: 16 },
})
