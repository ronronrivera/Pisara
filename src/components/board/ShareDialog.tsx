import { Check, Copy, Link2, Loader2, LogOut, RotateCw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BoardWithRole, MemberRole } from '../../lib/boards'
import {
  getShareToken,
  inviteUrl,
  listMembers,
  removeMember,
  rotateShareToken,
  setMemberRole,
  sharingErrorMessage,
  updateLinkSettings,
  type Member,
} from '../../lib/sharing'
import type { BoardRealtime } from '../../realtime/boardRealtime'
import { colorFor } from '../../realtime/colors'
import { usePresenceStore } from '../../store/presenceStore'
import Modal from '../ui/Modal'
import PeerAvatar from './PeerAvatar'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  board: BoardWithRole
  myId: string
  realtime: BoardRealtime | null
  /** Link settings changed (owner) */
  onBoardChange: (patch: Partial<Pick<BoardWithRole, 'link_role' | 'visibility'>>) => void
  /** I left the board */
  onLeft: () => void
}

export default function ShareDialog(props: ShareDialogProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} labelledBy="share-title">
      {/* Mounted only while open, so every opening loads fresh members. */}
      <ShareContent {...props} />
    </Modal>
  )
}

const select =
  'rounded-lg border border-board-line bg-board-raised px-2 py-1.5 text-sm text-chalk focus:border-chalk/40 focus:outline-none disabled:opacity-60'

