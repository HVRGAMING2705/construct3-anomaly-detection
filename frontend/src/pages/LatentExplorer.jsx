'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Grid,
  Layers,
  Download,
  Eye,
  HelpCircle,
  BarChart2
} from 'lucide-react'
import { useRuns, useLatent } from '../hooks/useApi'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'

const CANVAS_SIZE = 500
const POINT_RADIUS = 4

function drawDigit(ctx, data, x, y, size = 28) {
  const imageData = ctx.createImageData(size, size)
  const pixels = imageData.data
  for (let i = 0; i < data.length; i++) {
    const val = Math.round(data[i] * 255)
    pixels[i * 4] = val
    pixels[i * 4 + 1] = val
    pixels[i * 4 + 2] = val
    pixels[i * 4 + 3] = 255
  }
  ctx.putImageData(imageData, x, y)
}

function LatentCanvas({ 
  data, 
  method, 
  selectedIndex, 
  hoveredIndex,
  onPointClick,
  onPointHover,
  scale,
  offset,
  canvasRef 
}) {
  const ctxRef = useRef(null)
  
  useEffect(() => {
    if (canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d')
    }
  }, [canvasRef])
  
  useEffect(() => {
    if (!ctxRef.current || !data) return
    
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    const coords = method === 'pca' ? data.pca : data.tsne
    const labels = data.labels
    const isAnomaly = data.is_anomaly
    
    if (!coords || coords.length === 0) return
    
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.save()
    ctx.translate(CANVAS_SIZE / 2 + offset.x, CANVAS_SIZE / 2 + offset.y)
    ctx.scale(scale, scale)
    
    const xs = coords.map(c => c[0])
    const ys = coords.map(c => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    
    const padding = 50
    const drawX = (x) => ((x - minX) / rangeX - 0.5) * (CANVAS_SIZE - 2 * padding) / scale
    const drawY = (y) => ((y - minY) / rangeY - 0.5) * (CANVAS_SIZE - 2 * padding) / scale
    
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1 / scale
    ctx.beginPath()
    for (let i = 0; i <= 10; i++) {
      const x = drawX(minX + (i / 10) * rangeX)
      ctx.moveTo(x, drawY(minY))
      ctx.lineTo(x, drawY(maxY))
    }
    for (let i = 0; i <= 10; i++) {
      const y = drawY(minY + (i / 10) * rangeY)
      ctx.moveTo(drawX(minX), y)
      ctx.lineTo(drawX(maxX), y)
    }
    ctx.stroke()
    
    coords.forEach((coord, i) => {
      const x = drawX(coord[0])
      const y = drawY(coord[1])
      const anomaly = isAnomaly[i]
      const label = labels[i]
      
      if (i === selectedIndex) {
        ctx.beginPath()
        ctx.arc(x, y, POINT_RADIUS * 2.5 / scale, 0, Math.PI * 2)
        ctx.strokeStyle = anomaly ? '#ef4444' : '#22c55e'
        ctx.lineWidth = 3 / scale
        ctx.stroke()
      }
      
      if (i === hoveredIndex) {
        ctx.beginPath()
        ctx.arc(x, y, POINT_RADIUS * 2 / scale, 0, Math.PI * 2)
        ctx.fillStyle = anomaly ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'
        ctx.fill()
      }
      
      ctx.beginPath()
      ctx.arc(x, y, POINT_RADIUS / scale, 0, Math.PI * 2)
      ctx.fillStyle = anomaly ? '#ef4444' : '#22c55e'
      ctx.globalAlpha = anomaly ? 0.8 : 0.6
      ctx.fill()
      ctx.globalAlpha = 1
    })
    
    ctx.restore()
  }, [data, method, selectedIndex, hoveredIndex, scale, offset, canvasRef])
  
  const handleMouseMove = (e) => {
    if (!data || !ctxRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left - CANVAS_SIZE / 2 - offset.x) / scale
    const mouseY = (e.clientY - rect.top - CANVAS_SIZE / 2 - offset.y) / scale
    
    const coords = method === 'pca' ? data.pca : data.tsne
    const xs = coords.map(c => c[0])
    const ys = coords.map(c => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    
    const padding = 50
    const dataX = (mouseX * scale / (CANVAS_SIZE - 2 * padding) + 0.5) * rangeX + minX
    const dataY = (mouseY * scale / (CANVAS_SIZE - 2 * padding) + 0.5) * rangeY + minY
    
    let closestIdx = -1
    let closestDist = Infinity
    
    coords.forEach((coord, i) => {
      const dx = coord[0] - dataX
      const dy = coord[1] - dataY
      const dist = dx * dx + dy * dy
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    })
    
    if (closestDist < (rangeX * 0.02) ** 2) {
      onPointHover(closestIdx)
    } else {
      onPointHover(-1)
    }
  }
  
  const handleClick = (e) => {
    if (!data) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left - CANVAS_SIZE / 2 - offset.x) / scale
    const mouseY = (e.clientY - rect.top - CANVAS_SIZE / 2 - offset.y) / scale
    
    const coords = method === 'pca' ? data.pca : data.tsne
    const xs = coords.map(c => c[0])
    const ys = coords.map(c => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    
    const padding = 50
    const dataX = (mouseX * scale / (CANVAS_SIZE - 2 * padding) + 0.5) * rangeX + minX
    const dataY = (mouseY * scale / (CANVAS_SIZE - 2 * padding) + 0.5) * rangeY + minY
    
    let closestIdx = -1
    let closestDist = Infinity
    
    coords.forEach((coord, i) => {
      const dx = coord[0] - dataX
      const dy = coord[1] - dataY
      const dist = dx * dx + dy * dy
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    })
    
    if (closestDist < (rangeX * 0.02) ** 2) {
      onPointClick(closestIdx)
    }
  }
  
  const handleWheel = (e) => {
    e.preventDefault()
    // Scale is handled by parent
  }
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-slate-200/50 dark:border-slate-700/50 rounded-xl bg-white dark:bg-slate-900 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => onPointHover(-1)}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-2 left-2 right-2 flex justify-between px-2 pointer-events-none">
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-xs bg-black/50 text-white px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Normal
          </span>
          <span className="flex items-center gap-1 text-xs bg-black/50 text-white px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Anomaly
          </span>
        </div>
        <span className="text-xs bg-black/50 text-white px-2 py-1 rounded">
          {method.toUpperCase()}
        </span>
      </div>
    </div>
  )
}

