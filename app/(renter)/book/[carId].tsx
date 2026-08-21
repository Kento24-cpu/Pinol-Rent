import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native'
import { Text, Button, Surface, Snackbar, useTheme, TextInput, SegmentedButtons } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/stores/authStore'
import { useBookings } from '../../../src/hooks/useBookings'
import { usePaymentIntents } from '../../../src/hooks/usePaymentIntents'
import { ErrorSnackbar } from '../../../src/components/ErrorSnackbar'
import { DETAIL_MAX } from '../../../src/lib/responsive'
import { DateRangePicker } from '../../../src/components/DateRangePicker'
import { RENTER_FEE, renterTotalPrice, renterFeeAmount } from '../../../src/lib/commission'
import { waMeUrl } from '../../../src/lib/whatsapp'

interface CarForBooking {
  brand: string
  model: string
  price_per_day: number
  deposit: number | null
  owner_id: string
}

interface OwnerBankInfo {
  phone: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

export default function BookCarScreen() {
  const { carId: carIdParam, existingBookingId } = useLocalSearchParams<{ carId: string; existingBookingId?: string }>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.session?.user)
  const { createBooking, checkAvailability, error: bookingsError, clearError: clearBookingsError } = useBookings()
  const { submitCardPayment, error: paymentError, clearError: clearPaymentError } = usePaymentIntents()
  const [car, setCar] = useState<CarForBooking | null>(null)
  const [ownerBank, setOwnerBank] = useState<OwnerBankInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | null>(null)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)
  const [unitPrice, setUnitPrice] = useState(0)
  const [days, setDays] = useState(0)
  const [bookingStart, setBookingStart] = useState('')
  const [bookingEnd, setBookingEnd] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')

  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [disabledDates, setDisabledDates] = useState<string[]>([])

  const carId = Number(carIdParam)

  const loadOwnerBank = useCallback(async (ownerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('phone, bank_name, bank_account_number, bank_account_holder')
      .eq('id', ownerId)
      .single()
    if (data) {
      setOwnerBank(data as unknown as OwnerBankInfo)
    } else {
      setOwnerBank(null)
    }
  }, [])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- invalid id guard on mount
    if (!carId || isNaN(carId)) { setFetchError(true); setLoading(false); return }
    supabase
      .from('cars')
      .select('brand, model, price_per_day, deposit, owner_id')
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
              .select('id, start_date, end_date, total_price, unit_price, status, payment_method')
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
            setBookingStart(booking.start_date)
            setBookingEnd(booking.end_date)
            setPaymentMethod(booking.payment_method === 'cash' ? 'cash' : 'card')
            if (booking.payment_method === 'cash') {
              await loadOwnerBank(data.owner_id)
            }
            setShowPayment(true)
          }
        } else {
          setFetchError(true)
        }
        setLoading(false)
      })
  }, [carId, existingBookingId, loadOwnerBank])

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
      setBookingStart(startDate)
      setBookingEnd(endDate)
      setPaymentMethod(null)
      setShowPayment(true)
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
  }, [user, carId, car, createBooking, checkAvailability])

  const handleSelectPaymentMethod = async (method: 'card' | 'cash') => {
    if (!bookingId) return
    try {
      const { error } = await supabase.from('bookings').update({ payment_method: method }).eq('id', bookingId)
      if (error) throw error
      setPaymentMethod(method)
      if (method === 'cash' && car?.owner_id) {
        await loadOwnerBank(car.owner_id)
      }
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
  }

  const handleWhatsApp = async () => {
    if (!bookingId || !car || !ownerBank?.phone) return
    const deposit = car.deposit ?? 0
    const totalToDeposit = totalPrice + deposit
    const renterName = (user?.user_metadata?.full_name as string | undefined) ?? 'Cliente'
    const message = `Hola, soy ${renterName}. Acabo de depositar $${totalToDeposit.toLocaleString()} por la reserva #${bookingId} del ${car.brand} ${car.model} (${bookingStart} al ${bookingEnd}). Te adjunto el comprobante. ¡Gracias!`
    await Linking.openURL(waMeUrl(ownerBank.phone, message))
  }

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
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ maxWidth: DETAIL_MAX, alignSelf: 'center', width: '100%' }}>
        <View style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
          <Surface style={[styles.carInfo, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              {car?.brand} {car?.model}
            </Text>
            <Text variant="titleMedium" style={[styles.price, { color: colors.primary }]}>
              ${car?.price_per_day} / día
            </Text>
            {car?.deposit ? (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
                Depósito: ${car.deposit} por reserva
              </Text>
            ) : null}
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
          </Surface>

          {!paymentMethod && (
            <Surface style={[styles.cardForm, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 12, color: colors.onSurfaceVariant }}>
                ¿Cómo deseas pagar?
              </Text>
              <SegmentedButtons
                value=""
                onValueChange={(v) => handleSelectPaymentMethod(v as 'card' | 'cash')}
                buttons={[
                  { value: 'card', label: 'Tarjeta', icon: 'credit-card' },
                  { value: 'cash', label: 'Efectivo', icon: 'bank' },
                ]}
              />
              <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 12, color: colors.onSurfaceVariant }}>
                Con efectivo depositarás a la cuenta bancaria del arrendador y le enviarás el comprobante por WhatsApp.
              </Text>
            </Surface>
          )}

          {paymentMethod === 'card' && (
            <Surface style={[styles.cardForm, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
                Datos de pago
              </Text>
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
              <Button mode="text" onPress={() => setPaymentMethod(null)} compact style={{ marginTop: 4 }}>
                Cambiar método de pago
              </Button>
            </Surface>
          )}

          {paymentMethod === 'cash' && (
            <Surface style={[styles.cardForm, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Pago en efectivo
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
                Deposita el monto total a la cuenta del arrendador y envíale el comprobante por WhatsApp para que confirme tu reserva.
              </Text>
              <View style={styles.feeSummary}>
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                  Alquiler: ${totalPrice.toLocaleString()}
                </Text>
                {car?.deposit ? (
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                    Depósito por reserva: ${car.deposit.toLocaleString()}
                  </Text>
                ) : null}
                <Text variant="titleMedium" style={[styles.totalLabel, { color: colors.onSurface }]}>
                  Total a depositar: ${(totalPrice + (car?.deposit ?? 0)).toLocaleString()}
                </Text>
              </View>

              {ownerBank?.bank_name || ownerBank?.bank_account_number ? (
                <View style={[styles.bankBox, { backgroundColor: colors.surfaceVariant }]}>
                  {ownerBank.bank_name ? (
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Banco: {ownerBank.bank_name}</Text>
                  ) : null}
                  {ownerBank.bank_account_number ? (
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Número de cuenta: {ownerBank.bank_account_number}</Text>
                  ) : null}
                  {ownerBank.bank_account_holder ? (
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Titular: {ownerBank.bank_account_holder}</Text>
                  ) : null}
                </View>
              ) : (
                <Text variant="bodyMedium" style={{ color: colors.error, marginBottom: 8 }}>
                  El arrendador aún no configura su cuenta bancaria. Contáctalo por chat para coordinar el pago.
                </Text>
              )}

              <Button
                mode="contained"
                icon="whatsapp"
                onPress={handleWhatsApp}
                disabled={!ownerBank?.phone}
                style={styles.button}
              >
                Enviar comprobante por WhatsApp
              </Button>
              <Button mode="text" onPress={() => setPaymentMethod(null)} compact style={{ marginTop: 4 }}>
                Cambiar método de pago
              </Button>
            </Surface>
          )}
        </View>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
      <ErrorSnackbar error={bookingsError} onDismiss={clearBookingsError} />
      <ErrorSnackbar error={paymentError} onDismiss={clearPaymentError} />
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
      <ErrorSnackbar error={bookingsError} onDismiss={clearBookingsError} />
      <ErrorSnackbar error={paymentError} onDismiss={clearPaymentError} />
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
  bankBox: { borderRadius: 12, padding: 12, marginTop: 12, gap: 4 },
})
