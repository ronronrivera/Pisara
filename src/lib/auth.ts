import { isAuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type OAuthProvider = 'google' | 'github'

const NEXT_KEY = 'pisara:auth-next'

// Where to go after the OAuth round trip. Kept out of the redirect URL so the
// Supabase allow-list only needs the plain /auth/callback address.
function rememberNext(next: string) {
  try {
    sessionStorage.setItem(NEXT_KEY, next)
  } catch {
    // Private mode or blocked storage: we'll fall back to /boards.
  }
}

export function takeNext(): string {
  try {
    const next = sessionStorage.getItem(NEXT_KEY)
    sessionStorage.removeItem(NEXT_KEY)
    // Only allow same-site paths.
    if (next?.startsWith('/') && !next.startsWith('//')) return next
  } catch {
    // ignore
  }
  return '/boards'
}

const callbackUrl = () => `${window.location.origin}/auth/callback`

export async function signInAsGuest(displayName: string) {
  const { error } = await supabase.auth.signInAnonymously({
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
}

export async function signInWithProvider(provider: OAuthProvider, next = '/boards') {
  rememberNext(next)
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl() } })
  if (error) throw error
}

/** Guest → permanent account. Keeps the same user id, so guest boards stay theirs. */
export async function linkProvider(provider: OAuthProvider, next = '/boards') {
  rememberNext(next)
  const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: callbackUrl() } })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function updateDisplayName(id: string, displayName: string) {
  const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', id)
  if (error) throw error
}

const MESSAGES: Record<string, string> = {
  anonymous_provider_disabled: 'Guest mode isn’t switched on yet. Enable anonymous sign-ins in Supabase → Authentication.',
  manual_linking_disabled: 'Account linking isn’t switched on yet. Enable manual linking in Supabase → Authentication.',
  identity_already_exists:
    'That account is already connected to a different Pisara user. Sign out and sign in with it instead.',
  validation_failed: 'That sign-in method isn’t switched on yet in Supabase.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
}

/** Turns Supabase auth errors (thrown or from the redirect URL) into something a person can act on. */
export function authErrorMessage(error: unknown, code?: string | null): string {
  const key = code ?? (isAuthError(error) ? error.code : undefined)
  if (key && MESSAGES[key]) return MESSAGES[key]
  if (error instanceof Error && /provider is not enabled/i.test(error.message)) return MESSAGES.validation_failed
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong while signing in. Please try again.'
}
