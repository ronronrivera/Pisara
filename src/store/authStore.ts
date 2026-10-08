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
  /** True once we've tried to load the profile for the current user (even if it failed) */
  profileLoaded: boolean
  error: string | null
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  user: null,
  profile: null,
  profileLoaded: false,
  error: null,
}))

const statusFor = (user: User | null): AuthStatus => (!user ? 'signedOut' : user.is_anonymous ? 'guest' : 'member')

/**
 * Name to show. The saved profile wins; sign-in metadata is only a fallback when the
 * profile row is missing, because it reflects the *latest* provider (e.g. Google after
 * GitHub on the same account) and would flicker before the profile loads.
 */
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
  if (useAuthStore.getState().user?.id !== user.id) return // signed out or switched meanwhile
  if (error) console.warn('Could not load profile. Has the profiles migration been applied?', error.message)
  useAuthStore.setState({ profile: error ? null : data, profileLoaded: true })
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
        const sameUser = !!user && prev.profile?.id === user.id
        useAuthStore.setState({
          user,
          status: statusFor(user),
          profile: sameUser ? prev.profile : null,
          profileLoaded: sameUser ? prev.profileLoaded : false,
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
