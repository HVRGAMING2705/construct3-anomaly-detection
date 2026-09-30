'use client'

import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const NODE_COUNT = 150
const CONNECTION_DISTANCE = 80
const MOUSE_INFLUENCE = 100

function NeuralNetwork() {
  const nodesRef = useRef([])
  const linesRef = useRef()
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const { size, viewport } = useThree()

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(NODE_COUNT * 3)
    const velocities = new Float32Array(NODE_COUNT * 3)
    const colors = new Float32Array(NODE_COUNT * 3)
    const sizes = new Float32Array(NODE_COUNT)

    for (let i = 0; i < NODE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 50 + Math.random() * 100

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02

      const color = new THREE.Color()
      color.setHSL(0.55 + Math.random() * 0.15, 0.8, 0.6)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = 2 + Math.random() * 3
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return geo
  }, [])

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const maxLines = NODE_COUNT * 6
    const positions = new Float32Array(maxLines * 3 * 2)
    const colors = new Float32Array(maxLines * 3 * 2)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const material = useMemo(() => 
    new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    }), [])

  const lineMaterial = useMemo(() => 
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    }), [])

  useFrame((state, delta) => {
    const positions = geometry.attributes.position.array
    const velocities = geometry.attributes.velocity.array

    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 60
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60

      const dist = Math.sqrt(
        positions[i * 3] ** 2 + 
        positions[i * 3 + 1] ** 2 + 
        positions[i * 3 + 2] ** 2
      )

      if (dist > 150) {
        const factor = 150 / dist
        positions[i * 3] *= factor
        positions[i * 3 + 1] *= factor
        positions[i * 3 + 2] *= factor
        velocities[i * 3] *= -0.5
        velocities[i * 3 + 1] *= -0.5
        velocities[i * 3 + 2] *= -0.5
      }

      const mouse3D = new THREE.Vector3(
        mouseRef.current.x * 150,
        -mouseRef.current.y * 150,
        0
      )

      const nodePos = new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      )

      const toMouse = new THREE.Vector3().subVectors(mouse3D, nodePos)
      const mouseDist = toMouse.length()

      if (mouseDist < MOUSE_INFLUENCE && mouseDist > 0) {
        const force = (1 - mouseDist / MOUSE_INFLUENCE) * 0.5
        toMouse.normalize()
        velocities[i * 3] += toMouse.x * force * delta * 60
        velocities[i * 3 + 1] += toMouse.y * force * delta * 60
        velocities[i * 3 + 2] += toMouse.z * force * delta * 60
      }
    }

    geometry.attributes.position.needsUpdate = true

    const linePositions = lineGeometry.attributes.position.array
    const lineColors = lineGeometry.attributes.color.array
    let lineCount = 0

    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < CONNECTION_DISTANCE) {
          const alpha = 1 - dist / CONNECTION_DISTANCE
          
          linePositions[lineCount * 6] = positions[i * 3]
          linePositions[lineCount * 6 + 1] = positions[i * 3 + 1]
          linePositions[lineCount * 6 + 2] = positions[i * 3 + 2]
          
          linePositions[lineCount * 6 + 3] = positions[j * 3]
          linePositions[lineCount * 6 + 4] = positions[j * 3 + 1]
          linePositions[lineCount * 6 + 5] = positions[j * 3 + 2]

          const color = new THREE.Color()
          color.setHSL(0.55, 0.8, 0.6)
          
          lineColors[lineCount * 6] = color.r
          lineColors[lineCount * 6 + 1] = color.g
          lineColors[lineCount * 6 + 2] = color.b * alpha
          lineColors[lineCount * 6 + 3] = color.r
          lineColors[lineCount * 6 + 4] = color.g
          lineColors[lineCount * 6 + 5] = color.b * alpha

          lineCount++
        }
      }
    }

    lineGeometry.attributes.position.needsUpdate = true
    lineGeometry.attributes.color.needsUpdate = true
    lineGeometry.setDrawRange(0, lineCount * 2)

    state.camera.position.z = 300
    state.camera.rotation.y += delta * 0.02
  })

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event
    const rect = viewport.current?.getBoundingClientRect()
    if (!rect) return
    
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
  }

  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove)
      return () => canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [viewport])

  return (
    <>
      <points geometry={geometry} material={material} />
      <lineSegments geometry={lineGeometry} material={lineMaterial} />
    </>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 300], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <color attach="background" args={[0x000000, 0]} />
        <NeuralNetwork />
      </Canvas>
    </div>
  )
}