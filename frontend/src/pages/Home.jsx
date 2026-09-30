'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Target, TrendingUp, Github, ExternalLink, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useRuns } from '../hooks/useApi'
import { UI, StatCard, Skeleton } from '../components/UI'

const MODEL_ICONS = {
  fc: '🔗',
  conv: '🔍',
  denoising_conv: '✨',
}

function AnimatedCounter({ value, suffix = '', duration = 2000, className = '' }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime = null
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(value * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={clsx('font-display font-bold', className)}>
      {count.toFixed(value < 1 ? 3 : 0)}
      {suffix}
    </span>
  )
}

function HeroStats({ runs }) {
  const bestRun = runs.reduce((best, run) => 
    (run.roc_auc || 0) > (best.roc_auc || 0) ? run : best, { roc_auc: 0 })
  
  const bestF1 = runs.reduce((best, run) => 
    (run.f1 || 0) > (best.f1 || 0) ? run : best, { f1: 0 })

  const stats = [
    { label: 'Best ROC-AUC', value: bestRun.roc_auc || 0.857, suffix: '', icon: Target, color: 'primary' },
    { label: 'Best F1 Score', value: bestF1.f1 || 0.363, suffix: '', icon: TrendingUp, color: 'accent' },
    { label: 'Models Trained', value: runs.length, suffix: '', icon: Zap, color: 'success' },
    { label: 'Anomaly Class', value: 1, suffix: ' (Sandal)', icon: Target, color: 'warning' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className={clsx('stat-card p-6', stat.color === 'primary' && 'border-primary-500/20', stat.color === 'accent' && 'border-accent-500/20', stat.color === 'success' && 'border-green-500/20', stat.color === 'warning' && 'border-yellow-500/20')}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <AnimatedCounter value={stat.value} suffix={stat.suffix} className="text-3xl md:text-4xl" />
            </div>
            <div className={clsx('p-3 rounded-xl', 
              stat.color === 'primary' && 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
              stat.color === 'accent' && 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400',
              stat.color === 'success' && 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
              stat.color === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            )}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ModelLeaderboard({ runs }) {
  const sortedRuns = [...runs].sort((a, b) => (b.roc_auc || 0) - (a.roc_auc || 0))

  return (
    <motion.div className="glass-card overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Model Leaderboard</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ranked by ROC-AUC on Fashion-MNIST (Sandal anomaly)</p>
        </div>
        <Link to="/experiments" className="btn-ghost text-sm">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/50">
              <th className="pb-3 pr-4">Rank</th>
              <th className="pb-3 pr-4">Model</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">ROC-AUC</th>
              <th className="pb-3 pr-4">F1 Score</th>
              <th className="pb-3 pr-4">MSE</th>
              <th className="pb-3 pr-4">Params</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {sortedRuns.slice(0, 5).map((run, index) => (
              <motion.tr key={run.run} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + index * 0.05 }}>
                <td className="py-4 pr-4">
                  <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold font-display text-sm',
                    index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                    index === 1 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
                    index === 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                  )}>
                    {index + 1}
                  </span>
                </td>
                <td className="py-4 pr-4 font-medium text-slate-900 dark:text-slate-100">{run.run}</td>
                <td className="py-4 pr-4">
                  <UI.Badge variant="primary" className="text-xs">{run.model?.toUpperCase() || 'FC'}</UI.Badge>
                </td>
                <td className="py-4 pr-4">
                  <AnimatedCounter value={run.roc_auc || 0} className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100" />
                </td>
                <td className="py-4 pr-4">
                  <div className="relative w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((run.f1 || 0) / 0.5) * 100}%` }}
                      transition={{ delay: 0.8 + index * 0.05, duration: 0.8 }}
                    />
                  </div>
                </td>
                <td className="py-4 pr-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                  {(run.mse || 0).toFixed(4)}
                </td>
                <td className="py-4 pr-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                  {(run.params || 0).toLocaleString()}
                </td>
                <td className="py-4">
                  <Link to={`/experiments?run=${run.run}`} className="btn-ghost text-sm px-3 py-1.5">
                    Analyze
                  </Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

function QuickActions() {
  const actions = [
    { path: '/train', label: 'Train New Model', description: 'Configure and launch training runs', icon: Zap, color: 'from-primary-500 to-primary-600' },
    { path: '/detect', label: 'Detect Anomalies', description: 'Upload images for anomaly detection', icon: Target, color: 'from-accent-500 to-accent-600' },
    { path: '/latent', label: 'Explore Latent Space', description: 'Visualize bottleneck features', icon: CubeIcon, color: 'from-green-500 to-green-600' },
    { path: '/threshold', label: 'Tune Thresholds', description: 'Interactive precision/recall optimization', icon: SlidersIcon, color: 'from-yellow-500 to-yellow-600' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, i) => (
        <motion.div
          key={action.path}
          className="group stat-card p-6 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + i * 0.08 }}
        >
          <Link to={action.path} className="block h-full">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform', action.color)}>
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-display font-bold text-lg text-slate-900 dark:text-slate-50 mb-1">{action.label}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{action.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:underline">Launch</span>
              <ArrowRight className={clsx('w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform', action.color)} />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

function CubeIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M16 21.3A8.17 8.17 0 0 1 4 12.52"/><path d="M4 11.54a16 16 0 0 1 12 0"/><path d="M4 6.27a8.17 8.17 0 0 1 12 8.76"/></svg>
}
function SlidersIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
}

export default function Home() {
  const { runs, loading, error } = useRuns()

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[1,2,3,4].map(i => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton variant="card" className="h-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[1,2,3,4].map(i => <Skeleton variant="card" key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-50 mb-4">
          Construct3 <span className="text-gradient">Anomaly Detection Studio</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl">
          One-class anomaly detection on Fashion-MNIST. Train autoencoders, detect sandals, explore latent spaces.
        </p>
      </motion.div>

      <HeroStats runs={runs} />

      <div className="grid lg:grid-cols-3 gap-6 mb-12">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ModelLeaderboard runs={runs} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="stat-card p-6 h-full">
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Quick Start</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Train a model</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Choose FC, Conv, or Denoising</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <span className="text-accent-600 dark:text-accent-400 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Detect anomalies</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Upload images or use webcam</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Explore results</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Latent space, thresholds, figures</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.section 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">Quick Actions</h2>
            <p className="section-subtitle">Jump straight to the action</p>
          </div>
        </div>
        <QuickActions />
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.7 }}
        className="mt-12"
      >
        <div className="stat-card p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Read the Paper</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
            Deep dive into the methodology, experiments, and results of Construct3 anomaly detection.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="https://woxsenschoolofbusiness-my.sharepoint.com/:w:/g/personal/vikranth_reddy_2028_woxsen_edu_in/IQBTAZGqikrBSbgbdrfm3kqTAXX4E0prtyTQMgshuA9HVF0?e=UNRBBu" target="_blank" rel="noopener noreferrer" className="btn-primary">
              View Paper <ExternalLink className="w-4 h-4" />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-secondary">
              GitHub <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
