import { useState, useRef, useEffect } from 'react'
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Alert } from 'react-native'
import { Text, IconButton, useTheme, ActivityIndicator, Avatar, Icon } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import { useChat } from '../hooks/useChat'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'

interface ChatScreenProps {
  conversationId: number
}

export function ChatScreen({ conversationId }: ChatScreenProps) {
  const { colors } = useTheme()
  const userId = useAuthStore((s) => s.session?.user?.id)
  const { messages, loading, sending, sendMessage, markAsRead } = useChat(conversationId)
  const clearUnread = useChatStore((s) => s.clearUnreadForConversation)
  const [input, setInput] = useState('')
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<RNTextInput>(null)

  useEffect(() => {
    markAsRead()
    clearUnread(conversationId)
  }, [messages, conversationId, markAsRead, clearUnread])

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    try { await sendMessage(text) } catch { /* parent handles snackbar */ }
  }

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      if (Platform.OS === 'web') e.preventDefault()
      handleSend()
    }
  }

  const handleAttach = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Habilita el acceso a tus fotos para enviar imágenes.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    })
    if (result.canceled) return
    setInput('')
    try {
      await sendMessage('', { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType ?? 'image/jpeg' })
    } catch { /* parent handles snackbar */ }
  }

  const renderMessage = ({ item }: { item: typeof messages[number] }) => {
    const isOwn = item.sender_id === userId

    return (
      <View style={[styles.msgRow, isOwn ? styles.msgOwn : styles.msgOther]}>
        {!isOwn && (
          <View style={[styles.avatarCol, styles.avatarLeft]}>
            {item.sender?.avatar_url ? (
              <Avatar.Image size={28} source={{ uri: item.sender.avatar_url }} />
            ) : (
              <Avatar.Text size={28} label={(item.sender?.full_name?.[0] ?? '?').toUpperCase()} />
            )}
          </View>
        )}
        <View style={[
          styles.bubble,
          { backgroundColor: isOwn ? colors.primary : colors.surface },
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          !isOwn && { borderWidth: 1, borderColor: colors.outline },
        ]}>
          {item.attachment_url && (
            <View style={styles.attachment}>
              <Icon source="image" size={16} color={isOwn ? colors.onPrimary : colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: isOwn ? colors.onPrimaryContainer : colors.onSurfaceVariant, marginLeft: 4 }}>
                Imagen
              </Text>
            </View>
          )}
          <Text style={{ color: isOwn ? colors.onPrimary : colors.onSurface }}>{item.content}</Text>
          <View style={styles.msgMeta}>
            <Text variant="labelSmall" style={{ color: isOwn ? colors.onPrimaryContainer : colors.onSurfaceVariant }}>
              {new Date(item.created_at ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {item.read_at && isOwn ? ' ✓✓' : ''}
            </Text>
          </View>
        </View>
        {isOwn && (
          <View style={[styles.avatarCol, styles.avatarRight]}>
            {item.sender?.avatar_url ? (
              <Avatar.Image size={28} source={{ uri: item.sender.avatar_url }} />
            ) : (
              <Avatar.Text size={28} label={(item.sender?.full_name?.[0] ?? '?').toUpperCase()} />
            )}
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="chat-outline" size={48} color={colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
              Envía un mensaje para iniciar la conversación
            </Text>
          </View>
        }
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.list}
      />
      <View style={[styles.inputBar, { backgroundColor: colors.surface }]}>
        <IconButton icon="paperclip" size={22} onPress={handleAttach} disabled={sending} />
        <RNTextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          onKeyPress={handleKeyPress}
          placeholder="Escribe un mensaje...  (Enter enviar)"
          style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.onSurface }]}
          multiline
          editable={!sending}
        />
        <IconButton
          icon="send"
          size={22}
          iconColor={colors.primary}
          disabled={!input.trim() || sending}
          onPress={handleSend}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 8 },
  msgRow: { marginVertical: 3, flexDirection: 'row', alignItems: 'flex-end' },
  msgOwn: { justifyContent: 'flex-end' },
  msgOther: { justifyContent: 'flex-start' },
  avatarCol: { marginBottom: 4 },
  avatarLeft: { marginRight: 6 },
  avatarRight: { marginLeft: 6 },
  bubble: {
    maxWidth: '72%',
    padding: 10,
    borderRadius: 16,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  attachment: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  msgMeta: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyContainer: { flex: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
  },
})
