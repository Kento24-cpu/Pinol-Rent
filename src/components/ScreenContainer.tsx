import { View, type ViewStyle } from 'react-native'
import { CONTENT_MAX } from '../lib/responsive'

interface ScreenContainerProps {
  children: React.ReactNode
  maxWidth?: number
  style?: ViewStyle
}

export function ScreenContainer({ children, maxWidth = CONTENT_MAX, style }: ScreenContainerProps) {
  return (
    <View style={[{ width: '100%', maxWidth, alignSelf: 'center' }, style]}>
      {children}
    </View>
  )
}
