interface PeerAvatarProps {
  name: string
  color: string
  avatarUrl?: string | null
  size?: 'sm' | 'md'
  ring?: boolean
}

/** A person's photo (GitHub/Google) or their initial on their marker color. */
export default function PeerAvatar({ name, color, avatarUrl, size = 'md', ring = false }: PeerAvatarProps) {
  const box = size === 'sm' ? 'size-7 text-xs' : 'size-8 text-sm'
  const ringClass = ring ? 'ring-2 ring-board' : ''
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className={`${box} ${ringClass} shrink-0 rounded-full object-cover`}
      style={{ boxShadow: `0 0 0 2px ${color}` }}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${box} ${ringClass} flex shrink-0 items-center justify-center rounded-full font-bold text-board`}
      style={{ backgroundColor: color }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
