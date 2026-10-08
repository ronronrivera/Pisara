import { MARKERS } from '../components/landing/data'

const PALETTE = [MARKERS.coral, MARKERS.sky, MARKERS.lime, MARKERS.amber, MARKERS.violet]

/** A stable marker color per person, so their cursor looks the same to everyone. */
export function colorFor(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