function ShareContent({ board, myId, realtime, onBoardChange, onLeft }: ShareDialogProps) {
  const owner = board.role === 'owner'
  const linkOn = board.visibility !== 'private'
  const peers = usePresenceStore((s) => s.peers) // select the stable array; derive below
  const online = useMemo(() => new Set(peers.map((p) => p.userId)), [peers])
  const [token, setToken] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let current = true
    listMembers(board.id)
      .then((list) => current && setMembers(list))
      .catch((e: unknown) => current && setError(sharingErrorMessage(e)))
    if (owner && linkOn) {
      getShareToken(board.id)
        .then((t) => current && setToken(t))
        .catch((e: unknown) => current && setError(sharingErrorMessage(e)))
    }
    return () => {
      current = false
    }
  }, [board.id, owner, linkOn])

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(sharingErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const copy = () =>
    run('copy', async () => {
      if (!token) return
      await navigator.clipboard.writeText(inviteUrl(token))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })

  const toggleLink = () =>
    run('toggle', async () => {
      const visibility = linkOn ? 'private' : 'link'
      await updateLinkSettings(board.id, { visibility })
      onBoardChange({ visibility })
    })

  const changeLinkRole = (link_role: MemberRole) =>
    run('link-role', async () => {
      await updateLinkSettings(board.id, { link_role })
      onBoardChange({ link_role })
    })

  const reset = () =>
    run('reset', async () => {
      setToken(await rotateShareToken(board.id))
      setConfirmReset(false)
    })

  const changeRole = (member: Member, role: Exclude<MemberRole, 'owner'>) =>
    run(`role-${member.userId}`, async () => {
      await setMemberRole(board.id, member.userId, role)
      setMembers((list) => list?.map((m) => (m.userId === member.userId ? { ...m, role } : m)) ?? null)
      realtime?.sendMemberUpdated(member.userId, role) // their screen switches to edit/view mode
    })

  const remove = (member: Member) =>
    run(`remove-${member.userId}`, async () => {
      await removeMember(board.id, member.userId)
      setMembers((list) => list?.filter((m) => m.userId !== member.userId) ?? null)
      realtime?.sendMemberUpdated(member.userId, null) // their screen closes the board
    })

  const leave = () =>
    run('leave', async () => {
      await removeMember(board.id, myId)
      onLeft()
    })

  return (
    <div>
      <h2 id="share-title" className="pr-8 font-display text-2xl font-bold">
        Share “{board.title}”
      </h2>

      {owner ? (
        <section className="mt-5 rounded-xl border border-board-line p-4" aria-labelledby="link-heading">
          <div className="flex items-center justify-between gap-3">
            <h3 id="link-heading" className="flex items-center gap-2 font-semibold">
              <Link2 className="size-4 text-chalk-dim" aria-hidden="true" /> Invite link
            </h3>
            <button
              type="button"
              role="switch"
              aria-checked={linkOn}
              aria-label="Invite link"
              onClick={toggleLink}
              disabled={busy !== null}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${linkOn ? 'bg-lime' : 'bg-board-line'} disabled:opacity-60`}
            >
              <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-board transition-transform ${linkOn ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {linkOn ? (
            <>
              <div className="mt-3 flex gap-2">
                <input
                  readOnly
                  value={token ? inviteUrl(token) : 'Creating link…'}
                  aria-label="Invite link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-board-line bg-board-raised px-3 py-2 font-mono text-xs text-chalk-dim"
                />
                <button
                  type="button"
                  onClick={copy}
                  disabled={!token || busy !== null}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-chalk px-3 py-2 text-sm font-semibold text-board hover:bg-white disabled:opacity-60"
                >
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-chalk-dim">
                <label className="flex items-center gap-2">
                  Anyone with the link can
                  <select
                    value={board.link_role}
                    onChange={(e) => changeLinkRole(e.target.value as MemberRole)}
                    disabled={busy !== null}
                    className={select}
                  >
                    <option value="editor">edit</option>
                    <option value="viewer">view</option>
                  </select>
                </label>
                {confirmReset ? (
                  <span className="flex items-center gap-2">
                    Old links stop working.
                    <button type="button" onClick={reset} disabled={busy !== null} className="font-semibold text-coral hover:underline">
                      Reset
                    </button>
                    <button type="button" onClick={() => setConfirmReset(false)} className="hover:text-chalk">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    disabled={!token || busy !== null}
                    className="inline-flex items-center gap-1 hover:text-chalk disabled:opacity-60"
                  >
                    <RotateCw className="size-3.5" aria-hidden="true" /> Reset link
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-chalk-dim">Link sharing is off. Only current members can open this board.</p>
          )}
        </section>
      ) : (
        <p className="mt-2 text-sm text-chalk-dim">Only the owner can invite people or change roles.</p>
      )}

      <section className="mt-5" aria-labelledby="members-heading">
        <h3 id="members-heading" className="text-xs font-semibold tracking-wide text-chalk-dim uppercase">
          Members{members ? ` · ${members.length}` : ''}
        </h3>
        {!members && !error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-chalk-dim">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
          </p>
        )}
        {members && (
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <span className="relative">
                  <PeerAvatar name={m.name} color={colorFor(m.userId)} avatarUrl={m.avatarUrl} size="sm" />
                  {online.has(m.userId) && (
                    <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-lime ring-2 ring-board" title="Online" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.name}
                  {m.userId === myId && <span className="text-chalk-dim"> (you)</span>}
                  {m.isGuest && <span className="ml-1.5 text-xs text-lime">guest</span>}
                </span>
                {m.role === 'owner' || !owner ? (
                  <span className="text-sm text-chalk-dim capitalize">{m.role}</span>
                ) : (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value as Exclude<MemberRole, 'owner'>)}
                      disabled={busy !== null}
                      aria-label={`Role for ${m.name}`}
                      className={select}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      disabled={busy !== null}
                      aria-label={`Remove ${m.name}`}
                      className="rounded-lg p-1.5 text-chalk-dim hover:bg-coral/10 hover:text-coral disabled:opacity-60"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-3 text-sm text-coral">
          {error}
        </p>
      )}

      {!owner && (
        <div className="mt-5 border-t border-board-line pt-4">
          <button
            type="button"
            onClick={leave}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-coral hover:bg-coral/10 disabled:opacity-60"
          >
            {busy === 'leave' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
            Leave board
          </button>
        </div>
      )}
    </div>
  )
}
