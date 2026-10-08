import { create } from 'zustand'
import type { PenDraft } from '../canvas/tools/types'
import type { Point } from '../canvas/types'
import type { MemberRole } from '../lib/boards'

/** What each person shares about themselves on a board's channel. */
export interface Peer {
  userId: string
  name: string
  color: string
  avatarUrl: string | null
  isGuest: boolean
  role: MemberRole
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

interface PresenceState {
  status: ConnectionStatus
  /** Everyone online on this board, including me; one entry per person (not per tab) */
  peers: Peer[]
  cursors: Record<string, Point>
  /** Other people's pen strokes still being drawn, by user id */
  drafts: Record<string, PenDraft>
  reset: () => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
  status: 'connecting',
  peers: [],
  cursors: {},
  drafts: {},
  reset: () => set({ status: 'connecting', peers: [], cursors: {}, drafts: {} }),
}))
