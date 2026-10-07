import type { Ref } from 'react'
import { ExtrudeGeometry, Shape, type Group } from 'three'
import { CURSOR_OUTLINE } from '../shapes'
import Label from './Label'

const arrowShape = new Shape()
CURSOR_OUTLINE.forEach(([x, y], i) => (i === 0 ? arrowShape.moveTo(x, y) : arrowShape.lineTo(x, y)))
arrowShape.closePath()

const arrowGeometry = new ExtrudeGeometry(arrowShape, {
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.02,
  bevelSize: 0.02,
  bevelSegments: 2,
})

interface Cursor3DProps {
  name: string
  color: string
  /** Label tint; slightly below white keeps tags from blooming */
  labelTint?: string
  labelHeight?: number
  ref?: Ref<Group>
}

/** A glowing pointer with a name tag. The tip sits at the group's origin. */
export default function Cursor3D({ name, color, labelTint, labelHeight = 0.32, ref }: Cursor3DProps) {
  return (
    <group ref={ref}>
      <mesh geometry={arrowGeometry}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.35} />
      </mesh>
      <Label text={name} background={color} color="#0f1a17" position={[0.36, -0.7 - labelHeight / 2, 0.05]} height={labelHeight} tint={labelTint} />
    </group>
  )
}
