import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { MathUtils, Vector2, Vector3, type Group, type Mesh } from 'three'
import type { Line2 } from 'three-stdlib'
import { COLLABORATORS, MARKERS, type Collaborator } from './data'
import { HERO_BOARD, heroTrail, TRAIL_POINTS } from './shapes'
import Board from './three/Board'
import CameraFit from './three/CameraFit'
import Cursor3D from './three/Cursor3D'
import MarkerTrail from './three/MarkerTrail'

/** Last known pointer position in client (CSS pixel) coordinates. */
interface PointerState {
  x: number
  y: number
  seen: boolean
}

const BASE_TILT_X = -0.42
const BASE_TILT_Y = -0.2
const CURSOR_HEIGHT = 0.32
/** Bloom picks up anything brighter than this (linear luminance) */
const BLOOM_THRESHOLD = 0.6
/** Dims name tags just enough that they stay crisp under bloom */
const LABEL_TINT = '#dddddd'

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

interface HeroSceneProps {
  /** Render only while on screen */
  active: boolean
  /** Phones: fewer cursors, no bloom, no "You" cursor */
  simplified: boolean
  /** Mouse/trackpad available: parallax follows it; otherwise the board sways */
  finePointer: boolean
}

export default function HeroScene({ active, simplified, finePointer }: HeroSceneProps) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, seen: false })
  const board = useRef<Mesh>(null)
  const collaborators = simplified ? COLLABORATORS.slice(0, 2) : COLLABORATORS

  useEffect(() => {
    if (!finePointer) return
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, seen: true }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [finePointer])

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 11], fov: 35 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // The scene never needs pointer events; this keeps touch scrolling working.
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#0f1a17']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 6]} intensity={1.6} />
      <CameraFit width={HERO_BOARD.width + 1.6} height={HERO_BOARD.height + 0.6} />

      <Rig pointer={pointer} sway={!finePointer}>
        <Board width={HERO_BOARD.width} height={HERO_BOARD.height} ref={board} />
        {collaborators.map((c) => (
          <CollaboratorCursor key={c.name} collaborator={c} glow={simplified ? 1 : 2} labelHeight={simplified ? 0.5 : 0.32} />
        ))}
        {finePointer && !simplified && <YouCursor pointer={pointer} board={board} />}
      </Rig>

      {!simplified && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={BLOOM_THRESHOLD} luminanceSmoothing={0.2} intensity={0.75} radius={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

/** Tilts the board toward the visitor's mouse, or sways gently on touch devices. */
function Rig({
  pointer,
  sway,
  children,
}: {
  pointer: RefObject<PointerState>
  sway: boolean
  children: React.ReactNode
}) {
  const group = useRef<Group>(null)

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    let tiltX = 0
    let tiltY = 0
    if (sway || !pointer.current.seen) {
      const t = clock.elapsedTime
      tiltX = Math.sin(t * 0.35) * 0.06
      tiltY = Math.sin(t * 0.27) * 0.08
    } else {
      const nx = (pointer.current.x / window.innerWidth) * 2 - 1
      const ny = (pointer.current.y / window.innerHeight) * 2 - 1
      tiltX = ny * 0.12
      tiltY = nx * 0.18
    }
    g.rotation.x = MathUtils.damp(g.rotation.x, BASE_TILT_X + tiltX, 3, dt)
    g.rotation.y = MathUtils.damp(g.rotation.y, BASE_TILT_Y + tiltY, 3, dt)
  })

  return (
    <group ref={group} rotation={[BASE_TILT_X, BASE_TILT_Y, 0.03]}>
      {children}
    </group>
  )
}

/**
 * One collaborator's loop: glide to the start of their shape, draw it,
 * drift aside while the trail fades out, then start again.
 */
function CollaboratorCursor({
  collaborator: c,
  glow,
  labelHeight,
}: {
  collaborator: Collaborator
  glow: number
  labelHeight: number
}) {
  const points = useMemo(() => heroTrail(c.shape), [c.shape])
  const cursor = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const trail = useRef<Line2>(null)

  const path = useMemo(() => points.map(([x, y]) => new Vector3(x, y, 0)), [points])
  const rest = useMemo(() => path[0].clone().add(new Vector3(0.55, 0.45, 0)), [path])
  const pos = useMemo(() => new Vector3(), [])

  useFrame(({ clock }) => {
    if (!cursor.current || !trail.current || !shadow.current) return
    const t = (clock.elapsedTime / c.period + c.phase) % 1
    let drawn = 0
    let opacity = 1

    if (t < 0.12) {
      pos.lerpVectors(rest, path[0], easeInOut(t / 0.12))
    } else if (t < 0.62) {
      drawn = (t - 0.12) / 0.5
      const f = drawn * (TRAIL_POINTS - 1)
      const i = Math.floor(f)
      pos.lerpVectors(path[i], path[Math.min(i + 1, TRAIL_POINTS - 1)], f - i)
    } else {
      drawn = 1
      pos.lerpVectors(path[TRAIL_POINTS - 1], rest, easeInOut((t - 0.62) / 0.38))
      opacity = 1 - MathUtils.smoothstep(t, 0.7, 1)
    }

    const bob = Math.sin(clock.elapsedTime * 2.2 + c.phase * 10) * 0.05
    cursor.current.position.set(pos.x, pos.y, CURSOR_HEIGHT + bob)
    cursor.current.rotation.z = Math.sin(clock.elapsedTime * 1.3 + c.phase * 7) * 0.08
    shadow.current.position.set(pos.x + 0.06, pos.y - 0.06, 0.004)

    trail.current.geometry.instanceCount = Math.floor(drawn * (TRAIL_POINTS - 1))
    trail.current.material.opacity = opacity
  })

  return (
    <>
      <MarkerTrail ref={trail} points={points} color={c.color} glow={glow} width={4} />
      <mesh ref={shadow}>
        <circleGeometry args={[0.13, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <Cursor3D ref={cursor} name={c.name} color={c.color} labelTint={glow > 1 ? LABEL_TINT : undefined} labelHeight={labelHeight} />
    </>
  )
}

/** The visitor's own cursor, projected from the mouse onto the board. */
function YouCursor({ pointer, board }: { pointer: RefObject<PointerState>; board: RefObject<Mesh | null> }) {
  const cursor = useRef<Group>(null)
  const { camera, gl, raycaster } = useThree()
  const ndc = useMemo(() => new Vector2(), [])
  const target = useMemo(() => new Vector3(), [])
  const onBoard = useRef(false)

  useFrame((_, dt) => {
    const g = cursor.current
    if (!g || !board.current || !g.parent) return
    const { x, y, seen } = pointer.current
    const rect = gl.domElement.getBoundingClientRect()
    const inside = seen && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

    let hit = false
    if (inside) {
      ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const [intersection] = raycaster.intersectObject(board.current)
      if (intersection) {
        target.copy(intersection.point)
        g.parent.worldToLocal(target)
        hit = true
      }
    }

    if (hit && !onBoard.current) g.position.set(target.x, target.y, 0.25) // appear in place, don't fly in
    onBoard.current = hit
    g.visible = hit
    if (hit) {
      g.position.x = MathUtils.damp(g.position.x, target.x, 14, dt)
      g.position.y = MathUtils.damp(g.position.y, target.y, 14, dt)
    }
  })

  useEffect(() => {
    if (cursor.current) cursor.current.visible = false
  }, [])

  return <Cursor3D ref={cursor} name="You" color={MARKERS.violet} labelTint={LABEL_TINT} />
}
