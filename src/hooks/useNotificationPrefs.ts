import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Database } from '../types/database'

interface NotificationPrefs {
  chat_push: boolean
  booking_push: boolean
  marketing: boolean
}

const DEFAULTS: NotificationPrefs = {
  chat_push: true,
  booking_push: true,
  marketing: false,
}

export function useNotificationPrefs() {
  const user = useAuthStore((s) => s.session?.user)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const prefsRef = useRef(prefs)
  useEffect(() => { prefsRef.current = prefs }, [prefs])

  const fetchPrefs = useCallback(async () => {
    if (!user) return
    try {
      const { data: existing } = await supabase
        .from('notification_prefs')
        .select('chat_push, booking_push, marketing')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        setPrefs(existing)
      } else {
        const { data } = await supabase
          .from('notification_prefs')
          .insert({ user_id: user.id, ...DEFAULTS })
          .select('chat_push, booking_push, marketing')
          .single()
        if (data) setPrefs(data)
      }
    } catch (e) {
      console.error('Failed to fetch notification prefs', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
  useEffect(() => { fetchPrefs() }, [fetchPrefs])

  const updatePref = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return
    const prev = prefsRef.current
    setPrefs((p) => ({ ...p, [key]: value }))
    const update: Database['public']['Tables']['notification_prefs']['Insert'] = {
      user_id: user.id,
      [key]: value,
    }
    const { error } = await supabase
      .from('notification_prefs')
      .upsert(update)
    if (error) {
      setPrefs(prev)
      throw error
    }
  }, [user])

  return { prefs, loading, updatePref, refetch: fetchPrefs }
}
