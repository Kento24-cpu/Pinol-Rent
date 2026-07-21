import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Snackbar, useTheme, TextInput } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/stores/authStore'
import { useBookings } from '../../../src/hooks/useBookings'
import { usePaymentIntents } from '../../../src/hooks/usePaymentIntents'
import { DateRangePicker } from '../../../src/components/DateRangePicker'

export default function BookCarScreen() {
  const { carId: carIdParam } = useLocalSearchParams<{ carId: string }>()
  const { colors } = useTheme()
  const user = useAuthStore((s) => s.session?.user)
  const { createBooking, checkAvailability } = useBookings()
  const { submitCardPayment } = usePaymentIntents()
  const [car, setCar] = useState<{ brand: string; model: string; price_per_day: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const [showPayment, setShowPayment] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)
  const [days, setDays] = useState(0)
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')

  const [submittingPayment, setSubmittingPayment] = useState(false)

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

  const handleSelectDates = useCallback(async (startDate: string, endDate: string, daysCount: number, price: number) => {
    if (!user) {
      router.push(`/(public)/login?redirect=${encodeURIComponent(`/(renter)/book/${carId}`)}`)
      return
    }
    setBooking(true)
    try {
      const available = await checkAvailability(carId, startDate, endDate)
      if (!available) {
        setSnackbar({ visible: true, message: 'El auto ya no está disponible para esas fechas' })
        setBooking(false)
        return
      }
      const id = await createBooking({ carId, startDate, endDate, status: 'pending_payment' })
      setBookingId(id)
      setTotalPrice(price)
      setDays(daysCount)
      setShowPayment(true)
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
      setBooking(false)
    }
  }, [user, carId, createBooking, checkAvailability])

  const handlePayment = async () => {
    if (!bookingId) return
    if (!cardNumber || !cardHolder || !expiry) {
      setSnackbar({ visible: true, message: 'Completa todos los datos de la tarjeta' })
      return
    }
    setSubmittingPayment(true)
    try {
      await submitCardPayment(bookingId, {
        card_number: cardNumber.replace(/\s/g, ''),
        card_holder: cardHolder,
        expiry,
      })
      router.replace(`/(renter)/bookings/${bookingId}`)
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
    setSubmittingPayment(false)
  }

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

  if (showPayment && bookingId) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16 }}>
          <Surface style={[styles.carInfo, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              {car?.brand} {car?.model}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
              Datos de pago
            </Text>
          </Surface>

          <Surface style={[styles.cardForm, { backgroundColor: colors.surface }]} elevation={1}>
            <TextInput
              label="Número de tarjeta"
              value={cardNumber}
              onChangeText={(t) => setCardNumber(t.replace(/[^\d\s]/g, '').slice(0, 19))}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              disabled={submittingPayment}
            />
            <TextInput
              label="Titular de la tarjeta"
              value={cardHolder}
              onChangeText={setCardHolder}
              mode="outlined"
              style={styles.input}
              disabled={submittingPayment}
            />
            <View style={styles.cardRow}>
              <TextInput
                label="Vencimiento (MM/AA)"
                value={expiry}
                onChangeText={(t) => setExpiry(t.replace(/[^\d/]/g, '').slice(0, 5))}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                disabled={submittingPayment}
              />
            </View>

            <Button
              mode="contained"
              onPress={handlePayment}
              loading={submittingPayment}
              disabled={submittingPayment}
              style={styles.button}
            >
              Pagar ${totalPrice.toLocaleString('es-NI')} ({days} días)
            </Button>
          </Surface>
        </View>

        <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
          {snackbar.message}
        </Snackbar>
      </ScrollView>
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
  cardForm: { padding: 20, borderRadius: 16, marginTop: 8 },
  input: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  button: { borderRadius: 12, marginTop: 8 },
})
