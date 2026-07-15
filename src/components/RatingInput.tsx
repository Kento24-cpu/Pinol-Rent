import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Icon, useTheme } from 'react-native-paper'
import { RATING_COLOR } from '../lib/theme'

interface RatingInputProps {
  value: number
  onChange: (rating: number) => void
  size?: number
  disabled?: boolean
}

export function RatingInput({ value, onChange, size = 32, disabled }: RatingInputProps) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          disabled={disabled}
          style={styles.star}
          accessibilityLabel={`${star} estrella${star > 1 ? 's' : ''}`}
          accessibilityRole="radio"
        >
          <Icon
            source={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? RATING_COLOR : colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  star: { padding: 2 },
})
