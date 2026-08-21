import { TouchableOpacity, StyleSheet } from 'react-native'
import { Icon, useTheme } from 'react-native-paper'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function BackButton() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          top: insets.top + 8,
          backgroundColor: colors.surface,
          shadowColor: '#000',
        },
      ]}
      onPress={() => router.back()}
      accessibilityLabel="Volver"
      accessibilityRole="button"
    >
      <Icon source="arrow-left" size={22} color={colors.onSurface} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    borderRadius: 24,
    padding: 10,
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
})
