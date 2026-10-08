import { useEffect, useMemo } from 'react'
import type { BoardWithRole } from '../lib/boards'
import { safeAvatarUrl } from '../lib/safety'
import { BoardRealtime, type RealtimeHandlers } from '../realtime/boardRealtime'
import { colorFor } from '../realtime/colors'
import { displayNameOf, useAuthStore } from '../store/authStore'

/**
 * Joins the board's live channel while the board is open. Reconnects when the board
 * or my role changes (a role change needs a fresh authorization on the channel).
 */
export function useBoardRealtime(board: BoardWithRole | null, handlers: RealtimeHandlers): BoardRealtime | null {
  const userId = useAuthStore((s) => s.user?.id)
  const name = useAuthStore(displayNameOf)
  const isGuest = useAuthStore((s) => s.status === 'guest')
  const avatar = useAuthStore((s) => s.profile?.avatar_url ?? null)

  const boardId = board?.id
  const role = board?.role

  const realtime = useMemo(
    () =>
      boardId && role && userId
        ? new BoardRealtime({
            boardId,
            me: { userId, name, color: colorFor(userId), avatarUrl: safeAvatarUrl(avatar), isGuest, role },
          })
        : null,
    [boardId, role, userId, name, avatar, isGuest],
  )

  // Hand over the newest callbacks without reconnecting.
  useEffect(() => {
    realtime?.setHandlers(handlers)
  })

  useEffect(() => {
    if (!realtime) return
    void realtime.connect()
    return () => {
      void realtime.close()
    }
  }, [realtime])

  return realtime
}
