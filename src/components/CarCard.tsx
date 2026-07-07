import { View, Image, StyleSheet } from 'react-native'
import { Text, Card, Chip, Icon, useTheme } from 'react-native-paper'

interface CarCardCar {
  id: number
  brand: string
  model: string
  year: number
  price_per_day: number
  department_name: string
  available: boolean
  business_name: string | null
  owner_full_name: string
  tags: { name: string }[]
  image_url?: string | null
}

interface CarCardProps {
  car: CarCardCar
  onPress: (id: number) => void
}

export function CarCard({ car, onPress }: CarCardProps) {
  const { colors } = useTheme()

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => onPress(car.id)}
      mode="elevated"
      elevation={2}
    >
      {car.image_url ? (
        <Card.Cover source={{ uri: car.image_url }} style={styles.cover} />
      ) : null}
      <Card.Content>
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

        <View style={styles.detailRow}>
          <Icon source="map-marker" size={16} color={colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>
            {car.department_name}
          </Text>
        </View>

        <Text variant="titleMedium" style={[styles.price, { color: colors.primary }]}>
          ${car.price_per_day}/día
        </Text>

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
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 10, borderRadius: 16 },
  cover: { borderTopLeftRadius: 16, borderTopRightRadius: 16, height: 160 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  businessName: { fontWeight: 'bold', marginLeft: 6, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
  carName: { fontWeight: 'bold', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  price: { fontWeight: 'bold', marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  chip: { height: 28 },
  chipText: { fontSize: 11 },
})
