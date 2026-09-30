'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Download, RotateCcw, Zap, Trash, Loader2, Image, Sparkles, Eye, Maximize, Minimize } from 'lucide-react'
import { useRuns } from '../hooks/useApi'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp']

function drawImageOnCanvas(ctx, imageData, width, height) {
  const imageDataObj = ctx.createImageData(width, height)
  const pixels = imageDataObj.data
  
  for (let i = 0; i < imageData.length; i++) {
    const val = Math.round(imageData[i] * 255)
    pixels[i * 4] = val
    pixels[i * 4 + 1] = val
    pixels[i * 4 + 2] = val
    pixels[i * 4 + 3] = 255
  }
  ctx.putImageData(imageDataObj, 0, 0)
}

function calculatePSNR(original, denoised) {
  if (!original || !denoised || original.length !== denoised.length) return 0
  let mse = 0
  for (let i = 0; i < original.length; i++) {
    const diff = original[i] - denoised[i]
    mse += diff * diff
  }
  mse /= original.length
  if (mse === 0) return Infinity
  return 10 * Math.log10(1 / mse)
}

function ImageDisplay({ 
  title, 
  data, 
  originalData,
  displaySize = 280,
  onDownload,
  downloadName,
  showPSNR = false,
  psnrValue 
}) {
  const canvasRef = useRef(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  useEffect(() => {
    if (canvasRef.current && data) {
      const ctx = canvasRef.current.getContext('2d')
      canvasRef.current.width = displaySize
      canvasRef.current.height = displaySize
      drawImageOnCanvas(ctx, data, displaySize, displaySize)
    }
  }, [data, displaySize])
  
  return (
    <div className="relative group">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-slate-100">{title}</h4>
        {showPSNR && psnrValue !== undefined && psnrValue !== Infinity && (
          <UI.Badge variant="primary" className="text-xs">
            PSNR: {psnrValue.toFixed(2)} dB
          </UI.Badge>
        )}
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="mx-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {isExpanded && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
            <button 
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(downloadName) }}
          className="btn-ghost text-sm"
          disabled={!data}
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true) }}
          className="btn-ghost text-sm"
        >
          <Maximize2 className="w-4 h-4" />
          Expand
        </button>
      </div>
    </div>
  )
}

