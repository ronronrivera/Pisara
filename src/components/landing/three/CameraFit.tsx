import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { MathUtils, type PerspectiveCamera } from 'three'

/** Moves the camera back until a `width × height` area fits the canvas at any aspect ratio. */
export default function CameraFit({ width, height }: { width: number; height: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)

  useEffect(() => {
    const t = Math.tan(MathUtils.degToRad(camera.fov / 2))
    const aspect = size.width / size.height
    // oxlint-disable-next-line react/immutability -- R3F cameras are meant to be mutated
    camera.position.z = Math.max(height / 2 / t, width / 2 / (t * aspect))
    camera.updateProjectionMatrix()
  }, [camera, size, width, height])

  return null
}
