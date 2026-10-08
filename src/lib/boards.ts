import type { Database } from '../types/database.types'
import { supabase } from './supabase'

// share_token is deliberately not readable by clients (see the hardening migration).
export type Board = Omit<Database['public']['Tables']['boards']['Row'], 'share_token'>
export type MemberRole = Database['public']['Enums']['member_role']
export type BoardWithRole = Board & { role: MemberRole }

/** Every readable column. `select('*')` would ask for share_token and be refused. */
const BOARD_COLUMNS = 'id, owner_id, title, visibility, link_role, thumbnail_url, created_at, updated_at'

/** Boards the current user belongs to, most recently updated first. */
export async function listMyBoards(userId: string): Promise<BoardWithRole[]> {
  const { data, error } = await supabase
    .from('boards')
    .select(`${BOARD_COLUMNS}, board_members!inner(role)`)
    .eq('board_members.user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map(({ board_members, ...board }) => ({ ...board, role: board_members[0].role }))
}

/** One board plus the caller's role. Returns null if it doesn't exist or they aren't a member. */
export async function getBoard(id: string): Promise<BoardWithRole | null> {
  const { data, error } = await supabase.from('boards').select(BOARD_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { data: role, error: roleError } = await supabase.rpc('board_role', { b: id })
  if (roleError) throw roleError
  return { ...data, role }
}

export async function createBoard(title?: string): Promise<Board> {
  const { data, error } = await supabase.rpc('create_board', title ? { title } : {})
  if (error) throw error
  const { share_token: _secret, ...board } = data // the owner may see it, but nothing needs it yet
  return board
}

export async function renameBoard(id: string, title: string): Promise<Board> {
  const { data, error } = await supabase.from('boards').update({ title }).eq('id', id).select(BOARD_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteBoard(id: string) {
  const { error, count } = await supabase.from('boards').delete({ count: 'exact' }).eq('id', id)
  if (error) throw error
  if (count === 0) throw new Error('You can only delete boards you own.')
}

/** Postgres/PostgREST errors → a sentence for the UI. */
export function boardErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string; hint?: string } | null
  // Limits raised by create_board carry a ready-to-show hint.
  if (e?.message === 'RATE_LIMITED' || e?.message === 'BOARD_LIMIT') return e.hint ?? 'You’ve hit a board limit.'
  if (e?.code === '23514') return 'Board names must be 1–80 characters.'
  if (e?.code === '42501' || e?.message === 'FORBIDDEN') return 'You don’t have permission to do that.'
  if (e?.code === 'PGRST116') return 'That board no longer exists.'
  return e?.message || 'Something went wrong. Please try again.'
}
