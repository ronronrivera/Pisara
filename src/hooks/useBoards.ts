import { useCallback, useEffect, useState } from 'react'
import { boardErrorMessage, deleteBoard, listMyBoards, renameBoard, type BoardWithRole } from '../lib/boards'

type Status = 'loading' | 'ready' | 'error'

const sortByUpdated = (boards: BoardWithRole[]) =>
  [...boards].sort((a, b) => b.updated_at.localeCompare(a.updated_at))

/** The signed-in user's boards, with optimistic rename and delete. */
export function useBoards(userId: string | undefined) {
  const [boards, setBoards] = useState<BoardWithRole[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    if (!userId) return
    let current = true // ignore a slow response after the user or reload changed
    listMyBoards(userId)
      .then((data) => {
        if (!current) return
        setBoards(data)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (!current) return
        setError(boardErrorMessage(e))
        setStatus('error')
      })
    return () => {
      current = false
    }
  }, [userId, reloads])

  const reload = useCallback(() => {
    setStatus('loading')
    setReloads((n) => n + 1)
  }, [])

  /**
   * Optimistic: the change shows right away. If the database refuses, only the
   * affected board is put back, so other edits made meanwhile survive.
   */
  const rename = useCallback(async (board: BoardWithRole, title: string) => {
    setBoards((current) => current.map((b) => (b.id === board.id ? { ...b, title } : b)))
    try {
      const saved = await renameBoard(board.id, title)
      setBoards((current) => sortByUpdated(current.map((b) => (b.id === board.id ? { ...b, ...saved } : b))))
    } catch (e) {
      setBoards((current) => current.map((b) => (b.id === board.id ? board : b)))
      throw new Error(boardErrorMessage(e))
    }
  }, [])

  const remove = useCallback(async (board: BoardWithRole) => {
    setBoards((current) => current.filter((b) => b.id !== board.id))
    try {
      await deleteBoard(board.id)
    } catch (e) {
      setBoards((current) => sortByUpdated([...current, board]))
      throw new Error(boardErrorMessage(e))
    }
  }, [])

  return { boards, status, error, reload, rename, remove }
}
