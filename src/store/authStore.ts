import type { User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured } from '../lib/env'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  is_guest: boolean
}

export type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'member' | 'error'

interface AuthState {
  status: AuthStatus
  user: User | null
  profile: Profile | null
  error: string | null
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  user: null,
  profile: null,
  error: null,
}))

const statusFor = (user: User | null): AuthStatus => (!user ? 'signedOut' : user.is_anonymous ? 'guest' : 'member')

/** Name to show even before the profile row loads (or if it's missing). */
export function displayNameOf(state: Pick<AuthState, 'user' | 'profile'>) {
  const meta = state.user?.user_metadata ?? {}
  return state.profile?.display_name ?? meta.display_name ?? meta.full_name ?? meta.name ?? meta.user_name ?? 'Guest'
}

export async function refreshProfile() {
  const user = useAuthStore.getState().user
  if (!user) return
  const { supabase } = await import('../lib/supabase')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, is_guest')
    .eq('id', user.id)
    .maybeSingle()
  if (error) {
    console.warn('Could not load profile. Has the profiles migration been applied?', error.message)
    return
  }
  if (useAuthStore.getState().user?.id === user.id) useAuthStore.setState({ profile: data })
}

let started = false

/**
 * Subscribes to Supabase auth once per page load. supabase-js is imported lazily so
 * the landing page's first paint doesn't wait for it.
 */
export function initAuth() {
  if (started) return
  started = true

  if (!isSupabaseConfigured) {
    useAuthStore.setState({ status: 'error', error: 'Supabase isn’t configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' })
    return
  }

  import('../lib/supabase')
    .then(({ supabase }) => {
      supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user ?? null
        const prev = useAuthStore.getState()
        useAuthStore.setState({
          user,
          status: statusFor(user),
          profile: user && prev.profile?.id === user.id ? prev.profile : null,
          error: null,
        })
        // Supabase warns against awaiting its own calls inside this callback, so defer.
        if (user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          setTimeout(refreshProfile, 0)
        }
      })
    })
    .catch((e: unknown) => {
      useAuthStore.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    })
}
