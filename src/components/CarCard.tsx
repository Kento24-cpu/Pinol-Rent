import { View, Image, StyleSheet } from 'react-native'
import { Text, Card, Chip, Icon, useTheme } from 'react-native-paper'
import { LinearGradient } from 'expo-linear-gradient'
import { RATING_COLOR } from '../lib/theme'
import { CARD_RADIUS } from '../lib/responsive'
import { useState, memo } from 'react'
import { OWNER_COMMISSION, RENTER_FEE, ownerNetPrice, ownerCommissionAmount, renterUnitPrice, renterFeeAmount } from '../lib/commission'

interface CarCardCar {
  id: number
  brand: string
  model: string
  year: number
  price_per_day: number
  deposit: number | null
  department_name: string
  available: boolean
  business_name: string | null
  owner_full_name: string
  tags: { name: string }[]
  avg_rating: number
  reviews_count: number
  image_url?: string | null
}

interface CarCardProps {
  car: CarCardCar
  onPress: (id: number) => void
  role?: 'owner' | 'renter'
}

export const CarCard = memo(function CarCard({ car, onPress, role }: CarCardProps) {
  const { colors } = useTheme()
  const [imageError, setImageError] = useState(false)

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => onPress(car.id)}
      mode="elevated"
      elevation={2}
    >
      <View style={[styles.coverWrapper, { backgroundColor: colors.primaryContainer }]}>
        {car.image_url && !imageError ? (
          <>
            <Image
              source={{ uri: car.image_url }}
              style={styles.cover}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)']}
              style={styles.coverScrim}
              pointerEvents="none"
            />
          </>
        ) : (
          <View style={styles.coverPlaceholder}>
            <Icon source="car" size={40} color={colors.onSurfaceVariant} />
          </View>
        )}
      </View>
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          <Icon source="domain" size={16} color={colors.primary} />
          <Text variant="titleMedium" style={[styles.businessName, { color: colors.primary }]}>
            {car.business_name || car.owner_full_name}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: car.available ? colors.primary + '20' : colors.error + '20' },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: car.available ? colors.primary : colors.error, fontWeight: 'bold' }}
            >
              {car.available ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
        </View>

        <Text variant="titleLarge" style={[styles.carName, { color: colors.onSurface }]}>
          {car.brand} {car.model} {car.year}
        </Text>

        {car.reviews_count > 0 && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Icon key={s} source={s <= Math.round(car.avg_rating) ? 'star' : 'star-outline'} size={14} color={RATING_COLOR} />
            ))}
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
              {car.avg_rating.toFixed(1)} ({car.reviews_count})
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Icon source="map-marker" size={16} color={colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
            {car.department_name}
          </Text>
        </View>

        <Text variant="titleMedium" style={[styles.price, { color: colors.primary }]}>
          ${car.price_per_day}/día
        </Text>

        {role === 'renter' && (
          <View style={styles.commissionRow}>
            <Icon source="plus-circle" size={14} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
              ${renterFeeAmount(car.price_per_day)}/día ({Math.round(RENTER_FEE * 100)}% servicio)
            </Text>
          </View>
        )}
        {role === 'renter' && (
          <Text variant="bodyMedium" style={[styles.netPrice, { color: colors.onSurface }]}>
            ${renterUnitPrice(car.price_per_day)}/día — costo total
          </Text>
        )}

        {role === 'owner' && (
          <View style={styles.commissionRow}>
            <Icon source="minus-circle" size={14} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
              -${ownerCommissionAmount(car.price_per_day)}/día ({OWNER_COMMISSION * 100}% comisión)
            </Text>
          </View>
        )}
        {role === 'owner' && (
          <Text variant="bodyMedium" style={[styles.netPrice, { color: colors.primary }]}>
            ${ownerNetPrice(car.price_per_day)}/día — recibes
          </Text>
        )}

        {car.deposit && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
            Depósito: ${car.deposit} por reserva
          </Text>
        )}

        {car.tags.length > 0 && (
          <View style={styles.tags}>
            {car.tags.slice(0, 4).map((tag) => (
              <Chip key={tag.name} style={[styles.chip, { backgroundColor: colors.primaryContainer }]} textStyle={styles.chipText}>
                {tag.name}
              </Chip>
            ))}
            {car.tags.length > 4 && (
              <Chip style={[styles.chip, { backgroundColor: colors.surfaceVariant }]} textStyle={styles.chipText}>
                +{car.tags.length - 4}
              </Chip>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  )
})

const styles = StyleSheet.create({
  card: { marginVertical: 10, borderRadius: CARD_RADIUS, flexGrow: 1 },
  coverWrapper: {
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  coverPlaceholder: { aspectRatio: 16 / 9, justifyContent: 'center', alignItems: 'center' },
  coverScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  content: { paddingTop: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  businessName: { fontWeight: 'bold', marginLeft: 6, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
  carName: { fontWeight: 'bold', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  price: { fontWeight: 'bold', marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  chip: { height: 28 },
  chipText: { fontSize: 11 },
  commissionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  netPrice: { fontWeight: 'bold', marginBottom: 8 },
})
