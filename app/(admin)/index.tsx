import { useEffect, useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Text, Button, Surface, Chip, useTheme, Icon } from 'react-native-paper'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePaymentIntents } from '../../src/hooks/usePaymentIntents'
import { ScreenContainer } from '../../src/components/ScreenContainer'
import { useColumns } from '../../src/lib/responsive'

export default function AdminDashboard() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { intents, loading, fetchPending } = usePaymentIntents()
  const [refreshing, setRefreshing] = useState(false)
  const cols = useColumns({ mobile: 1, tablet: 2, desktop: 2 })

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPending()
    setRefreshing(false)
  }, [fetchPending])

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenContainer style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onBackground }}>
            Solicitudes de pago
          </Text>
          <Button mode="contained" icon="refresh" onPress={handleRefresh} loading={refreshing} compact>
            Recargar
          </Button>
        </View>

        {loading && intents.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" /></View>
        ) : intents.length === 0 ? (
          <View style={styles.center}>
            <Icon source="credit-card-check" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>
              No hay pagos pendientes
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
              Los nuevos aparecerán aquí automáticamente
            </Text>
          </View>
        ) : (
          <FlatList
            data={intents}
            numColumns={cols}
            key={cols}
            renderItem={({ item }) => (
              <View style={cols > 1 ? styles.gridItem : undefined}>
                <Surface style={[styles.card, cols > 1 && styles.cardGrid, { backgroundColor: colors.surface }]} elevation={1}>
                  <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      {item.brand} {item.model}
                    </Text>
                    <Chip style={styles.chip} textStyle={styles.chipText}>
                      ${item.amount.toLocaleString()}
                    </Chip>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.row}>
                      <Icon source="account" size={16} color={colors.onSurfaceVariant} />
                      <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                        {item.renter_name}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Icon source="card" size={16} color={colors.onSurfaceVariant} />
                      <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                        **** {item.card_last_four}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Icon source="clock" size={16} color={colors.onSurfaceVariant} />
                      <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                        {new Date(item.expires_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    icon="eye"
                    onPress={() => router.push(`/(admin)/payments/${item.id}`)}
                    style={styles.reviewBtn}
                  >
                    Revisar
                  </Button>
                </Surface>
              </View>
            )}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.list, cols > 1 && styles.gridList]}
            columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
            style={{ flex: 1 }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </ScreenContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  card: { margin: 16, padding: 20, borderRadius: 16 },
  cardGrid: { margin: 0, padding: 20, borderRadius: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chip: { backgroundColor: '#E65100' + '20' },
  chipText: { fontSize: 12, fontWeight: 'bold', color: '#E65100' },
  cardBody: { gap: 8, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  reviewBtn: { borderRadius: 12 },
  list: { paddingBottom: 32 },
  gridList: { paddingHorizontal: 16 },
  gridRow: { gap: 16 },
  gridItem: { flex: 1, marginBottom: 16 },
})
