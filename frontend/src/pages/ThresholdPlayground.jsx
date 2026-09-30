'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  LineChart, 
  Download, 
  Search,
  RefreshCw,
  Zap
} from 'lucide-react'
import { useRuns } from '../hooks/useApi'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Scatter
} from 'recharts'

function GaugeChart({ value, max = 1, label, color = 'primary', size = 140 }) {
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
          strokeWidth="10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color === 'anomaly' ? '#ef4444' : color === 'normal' ? '#22c55e' : '#0ea5e9'}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="mt-3 text-center">
        <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
          {(value * 100).toFixed(1)}%
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function SweepChart({ sweep, currentPercentile, rocAuc, prAuc }) {
  const data = sweep.map(s => ({
    percentile: s.percentile,
    precision: s.precision,
    recall: s.recall,
    f1: s.f1,
    threshold: s.threshold,
  }))
  
  const currentPoint = data.find(d => Math.abs(d.percentile - currentPercentile) < 0.5)
  
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
          <defs>
            <linearGradient id="precisionColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="recallColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="f1Color" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="percentile" 
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{ value: 'Percentile', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#e2e8f0' }}
            domain={[0, 1.05]}
            label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value, name) => [value.toFixed(3), name]}
          />
          <Area 
            type="monotone" 
            dataKey="precision" 
            stroke="#22c55e" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#precisionColor)"
            name="Precision"
          />
          <Area 
            type="monotone" 
            dataKey="recall" 
            stroke="#0ea5e9" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#recallColor)"
            name="Recall"
          />
          <Area 
            type="monotone" 
            dataKey="f1" 
            stroke="#d946ef" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#f1Color)"
            name="F1 Score"
          />
          {currentPoint && (
            <>
              <Line 
                type="monotone" 
                dataKey="precision" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Scatter
                data={[{ name: 'precision', value: currentPoint.precision }]}
                shape="circle"
                zIndex={10}
                fill="#22c55e"
                stroke="#fff"
                strokeWidth={2}
                r={6}
              />
              <Scatter
                data={[{ name: 'recall', value: currentPoint.recall }]}
                shape="circle"
                zIndex={10}
                fill="#0ea5e9"
                stroke="#fff"
                strokeWidth={2}
                r={6}
              />
              <Scatter
                data={[{ name: 'f1', value: currentPoint.f1 }]}
                shape="circle"
                zIndex={10}
                fill="#d946ef"
                stroke="#fff"
                strokeWidth={2}
                r={6}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricCard({ label, value, icon, trend, color, unit = '' }) {
  return (
    <UI.Card className="p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <motion.p
            className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50 mt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {value}{unit}
          </motion.p>
          {trend && (
            <motion.p
              className={clsx('mt-1.5 text-sm font-medium', trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" />}
              {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 inline mr-0.5" />}
              {trend === 'neutral' && <span>Stable</span>}
            </motion.p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', color)}>
          {icon}
        </div>
      </div>
    </UI.Card>
  )
}

export default function ThresholdPlayground() {
  const { runs, loading: runsLoading } = useRuns()
  const [selectedRun, setSelectedRun] = useState('')
  const [percentile, setPercentile] = useState(95)
  const [thresholdData, setThresholdData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastPercentile, setLastPercentile] = useState(95)
  
  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0].run)
    }
  }, [runs, selectedRun])
  
  const fetchThreshold = useCallback(async (p) => {
    if (!selectedRun) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiEndpoints.threshold(selectedRun, p)
      setThresholdData(response.data)
      setLastPercentile(p)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch threshold data')
    } finally {
      setLoading(false)
    }
  }, [selectedRun])
  
  useEffect(() => {
    if (selectedRun) {
      fetchThreshold(percentile)
    }
  }, [selectedRun, percentile, fetchThreshold])
  
  const handleSliderChange = (e) => {
    const newPercentile = parseInt(e.target.value)
    setPercentile(newPercentile)
  }
  
  const handleSliderEnd = () => {
    fetchThreshold(percentile)
  }
  
  if (runsLoading) {
    return (
      <div className="page-container">
        <div className="glass-card p-8">
          <Skeleton variant="title" className="mb-8" />
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Skeleton variant="card" className="h-28" />
            <Skeleton variant="card" className="h-28" />
            <Skeleton variant="card" className="h-28" />
          </div>
          <Skeleton variant="card" className="h-80" />
        </div>
      </div>
    )
  }
  
  const sweep = thresholdData?.sweep || []
  const currentPoint = sweep.find(s => Math.abs(s.percentile - percentile) < 0.5) || 
    sweep.find(s => Math.abs(s.percentile - lastPercentile) < 0.5)
  
  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Threshold Playground</h1>
        <p className="text-slate-500 dark:text-slate-400">Interactively tune the anomaly detection threshold and observe precision/recall tradeoffs</p>
      </motion.div>
      
      <div className="grid lg:grid-cols-4 gap-6">
        <motion.div 
          className="lg:col-span-1 space-y-6"
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Configuration</h2>
            
            <UI.Select
              label="Model"
              value={selectedRun}
              onChange={(e) => { setSelectedRun(e.target.value); setPercentile(95); }}
              options={runs.map(r => ({ value: r.run, label: `${r.run} (${r.model.toUpperCase()})` }))}
              disabled={runs.length === 0}
            />
            
            {runs.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                No trained models available. Train a model first in <span className="text-primary-600 dark:text-primary-400 font-medium">Train Studio</span>.
              </p>
            )}
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Threshold Percentile: <span className="font-mono text-primary-600 dark:text-primary-400 ml-2">{percentile}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="99"
                value={percentile}
                onChange={handleSliderChange}
                onMouseUp={handleSliderEnd}
                onTouchEnd={handleSliderEnd}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none accent-primary-500 cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>1% (Low threshold → More anomalies)</span>
                <span>99% (High threshold → Fewer anomalies)</span>
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <UI.Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  onClick={() => { setPercentile(95); fetchThreshold(95); }}
                >
                  <Target className="w-4 h-4" />
                  Default (95th percentile)
                </UI.Button>
                <UI.Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => { setPercentile(50); fetchThreshold(50); }}
                >
                  <BarChart2 className="w-4 h-4" />
                  Balanced (50th percentile)
                </UI.Button>
                <UI.Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => { setPercentile(99); fetchThreshold(99); }}
                >
                  <Zap className="w-4 h-4" />
                  Conservative (99th percentile)
                </UI.Button>
              </div>
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
          
          {thresholdData && (
            <UI.Card className="p-6">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Current Threshold</h2>
              
              <GaugeChart 
                value={thresholdData.recall} 
                max={1}
                label="Recall"
                color="normal"
                size={130}
              />
              
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">Threshold Value</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{thresholdData.threshold.toFixed(6)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">ROC-AUC</span>
                  <span className="font-mono font-bold text-green-600 dark:text-green-400">{thresholdData.roc_auc.toFixed(3)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">PR-AUC</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{thresholdData.pr_auc.toFixed(3)}</span>
                </div>
              </div>
            </UI.Card>
          )}
        </motion.div>
        
        <motion.div 
          className="lg:col-span-3 space-y-6"
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <AnimatePresence mode="wait">
            {thresholdData && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricCard
                    label="Precision"
                    value={thresholdData.precision.toFixed(3)}
                    icon={<Target className="w-6 h-6" />}
                    color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  />
                  <MetricCard
                    label="Recall"
                    value={thresholdData.recall.toFixed(3)}
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  />
                  <MetricCard
                    label="F1 Score"
                    value={thresholdData.f1.toFixed(3)}
                    icon={<BarChart2 className="w-6 h-6" />}
                    color="bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400"
                  />
                  <MetricCard
                    label="Threshold"
                    value={thresholdData.threshold.toFixed(4)}
                    icon={<Zap className="w-6 h-6" />}
                    color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <UI.Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Precision-Recall-F1 Curves</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Precision</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-500" /> Recall</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent-500" /> F1 Score</span>
              </div>
            </div>
            
            {thresholdData ? (
              <SweepChart 
                sweep={sweep} 
                currentPercentile={thresholdData.percentile}
                rocAuc={thresholdData.roc_auc}
                prAuc={thresholdData.pr_auc}
              />
            ) : (
              <div className="h-72 flex items-center justify-center">
                <Skeleton variant="card" className="w-full h-full" />
              </div>
            )}
          </UI.Card>
          
          {thresholdData && sweep.length > 0 && (
            <UI.Card className="p-6">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Threshold Sweep Table</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/50">
                      <th className="pb-3 pr-4 font-medium">Percentile</th>
                      <th className="pb-3 pr-4 font-medium">Threshold</th>
                      <th className="pb-3 pr-4 font-medium">Precision</th>
                      <th className="pb-3 pr-4 font-medium">Recall</th>
                      <th className="pb-3 pr-4 font-medium">F1 Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {sweep.map((s, i) => (
                      <tr 
                        key={i} 
                        className={clsx('hover:bg-white/50 dark:hover:bg-slate-800/50', 
                          Math.abs(s.percentile - thresholdData.percentile) < 0.5 && 'bg-primary-50/50 dark:bg-primary-900/20'
                        )}
                      >
                        <td className="py-2 pr-4 font-mono font-medium">{s.percentile.toFixed(1)}%</td>
                        <td className="py-2 pr-4 font-mono text-slate-600 dark:text-slate-400">{s.threshold.toFixed(6)}</td>
                        <td className="py-2 pr-4 font-mono text-green-600 dark:text-green-400">{s.precision.toFixed(3)}</td>
                        <td className="py-2 pr-4 font-mono text-primary-600 dark:text-primary-400">{s.recall.toFixed(3)}</td>
                        <td className="py-2 pr-4 font-mono font-bold text-accent-600 dark:text-accent-400">{s.f1.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </UI.Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}