import { useState, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native'
import { Text, Button, Surface, Chip, Icon, Switch, Snackbar, Dialog, Portal, useTheme } from 'react-native-paper'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import type { CarWithRelations } from '../../src/types/database.types'

export default function OwnerCarDetailScreen() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [imageError, setImageError] = useState(false)
  const user = useAuthStore((s) => s.session?.user)
  const [car, setCar] = useState<CarWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })
  const genRef = useRef(0)

  const carId = Number(id)

  const fetchCar = useCallback(async () => {
    if (isNaN(carId)) { setFetchError(true); setLoading(false); return }
    const gen = ++genRef.current
    const { data, error } = await supabase
      .from('cars')
      .select('*, department:department_id(name), profile:owner_id(full_name, business_name, phone), car_tags(tag:tag_id(name, slug))')
      .eq('id', carId)
      .single()
    if (gen !== genRef.current) return
    if (error || !data) { setFetchError(true); setLoading(false); return }
    setCar(data as unknown as CarWithRelations)
    setLoading(false)
  }, [carId])

  useFocusEffect(useCallback(() => {
    fetchCar()
    return () => { genRef.current++ }
  }, [fetchCar]))

  const toggleAvailability = async () => {
    if (!car || !user) return
    if (car.owner_id !== user.id) { setSnackbar({ visible: true, message: 'No tienes permiso para modificar este auto' }); return }
    setUpdating(true)
    const { error } = await supabase.from('cars').update({ available: !car.available }).eq('id', car.id)
    if (error) {
      setSnackbar({ visible: true, message: error.message })
    } else {
      setCar({ ...car, available: !car.available })
      setSnackbar({ visible: true, message: 'Disponibilidad actualizada' })
    }
    setUpdating(false)
  }

  const handleDelete = async () => {
    setShowDeleteDialog(false)
    if (!user || !car) return
    if (car.owner_id !== user.id) { setSnackbar({ visible: true, message: 'No tienes permiso para eliminar este auto' }); return }
    setUpdating(true)
    const { error } = await supabase.from('cars').delete().eq('id', carId)
    setUpdating(false)
    if (error) {
      setSnackbar({ visible: true, message: error.message })
    } else {
      router.replace('/(owner)')
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (fetchError || !car) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="displayMedium" style={{ marginBottom: 16 }}>⚠️</Text>
        <Text variant="bodyLarge">Auto no encontrado</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 16 }}>Volver</Button>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => router.back()}>
        <Icon source="arrow-left" size={24} color={colors.surface} />
      </TouchableOpacity>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {car.image_url && !imageError ? (
          <Image source={{ uri: car.image_url }} style={styles.image} resizeMode="cover" onError={() => setImageError(true)} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryContainer }]}>
            <Icon source="car" size={80} color={colors.onSurfaceVariant} />
          </View>
        )}

        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.titleRow}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', flex: 1 }}>
              {car.brand} {car.model}
            </Text>
            <View style={[styles.badge, { backgroundColor: car.available ? colors.primary + '20' : colors.error + '20' }]}>
              <Text variant="labelSmall" style={{ color: car.available ? colors.primary : colors.error, fontWeight: 'bold' }}>
                {car.available ? 'Disponible' : 'No disponible'}
              </Text>
            </View>
          </View>

          <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
            {car.year} · {car.color || 'Color no especificado'}
          </Text>

          <Text variant="headlineMedium" style={[styles.price, { color: colors.primary }]}>
            ${car.price_per_day} <Text variant="bodyMedium">/ día</Text>
          </Text>

          {car.description && (
            <Text variant="bodyMedium" style={{ marginTop: 16, lineHeight: 22 }}>
              {car.description}
            </Text>
          )}

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Icon source="map-marker" size={20} color={colors.primary} />
              <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                {car.department?.name || 'No especificado'}
              </Text>
            </View>
          </View>

          {car.car_tags?.length > 0 && (
            <>
              <Text variant="titleSmall" style={styles.sectionTitle}>Características</Text>
              <View style={styles.tags}>
                {car.car_tags.map((ct) => (
                  <Chip key={ct.tag.slug} style={[styles.chip, { backgroundColor: colors.primaryContainer }]} textStyle={styles.chipText}>
                    {ct.tag.name}
                  </Chip>
                ))}
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.outline }]} />

          <View style={styles.ownerControls}>
            <View style={styles.switchRow}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Disponible para rentar</Text>
              <Switch value={car.available ?? false} onValueChange={toggleAvailability} disabled={updating} color={colors.primary} />
            </View>

            <Button
              mode="contained"
              icon="forum"
              style={styles.editBtn}
              contentStyle={styles.btnContent}
              onPress={() => router.push({ pathname: '/(owner)/conversations', params: { carId: String(carId) } })}
            >
              Ver mensajes
            </Button>

            <Button
              mode="contained"
              icon="pencil"
              style={styles.editBtn}
              contentStyle={styles.btnContent}
              onPress={() => router.push(`/(owner)/edit/${carId}`)}
            >
              Editar auto
            </Button>

            <Button
              mode="outlined"
              icon="delete"
              textColor={colors.error}
              style={styles.deleteBtn}
              contentStyle={styles.btnContent}
              onPress={() => setShowDeleteDialog(true)}
              loading={updating}
              disabled={updating}
            >
              Eliminar auto
            </Button>
          </View>
        </Surface>
      </ScrollView>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)} style={{ borderRadius: 8 }}>
          <Dialog.Title>Eliminar auto</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">¿Seguro? Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button onPress={handleDelete} textColor={colors.error}>Eliminar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', left: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 8 },
  imagePlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', aspectRatio: 16 / 9 },
  card: { margin: 16, padding: 24, borderRadius: 20, marginTop: -30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  price: { fontWeight: 'bold' },
  infoSection: { marginTop: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 30 },
  chipText: { fontSize: 12 },
  divider: { height: 1, marginVertical: 20 },
  ownerControls: { gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  editBtn: { borderRadius: 12, marginTop: 8 },
  deleteBtn: { borderRadius: 12, borderColor: '#C62828' },
  btnContent: { paddingVertical: 6 },
})
