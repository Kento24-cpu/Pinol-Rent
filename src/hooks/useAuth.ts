import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const SAFETY_TIMEOUT = 8000

async function fetchProfileWithRetry(userId: string, retries = 3, delay = 500): Promise<'owner' | 'renter' | 'admin' | null> {
  for (let i = 0; i < retries; i++) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profile?.role) return profile.role as 'owner' | 'renter' | 'admin'
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delay))
  }
  return null
}

function forceInitialized() {
  const state = useAuthStore.getState()
  if (!state.initialized) {
    console.warn('[Auth] Safety timeout — forcing initialized')
    state.setLoading(false)
    state.setInitialized(true)
  }
}

export function useAuth() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const loading = useAuthStore((s) => s.loading)
  const initialized = useAuthStore((s) => s.initialized)
  const fetchingRef = useRef(false)

  useEffect(() => {
    const store = useAuthStore.getState()
    const safetyTimer = setTimeout(forceInitialized, SAFETY_TIMEOUT)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(safetyTimer)
        store.setSession(session)
        if (session) {
          if (fetchingRef.current) return
          fetchingRef.current = true
          const currentUserId = session.user.id
          try {
            const userRole = await fetchProfileWithRetry(currentUserId)
            if (useAuthStore.getState().session?.user?.id === currentUserId) {
              if (userRole) {
                store.setRole(userRole)
              } else {
                store.setProfileError(true)
              }
            }
          } catch (e) {
            console.error('Failed to fetch profile', e)
            store.setProfileError(true)
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

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  return { session, role, loading, initialized }
}
