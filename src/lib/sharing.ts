import type { Database } from '../types/database.types'
import type { MemberRole } from './boards'
import { safeAvatarUrl } from './safety'
import { supabase } from './supabase'

type Visibility = Database['public']['Enums']['board_visibility']

export interface Member {
  userId: string
  role: MemberRole
  name: string
  avatarUrl: string | null
  isGuest: boolean
}

export interface InvitePreview {
  boardId: string
  title: string
  ownerName: string
  linkRole: MemberRole
}

export const inviteUrl = (token: string) => `${window.location.origin}/join/${token}`

/** Owner only: the board's invite token (created the first time it's asked for). */
export async function getShareToken(boardId: string): Promise<string> {
  const { data, error } = await supabase.rpc('share_token_for', { b: boardId })
  if (error) throw error
  return data
}

/** Owner only: a new token; every link shared before stops working. */
export async function rotateShareToken(boardId: string): Promise<string> {
  const { data, error } = await supabase.rpc('rotate_share_token', { b: boardId })
  if (error) throw error
  return data
}

/** Owner only: who a link lets in, and whether links work at all. */
export async function updateLinkSettings(boardId: string, patch: { link_role?: MemberRole; visibility?: Visibility }) {
  const { error } = await supabase.from('boards').update(patch).eq('id', boardId)
  if (error) throw error
}

/** Works signed out: what an invite link points to, or null if it's invalid or turned off. */
export async function peekInvite(token: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc('peek_invite', { token })
  if (error) throw error
  const row = data[0]
  return row ? { boardId: row.board_id, title: row.title, ownerName: row.owner_name, linkRole: row.link_role } : null
}

export async function joinBoard(token: string): Promise<{ boardId: string; role: MemberRole }> {
  const { data, error } = await supabase.rpc('join_board', { token })
  if (error) throw error
  return { boardId: data[0].board_id, role: data[0].role }
}

export async function listMembers(boardId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('board_members')
    .select('user_id, role, profiles(display_name, avatar_url, is_guest)')
    .eq('board_id', boardId)
    .order('joined_at')
  if (error) throw error
  return data.map((m) => ({
    userId: m.user_id,
    role: m.role,
    name: m.profiles?.display_name ?? 'Someone',
    avatarUrl: safeAvatarUrl(m.profiles?.avatar_url),
    isGuest: m.profiles?.is_guest ?? true,
  }))
}

export async function setMemberRole(boardId: string, userId: string, role: Exclude<MemberRole, 'owner'>) {
  const { error } = await supabase.rpc('set_member_role', { b: boardId, member: userId, new_role: role })
  if (error) throw error
}

/** Owner removes someone, or a member removes themselves (leaves). */
export async function removeMember(boardId: string, userId: string) {
  const { error } = await supabase.rpc('remove_member', { b: boardId, member: userId })
  if (error) throw error
}

/** Database errors carry a readable hint; fall back to the message. */
export function sharingErrorMessage(error: unknown): string {
  const e = error as { hint?: string | null; message?: string } | null
  return e?.hint || e?.message || 'Something went wrong. Please try again.'
}