export default function LatentExplorer() {
  const { runs, loading: runsLoading } = useRuns()
  const [selectedRun, setSelectedRun] = useState('')
  const [method, setMethod] = useState('pca')
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hoveredIndex, setHoveredIndex] = useState(-1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  
  const { data: latentData, loading, error: latentError, refetch } = useLatent(selectedRun)
  
  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0].run)
    }
  }, [runs, selectedRun])
  
  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setSelectedIndex(-1)
    setHoveredIndex(-1)
  }, [selectedRun, method])
  
  const handleMouseDown = (e) => {
    setIsPanning(true)
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    e.preventDefault()
  }
  
  const handleMouseMove = (e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }
  
  const handleMouseUp = () => {
    setIsPanning(false)
  }
  
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.min(Math.max(prev * delta, 0.3), 5))
  }
  
  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }
  
  const selectedPoint = useMemo(() => {
    if (!latentData || selectedIndex < 0 || selectedIndex >= latentData.labels.length) return null
    return {
      label: latentData.labels[selectedIndex],
      isAnomaly: latentData.is_anomaly[selectedIndex],
      coords: method === 'pca' ? latentData.pca[selectedIndex] : latentData.tsne[selectedIndex],
      explainedVariance: method === 'pca' ? latentData.explained_variance : null
    }
  }, [latentData, selectedIndex, method])
  
  const hoveredPoint = useMemo(() => {
    if (!latentData || hoveredIndex < 0 || hoveredIndex >= latentData.labels.length) return null
    return {
      label: latentData.labels[hoveredIndex],
      isAnomaly: latentData.is_anomaly[hoveredIndex],
      coords: method === 'pca' ? latentData.pca[hoveredIndex] : latentData.tsne[hoveredIndex]
    }
  }, [latentData, hoveredIndex, method])
  
  if (runsLoading) {
    return (
      <div className="page-container">
        <div className="glass-card p-8">
          <Skeleton variant="title" className="mb-8" />
          <div className="flex gap-4 mb-6">
            <Skeleton variant="text" className="w-32 h-8" />
            <Skeleton variant="text" className="w-32 h-8" />
          </div>
          <Skeleton variant="card" className="h-96" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Latent Explorer</h1>
        <p className="text-slate-500 dark:text-slate-400">Visualize 2D projections of the bottleneck latent space using PCA or t-SNE</p>
      </motion.div>
      
      <div className="grid lg:grid-cols-4 gap-6">
        <motion.div 
          className="lg:col-span-1 space-y-6"
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Model Selection</h2>
            
            <UI.Select
              label="Model"
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              options={runs.map(r => ({ value: r.run, label: r.run }))}
              disabled={runs.length === 0}
            />
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Projection Method</label>
              <div className="space-y-2">
                {['pca', 'tsne'].map(m => (
                  <label key={m} className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border-2',
                    method === m 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}>
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                      className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                    />
                    <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{m}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                      {m === 'pca' ? 'Linear, fast' : 'Non-linear, preserves local structure'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Controls</h4>
              <div className="space-y-2">
                <UI.Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  onClick={resetView}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset View
                </UI.Button>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400 w-20">Zoom:</span>
                  <UI.Button variant="ghost" size="sm" onClick={() => setScale(s => Math.min(s * 1.2, 5))}><ZoomIn className="w-4 h-4" /></UI.Button>
                  <UI.Button variant="ghost" size="sm" onClick={() => setScale(s => Math.max(s / 1.2, 0.3))}><ZoomOut className="w-4 h-4" /></UI.Button>
                  <span className="font-mono text-slate-900 dark:text-slate-100 w-16">{Math.round(scale * 100)}%</span>
                </div>
              </div>
            </div>
            
            {latentError && (
              <motion.div 
                className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{latentError}</span>
                </div>
              </motion.div>
            )}
          </UI.Card>
          
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Statistics</h2>
            {latentData && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">Total Points</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{latentData.labels.length}</span>
                </div>
                <div className="flex justify-between text-sm p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">Normal (Sneakers)</span>
                  <span className="font-mono font-bold text-green-600 dark:text-green-400">{latentData.is_anomaly.filter(a => !a).length}</span>
                </div>
                <div className="flex justify-between text-sm p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">Anomalies (Sandals)</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">{latentData.is_anomaly.filter(a => a).length}</span>
                </div>
                {method === 'pca' && latentData.explained_variance && (
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                    <span className="text-slate-600 dark:text-slate-400">Explained Variance</span>
                    <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                      {(latentData.explained_variance[0] * 100).toFixed(1)}% / {(latentData.explained_variance[1] * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </UI.Card>
        </motion.div>
        
        <motion.div 
          className="lg:col-span-3 space-y-6"
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="relative" 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={(e) => handleMouseDown(e.touches[0])}
            onTouchMove={(e) => handleMouseMove(e.touches[0])}
            onTouchEnd={handleMouseUp}
          >
            {loading ? (
              <div className="h-[500px] flex items-center justify-center">
                <Skeleton variant="card" className="w-[500px] h-[500px]" />
              </div>
            ) : latentData ? (
              <LatentCanvas
                data={latentData}
                method={method}
                selectedIndex={selectedIndex}
                hoveredIndex={hoveredIndex}
                onPointClick={setSelectedIndex}
                onPointHover={setHoveredIndex}
                scale={scale}
                offset={offset}
                canvasRef={canvasRef}
              />
            ) : (
              <UI.Card className="h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <Layers className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">No data loaded</h3>
                  <p className="text-slate-500 dark:text-slate-400">Select a model to visualize latent space</p>
                </div>
              </UI.Card>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            {(selectedPoint || hoveredPoint) && (
              <motion.div
                key={selectedPoint ? `selected-${selectedIndex}` : `hovered-${hoveredIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <UI.Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
                      {selectedPoint ? 'Selected Point' : 'Hovered Point'}
                    </h2>
                    <UI.Badge 
                      variant={ (selectedPoint || hoveredPoint)?.isAnomaly ? 'anomaly' : 'normal' }
                      className="text-sm"
                    >
                      { (selectedPoint || hoveredPoint)?.isAnomaly ? 'ANOMALY (Sandal)' : 'NORMAL (Sneaker)' }
                    </UI.Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <UI.StatCard 
                      label="True Label" 
                      value={(selectedPoint || hoveredPoint)?.label.toString() || '—'}
                      icon={<Target className="w-5 h-5" />}
                    />
                    <UI.StatCard 
                      label={`${method.toUpperCase()} X`} 
                      value={(selectedPoint || hoveredPoint)?.coords?.[0]?.toFixed(3) || '—'}
                      icon={<Grid className="w-5 h-5" />}
                    />
                    <UI.StatCard 
                      label={`${method.toUpperCase()} Y`} 
                      value={(selectedPoint || hoveredPoint)?.coords?.[1]?.toFixed(3) || '—'}
                      icon={<Grid className="w-5 h-5" />}
                    />
                    {method === 'pca' && selectedPoint?.explainedVariance && (
                      <UI.StatCard 
                        label="Explained Var" 
                        value={`${(selectedPoint.explainedVariance[0] * 100).toFixed(1)}%`}
                        icon={<BarChart2 className="w-5 h-5" />}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <canvas 
                        id="digit-canvas" 
                        width={112} 
                        height={112} 
                        className="mx-auto border border-slate-200/50 dark:border-slate-700/50 rounded-xl bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </UI.Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const canvas = document.getElementById('digit-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            window.drawDigitOnCanvas = function(data) {
              if (!data || !data.length) return;
              const size = 28;
              const displaySize = 112;
              const scale = displaySize / size;
              ctx.clearRect(0, 0, displaySize, displaySize);
              ctx.imageSmoothingEnabled = false;
              for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                  const val = Math.round(data[y * size + x] * 255);
                  ctx.fillStyle = 'rgb(' + val + ',' + val + ',' + val + ')';
                  ctx.fillRect(x * scale, y * scale, scale, scale);
                }
              }
            };
          })();
        `
      }} />
    </div>
  )
}


