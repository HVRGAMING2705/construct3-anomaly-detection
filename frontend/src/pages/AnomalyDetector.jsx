'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, CheckCircle, AlertCircle, RotateCcw, Download, Eye, Zap, Trash2, Loader2 } from 'lucide-react'
import { useRuns } from '../hooks/useApi'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp']

function drawHeatmap(ctx, heatmapData, width, height) {
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  
  for (let i = 0; i < heatmapData.length; i++) {
    const row = heatmapData[i]
    for (let j = 0; j < row.length; j++) {
      const idx = (i * width + j) * 4
      const val = row[j]
      if (val > 0) {
        const intensity = Math.min(val / 128, 1)
        data[idx] = Math.round(255 * intensity)
        data[idx + 1] = Math.round(50 * (1 - intensity))
        data[idx + 2] = 0
        data[idx + 3] = Math.round(200 * intensity)
      } else {
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
        data[idx + 3] = 0
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

function drawImageOnCanvas(ctx, imageSrc, width, height) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = imageSrc
  })
}

function GaugeChart({ value, max = 1, label, color = 'primary', size = 160 }) {
  const percentage = Math.min(value / max, 1)
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percentage)
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color === 'anomaly' ? '#ef4444' : color === 'normal' ? '#22c55e' : '#0ea5e9'}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="mt-4 text-center">
        <p className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
          {(value * 100).toFixed(1)}%
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function ImageViewer({ original, heatmap, onDownload }) {
  const canvasRef = useRef(null)
  const [showMode, setShowMode] = useState('original')
  
  useEffect(() => {
    if (canvasRef.current && (original || heatmap)) {
      const ctx = canvasRef.current.getContext('2d')
      const displaySize = 280
      canvasRef.current.width = displaySize
      canvasRef.current.height = displaySize
      
      ctx.clearRect(0, 0, displaySize, displaySize)
      
      if (showMode === 'original' && original) {
        drawImageOnCanvas(ctx, original, displaySize, displaySize)
      } else if (showMode === 'heatmap' && heatmap && heatmap.length > 0) {
        const displayHeatmap = heatmap.slice(0, 28).map(row => row.slice(0, 28))
        drawHeatmap(ctx, displayHeatmap, displaySize, displaySize)
      } else if (showMode === 'overlay' && original && heatmap && heatmap.length > 0) {
        drawImageOnCanvas(ctx, original, displaySize, displaySize).then(() => {
          const displayHeatmap = heatmap.slice(0, 28).map(row => row.slice(0, 28))
          const imageData = ctx.createImageData(displaySize, displaySize)
          const data = imageData.data
          
          for (let i = 0; i < displayHeatmap.length; i++) {
            const row = displayHeatmap[i]
            for (let j = 0; j < row.length; j++) {
              const idx = (i * displaySize + j) * 4
              const val = row[j]
              if (val > 0) {
                const intensity = Math.min(val / 128, 1)
                data[idx] = Math.round(255 * intensity)
                data[idx + 1] = Math.round(50 * (1 - intensity))
                data[idx + 2] = 0
                data[idx + 3] = Math.round(180 * intensity)
              }
            }
          }
          ctx.putImageData(imageData, 0, 0)
        })
      }
    }
  }, [original, heatmap, showMode])
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        {['original', 'overlay', 'heatmap'].map(mode => (
          <button
            key={mode}
            onClick={() => setShowMode(mode)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              showMode === mode
                ? 'bg-primary-500 text-white'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            )}
          >
            {mode === 'original' && 'Original'}
            {mode === 'overlay' && 'Overlay'}
            {mode === 'heatmap' && 'Heatmap'}
          </button>
        ))}
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="mx-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {showMode !== 'original' && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
            {showMode === 'heatmap' ? 'Error Heatmap' : 'Heatmap Overlay'}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-center gap-4">
        {original && (
          <button
            onClick={() => onDownload(original, 'original.png')}
            className="btn-ghost text-sm"
          >
            <Download className="w-4 h-4" />
            Download Original
          </button>
        )}
      </div>
    </div>
  )
}

