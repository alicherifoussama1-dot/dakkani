'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Environment, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'

function GlowOrb() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.15
    meshRef.current.rotation.y += 0.005
  })

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
      <Sphere ref={meshRef} args={[1.35, 64, 64]}>
        <MeshDistortMaterial
          color="#4F46E5"
          attach="material"
          distort={0.45}
          speed={2.5}
          roughness={0.1}
          metalness={0.6}
          emissive="#312E81"
          emissiveIntensity={0.3}
        />
      </Sphere>
    </Float>
  )
}

function Ring() {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ringRef.current) return
    ringRef.current.rotation.x = Math.PI / 3 + Math.sin(clock.elapsedTime * 0.4) * 0.1
    ringRef.current.rotation.z += 0.006
  })

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[2.0, 0.06, 16, 100]} />
      <meshStandardMaterial
        color="#818CF8"
        roughness={0.1}
        metalness={0.9}
        emissive="#4F46E5"
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}

function Ring2() {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ringRef.current) return
    ringRef.current.rotation.x = Math.PI / 5 + Math.cos(clock.elapsedTime * 0.3) * 0.12
    ringRef.current.rotation.z -= 0.004
  })

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[2.6, 0.04, 16, 100]} />
      <meshStandardMaterial
        color="#C7D2FE"
        roughness={0.2}
        metalness={0.7}
        transparent
        opacity={0.5}
      />
    </mesh>
  )
}

function ParticleDots() {
  const count = 60
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 3.5 + Math.random() * 1.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
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

  const groupRef = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = clock.elapsedTime * 0.04
  })

  return (
    <points ref={groupRef} geometry={geo}>
      <pointsMaterial color="#A5B4FC" size={0.04} sizeAttenuation transparent opacity={0.7} />
    </points>
  )
}

export default function Hero3D() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-4, -4, -4]} intensity={0.6} color="#818CF8" />
      <pointLight position={[4, 2, 2]} intensity={0.5} color="#C7D2FE" />

      <GlowOrb />
      <Ring />
      <Ring2 />
      <ParticleDots />

      <Environment preset="city" />
    </Canvas>
  )
}
