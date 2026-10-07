import { Line } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import { useMemo, useRef } from 'react'
import { MathUtils, QuadraticBezierCurve3, Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three'
import { MARKERS } from './data'
import { DIAGRAM_BOARD, DIAGRAM_ELEMENTS, TEXT_BARS, type DiagramElement } from './shapes'
import Board from './three/Board'
import CameraFit from './three/CameraFit'
import Label from './three/Label'
import MarkerTrail from './three/MarkerTrail'

const SPLIT_X = 1.65
const SPLIT_SCALE = 0.56
const ARC = new QuadraticBezierCurve3(
  new Vector3(-SPLIT_X, 1.05, 0.15),
  new Vector3(0, 2.0, 0.6),
  new Vector3(SPLIT_X, 1.05, 0.15),
)
const ARC_POINTS = ARC.getPoints(40)

const smooth = (p: number, a: number, b: number) => MathUtils.smoothstep(p, a, b)

/** All animation is a pure function of scroll progress p ∈ [0, 1]. */
function phases(p: number) {
  const split = smooth(p, 0.6, 0.8) // step 3: one board becomes two
  const explode = smooth(p, 0.25, 0.45) - split // step 2: elements lift into layers
  return { explode, split }
}

interface ExplodingCanvasSceneProps {
  progress: MotionValue<number>
  active: boolean
}

export default function ExplodingCanvasScene({ progress, active }: ExplodingCanvasSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 12], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[2, 4, 6]} intensity={1.2} />
      <CameraFit width={DIAGRAM_BOARD.width + 2.4} height={DIAGRAM_BOARD.height + 2.4} />
      <Rig progress={progress} />
    </Canvas>
  )
}

function Rig({ progress }: { progress: MotionValue<number> }) {
  const rig = useRef<Group>(null)
  const boardA = useRef<Group>(null)
  const boardB = useRef<Group>(null)
  const pulse = useRef<Mesh>(null)
  const link = useRef<Group>(null)
  const pulsePos = useMemo(() => new Vector3(), [])

  useFrame(({ clock }, dt) => {
    if (!rig.current || !boardA.current || !boardB.current || !pulse.current || !link.current) return
    const { explode, split } = phases(progress.get())

    // Turn the rig so the stacked layers read as depth, then settle back for the two screens.
    rig.current.rotation.x = MathUtils.damp(rig.current.rotation.x, -0.32 - 0.28 * explode + 0.12 * split, 6, dt)
    rig.current.rotation.y = MathUtils.damp(rig.current.rotation.y, 0.42 * explode, 6, dt)

    const scale = MathUtils.lerp(1, SPLIT_SCALE, split)
    boardA.current.position.x = -SPLIT_X * split
    boardB.current.position.x = SPLIT_X * split
    boardA.current.scale.setScalar(scale)
    boardB.current.scale.setScalar(scale)
    boardB.current.visible = split > 0.001

    // A sync pulse travels back and forth between the two screens.
    link.current.visible = split > 0.95
    if (link.current.visible) {
      const t = (clock.elapsedTime * 0.7) % 2
      ARC.getPoint(t < 1 ? t : 2 - t, pulsePos)
      pulse.current.position.copy(pulsePos)
      pulse.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 8) * 0.15)
    }
  })

  return (
    <group ref={rig}>
      <group ref={boardA}>
        <DiagramBoard progress={progress} screenLabel="Ana's screen" showLayerLabels />
      </group>
      <group ref={boardB} visible={false}>
        <DiagramBoard progress={progress} screenLabel="Miguel's screen" />
      </group>
      <group ref={link} visible={false}>
        <Line points={ARC_POINTS} color={MARKERS.violet} lineWidth={2} dashed dashSize={0.12} gapSize={0.1} transparent opacity={0.7} />
        <mesh ref={pulse}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color={MARKERS.violet} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function DiagramBoard({
  progress,
  screenLabel,
  showLayerLabels = false,
}: {
  progress: MotionValue<number>
  screenLabel: string
  showLayerLabels?: boolean
}) {
  const screenTag = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    if (screenTag.current) screenTag.current.opacity = smooth(progress.get(), 0.78, 0.88)
  })

  return (
    <>
      <Board width={DIAGRAM_BOARD.width} height={DIAGRAM_BOARD.height} cell={0.4} />
      {DIAGRAM_ELEMENTS.map((el, i) => (
        <LayeredElement key={el.label} element={el} index={i} progress={progress} showLabel={showLayerLabels} />
      ))}
      <Label
        text={screenLabel}
        background="#0f1a17"
        border="#2c4a40"
        color="#ece9df"
        anchor="center"
        height={0.5}
        position={[0, -DIAGRAM_BOARD.height / 2 - 0.5, 0]}
        opacity={0}
        materialRef={screenTag}
      />
    </>
  )
}

/** One element plus the translucent "layer card" behind it and its version label. */
function LayeredElement({
  element: el,
  index,
  progress,
  showLabel,
}: {
  element: DiagramElement
  index: number
  progress: MotionValue<number>
  showLabel: boolean
}) {
  const group = useRef<Group>(null)
  const card = useRef<Mesh>(null)
  const label = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    if (!group.current || !card.current) return
    const { explode } = phases(progress.get())
    // Stagger so elements peel off one after another.
    const lift = MathUtils.clamp(explode * 1.4 - index * 0.08, 0, 1)
    group.current.position.z = lift * (0.3 + index * 0.34)
    ;(card.current.material as { opacity: number }).opacity = lift * 0.14
    if (label.current) label.current.opacity = lift
  })

  return (
    <group ref={group} position={[el.x, el.y, 0]}>
      <mesh ref={card} position={[0, 0, -0.02]}>
        <planeGeometry args={[el.w + 0.3, el.h + 0.3]} />
        <meshBasicMaterial color="#ece9df" transparent opacity={0} depthWrite={false} />
      </mesh>
      <ElementShape element={el} />
      {showLabel && (
        <Label
          text={el.label}
          background="rgba(15, 26, 23, 0.92)"
          border="rgba(236, 233, 223, 0.25)"
          color="#ece9df"
          mono
          height={0.26}
          position={[-(el.w + 0.3) / 2, (el.h + 0.3) / 2 + 0.18, 0]}
          opacity={0}
          materialRef={label}
        />
      )}
    </group>
  )
}

function ElementShape({ element: el }: { element: DiagramElement }) {
  if (el.kind === 'text') {
    return (
      <>
        {TEXT_BARS.map(([x, y, w]) => (
          <mesh key={y} position={[x + w / 2, y, 0.01]}>
            <planeGeometry args={[w, 0.08]} />
            <meshBasicMaterial color={el.color} transparent opacity={0.85} />
          </mesh>
        ))}
      </>
    )
  }

  return (
    <>
      {el.kind === 'rect' && (
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[el.w, el.h]} />
          <meshBasicMaterial color={el.color} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
      <MarkerTrail points={el.points} color={el.color} width={3} />
    </>
  )
}
