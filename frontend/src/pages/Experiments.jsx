'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart2, 
  LineChart, 
  Table, 
  Download, 
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
  Eye,
  ExternalLink,
  GitBranch,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react'
import { useRuns, useCompare } from '../hooks/useApi'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts'

const METRICS = [
  { key: 'roc_auc', label: 'ROC-AUC', color: '#22c55e', higherBetter: true, format: (v) => v.toFixed(3) },
  { key: 'f1', label: 'F1 Score', color: '#d946ef', higherBetter: true, format: (v) => v.toFixed(3) },
  { key: 'test_normal_mse', label: 'Test MSE', color: '#ef4444', higherBetter: false, format: (v) => v.toFixed(4) },
  { key: 'params', label: 'Parameters', color: '#0ea5e9', higherBetter: false, format: (v) => v.toLocaleString() },
  { key: 'epochs', label: 'Epochs', color: '#f59e0b', higherBetter: null, format: (v) => v.toString() },
]

function MetricBarChart({ runs, metric, selectedRuns }) {
  const data = runs.map(run => ({
    name: run.run.length > 15 ? run.run.substring(0, 15) + '…' : run.run,
    fullName: run.run,
    value: run[metric.key] ?? 0,
    model: run.model,
    isSelected: selectedRuns.includes(run.run),
    color: metric.color,
  })).sort((a, b) => metric.higherBetter === false ? a.value - b.value : b.value - a.value)
  
  const maxValue = Math.max(...data.map(d => d.value)) * 1.15
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 120, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis 
            type="number" 
            domain={[0, maxValue]}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(v) => metric.key === 'params' ? (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) : v.toFixed(metric.key === 'roc_auc' || metric.key === 'f1' ? 3 : 2)}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            width={110}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value, name) => [metric.format(value), metric.label]}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
            maxBarSize={32}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isSelected ? metric.color : `${metric.color}60`}
                stroke={entry.isSelected ? '#fff' : 'none'}
                strokeWidth={2}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricLineChart({ runs, metric }) {
  const sortedRuns = [...runs].sort((a, b) => {
    const epochA = a.epochs || 0
    const epochB = b.epochs || 0
    return epochA - epochB
  })
  
  const data = sortedRuns.map(run => ({
    epoch: run.epochs,
    value: run[metric.key] ?? 0,
    run: run.run,
    model: run.model,
  }))
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 60, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="epoch" 
            type="number"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{ value: 'Epochs', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#e2e8f0' }}
            domain={['auto', 'auto']}
            label={{ value: metric.label, angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value, name) => [metric.format(value), metric.label]}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={metric.color} 
            strokeWidth={2}
            dot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 8, strokeWidth: 3 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ComparisonTable({ runs, selectedRuns, onToggleSelect, sortConfig, onSort }) {
  const sortedRuns = useMemo(() => {
    let filtered = [...runs]
    
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0
      const bVal = b[sortConfig.key] ?? 0
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [runs, sortConfig])
  
  return (
    <UI.Card className="overflow-hidden">
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter runs..."
              className="input-field pl-10"
              onChange={(e) => {}}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {selectedRuns.length > 0 && (
              <UI.Button variant="primary" size="sm" onClick={() => {}}>
                <BarChart2 className="w-4 h-4" />
                Compare {selectedRuns.length} Selected
              </UI.Button>
            )}
            <UI.Button variant="secondary" size="sm" onClick={() => window.open('/api/registry', '_blank')}>
              <Download className="w-4 h-4" />
              Export All
            </UI.Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50">
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedRuns.length === runs.length && runs.length > 0}
                  onChange={() => runs.forEach(r => onToggleSelect(r.run))}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800" onClick={() => onSort('run')}>
                <div className="flex items-center gap-1">
                  Run Name
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="p-4 pr-4">Model</th>
              <th className="p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800" onClick={() => onSort('epochs')}>
                <div className="flex items-center gap-1">
                  Epochs
                  {sortConfig.key === 'epochs' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th className="p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800" onClick={() => onSort('params')}>
                <div className="flex items-center gap-1">
                  Params
                  {sortConfig.key === 'params' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th className="p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800" onClick={() => onSort('roc_auc')}>
                <div className="flex items-center gap-1">
                  ROC-AUC
                  {sortConfig.key === 'roc_auc' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th className="p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800" onClick={() => onSort('f1')}>
                <div className="flex items-center gap-1">
                  F1 Score
                  {sortConfig.key === 'f1' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th className="p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800" onClick={() => onSort('test_normal_mse')}>
                <div className="flex items-center gap-1">
                  Test MSE
                  {sortConfig.key === 'test_normal_mse' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {sortedRuns.map((run, index) => (
              <motion.tr
                key={run.run}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={clsx('hover:bg-white/50 dark:hover:bg-slate-800/50', selectedRuns.includes(run.run) && 'bg-primary-50/50 dark:bg-primary-900/20')}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedRuns.includes(run.run)}
                    onChange={() => onToggleSelect(run.run)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="p-4 pr-4 font-mono font-medium text-slate-900 dark:text-slate-100">{run.run}</td>
                <td className="p-4 pr-4">
                  <UI.Badge variant="primary" className="text-xs">{run.model?.toUpperCase()}</UI.Badge>
                </td>
                <td className="p-4 pr-4 font-mono">{run.epochs}</td>
                <td className="p-4 pr-4 font-mono text-slate-600 dark:text-slate-400">{run.params?.toLocaleString()}</td>
                <td className="p-4 pr-4">
                  <span className={clsx('font-mono font-bold', run.roc_auc >= 0.85 ? 'text-green-600 dark:text-green-400' : run.roc_auc >= 0.8 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>
                    {run.roc_auc?.toFixed(3) || '—'}
                  </span>
                </td>
                <td className="p-4 pr-4 font-mono">{run.f1?.toFixed(3) || '—'}</td>
                <td className="p-4 pr-4 font-mono text-slate-600 dark:text-slate-400">{run.mse?.toFixed(4) || run.test_normal_mse?.toFixed(4) || '—'}</td>
                <td className="p-4">
                  <UI.Button variant="ghost" size="sm" onClick={() => window.open(`/research?run=${run.run}`, '_blank')}>
                    <Eye className="w-4 h-4" />
                  </UI.Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table></div>
      
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{runs.length} runs total</span>
        {selectedRuns.length > 0 && (
          <span className="text-primary-600 dark:text-primary-400">{selectedRuns.length} selected for comparison</span>
        )}
      </div>
    </UI.Card>
  )
}

function ModelCard({ run, isSelected, onClick, onSelect }) {
  const isBest = run.roc_auc >= 0.85
  
  return (
    <motion.div
      className={clsx(
        'glass-card p-5 cursor-pointer transition-all duration-200 relative overflow-hidden',
        isSelected && 'ring-2 ring-primary-500 bg-primary-50/30 dark:bg-primary-900/20',
        isBest && 'border-green-500/30'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{run.run}</span>
          {isBest && (
            <UI.Badge variant="success" className="ml-2 text-xs">Best</UI.Badge>
          )}
        </div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onSelect(run.run) }}
          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-0.5"
        />
      </div>
      
      <UI.Badge variant="primary" className="text-xs mb-3">{run.model?.toUpperCase()}</UI.Badge>
      
      <div className="space-y-2 text-sm">
        {METRICS.map(metric => (
          <div key={metric.key} className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
            <span className={clsx('font-mono font-bold', 
              metric.key === 'roc_auc' && run.roc_auc >= 0.85 ? 'text-green-600 dark:text-green-400' :
              metric.key === 'f1' && run.f1 >= 0.35 ? 'text-accent-600 dark:text-accent-400' :
              metric.key === 'test_normal_mse' && run.test_normal_mse <= 0.02 ? 'text-green-600 dark:text-green-400' :
              'text-slate-600 dark:text-slate-400'
            )}>
              {metric.format(run[metric.key] ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function Experiments() {
  const { runs, loading: runsLoading, error: runsError } = useRuns()
  const [selectedRuns, setSelectedRuns] = useState([])
  const [activeView, setActiveView] = useState('cards')
  const [activeMetric, setActiveMetric] = useState('roc_auc')
  const [sortConfig, setSortConfig] = useState({ key: 'roc_auc', direction: 'desc' })
  const [chartType, setChartType] = useState('bar')
  
  const { data: compareData, loading: compareLoading } = useCompare(selectedRuns)
  
  const toggleSelect = useCallback((run) => {
    setSelectedRuns(prev => 
      prev.includes(run) 
        ? prev.filter(r => r !== run) 
        : [...prev, run]
    )
  }, [])
  
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])
  
  const selectAll = () => {
    if (selectedRuns.length === runs.length) {
      setSelectedRuns([])
    } else {
      setSelectedRuns(runs.map(r => r.run))
    }
  }
  
  if (runsLoading) {
    return (
      <div className="page-container">
        <div className="glass-card p-8">
          <Skeleton variant="title" className="mb-8" />
          <div className="flex gap-4 mb-6">
            <Skeleton variant="text" className="w-32 h-8" />
            <Skeleton variant="text" className="w-32 h-8" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} variant="card" className="h-64" />)}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Experiments</h1>
            <p className="text-slate-500 dark:text-slate-400">Compare trained models across metrics, visualize trade-offs, and export results</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedRuns.length > 0 && (
              <UI.Button variant="primary" onClick={() => setActiveView('compare')}>
                <BarChart2 className="w-4 h-4" />
                Compare {selectedRuns.length}
              </UI.Button>
            )}
            <UI.Button variant="secondary" onClick={() => window.open('/api/registry', '_blank')}>
              <Download className="w-4 h-4" />
              Export Registry
            </UI.Button>
          </div>
        </div>
      </motion.div>
      
      <div className="space-y-6">
        <motion.div 
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {['cards', 'table', 'charts'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                activeView === view
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              )}
            >
              {view === 'cards' && <><GitBranch className="w-4 h-4 inline mr-1" /> Model Cards</>}
              {view === 'table' && <><Table className="w-4 h-4 inline mr-1" /> Table</>}
              {view === 'charts' && <><BarChart2 className="w-4 h-4 inline mr-1" /> Charts</>}
            </button>
          ))}
        </motion.div>
        
        <AnimatePresence mode="wait">
          {activeView === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sort by:</label>
                  <select
                    value={sortConfig.key}
                    onChange={(e) => { setSortConfig({ key: e.target.value, direction: 'desc' }) }}
                    className="input-field w-auto"
                  >
                    {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                  <button
                    onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                    className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
                  >
                    {sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRuns.length === runs.length && runs.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Select All ({selectedRuns.length}/{runs.length})</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {runs
                  .slice()
                  .sort((a, b) => {
                    const aVal = a[sortConfig.key] ?? 0
                    const bVal = b[sortConfig.key] ?? 0
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
                  })
                  .map((run, index) => (
                    <ModelCard
                      key={run.run}
                      run={run}
                      isSelected={selectedRuns.includes(run.run)}
                      onClick={() => {}}
                      onSelect={toggleSelect}
                    />
                  ))}
              </div>
            </motion.div>
          )}
          
          {activeView === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ComparisonTable 
                runs={runs} 
                selectedRuns={selectedRuns} 
                onToggleSelect={toggleSelect}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </motion.div>
          )}
          
          {activeView === 'charts' && (
            <motion.div
              key="charts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Metric:</label>
                  <select
                    value={activeMetric}
                    onChange={(e) => setActiveMetric(e.target.value)}
                    className="input-field w-auto"
                  >
                    {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chart:</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="input-field w-auto"
                  >
                    <option value="bar">Horizontal Bars</option>
                    <option value="line">Line (by Epochs)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <UI.Button variant="secondary" onClick={() => setSelectedRuns([])}>
                    <RotateCcw className="w-4 h-4" />
                    Clear Selection
                  </UI.Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {METRICS.map(metric => (
                  <UI.Card key={metric.key} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }} />
                        {metric.label}
                        {metric.higherBetter === true && <span className="text-xs text-green-600 dark:text-green-400">↑ Higher is better</span>}
                        {metric.higherBetter === false && <span className="text-xs text-red-600 dark:text-red-400">↓ Lower is better</span>}
                      </h3>
                    </div>
                    
                    {chartType === 'bar' ? (
                      <MetricBarChart runs={runs} metric={metric} selectedRuns={selectedRuns} />
                    ) : (
                      <MetricLineChart runs={runs} metric={metric} />
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {runs.length} models • Click model cards to select for comparison
                      </p>
                    </div>
                  </UI.Card>
                ))}
              </div>
            </motion.div>
          )}
          
          {activeView === 'compare' && selectedRuns.length > 0 && compareData && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <UI.Card className="p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Detailed Comparison</h2>
                  <UI.Button variant="ghost" onClick={() => setSelectedRuns([])}>
                    <RotateCcw className="w-4 h-4" />
                    Clear Selection
                  </UI.Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/50">
                        <th className="p-4 font-medium">Metric</th>
                        {compareData.comparison.map(c => (
                          <th key={c.run} className="p-4 font-medium text-center">
                            <UI.Badge variant="primary" className="text-xs mb-1">{c.run.split('_').pop()?.toUpperCase()}</UI.Badge>
                            <div className="font-mono text-slate-900 dark:text-slate-100">{c.run}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                      {METRICS.map(metric => (
                        <tr key={metric.key} className="hover:bg-white/50 dark:hover:bg-slate-800/50">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{metric.label}</td>
                          {compareData.comparison.map((c, idx) => (
                            <td key={c.run} className="p-4 text-center">
                              {c.metrics && (
                                <>
                                  <div className="font-mono font-bold text-lg" style={{ color: metric.color }}>
                                    {metric.format(c.metrics[metric.key] ?? 0)}
                                  </div>
                                  {c.delta && metric.key in c.delta && idx > 0 && (
                                    <div className={clsx('text-xs font-medium mt-1',
                                      c.delta[metric.key] > 0 ? (metric.higherBetter ? 'text-green-600' : 'text-red-600') :
                                      c.delta[metric.key] < 0 ? (metric.higherBetter ? 'text-red-600' : 'text-green-600') :
                                      'text-slate-500'
                                    )}>
                                      {c.delta[metric.key] > 0 ? '+' : ''}{metric.format(c.delta[metric.key])} vs baseline
                                    </div>
                                  )}
                                </>
                              )}
                              {c.error && <span className="text-red-500 text-sm">Error: {c.error}</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </UI.Card>
            </motion.div>
          )}
          
          {activeView === 'compare' && selectedRuns.length === 0 && (
            <motion.div
              key="compare-empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <UI.Card className="p-12 text-center">
                <GitBranch className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Select models to compare</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Choose 2 or more models from the Model Cards or Table view</p>
                <UI.Button onClick={() => setActiveView('cards')}>
                  <GitBranch className="w-4 h-4" />
                  Browse Models
                </UI.Button>
              </UI.Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}