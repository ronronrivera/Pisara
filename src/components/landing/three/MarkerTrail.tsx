import { Line } from '@react-three/drei'
import { useMemo, type Ref } from 'react'
import { Color, Vector3 } from 'three'
import type { Line2 } from 'three-stdlib'
import type { Pt } from '../shapes'

interface MarkerTrailProps {
  points: Pt[]
  color: string
  width?: number
  /** > 1 pushes the color past the bloom threshold */
  glow?: number
  z?: number
  ref?: Ref<Line2>
}

/**
 * A fat line along `points`. Callers reveal it progressively by setting
 * `geometry.instanceCount` (number of segments drawn) and fade it with `material.opacity`.
 */
export default function MarkerTrail({ points, color, width = 4, glow = 1, z = 0.01, ref }: MarkerTrailProps) {
  const vectors = useMemo(() => points.map(([x, y]) => new Vector3(x, y, z)), [points, z])
  const tint = useMemo(() => new Color(color).multiplyScalar(glow), [color, glow])

  return (
    <Line
      ref={ref as Ref<never>}
      points={vectors}
      color={tint}
      lineWidth={width}
      toneMapped={false}
      transparent
      depthWrite={false}
    />
  )
}
