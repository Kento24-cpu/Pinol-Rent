import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Snackbar, useTheme, Icon } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { usePaymentIntents } from '../../../src/hooks/usePaymentIntents'

export default function PaymentDetailScreen() {
  const { id: paymentIdParam } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { getPreview, approve, decline, decryptCard } = usePaymentIntents()
  const [preview, setPreview] = useState<{
    card_last_four: string
    card_holder: string
    amount: number
    booking_status: string
    created_at: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })
  const [done, setDone] = useState(false)
  const [decrypted, setDecrypted] = useState<{ card_number: string; card_holder: string; expiry: string } | null>(null)
  const [decrypting, setDecrypting] = useState(false)

  const paymentId = Number(paymentIdParam)

  const load = useCallback(async () => {
    try {
      const data = await getPreview(paymentId)
      setPreview(data)
    } catch (e) {
      console.warn('Failed to load payment preview', e)
      setPreview(null)
    }
    setLoading(false)
  }, [paymentId, getPreview])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load on mount
  useEffect(() => { load() }, [load])

  const handleApprove = async () => {
    setUpdating(true)
    try {
      await approve(paymentId)
      setDone(true)
      setSnackbar({ visible: true, message: 'Pago aprobado — reserva notificada al arrendador' })
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
    setUpdating(false)
  }

  const handleDecline = async () => {
    setUpdating(true)
    try {
      await decline(paymentId)
      setDone(true)
      setSnackbar({ visible: true, message: 'Pago rechazado — reserva cancelada' })
    } catch (e) {
      setSnackbar({ visible: true, message: (e as Error).message })
    }
    setUpdating(false)
  }

  const handleDecrypt = async () => {
    setDecrypting(true)
    try {
      const data = await decryptCard(paymentId)
      if (data && typeof data.card_number === 'string' && data.card_number.length > 0) {
        setDecrypted(data)
      } else {
        throw new Error(data === null ? 'Acceso denegado' : 'Datos de tarjeta incompletos')
      }
    } catch (e) {
      console.warn('[PayDetail] decryptCard error:', (e as Error).message)
      setSnackbar({ visible: true, message: (e as Error).message })
    }
    setDecrypting(false)
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!preview || done) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon source="check-circle" size={64} color={colors.primary} />
        <Text variant="bodyLarge" style={{ marginTop: 16, marginBottom: 16 }}>
          {done ? 'Solicitud procesada' : 'Solicitud no encontrada o expirada'}
        </Text>
        <Button onPress={() => router.replace('/(admin)')}>Volver al panel</Button>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>
          Detalle de pago
        </Text>

        <View style={styles.row}>
          <Icon source="card" size={20} color={colors.primary} />
          <Text variant="bodyLarge" style={{ marginLeft: 12 }}>
            {decrypted?.card_number ? decrypted.card_number.match(/.{1,4}/g)?.join(' ') : `**** ${preview.card_last_four}`}
          </Text>
        </View>

        <View style={styles.row}>
          <Icon source="account" size={20} color={colors.primary} />
          <Text variant="bodyLarge" style={{ marginLeft: 12 }}>
            {preview.card_holder}
          </Text>
        </View>

        {decrypted && (
          <View style={styles.row}>
            <Icon source="calendar" size={20} color={colors.primary} />
            <Text variant="bodyLarge" style={{ marginLeft: 12 }}>
              Vence: {decrypted.expiry}
            </Text>
          </View>
        )}

        {!decrypted && (
          <Button
            mode="text"
            icon="lock-open"
            onPress={handleDecrypt}
            loading={decrypting}
            disabled={decrypting}
            style={{ marginTop: 8 }}
            compact
          >
            Mostrar datos de tarjeta
          </Button>
        )}

        <View style={[styles.divider, { backgroundColor: colors.outline }]} />

        <View style={styles.row}>
          <Icon source="currency-usd" size={20} color={colors.primary} />
          <Text variant="titleLarge" style={{ marginLeft: 12, fontWeight: 'bold', color: colors.primary }}>
            ${preview.amount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.row}>
          <Icon source="calendar" size={20} color={colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ marginLeft: 12, color: colors.onSurfaceVariant }}>
            {new Date(preview.created_at).toLocaleString()}
          </Text>
        </View>
      </Surface>

      <Surface style={[styles.actionsCard, { backgroundColor: colors.surface }]} elevation={1}>
        <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16, color: colors.onSurfaceVariant }}>
          ¿Apruebas o rechazas esta solicitud de pago?
        </Text>
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            icon="close"
            textColor={colors.error}
            onPress={handleDecline}
            loading={updating}
            disabled={updating}
            style={[styles.actionBtn, { borderColor: '#C62828' }]}
          >
            Rechazar
          </Button>
          <Button
            mode="contained"
            icon="check"
            onPress={handleApprove}
            loading={updating}
            disabled={updating}
            style={styles.actionBtn}
          >
            Aprobar
          </Button>
        </View>
      </Surface>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={4000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 16, padding: 24, borderRadius: 20 },
  actionsCard: { margin: 16, padding: 20, borderRadius: 16, marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  divider: { height: 1, marginVertical: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 12 },
})
