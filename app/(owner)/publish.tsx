import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, Surface, Switch, useTheme } from 'react-native-paper'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { DepartmentPicker } from '../../src/components/DepartmentPicker'
import { TagSelector } from '../../src/components/TagSelector'
import type { Department, Tag } from '../../src/types/database.types'

interface CarForm {
  brand: string
  model: string
  year: string
  color: string
  price_per_day: string
  description: string
}

export default function PublishScreen() {
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const [departments, setDepartments] = useState<Department[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [available, setAvailable] = useState(true)

  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<CarForm>({
    defaultValues: {
      brand: '', model: '', year: String(new Date().getFullYear()),
      color: '', price_per_day: '', description: '',
    },
  })

  useEffect(() => {
    supabase.from('departments' as any).select('id, name, slug').order('name' as any).then(({ data }: any) => {
      if (data) setDepartments(data)
    })
    supabase.from('tags' as any).select('id, name, slug').order('name' as any).then(({ data }: any) => {
      if (data) setTags(data)
    })
  }, [])

  const onSubmit = async (form: CarForm) => {
    if (!departmentId) {
      setError('root', { message: 'Selecciona un departamento' })
      return
    }
    if (!user) return

    const year = parseInt(form.year, 10)
    const price_per_day = parseFloat(form.price_per_day)
    if (isNaN(year) || year < 2000 || year > 2030) {
      setError('root', { message: 'Año inválido (2000-2030)' })
      return
    }
    if (isNaN(price_per_day) || price_per_day <= 0) {
      setError('root', { message: 'Precio inválido' })
      return
    }

    const { data: newCar, error: carError } = await supabase.from('cars').insert({
      owner_id: user.id,
      brand: form.brand,
      model: form.model,
      year,
      color: form.color || null,
      price_per_day,
      description: form.description || null,
      department_id: departmentId,
      available,
    } as any).select('id').single()

    if (carError) { setError('root', { message: carError.message }); return }

    if (selectedTags.length > 0 && newCar) {
      const { error: tagsError } = await supabase.from('car_tags' as any).insert(
        selectedTags.map((tagId) => ({ car_id: newCar.id, tag_id: tagId }))
      )
      if (tagsError) { setError('root', { message: tagsError.message }); return }
    }

    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
          <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
            Publicar auto
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
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Descripción (opcional)" value={value} onChangeText={onChange}
                mode="outlined" style={styles.input} disabled={isSubmitting}
                multiline numberOfLines={3} />
            )}
          />

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
            <Button mode="contained" onPress={handleSubmit(onSubmit)}
              loading={isSubmitting} disabled={isSubmitting} style={styles.actionBtn}>
              Publicar
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
})
