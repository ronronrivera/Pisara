import { Billboard } from '@react-three/drei'
import { useEffect, useMemo, type Ref } from 'react'
import { CanvasTexture, SRGBColorSpace, type MeshBasicMaterial } from 'three'

interface LabelProps {
  text: string
  background: string
  color: string
  border?: string
  mono?: boolean
  /** Height in world units */
  height?: number
  /** 'left': position is the label's left edge. 'center': its middle. */
  anchor?: 'left' | 'center'
  position?: [number, number, number]
  /** Tints the texture; below white keeps bright tags under the bloom threshold */
  tint?: string
  opacity?: number
  materialRef?: Ref<MeshBasicMaterial>
}

const PX = 96 // texture height in pixels

/**
 * A pill-shaped text tag drawn to a canvas texture and always facing the camera.
 * Stays inside WebGL (no DOM overlay), so it costs one draw call and no React roots.
 */
export default function Label({
  text,
  background,
  color,
  border,
  mono = false,
  height = 0.3,
  anchor = 'left',
  position = [0, 0, 0],
  tint = '#ffffff',
  opacity = 1,
  materialRef,
}: LabelProps) {
  const { texture, aspect, draw } = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const font = `600 ${PX * 0.48}px ${mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'Inter, system-ui, sans-serif'}`
    ctx.font = font
    const pad = PX * 0.32
    canvas.width = Math.ceil(ctx.measureText(text).width + pad * 2)
    canvas.height = PX

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, PX * 0.2)
      ctx.fillStyle = background
      ctx.fill()
      if (border) {
        ctx.lineWidth = 3
        ctx.strokeStyle = border
        ctx.stroke()
      }
      ctx.font = font
      ctx.fillStyle = color
      ctx.textBaseline = 'middle'
      ctx.fillText(text, pad, canvas.height / 2 + 2)
    }
    draw()

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    return { texture, aspect: canvas.width / canvas.height, draw }
  }, [text, background, color, border, mono])

  // Redraw once web fonts finish loading so tags use Inter, not the fallback.
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (!alive) return
      draw()
      texture.needsUpdate = true
    })
    return () => {
      alive = false
      texture.dispose()
    }
  }, [draw, texture])

  const width = height * aspect

  return (
    <Billboard position={position}>
      <mesh position={[anchor === 'left' ? width / 2 : 0, 0, 0]} renderOrder={10}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          color={tint}
          transparent
          opacity={opacity}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}
