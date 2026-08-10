import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '../types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export type NotificationItem = NotificationRow

const n = () => supabase.from('notifications')

export function useNotifications({ subscribe = true }: { subscribe?: boolean } = {}) {
  const user = useAuthStore((s) => s.session?.user)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await n()
      .select()
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications((data ?? []) as NotificationItem[])
    setLoading(false)
  }, [user])

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    const { count } = await n()
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setUnreadCount(count ?? 0)
  }, [user])

  const markAsRead = useCallback(async (id: number) => {
    await n().update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await n().update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [user])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
    fetchNotifications()
    fetchUnreadCount()
  }, [user, fetchNotifications, fetchUnreadCount])

  useEffect(() => {
    if (!user || !subscribe) return

    const channel = supabase
      .channel('in-app-notifications')
      .on<NotificationRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          const newNotif = payload.new as NotificationRow
          setNotifications((prev) => {
            // Dedupe: realtime events may be redelivered after reconnects
            if (prev.some((n) => n.id === newNotif.id)) return prev
            return [newNotif, ...prev]
          })
          setUnreadCount((prev) => prev + 1)
        },
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user, subscribe])

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }
}
