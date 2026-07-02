import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const loading = useAuthStore((s) => s.loading)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    const store = useAuthStore.getState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        store.setSession(session)
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          store.setRole(profile?.role ?? null)
        } else {
          store.setRole(null)
        }
        store.setLoading(false)
        store.setInitialized(true)
      }
    )

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      store.setSession(session)
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        store.setRole(profile?.role ?? null)
      }
      store.setLoading(false)
      store.setInitialized(true)
    })()

    return () => subscription.unsubscribe()
  }, [])

  return { session, role, loading, initialized }
}
