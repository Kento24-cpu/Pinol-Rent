import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Chip, Icon, useTheme } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(supabase as any)
      .from('cars')
      .select('*, department:department_id(name), profile:owner_id(full_name, business_name, phone), car_tags(tag:tag_id(name, slug))')
      .eq('id', Number(id))
      .single()
      .then(({ data }: any) => {
        if (data) setCar(data)
        setLoading(false)
      })
  }, [id])

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
        <Text variant="bodyLarge">Auto no encontrado</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 16 }}>Volver</Button>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.imagePlaceholder}>
        <Icon source="car" size={80} color={colors.onSurfaceVariant} />
      </View>

      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.titleRow}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', flex: 1 }}>
            {car.brand} {car.model}
          </Text>
          <View style={[styles.badge, { backgroundColor: car.available ? '#2E7D3220' : '#C6282820' }]}>
            <Text variant="labelSmall" style={{ color: car.available ? '#2E7D32' : '#C62828', fontWeight: 'bold' }}>
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
              {car.car_tags.map((ct: any) => (
                <Chip key={ct.tag.slug} style={styles.chip} textStyle={styles.chipText}>
                  {ct.tag.name}
                </Chip>
              ))}
            </View>
          </>
        )}

        <View style={styles.divider} />

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

        <Button
          mode="contained"
          icon="chat"
          style={styles.contactBtn}
          contentStyle={styles.contactBtnContent}
          onPress={() => {}}
        >
          Contactar
        </Button>
      </Surface>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: {
    height: 200, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  card: { margin: 16, padding: 24, borderRadius: 20, marginTop: -30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  price: { fontWeight: 'bold' },
  infoSection: { marginTop: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#E3F2FD', height: 30 },
  chipText: { fontSize: 12 },
  divider: { height: 1, backgroundColor: '#CFD8DC', marginVertical: 20 },
  ownerRow: { flexDirection: 'row', alignItems: 'center' },
  contactBtn: { marginTop: 24, borderRadius: 12 },
  contactBtnContent: { paddingVertical: 8 },
})
