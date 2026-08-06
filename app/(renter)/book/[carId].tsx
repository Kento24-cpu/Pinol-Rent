import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Snackbar, useTheme, TextInput } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/stores/authStore'
import { useBookings } from '../../../src/hooks/useBookings'
import { usePaymentIntents } from '../../../src/hooks/usePaymentIntents'
import { DateRangePicker } from '../../../src/components/DateRangePicker'
import { RENTER_FEE, renterTotalPrice, renterFeeAmount } from '../../../src/lib/commission'

export default function BookCarScreen() {
  const { carId: carIdParam, existingBookingId } = useLocalSearchParams<{ carId: string; existingBookingId?: string }>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.session?.user)
  const { createBooking, checkAvailability } = useBookings()
  const { submitCardPayment } = usePaymentIntents()
  const [car, setCar] = useState<{ brand: string; model: string; price_per_day: number; deposit_per_day: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const [showPayment, setShowPayment] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)
  const [unitPrice, setUnitPrice] = useState(0)
  const [days, setDays] = useState(0)
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')

  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [disabledDates, setDisabledDates] = useState<string[]>([])

  const carId = Number(carIdParam)

  useEffect(() => {
    if (!carId || isNaN(carId)) return
    supabase
      .rpc('get_booked_ranges', { p_car_id: carId })
      .then(({ data }) => {
        if (!data) return
        const dates = new Set<string>()
        for (const range of data) {
          let d = new Date(`${range.start_date}T00:00:00`)
          const end = new Date(`${range.end_date}T00:00:00`)
          while (d <= end) {
            dates.add(
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            )
            d.setDate(d.getDate() + 1)
          }
        }
        setDisabledDates([...dates])
      })
  }, [carId])

  useEffect(() => {
    if (!carId || isNaN(carId)) { setFetchError(true); setLoading(false); return }
    supabase
      .from('cars')
      .select('brand, model, price_per_day, deposit_per_day')
      .eq('id', carId)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setCar(data)
          if (existingBookingId) {
            const id = Number(existingBookingId)
            if (isNaN(id)) { setFetchError(true); setLoading(false); return }
            const { data: booking } = await supabase
              .from('bookings')
              .select('id, start_date, end_date, total_price, unit_price, status')
              .eq('id', id)
              .single()
            if (!booking || booking.status !== 'pending_payment') {
              router.replace(`/(renter)/bookings/${id}`)
              return
            }
            const dayCount = Math.round(
              (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000
            ) + 1
            setBookingId(booking.id)
            setTotalPrice(booking.total_price)
            setUnitPrice(booking.unit_price ?? data.price_per_day)
            setDays(dayCount)
            setShowPayment(true)
          }
        } else {
          setFetchError(true)
        }
        setLoading(false)
      })
  }, [carId, existingBookingId])

  const handleSelectDates = useCallback(async (startDate: string, endDate: string, daysCount: number) => {
    if (!user) {
      router.push(`/(public)/login?redirect=${encodeURIComponent(`/(renter)/book/${carId}`)}`)
      return
    }
    try {
      const available = await checkAvailability(carId, startDate, endDate)
      if (!available) {
        setSnackbar({ visible: true, message: 'El auto ya no está disponible para esas fechas' })
        return
      }
      const baseUnitPrice = car?.price_per_day ?? 0
      const feeIncludedTotal = renterTotalPrice(baseUnitPrice, daysCount)
      const id = await createBooking({ carId, startDate, endDate, totalPrice: feeIncludedTotal, unitPrice: baseUnitPrice, status: 'pending_payment' })
      setBookingId(id)
      setTotalPrice(feeIncludedTotal)
      setUnitPrice(baseUnitPrice)
      setDays(daysCount)
      setShowPayment(true)
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
  }, [user, carId, car, createBooking, checkAvailability])

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
        <View style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
          <Surface style={[styles.carInfo, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              {car?.brand} {car?.model}
            </Text>
            <Text variant="titleMedium" style={[styles.price, { color: colors.primary }]}>
              ${car?.price_per_day} / día
            </Text>
            {car?.deposit_per_day && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
                Depósito: ${car.deposit_per_day}/día
              </Text>
            )}
            <View style={styles.feeSummary}>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                ${unitPrice} × {days} día{days > 1 ? 's' : ''} = ${(unitPrice * days).toLocaleString()}
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                + {Math.round(RENTER_FEE * 100)}% servicio = ${renterFeeAmount(unitPrice, days).toLocaleString()}
              </Text>
              <Text variant="titleMedium" style={[styles.totalLabel, { color: colors.onSurface }]}>
                Total: ${totalPrice.toLocaleString()}
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
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
              Pagar ${totalPrice.toLocaleString()} ({days} días)
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
      <View style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
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
          disabledDates={disabledDates}
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
  feeSummary: { marginTop: 12, alignItems: 'center', gap: 2 },
  totalLabel: { fontWeight: 'bold', marginTop: 4 },
})
