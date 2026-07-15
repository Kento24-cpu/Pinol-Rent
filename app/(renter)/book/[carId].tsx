import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Snackbar, useTheme } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/stores/authStore'
import { useBookings } from '../../../src/hooks/useBookings'
import { DateRangePicker } from '../../../src/components/DateRangePicker'

export default function BookCarScreen() {
  const { carId: carIdParam } = useLocalSearchParams<{ carId: string }>()
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const { createBooking, checkAvailability } = useBookings()
  const [car, setCar] = useState<{ brand: string; model: string; price_per_day: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const carId = Number(carIdParam)

  useEffect(() => {
    if (!carId || isNaN(carId)) { setFetchError(true); setLoading(false); return }
    supabase
      .from('cars')
      .select('brand, model, price_per_day')
      .eq('id', carId)
      .single()
      .then(({ data }) => {
        if (data) setCar(data)
        else setFetchError(true)
        setLoading(false)
      })
  }, [carId])

  const handleSelectDates = useCallback(async (startDate: string, endDate: string, _days: number, _price: number) => {
    if (!user) return
    setBooking(true)
    try {
      const available = await checkAvailability(carId, startDate, endDate)
      if (!available) {
        setSnackbar({ visible: true, message: 'El auto ya no está disponible para esas fechas' })
        setBooking(false)
        return
      }
      const bookingId = await createBooking({ carId, startDate, endDate })
      router.replace(`/(renter)/bookings/${bookingId}`)
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
      setBooking(false)
    }
  }, [user, carId, createBooking, checkAvailability])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (fetchError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge" style={{ marginBottom: 16 }}>Auto no encontrado</Text>
        <Button onPress={() => router.back()}>Volver</Button>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: 16 }}>
        <Surface style={[styles.carInfo, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
            {car?.brand} {car?.model}
          </Text>
          <Text variant="titleMedium" style={[styles.price, { color: colors.primary }]}>
            ${car?.price_per_day} / día
          </Text>
        </Surface>

        <DateRangePicker
          pricePerDay={car?.price_per_day ?? 0}
          onSelect={handleSelectDates}
          onCancel={() => router.back()}
        />
      </View>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  carInfo: { padding: 20, borderRadius: 16, marginBottom: 8, alignItems: 'center' },
  price: { fontWeight: 'bold', marginTop: 4 },
})
