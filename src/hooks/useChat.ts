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
    if (gen !== genRef.current) { setLoading(false); return }
    if (data) setMessages(data as unknown as MessageWithSender[])
    setLoading(false)
  }, [conversationId, user])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    fetchMessages()
  }, [fetchMessages])

  const senderCache = useRef<Record<string, { full_name: string; avatar_url: string | null }>>({})

  useEffect(() => {
    if (!conversationId) return
    senderCache.current = {}
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const raw = payload.new as MessageWithSender
          if (!senderCache.current[raw.sender_id]) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', raw.sender_id)
              .single()
            senderCache.current[raw.sender_id] = sender ?? { full_name: '', avatar_url: null }
          }
          const newMsg: MessageWithSender = {
            ...raw,
            sender: senderCache.current[raw.sender_id],
          }
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
      const { data: signedData } = await supabase.storage.from('chat-attachments').createSignedUrl(uploadData.path, 7 * 24 * 60 * 60)
      attachmentUrl = signedData?.signedUrl ?? ''
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
