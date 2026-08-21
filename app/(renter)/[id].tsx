import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native'
import { Text, Button, Surface, Chip, Icon, Snackbar, useTheme } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { findOrCreateConversation } from '../../src/lib/chat'
import { useReviews } from '../../src/hooks/useReviews'
import { ReviewCard } from '../../src/components/ReviewCard'
import { RENTER_FEE, renterFeeAmount, renterUnitPrice } from '../../src/lib/commission'
import { DETAIL_MAX, useBreakpoint } from '../../src/lib/responsive'
import type { CarWithRelations } from '../../src/types/database.types'

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const [imageError, setImageError] = useState(false)
  const insets = useSafeAreaInsets()
  const userId = useAuthStore((s) => s.session?.user?.id)
  const { reviews, fetchCarReviews } = useReviews()
  const [car, setCar] = useState<CarWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const carId = Number(id)
  const isDesktop = useBreakpoint() === 'desktop'

  useEffect(() => {
    if (isNaN(carId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- error state on mount
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
    fetchCarReviews(carId)
  }, [carId, fetchCarReviews])

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

  const hero = (
    <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
      {car.image_url && !imageError ? (
        <Image source={{ uri: car.image_url }} style={styles.heroImage} resizeMode="cover" onError={() => setImageError(true)} />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Icon source="car" size={80} color={colors.onSurfaceVariant} />
        </View>
      )}
      <View style={[styles.heroBadge, { backgroundColor: car.available ? colors.primary : colors.error }]}>
        <Text variant="labelSmall" style={{ color: '#fff', fontWeight: 'bold' }}>
          {car.available ? 'Disponible' : 'No disponible'}
        </Text>
      </View>
    </View>
  )

  const mainContent = (
    <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
      <Text variant="headlineSmall" style={styles.title}>{car.brand} {car.model}</Text>
      <Text variant="titleMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
        {car.year} · {car.color || 'Color no especificado'}
      </Text>

      {(car.reviews_count ?? 0) > 0 && (
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Icon key={s} source={s <= Math.round(car.avg_rating ?? 0) ? 'star' : 'star-outline'} size={18} color={'#FFB300'} />
          ))}
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginLeft: 6 }}>
            {Number(car.avg_rating).toFixed(1)} ({(car.reviews_count ?? 0)} reseña{(car.reviews_count ?? 0) > 1 ? 's' : ''})
          </Text>
        </View>
      )}

      {car.description && (
        <Text variant="bodyMedium" style={[styles.description, { color: colors.onSurfaceVariant }]}>{car.description}</Text>
      )}

      <View style={styles.specs}>
        <View style={styles.specRow}>
          <Icon source="map-marker" size={18} color={colors.primary} />
          <Text variant="bodyMedium" style={{ marginLeft: 8 }}>{car.department?.name || 'No especificado'}</Text>
        </View>
        {car.location && (
          <View style={styles.specRow}>
            <Icon source="map" size={18} color={colors.primary} />
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
    </Surface>
  )

  const sidebarContent = (
    <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={2}>
      <Text variant="headlineMedium" style={[styles.price, { color: colors.primary }]}>
        ${car.price_per_day} <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>/ día</Text>
      </Text>
      <View style={styles.feeRow}>
        <Icon source="plus-circle" size={16} color={colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginLeft: 6 }}>
          ${renterFeeAmount(car.price_per_day)}/día ({Math.round(RENTER_FEE * 100)}% servicio)
        </Text>
      </View>
      <Text variant="titleMedium" style={[styles.totalPrice, { color: colors.onSurface }]}>
        ${renterUnitPrice(car.price_per_day)}/día — costo total
      </Text>
      {car.deposit && (
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
          Depósito: ${car.deposit} por reserva
        </Text>
      )}

      {car.owner_id !== userId && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.outline }]} />
          <View style={styles.ownerRow}>
            <Icon source="domain" size={24} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {car.profile?.business_name || car.profile?.full_name || 'Desconocido'}
              </Text>
              {car.profile?.phone && (
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{car.profile.phone}</Text>
              )}
            </View>
          </View>

          <Button
            mode="contained"
            icon="calendar"
            style={styles.contactBtn}
            contentStyle={styles.contactBtnContent}
            onPress={() => router.push(`/(renter)/book/${carId}`)}
          >
            Reservar
          </Button>

          <Button
            mode="outlined"
            icon="forum"
            style={[styles.contactBtn, { marginTop: 8 }]}
            contentStyle={styles.contactBtnContent}
            onPress={async () => {
              if (!userId) {
                setSnackbar({ visible: true, message: 'Debes iniciar sesión para enviar mensajes' })
                return
              }
              try {
                const convId = await findOrCreateConversation(car.id, car.owner_id, userId, car.profile?.full_name || undefined)
                router.push(`/(renter)/conversations/${convId}`)
              } catch (e) {
                setSnackbar({ visible: true, message: (e as Error).message })
              }
            }}
          >
            Enviar mensaje
          </Button>
        </>
      )}
    </Surface>
  )

  const reviewsBlock = reviews.length > 0 ? (
    <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
      <Text variant="titleSmall" style={styles.sectionTitle}>Reseñas</Text>
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          rating={r.rating}
          comment={r.comment}
          createdAt={r.created_at}
          renterName={r.renter?.full_name ?? 'Anónimo'}
          renterAvatar={r.renter?.avatar_url ?? null}
        />
      ))}
    </Surface>
  ) : null

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Icon source="arrow-left" size={24} color={colors.surface} />
      </TouchableOpacity>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scroll, { maxWidth: DETAIL_MAX, alignSelf: 'center', width: '100%' }]}
      >
        {hero}
        {isDesktop ? (
          <View style={styles.twoCol}>
            <View style={styles.leftCol}>
              {mainContent}
              {reviewsBlock}
            </View>
            <View style={styles.rightCol}>
              {sidebarContent}
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            {mainContent}
            {sidebarContent}
            {reviewsBlock}
          </View>
        )}
      </ScrollView>

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
  scroll: { paddingBottom: 40 },
  hero: { width: '100%', height: 300, borderRadius: 16, overflow: 'hidden', marginTop: 8, marginBottom: 16, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  twoCol: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  leftCol: { flex: 2, gap: 16 },
  rightCol: { flex: 1 },
  stack: { gap: 16 },
  section: { padding: 20, borderRadius: 16 },
  summaryCard: { padding: 20, borderRadius: 16 },
  title: { fontWeight: 'bold' },
  subtitle: { marginTop: 4 },
  description: { marginTop: 12, lineHeight: 22 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  specs: { marginTop: 16, gap: 8 },
  specRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 30 },
  chipText: { fontSize: 12 },
  price: { fontWeight: 'bold' },
  feeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  totalPrice: { fontWeight: 'bold', marginTop: 2 },
  divider: { height: 1, marginVertical: 16 },
  ownerRow: { flexDirection: 'row', alignItems: 'center' },
  contactBtn: { marginTop: 16, borderRadius: 12 },
  contactBtnContent: { paddingVertical: 8 },
})
