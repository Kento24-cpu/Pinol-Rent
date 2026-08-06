import { useState, useRef, useEffect, useCallback } from 'react'
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Image, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native'
import { Text, IconButton, useTheme, ActivityIndicator, Avatar, Icon, Snackbar } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import { useChat } from '../hooks/useChat'
import { showAlert } from '../lib/alert'
import type { MessageWithSender } from '../types/database.types'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'

interface ChatScreenProps {
  conversationId: number
}

export function ChatScreen({ conversationId }: ChatScreenProps) {
  const { colors } = useTheme()
  const userId = useAuthStore((s) => s.session?.user?.id)
  const user = useAuthStore((s) => s.session?.user)
  const { messages, loading, sending, sendMessage, markAsRead } = useChat(conversationId)
  const clearUnread = useChatStore((s) => s.clearUnreadForConversation)
  const [input, setInput] = useState('')
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<RNTextInput>(null)

  useEffect(() => {
    markAsRead()
    clearUnread(conversationId)
  }, [conversationId, markAsRead, clearUnread, user?.id])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    try { await sendMessage(text) } catch (e) { setSnackbar({ visible: true, message: (e as Error).message }) }
  }, [input, sendMessage])

  const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      handleSend()
    }
  }, [handleSend])

  const handleAttach = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showAlert('Permiso requerido', 'Habilita el acceso a tus fotos para enviar imágenes.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    })
    if (result.canceled || !result.assets?.length) return
    setInput('')
    try {
      const asset = result.assets[0]!
      await sendMessage('', { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' })
    } catch (e) { setSnackbar({ visible: true, message: (e as Error).message }) }
  }, [sendMessage])

  const renderMessage = useCallback(({ item }: { item: MessageWithSender }) => {
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
          {item.attachment_signed_url && (
            <Image
              source={{ uri: item.attachment_signed_url }}
              style={[styles.attachmentImage, { borderRadius: 10 }]}
              resizeMode="cover"
            />
          )}
          {item.attachment_url && !item.attachment_signed_url && (
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
              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
  }, [userId, colors])

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
      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.outline }]}>
        <IconButton icon="paperclip" size={22} onPress={handleAttach} disabled={sending} accessibilityLabel="Adjuntar imagen" />
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
          accessibilityLabel="Enviar mensaje"
        />
      </View>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
        {snackbar.message}
      </Snackbar>
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
  attachmentImage: { width: 200, height: 150, marginBottom: 4, borderRadius: 10 },
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