function ImageCanvas({ data, displaySize = 280 }) {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    if (canvasRef.current && data) {
      const ctx = canvasRef.current.getContext('2d')
      canvasRef.current.width = displaySize
      canvasRef.current.height = displaySize
      drawImageOnCanvas(ctx, data, displaySize, displaySize)
    }
  }, [data, displaySize])
  
  return (
    <canvas
      ref={canvasRef}
      className="mx-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}

function ComparisonView({ original, noisy, denoised, noiseStd }) {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('triplet')
  const displaySize = 280
  
  useEffect(() => {
    if (canvasRef.current && original && noisy && denoised) {
      const ctx = canvasRef.current.getContext('2d')
      
      if (mode === 'triplet') {
        canvasRef.current.width = displaySize * 3
        canvasRef.current.height = displaySize
        drawImageOnCanvas(ctx, original, displaySize, displaySize)
        drawImageOnCanvas(ctx, noisy, displaySize, displaySize)
        ctx.drawImage(canvasRef.current, displaySize, 0)
        drawImageOnCanvas(ctx, denoised, displaySize, displaySize)
        ctx.drawImage(canvasRef.current, displaySize * 2, 0)
        
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(displaySize, 0)
        ctx.lineTo(displaySize, displaySize)
        ctx.moveTo(displaySize * 2, 0)
        ctx.lineTo(displaySize * 2, displaySize)
        ctx.stroke()
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.font = '14px Inter'
        ctx.fillText('Original', 10, 20)
        ctx.fillText('Noisy (σ=' + noiseStd + ')', displaySize + 10, 20)
        ctx.fillText('Denoised', displaySize * 2 + 10, 20)
      } else if (mode === 'diff') {
        canvasRef.current.width = displaySize
        canvasRef.current.height = displaySize
        const imageData = ctx.createImageData(displaySize, displaySize)
        const pixels = imageData.data
        
        for (let i = 0; i < original.length; i++) {
          const diff = Math.abs(denoised[i] - original[i]) * 255
          const idx = i * 4
          pixels[idx] = Math.round(diff)
          pixels[idx + 1] = 0
          pixels[idx + 2] = Math.round(255 - diff)
          pixels[idx + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)
      } else if (mode === 'overlay') {
        canvasRef.current.width = displaySize
        canvasRef.current.height = displaySize
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = displaySize
        tempCanvas.height = displaySize
        const tempCtx = tempCanvas.getContext('2d')
        drawImageOnCanvas(tempCtx, original, displaySize, displaySize)
        drawImageOnCanvas(ctx, denoised, displaySize, displaySize)
        ctx.globalAlpha = 0.5
        ctx.drawImage(tempCanvas, 0, 0)
        ctx.globalAlpha = 1
      }
    }
  }, [original, noisy, denoised, mode, noiseStd, displaySize])
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        {['triplet', 'overlay', 'diff'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              mode === m
                ? 'bg-primary-500 text-white'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            )}
          >
            {m === 'triplet' && 'Triplet'}
            {m === 'overlay' && 'Overlay'}
            {m === 'diff' && 'Difference'}
          </button>
        ))}
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="mx-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900"
        />
        {mode === 'triplet' && (
          <div className="absolute top-2 left-2 right-2 flex justify-between px-2 pointer-events-none">
            <span className="text-xs font-medium bg-black/50 text-white px-2 py-1 rounded">Original</span>
            <span className="text-xs font-medium bg-black/50 text-white px-2 py-1 rounded">Noisy</span>
            <span className="text-xs font-medium bg-black/50 text-white px-2 py-1 rounded">Denoised</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Denoiser() {
  const { runs, loading: runsLoading } = useRuns()
  const [selectedRun, setSelectedRun] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [noiseStd, setNoiseStd] = useState(0.3)
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
  
  const handleDenoise = async () => {
    if (!file || !selectedRun) return
    
    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('run', selectedRun)
      formData.append('noise_std', noiseStd.toString())
      formData.append('file', file)
      
      const response = await apiEndpoints.denoise(selectedRun, noiseStd, file)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Denoising failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDownload = (data, filename) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const displaySize = 280
    canvas.width = displaySize
    canvas.height = displaySize
    drawImageOnCanvas(ctx, data, displaySize, displaySize)
    
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
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
  
  const psnr = result ? calculatePSNR(result.original, result.denoised) : null
  
  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Denoiser</h1>
        <p className="text-slate-500 dark:text-slate-400">Remove Gaussian noise from images using trained denoising autoencoders</p>
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
              label="Model"
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              options={runs.map(r => ({ value: r.run, label: `${r.run} (${r.model.toUpperCase()})` }))}
              disabled={runs.length === 0}
            />
            
            {runs.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                No trained models available. Train a denoising model in <span className="text-primary-600 dark:text-primary-400 font-medium">Train Studio</span>.
              </p>
            )}
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Noise Std: <span className="font-mono text-primary-600 dark:text-primary-400 ml-2">{noiseStd.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={noiseStd}
                onChange={(e) => setNoiseStd(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none accent-primary-500 cursor-pointer"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Higher values = more corruption. Model trained with σ=0.3
              </p>
            </div>
            
            {error && (
              <motion.div 
                className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </UI.Card>
          
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
                    Images will be resized to 28×28 grayscale
                  </p>
                </>
              )}
            </div>
            
            <div className="mt-6 flex items-center gap-4">
              <UI.Button
                onClick={handleDenoise}
                disabled={!file || !selectedRun || loading}
                loading={loading}
                className="flex-1"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                Denoise
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
          
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">How It Works</h2>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Denoising Autoencoder</p>
                  <p>Model learns to reconstruct clean images from corrupted inputs by minimizing MSE between output and clean target.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Gaussian Corruption</p>
                  <p>Input images are corrupted with N(0, σ²) noise. σ controls noise intensity (trained with σ=0.3).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Image className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">PSNR Metric</p>
                  <p>Peak Signal-to-Noise Ratio measures reconstruction quality. Higher = better denoising.</p>
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
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Denoising Result</h2>
                    <div className="flex items-center gap-3">
                      <UI.Badge variant="primary" className="text-sm">
                        Noise σ: {noiseStd.toFixed(2)}
                      </UI.Badge>
                      {psnr !== null && psnr !== Infinity && (
                        <UI.Badge variant="success" className="text-sm">
                          PSNR: {psnr.toFixed(2)} dB
                        </UI.Badge>
                      )}
                      {psnr === Infinity && (
                        <UI.Badge variant="success" className="text-sm">
                          Perfect reconstruction
                        </UI.Badge>
                      )}
                    </div>
                  </div>
                  
                  <ComparisonView
                    original={result.original}
                    noisy={result.noisy}
                    denoised={result.denoised}
                    noiseStd={noiseStd}
                  />
                </UI.Card>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <ImageDisplay
                    title="Original (Clean)"
                    data={result.original}
                    originalData={result.original}
                    onDownload={handleDownload}
                    downloadName="original.png"
                  />
                  <ImageDisplay
                    title="Noisy Input"
                    data={result.noisy}
                    originalData={result.original}
                    onDownload={handleDownload}
                    downloadName="noisy.png"
                    showPSNR
                    psnrValue={calculatePSNR(result.original, result.noisy)}
                  />
                  <ImageDisplay
                    title="Denoised Output"
                    data={result.denoised}
                    originalData={result.original}
                    onDownload={handleDownload}
                    downloadName="denoised.png"
                    showPSNR
                    psnrValue={psnr}
                  />
                </div>
                
                {result.original && result.noisy && result.denoised && (
                  <UI.Card className="p-6">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Pixel Analysis</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Noise Statistics</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Applied Noise σ</span><span className="font-mono">{noiseStd.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Observed Noise σ</span><span className="font-mono">{Math.sqrt(result.noisy.reduce((sum, v, i) => sum + Math.pow(v - result.original[i], 2), 0) / result.original.length).toFixed(4)}</span></div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Reconstruction Quality</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">MSE (Original vs Denoised)</span><span className="font-mono">{(result.original.reduce((sum, v, i) => sum + Math.pow(v - result.denoised[i], 2), 0) / result.original.length).toFixed(6)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">PSNR</span><span className="font-mono">{psnr === Infinity ? '∞' : psnr.toFixed(2) + ' dB'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">SSIM (approx)</span><span className="font-mono">{(1 - result.original.reduce((sum, v, i) => sum + Math.abs(v - result.denoised[i]), 0) / result.original.length).toFixed(4)}</span></div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Model Info</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Run</span><span className="font-mono">{selectedRun}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Architecture</span><span className="font-mono">{runs.find(r => r.run === selectedRun)?.model?.toUpperCase() || 'Denoising Conv'}</span></div>
                        </div>
                      </div>
                    </div>
                  </UI.Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          {!result && !loading && (
            <UI.Card className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">No result yet</h3>
              <p className="text-slate-500 dark:text-slate-400">Upload an image and click Denoise to see results</p>
            </UI.Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}