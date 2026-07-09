import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { ConversationWithLatest } from '../types/database.types'

export function useConversations() {
  const user = useAuthStore((s) => s.session?.user)
  const [conversations, setConversations] = useState<ConversationWithLatest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('conversations')
      .select('*, car:car_id(brand, model, image_url), renter:renter_id(full_name, avatar_url), owner:owner_id(full_name, avatar_url), latest_message:messages(content, created_at, sender_id)')
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    if (data) setConversations(data as unknown as ConversationWithLatest[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { fetchConversations() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchConversations])

  return { conversations, loading, refetch: fetchConversations }
}
