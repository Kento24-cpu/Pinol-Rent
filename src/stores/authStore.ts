import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

type UserRole = 'owner' | 'renter' | 'admin' | null

interface AuthState {
  session: Session | null
  role: UserRole
  loading: boolean
  initialized: boolean
  profileError: boolean
  setSession: (session: Session | null) => void
  setRole: (role: UserRole) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setProfileError: (error: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  role: null,
  loading: true,
  initialized: false,
  profileError: false,
  setSession: (session) => set({ session }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setProfileError: (profileError) => set({ profileError }),
  reset: () => set({ session: null, role: null, loading: false, initialized: true, profileError: false }),
}))
