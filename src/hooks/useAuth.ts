import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const loading = useAuthStore((s) => s.loading)
  const initialized = useAuthStore((s) => s.initialized)
  const fetchingRef = useRef(false)

  useEffect(() => {
    const store = useAuthStore.getState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        store.setSession(session)
        if (session) {
          if (fetchingRef.current) return
          fetchingRef.current = true
          const currentUserId = session.user.id
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentUserId)
              .single()
            if (useAuthStore.getState().session?.user?.id === currentUserId) {
              store.setRole(profile?.role ?? null)
            }
          } catch (e) {
            console.error('Failed to fetch profile', e)
          } finally {
            fetchingRef.current = false
          }
        } else {
          store.setRole(null)
        }
        store.setLoading(false)
        store.setInitialized(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { session, role, loading, initialized }
}
