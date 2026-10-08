import { worldToScreen } from '../../canvas/viewport'
import { useBoardStore } from '../../store/boardStore'
import { usePresenceStore } from '../../store/presenceStore'

/** Other people's pointers with name tags, positioned over the canvas. */
export default function RemoteCursors() {
  const cursors = usePresenceStore((s) => s.cursors)
  const peers = usePresenceStore((s) => s.peers)
  const viewport = useBoardStore((s) => s.viewport)

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
      {Object.entries(cursors).map(([userId, point]) => {
        const peer = peers.find((p) => p.userId === userId)
        if (!peer) return null
        const { x, y } = worldToScreen(viewport, point)
        return (
          <div
            key={userId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-linear will-change-transform"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              <path d="M1 1 L1 17 L5.5 13 L8.5 20 L11.5 18.6 L8.5 12 L14.5 12 Z" fill={peer.color} stroke="#0f1a17" strokeWidth="1.2" />
            </svg>
            <span
              className="absolute top-5 left-3 max-w-40 truncate rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-board shadow-md"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
