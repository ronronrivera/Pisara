// Small checks shared by the UI. The database enforces the same rules; these keep the
// client from sending, storing or rendering anything it would refuse.

/** Control, zero-width and bidirectional-override characters (they can disguise names). */
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE_CHAR = /[\u0001-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/
const UNSAFE_CHARS = new RegExp(UNSAFE_CHAR.source, 'g')

export const stripUnsafeChars = (value: string) => value.replace(UNSAFE_CHARS, '')

/**
 * A same-site path to go to after sign-in, or the fallback. Rejects anything that could
 * leave the site: "//evil.com", "/\evil.com", full URLs, and control characters.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/boards'): string {
  if (!raw || raw.length > 2048) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || UNSAFE_CHAR.test(raw)) return fallback
  try {
    // Resolving against a dummy origin must keep the same origin.
    const url = new URL(raw, 'https://pisara.invalid')
    return url.origin === 'https://pisara.invalid' ? url.pathname + url.search + url.hash : fallback
  } catch {
    return fallback
  }
}

/** Only GitHub and Google avatars are shown (mirrors public.safe_avatar_url in the database). */
const AVATAR_URL = /^https:\/\/(avatars\.githubusercontent\.com|[a-z0-9-]+\.googleusercontent\.com)\/[^\s"'<>\\]*$/

export const safeAvatarUrl = (url: unknown): string | null => (typeof url === 'string' && AVATAR_URL.test(url) ? url : null)
