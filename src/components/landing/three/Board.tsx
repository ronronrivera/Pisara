import { RoundedBox } from '@react-three/drei'
import { useMemo, type Ref } from 'react'
import { Color, type Mesh } from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Dark slate surface, a faint grid, a slight vignette and a soft chalk edge.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLine;
  uniform vec2 uSize;
  uniform float uCell;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * uSize / uCell;
    vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    vec3 col = mix(uColor, uLine, line * 0.6);

    vec2 e = min(vUv, 1.0 - vUv) * uSize;
    float edge = min(e.x, e.y);
    col *= mix(0.8, 1.0, smoothstep(0.0, 1.2, edge));
    col = mix(col, uLine * 1.8, 1.0 - smoothstep(0.0, 0.035, edge));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

interface BoardProps {
  width: number
  height: number
  cell?: number
  /** The drawing surface, for raycasting */
  ref?: Ref<Mesh>
}

export default function Board({ width, height, cell = 0.5, ref }: BoardProps) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color('#132520') },
      uLine: { value: new Color('#2c4a40') },
      uSize: { value: [width, height] },
      uCell: { value: cell },
    }),
    [width, height, cell],
  )

  return (
    <group>
      <RoundedBox args={[width + 0.24, height + 0.24, 0.14]} radius={0.06} position={[0, 0, -0.08]}>
        <meshStandardMaterial color="#0a1310" roughness={0.9} />
      </RoundedBox>
      <mesh ref={ref}>
        <planeGeometry args={[width, height]} />
        <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
      </mesh>
    </group>
  )
}
