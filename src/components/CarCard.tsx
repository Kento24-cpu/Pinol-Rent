import { View, StyleSheet } from 'react-native'
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
      <Card.Content>
        <View style={styles.topRow}>
          <Icon source="domain" size={16} color={colors.primary} />
          <Text variant="titleMedium" style={[styles.businessName, { color: colors.primary }]}>
            {car.business_name || car.owner_full_name}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: car.available ? '#2E7D3220' : '#C6282820' },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: car.available ? '#2E7D32' : '#C62828', fontWeight: 'bold' }}
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
              <Chip key={tag.name} style={styles.chip} textStyle={styles.chipText}>
                {tag.name}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6, borderRadius: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  businessName: { fontWeight: 'bold', marginLeft: 6, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
  carName: { fontWeight: 'bold', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  price: { fontWeight: 'bold', marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { backgroundColor: '#E3F2FD', height: 28 },
  chipText: { fontSize: 11 },
})
