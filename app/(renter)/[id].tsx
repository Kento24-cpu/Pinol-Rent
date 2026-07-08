import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Linking, Image, TouchableOpacity } from 'react-native'
import { Text, Button, Surface, Chip, Icon, useTheme } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import type { CarWithRelations } from '../../src/types/database.types'

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const userId = useAuthStore((s) => s.session?.user?.id)
  const [car, setCar] = useState<CarWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  const carId = Number(id)

  useEffect(() => {
    if (isNaN(carId)) {
      setLoading(false)
      setFetchError(true)
      return
    }
    supabase
      .from('cars')
      .select('*, department:department_id(name), profile:owner_id(full_name, business_name, phone), car_tags(tag:tag_id(name, slug))')
      .eq('id', carId)
      .single()
      .then(({ data, error }) => {
        if (error) { setFetchError(true); setLoading(false); return }
        if (data) setCar(data as unknown as CarWithRelations)
        setLoading(false)
      })
  }, [carId])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!car) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="displayMedium" style={{ marginBottom: 16 }}>{fetchError ? '⚠️' : '🚗'}</Text>
        <Text variant="bodyLarge">{fetchError ? 'Error al cargar el auto' : 'Auto no encontrado'}</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 16 }}>Volver</Button>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Icon source="arrow-left" size={24} color={colors.surface} />
      </TouchableOpacity>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {car.image_url ? (
          <Image source={{ uri: car.image_url }} style={styles.image} resizeMode="cover" />
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
          {car.location && (
            <View style={styles.infoRow}>
              <Icon source="map" size={20} color={colors.primary} />
              <Text variant="bodyMedium" style={{ marginLeft: 8 }}>{car.location}</Text>
            </View>
          )}
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

        {car.owner_id !== userId && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.outline }]} />

            <Text variant="titleSmall" style={styles.sectionTitle}>Ofrecido por</Text>
            <View style={styles.ownerRow}>
              <Icon source="domain" size={24} color={colors.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {car.profile?.business_name || car.profile?.full_name || 'Desconocido'}
                </Text>
                {car.profile?.phone && (
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                    {car.profile.phone}
                  </Text>
                )}
              </View>
            </View>

            {car.profile?.phone ? (
              <Button
                mode="contained"
                icon="phone"
                style={styles.contactBtn}
                contentStyle={styles.contactBtnContent}
                onPress={() => Linking.openURL(`tel:${car.profile!.phone}`)}
              >
                Llamar a {car.profile.phone}
              </Button>
            ) : null}
          </>
        )}
      </Surface>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', left: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 8 },
  imagePlaceholder: {
    height: 200, justifyContent: 'center', alignItems: 'center',
  },
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
  ownerRow: { flexDirection: 'row', alignItems: 'center' },
  contactBtn: { marginTop: 24, borderRadius: 12 },
  contactBtnContent: { paddingVertical: 8 },
  contentEnd: { height: 40 },
})
