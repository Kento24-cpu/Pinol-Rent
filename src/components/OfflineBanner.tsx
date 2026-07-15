import { View, StyleSheet } from 'react-native'
import { Text, Icon, useTheme } from 'react-native-paper'
import { useNetwork } from '../hooks/useNetwork'

export function OfflineBanner() {
  const { colors } = useTheme()
  const { isOnline } = useNetwork()

  if (isOnline) return null

  return (
    <View style={[styles.banner, { backgroundColor: colors.error }]}>
      <Icon source="wifi-off" size={16} color={colors.onError} />
      <Text style={[styles.text, { color: colors.onError }]}>Sin conexión — los datos pueden no estar actualizados</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: { fontSize: 12, fontWeight: '500' },
})
