import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { MessageWithSender } from '../types/database.types'
import { uriToBlob, mimeToExt } from '../lib/upload'

async function signAttachment(m: MessageWithSender): Promise<MessageWithSender> {
  if (!m.attachment_url || m.attachment_url.startsWith('http')) return m
  try {
    const { data } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(m.attachment_url, 60 * 60)
    return { ...m, attachment_signed_url: data?.signedUrl ?? null }
  } catch {
    return m
  }
}

export function useChat(conversationId: number | null) {
  const user = useAuthStore((s) => s.session?.user)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const genRef = useRef(0)

  const clearError = () => setError(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return
    const gen = ++genRef.current
    const { data, error: fetchError } = await supabase
      .from('messages')
      .select('*, sender:sender_id(full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (gen !== genRef.current) { setLoading(false); return }
    if (fetchError) { setError(fetchError.message); setLoading(false); return }
    if (data) {
      const raw = data as unknown as MessageWithSender[]
      const signed = await Promise.all(raw.map(signAttachment))
      if (gen !== genRef.current) return
      setMessages(signed)
    }
    setLoading(false)
  }, [conversationId, user])

  /* eslint-disable react-hooks/set-state-in-effect -- reset chat state on conversation change */
  useEffect(() => {
    setLoading(true)
    setMessages([])
    fetchMessages()
  }, [fetchMessages])
  /* eslint-enable react-hooks/set-state-in-effect */

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
            senderCache.current[raw.sender_id] = { full_name: sender?.full_name ?? '', avatar_url: sender?.avatar_url ?? null }
          }
          const senderData = senderCache.current[raw.sender_id]
          const newMsg: MessageWithSender = {
            ...raw,
            sender: senderData ? { ...senderData, full_name: senderData.full_name ?? '' } : { full_name: '', avatar_url: null },
          }
          const signed = await signAttachment(newMsg)
          setMessages((prev) => {
            if (prev.some((m) => m.id === signed.id)) return prev
            return [...prev, signed]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, user])

  const sendMessage = useCallback(async (content: string, attachment?: { uri: string; mimeType: string }) => {
    if (!user || !conversationId || (!content.trim() && !attachment)) return
    setSending(true)
    try {
      let attachmentUrl: string | null = null

      if (attachment) {
        const ext = mimeToExt(attachment.mimeType) ?? 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const blob = await uriToBlob(attachment.uri)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(path, blob, { contentType: attachment.mimeType })
        if (uploadError) throw uploadError
        // Store the storage path; the URL is signed fresh on read (signed
        // URLs persisted in the DB would expire after 7 days)
        attachmentUrl = uploadData.path
      }

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        attachment_url: attachmentUrl,
      })
      if (msgError) throw msgError

      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
    } finally {
      setSending(false)
    }
  }, [user, conversationId])

  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return
    try {
      await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId })
    } catch {
      // best-effort read receipts
    }
  }, [user, conversationId])

  return { messages, loading, sending, error, clearError, sendMessage, markAsRead, refetch: fetchMessages }
}
