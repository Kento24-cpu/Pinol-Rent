import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import type { ConversationWithLatest } from '../types/database.types'

export function useConversations() {
  const user = useAuthStore((s) => s.session?.user)
  const setUnreads = useChatStore((s) => s.setUnreads)
  const [conversations, setConversations] = useState<ConversationWithLatest[]>([])
  const [loading, setLoading] = useState(true)
  const genRef = useRef(0)

  const fetchConversations = useCallback(async () => {
    if (!user) return
    const gen = ++genRef.current
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*, car:car_id(brand, model, image_url), renter:renter_id(full_name, avatar_url), owner:owner_id(full_name, avatar_url), latest_message:messages(order:created_at.desc,limit:1,content,created_at,sender_id)')
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
      if (gen !== genRef.current) return
      const convs = (data ?? []) as unknown as ConversationWithLatest[]
      setConversations(convs)

      const ids = convs.map((c) => c.id)
      if (ids.length > 0) {
        const { data: unread } = await supabase
          .from('messages')
          .select('id, conversation_id')
          .in('conversation_id', ids)
          .is('read_at', null)
          .neq('sender_id', user.id)

        if (unread) {
          const countMap = new Map<number, number>()
          for (const m of unread) {
            countMap.set(m.conversation_id, (countMap.get(m.conversation_id) ?? 0) + 1)
          }
          const convMap: Record<number, number> = {}
          for (const [k, v] of countMap) convMap[k] = v

          setConversations((prev) =>
            prev.map((c) => ({ ...c, unread_count: convMap[c.id] ?? 0 }))
          )
          setUnreads(convMap, unread.length)
        } else {
          setUnreads({}, 0)
        }
      } else {
        setUnreads({}, 0)
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e)
    } finally {
      setLoading(false)
    }
  }, [user, setUnreads])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!user) return
    const userFilter = `renter_id=eq.${user.id},owner_id=eq.${user.id}`
    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: userFilter },
        () => fetchConversations()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: userFilter },
        () => fetchConversations()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchConversations])

  return { conversations, loading, refetch: fetchConversations }
}