function HeatmapTable({ heatmap }) {
  const displayData = heatmap.slice(0, 14).map(row => row.slice(0, 14))
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="text-left pb-2">Row</th>
            {Array.from({ length: displayData[0]?.length || 0 }).map((_, i) => (
              <th key={i} className="text-right pb-2 pr-2">{i}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
          {displayData.map((row, i) => (
            <tr key={i} className="hover:bg-white/50 dark:hover:bg-slate-800/50">
              <td className="py-1 pr-2 text-slate-600 dark:text-slate-400">{i}</td>
              {row.map((val, j) => (
                <td key={j} className="py-1 pr-2 text-right">
                  <span className={clsx(
                    'font-medium',
                    val > 100 ? 'text-red-600 dark:text-red-400' :
                    val > 50 ? 'text-orange-600 dark:text-orange-400' :
                    val > 10 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-slate-500 dark:text-slate-400'
                  )}>
                    {val}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Showing first 14×14 pixels. Values represent pixel-wise absolute difference × 255.
      </p>
    </div>
  )
}

export default function AnomalyDetector() {
  const { runs, loading: runsLoading } = useRuns()
  const [selectedRun, setSelectedRun] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  
  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0].run)
    }
  }, [runs, selectedRun])
  
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }
  
  const handleFile = (newFile) => {
    if (!ACCEPTED_TYPES.includes(newFile.type)) {
      setError('Please select a valid image file (PNG, JPG, GIF, WebP, BMP)')
      return
    }
    if (newFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB')
      return
    }
    
    setFile(newFile)
    setError(null)
    setResult(null)
    
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target.result)
    reader.readAsDataURL(newFile)
  }
  
  const handleRemoveFile = () => {
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleDetect = async () => {
    if (!file || !selectedRun) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiEndpoints.detect(selectedRun, file)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Detection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDownload = (dataUrl, filename) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    link.click()
  }
  
  if (runsLoading) {
    return (
      <div className="page-container">
        <div className="glass-card p-8">
          <Skeleton variant="title" className="mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton variant="card" className="h-64" />
            <Skeleton variant="card" className="h-64 md:col-span-2" />
          </div>
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
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Anomaly Detector</h1>
        <p className="text-slate-500 dark:text-slate-400">Upload images to detect anomalies using trained autoencoder models</p>
      </motion.div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div 
          className="lg:col-span-1 space-y-6"
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Model Selection</h2>
            
            <UI.Select
              label="Select Model"
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              options={runs.map(r => ({ value: r.run, label: `${r.run} (${r.model.toUpperCase()}, ROC-AUC: ${r.roc_auc?.toFixed(3) || 'N/A'})` }))}
              disabled={runs.length === 0}
            />
            
            {runs.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                No trained models available. Train a model first in <span className="text-primary-600 dark:text-primary-400 font-medium">Train Studio</span>.
              </p>
            )}
            
            {selectedRun && runs.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Model Info</h4>
                <div className="space-y-1 text-sm">
                  {(() => {
                    const run = runs.find(r => r.run === selectedRun)
                    if (!run) return null
                    return (
                      <>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Architecture</span><span className="font-mono">{run.model?.toUpperCase()}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Epochs</span><span className="font-mono">{run.epochs}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">ROC-AUC</span><span className="font-mono text-green-600 dark:text-green-400">{run.roc_auc?.toFixed(3)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">F1 Score</span><span className="font-mono">{run.f1?.toFixed(3)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Params</span><span className="font-mono">{run.params?.toLocaleString()}</span></div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </UI.Card>
          
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">How It Works</h2>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Autoencoder Reconstruction</p>
                  <p>The model learns to compress and reconstruct normal images (sneakers). Anomalies (sandals) reconstruct poorly.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">MSE Threshold</p>
                  <p>Mean Squared Error between input and reconstruction. High MSE = anomaly. Threshold set at 95th percentile of normal data.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Visual Heatmap</p>
                  <p>Red regions show where reconstruction differs most from input, highlighting anomalous features.</p>
                </div>
              </div>
            </div>
          </UI.Card>
        </motion.div>
        
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Upload Image</h2>
            
            <div
              className={clsx(
                'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200',
                dragActive 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary-400',
                file && 'border-transparent bg-white/50 dark:bg-slate-800/50'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />
              
              {file && previewUrl ? (
                <div className="relative max-w-xs mx-auto">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-auto rounded-xl shadow-lg"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile() }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {dragActive ? 'Drop image here' : 'Click or drag to upload'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    PNG, JPG, GIF, WebP, BMP up to 5MB
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Images will be resized to 28×28 grayscale for detection
                  </p>
                </>
              )}
            </div>
            
            {error && (
              <motion.div 
                className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
            
            <div className="mt-6 flex items-center gap-4">
              <UI.Button
                onClick={handleDetect}
                disabled={!file || !selectedRun || loading}
                loading={loading}
                className="flex-1"
                size="lg"
              >
                <Zap className="w-5 h-5" />
                Detect Anomaly
              </UI.Button>
              
              {file && !loading && (
                <UI.Button
                  variant="ghost"
                  onClick={handleRemoveFile}
                  className="flex-1"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear
                </UI.Button>
              )}
            </div>
          </UI.Card>
          
          <AnimatePresence>
            {result && (
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <UI.Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Detection Result</h2>
                    <UI.Badge 
                      variant={result.is_anomaly ? 'anomaly' : 'normal'} 
                      className="text-lg px-4 py-2"
                    >
                      {result.verdict}
                    </UI.Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <UI.StatCard 
                      label="MSE Error" 
                      value={result.mse.toFixed(5)} 
                      icon={<AlertCircle className="w-5 h-5" />}
                      trend={result.is_anomaly ? 'up' : 'down'}
                    />
                    <UI.StatCard 
                      label="Threshold" 
                      value={result.threshold.toFixed(5)} 
                      icon={<RotateCcw className="w-5 h-5" />}
                    />
                    <UI.StatCard 
                      label="Ratio" 
                      value={`${(result.mse / result.threshold).toFixed(2)}x`} 
                      icon={<Zap className="w-5 h-5" />}
                      trend={result.is_anomaly ? 'up' : 'neutral'}
                    />
                    <UI.StatCard 
                      label="Confidence" 
                      value={`${Math.min(Math.abs(result.mse - result.threshold) / result.threshold * 100, 100).toFixed(0)}%`} 
                      icon={<CheckCircle className="w-5 h-5" />}
                    />
                  </div>
                  
                  <GaugeChart 
                    value={Math.min(result.mse / result.threshold, 2)} 
                    max={2}
                    label="Error vs Threshold"
                    color={result.is_anomaly ? 'anomaly' : 'normal'}
                    size={180}
                  />
                </UI.Card>
                
                <UI.Card className="p-6">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Visualization</h3>
                  
                  <ImageViewer
                    original={previewUrl}
                    heatmap={result.heatmap}
                    onDownload={handleDownload}
                  />
                </UI.Card>
                
                {result.heatmap && result.heatmap.length > 0 && (
                  <UI.Card className="p-6">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Error Heatmap Data</h3>
                    <HeatmapTable heatmap={result.heatmap} />
                  </UI.Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}