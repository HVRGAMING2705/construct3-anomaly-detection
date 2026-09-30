'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command, Home, Zap, Eye, Sliders, Cuboid, ZapOff, Database, BookOpen, X } from 'lucide-react'
import { clsx } from 'clsx'

const COMMANDS = [
  { id: 'home', label: 'Home', description: 'Dashboard overview', icon: Home, shortcut: 'H', path: '/' },
  { id: 'train', label: 'Train Studio', description: 'Train new models with live metrics', icon: Zap, shortcut: 'T', path: '/train' },
  { id: 'detect', label: 'Anomaly Detector', description: 'Detect anomalies in images', icon: Eye, shortcut: 'D', path: '/detect' },
  { id: 'threshold', label: 'Threshold Playground', description: 'Interactive threshold tuning', icon: Sliders, shortcut: 'P', path: '/threshold' },
  { id: 'latent', label: 'Latent Explorer', description: 'Latent space visualization', icon: Cuboid, shortcut: 'L', path: '/latent' },
  { id: 'denoise', label: 'Denoiser', description: 'Denoise images with autoencoder', icon: ZapOff, shortcut: 'N', path: '/denoise' },
  { id: 'experiments', label: 'Experiments', description: 'Manage and compare runs', icon: Database, shortcut: 'E', path: '/experiments' },
  { id: 'research', label: 'Research', description: 'Paper figures and results', icon: BookOpen, shortcut: 'R', path: '/research' },
]

export default function CommandPalette({ isOpen, onClose, navigate }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const itemsRef = useRef([])

  const filteredCommands = useMemo(() => {
    if (!query) return COMMANDS
    const q = query.toLowerCase()
    return COMMANDS.filter(cmd => 
      cmd.label.toLowerCase().includes(q) || 
      cmd.description.toLowerCase().includes(q) ||
      cmd.shortcut.toLowerCase().includes(q)
    )
  }, [query])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        navigate(filteredCommands[selectedIndex].path)
        onClose()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, navigate])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={clsx('w-full max-w-2xl glass-card rounded-2xl shadow-2xl overflow-hidden')}
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded text-slate-500">⌘K</kbd>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="w-full pl-12 pr-16 py-3 bg-white/5 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-hide">
            <AnimatePresence>
              {filteredCommands.map((cmd, index) => (
                <motion.div
                  key={cmd.id}
                  ref={(el) => { itemsRef.current[index] = el }}
                  className={clsx(
                    'flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors',
                    index === selectedIndex 
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' 
                      : 'hover:bg-white/5 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => {
                    navigate(cmd.path)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                    <cmd.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cmd.label}</p>
                    <p className="text-sm opacity-70 truncate">{cmd.description}</p>
                  </div>
                  <kbd className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                    {cmd.shortcut}
                  </kbd>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredCommands.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                No commands found
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-200/50 dark:border-slate-700/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">Esc</kbd> to close
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
