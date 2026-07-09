import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { MessageWithSender } from '../types/database.types'
import { uriToBlob, mimeToExt } from '../lib/upload'

export function useChat(conversationId: number | null) {
  const user = useAuthStore((s) => s.session?.user)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const genRef = useRef(0)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return
    const gen = ++genRef.current
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (gen !== genRef.current) return
    if (data) setMessages(data as unknown as MessageWithSender[])
    setLoading(false)
  }, [conversationId, user])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as MessageWithSender
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  const sendMessage = async (content: string, attachment?: { uri: string; mimeType: string }) => {
    if (!user || !conversationId || (!content.trim() && !attachment)) return
    setSending(true)
    let attachmentUrl: string | null = null

    if (attachment) {
      const ext = mimeToExt(attachment.mimeType) ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const blob = await uriToBlob(attachment.uri)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(path, blob, { contentType: attachment.mimeType })
      if (uploadError) { setSending(false); throw uploadError }
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(uploadData.path)
      attachmentUrl = publicUrl
    }

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      attachment_url: attachmentUrl,
    })

    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
    setSending(false)
  }

  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return
    const { data: unread } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null)

    if (unread && unread.length > 0) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unread.map((m) => m.id))
    }
  }, [user, conversationId])

  return { messages, loading, sending, sendMessage, markAsRead, refetch: fetchMessages }
}
