import { View, StyleSheet } from 'react-native'
import { useTheme, Text } from 'react-native-paper'
import { useLocalSearchParams } from 'expo-router'
import { ChatScreen } from '../../../src/components/ChatScreen'
import { ScreenContainer } from '../../../src/components/ScreenContainer'

export default function RenterChatScreen() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const conversationId = Number(id)

  if (isNaN(conversationId)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge">Conversación inválida</Text>
      </View>
    )
  }

  return (
    <ScreenContainer style={{ flex: 1 }}>
      <ChatScreen conversationId={conversationId} />
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
