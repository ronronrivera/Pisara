import { usePresenceStore } from '../../store/presenceStore'
import PeerAvatar from './PeerAvatar'

const SHOWN = 4

/** Who's on this board right now (me first). */
export default function PresenceBar() {
  const peers = usePresenceStore((s) => s.peers)
  if (peers.length === 0) return null
  const names = peers.map((p, i) => (i === 0 ? `${p.name} (you)` : p.name))
  const hidden = peers.length - SHOWN

  return (
    <div className="flex items-center gap-2" role="group" aria-label={`${peers.length} online: ${names.join(', ')}`}>
      <ul className="flex -space-x-2">
        {peers.slice(0, SHOWN).map((p, i) => (
          <li key={p.userId} title={names[i]}>
            <PeerAvatar name={p.name} color={p.color} avatarUrl={p.avatarUrl} size="sm" ring />
          </li>
        ))}
        {hidden > 0 && (
          <li
            title={names.slice(SHOWN).join(', ')}
            className="flex size-7 items-center justify-center rounded-full bg-board-line text-xs font-semibold text-chalk ring-2 ring-board"
          >
            +{hidden}
          </li>
        )}
      </ul>
      <span className="hidden text-xs text-chalk-dim md:inline">{peers.length} online</span>
    </div>
  )
}
