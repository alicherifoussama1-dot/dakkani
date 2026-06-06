'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Environment } from '@react-three/drei'
import * as THREE from 'three'

function GlowSphere({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current || !groupRef.current) return
    // Subtle auto-rotation
    meshRef.current.rotation.y += 0.004
    meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.25) * 0.12
    // Mouse tracking — smooth lerp toward cursor
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, mouse.current[0] * 0.4, 0.04
    )
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, -mouse.current[1] * 0.3, 0.04
    )
  })

  return (
    <group ref={groupRef}>
      <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.7}>
        <Sphere ref={meshRef} args={[1.35, 64, 64]}>
          <MeshDistortMaterial
            color="#4F46E5"
            distort={0.42}
            speed={2.2}
            roughness={0.08}
            metalness={0.65}
            emissive="#312E81"
            emissiveIntensity={0.25}
          />
        </Sphere>
      </Float>
    </group>
  )
}

function OrbitRing({ radius, thickness, speed, tiltX, tiltZ, color, opacity = 1 }: {
  radius: number; thickness: number; speed: number
  tiltX: number; tiltZ: number; color: string; opacity?: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.z += speed
  })
  return (
    <mesh ref={ref} rotation={[tiltX, 0, tiltZ]}>
      <torusGeometry args={[radius, thickness, 16, 100]} />
      <meshStandardMaterial
        color={color} roughness={0.1} metalness={0.85}
        emissive={color} emissiveIntensity={0.15}
        transparent opacity={opacity}
      />
    </mesh>
  )
}

function Particles() {
  const count = 80
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 3.2 + Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  const ref = useRef<THREE.Points>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.03
  })

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#A5B4FC" size={0.045} sizeAttenuation transparent opacity={0.6} />
    </points>
  )
}

function Scene({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]}  intensity={1.2} />
      <pointLight       position={[-4,-3,-4]}  intensity={0.7} color="#818CF8" />
      <pointLight       position={[3, 3, 2]}   intensity={0.5} color="#C7D2FE" />
      <pointLight       position={[0, -4, 0]}  intensity={0.4} color="#4F46E5" />

      <GlowSphere mouse={mouse} />
      <OrbitRing radius={2.05} thickness={0.055} speed={0.006}  tiltX={Math.PI/3}   tiltZ={0.2}  color="#818CF8" />
      <OrbitRing radius={2.7}  thickness={0.035} speed={-0.004} tiltX={Math.PI/5}   tiltZ={-0.3} color="#C7D2FE" opacity={0.6} />
      <OrbitRing radius={3.2}  thickness={0.022} speed={0.003}  tiltX={Math.PI/2.2} tiltZ={0.5}  color="#E0E7FF" opacity={0.3} />
      <Particles />

      <Environment preset="city" />
    </>
  )
}

export default function Hero3D() {
  const mouse = useRef<[number, number]>([0, 0])

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouse.current = [
      ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      ((e.clientY - rect.top)  / rect.height - 0.5) * 2,
    ]
  }
  const onMouseLeave = () => { mouse.current = [0, 0] }

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.5], fov: 42 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  )
}
