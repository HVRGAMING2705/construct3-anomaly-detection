'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const CLASS_NAMES = [
  'T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
  'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'
]

const CLASS_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

function Points({ positions, colors, labels, isAnomaly, onHover, onClick, highlightedIndex }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.Float32BufferAttribute(
      positions.map((_, i) => isAnomaly[i] ? 6 : 3), 1
    ))
    return geo
  }, [positions, colors, isAnomaly])

  const material = useMemo(() => 
    new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    }), [])

  const { camera, raycaster, mouse, scene } = useThree()
  const pointsRef = useRef()
  const [hovered, setHovered] = useState(null)

  useFrame(() => {
    if (!pointsRef.current) return
    
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(pointsRef.current)
    
    if (intersects.length > 0) {
      const index = intersects[0].index
      if (index !== hovered) {
        setHovered(index)
        onHover?.(index, labels[index], isAnomaly[index])
      }
    } else if (hovered !== null) {
      setHovered(null)
      onHover?.(null, null, null)
    }
  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onClick={(e) => {
        if (e.object.geometry) {
          const index = e.index
          onClick?.(index, labels[index], isAnomaly[index])
        }
      }}
    />
  )
}

function AxesHelper3D({ size = 100 }) {
  const axes = useMemo(() => {
    const group = new THREE.Group()
    
    const createAxis = (color, axis) => {
      const geometry = new THREE.BufferGeometry()
      const vertices = new Float32Array([0, 0, 0, 
        axis === 'x' ? size : 0,
        axis === 'y' ? size : 0,
        axis === 'z' ? size : 0
      ])
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
      return new THREE.Line(geometry, material)
    }

    group.add(createAxis(0xef4444, 'x'))
    group.add(createAxis(0x22c55e, 'y'))
    group.add(createAxis(0x3b82f6, 'z'))

    return group
  }, [size])

  return <primitive object={axes} />
}

function GridHelper3D({ size = 200, divisions = 20 }) {
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(size, divisions, 0x334155, 0x1e293b)
    helper.material.transparent = true
    helper.material.opacity = 0.2
    return helper
  }, [size, divisions])

  return <primitive object={grid} />
}

export default function LatentExplorer3D({ 
  data, 
  selectedRun, 
  onPointSelect,
  projection = 'tsne' 
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const { positions, colors, labels, isAnomaly } = useMemo(() => {
    if (!data || !data[projection]) return { positions: [], colors: [], labels: [], isAnomaly: [] }

    const coords = data[projection]
    const pos = []
    const col = []
    const lbl = []
    const anom = []

    coords.forEach(([x, y], i) => {
      pos.push(x * 50, y * 50, (Math.random() - 0.5) * 20)
      
      const classIdx = labels[i]
      const color = new THREE.Color(CLASS_COLORS[classIdx] || '#64748b')
      col.push(color.r, color.g, color.b)
      
      lbl.push(CLASS_NAMES[classIdx] || `Class ${classIdx}`)
      anom.push(isAnomaly[i])
    })

    return { positions: pos, colors: col, labels: lbl, isAnomaly: anom }
  }, [data, projection, labels])

  const handleHover = (index, label, anomaly) => {
    setHoveredPoint(index !== null ? { index, label, anomaly } : null)
  }

  const handleClick = (index, label, anomaly) => {
    onPointSelect?.(index, label, anomaly)
  }

  return (
    <div className="relative w-full h-[600px] rounded-xl glass overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 200], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <color attach="background" args={[0x000000, 0]} />
        <fog attach="fog" args={[0x000000, 100, 400]} />
        
        <GridHelper3D size={250} divisions={25} />
        <AxesHelper3D size={120} />
        
        <Points
          positions={positions}
          colors={colors}
          labels={labels}
          isAnomaly={isAnomaly}
          onHover={handleHover}
          onClick={handleClick}
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[100, 100, 100]} intensity={0.8} />
        <pointLight position={[-50, 50, 50]} intensity={0.3} color="#0ea5e9" />
        <pointLight position={[50, -50, -50]} intensity={0.3} color="#d946ef" />
      </Canvas>

      {hoveredPoint && (
        <motion.div
          className="absolute top-4 right-4 glass-card p-4 min-w-[200px] z-10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx('w-3 h-3 rounded-full', hoveredPoint.anomaly ? 'bg-red-500 animate-pulse' : 'bg-green-500')} />
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {hoveredPoint.anomaly ? 'ANOMALY' : 'NORMAL'}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{hoveredPoint.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Index: {hoveredPoint.index}</p>
        </motion.div>
      )}

      <div className="absolute bottom-4 left-4 glass-panel p-3 z-10">
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          {CLASS_NAMES.map((name, i) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[i] }} />
              {name === 'Sandal' ? <span className="font-bold text-accent-500">{name}</span> : name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

import { clsx } from 'clsx'
import { motion } from 'framer-motion'