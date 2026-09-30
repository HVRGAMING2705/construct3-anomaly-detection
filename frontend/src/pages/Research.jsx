'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Image, 
  Table, 
  BarChart2, 
  LineChart, 
  ScatterChart, 
  Download, 
  ExternalLink, 
  Eye, 
  Search,
  FileText
} from 'lucide-react'
import { useRuns, useRegistry } from '../hooks/useApi'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'

const FIGURE_CATEGORIES = [
  { id: 'loss_curves', label: 'Loss Curves', icon: LineChart, description: 'Training/validation loss over epochs' },
  { id: 'roc_pr', label: 'ROC & PR Curves', icon: BarChart2, description: 'ROC-AUC and Precision-Recall curves' },
  { id: 'error_hist', label: 'Error Distributions', icon: BarChart2, description: 'Histogram of reconstruction errors' },
  { id: 'recon', label: 'Reconstructions', icon: Image, description: 'Original vs reconstructed images' },
  { id: 'anomaly', label: 'Anomaly Examples', icon: AlertTriangle, description: 'Detected anomaly samples with heatmaps' },
  { id: 'latent', label: 'Latent Space', icon: ScatterChart, description: 'PCA/t-SNE visualizations of bottleneck' },
]

function AlertTriangle({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function FigureCard({ figure, run, onClick }) {
  const figurePath = `/api/figures/${run}/${figure.id}`
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  
  return (
    <motion.div 
      className="group glass-card overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white/50 dark:bg-slate-800/50">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton variant="card" className="w-full h-full" />
          </div>
        )}
        <AnimatePresence mode="wait">
          {!imgError && (
            <img
              src={figurePath}
              alt={figure.label}
              className={clsx(
                'absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105',
                imgLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          )}
          {imgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <div className="text-center p-4">
                <FileText className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Failed to load</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{figure.id}</p>
              </div>
            </div>
          )}
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <span className="font-medium">{figure.label}</span>
            <Eye className="w-5 h-5 opacity-80" />
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{figure.label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{figure.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
          <UI.Badge variant="primary" className="text-xs">{run.model?.toUpperCase()}</UI.Badge>
          <a 
            href={figurePath} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        </div>
      </div>
    </motion.div>
  )
}

function FigureModal({ figure, run, isOpen, onClose }) {
  if (!isOpen || !figure) return null
  
  const figurePath = `/api/figures/${run}/${figure.id}`
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <motion.div
        className="relative max-w-5xl w-full max-h-[90vh] glass-card rounded-2xl overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 id="modal-title" className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">{figure.label}</h2>
          <div className="flex items-center gap-2">
            <a 
              href={figurePath} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        
        <div className="relative h-[calc(90vh-80px)] flex items-center justify-center bg-white/50 dark:bg-slate-800/50 overflow-auto p-4">
          <img
            src={figurePath}
            alt={figure.label}
            className="max-w-full max-h-full object-contain shadow-2xl"
            onLoad={() => {}}
          />
        </div>
        
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">{figure.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500 dark:text-slate-500">Run: {run}</span>
            <UI.Badge variant="primary" className="text-xs">{run.split('_').pop()?.toUpperCase()}</UI.Badge>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ResultsTable({ runs }) {
  const [sortConfig, setSortConfig] = useState({ key: 'roc_auc', direction: 'desc' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRuns, setSelectedRuns] = useState([])
  
  const sortedRuns = useMemo(() => {
    let filtered = runs.filter(run => 
      run.run.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.model.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    filtered.sort((a, b) => {
      if (a[sortConfig.key] === null || a[sortConfig.key] === undefined) return 1
      if (b[sortConfig.key] === null || b[sortConfig.key] === undefined) return -1
      
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
    
    return filtered
  }, [runs, sortConfig, searchTerm])
  
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }
  
  const toggleSelect = (run) => {
    setSelectedRuns(prev => 
      prev.includes(run) 
        ? prev.filter(r => r !== run) 
        : [...prev, run]
    )
  }
  
  const toggleSelectAll = () => {
    if (selectedRuns.length === sortedRuns.length) {
      setSelectedRuns([])
    } else {
      setSelectedRuns(sortedRuns.map(r => r.run))
    }
  }
  
  const columns = [
    { key: 'run', label: 'Run Name', render: (run) => (
      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{run.run}</span>
    )},
    { key: 'model', label: 'Model', render: (run) => (
      <UI.Badge variant="primary" className="text-xs">{run.model?.toUpperCase()}</UI.Badge>
    )},
    { key: 'epochs', label: 'Epochs', sortable: true, render: (run) => run.epochs },
    { key: 'params', label: 'Params', sortable: true, render: (run) => run.params?.toLocaleString() },
    { key: 'roc_auc', label: 'ROC-AUC', sortable: true, render: (run) => (
      <span className={clsx('font-mono font-bold', run.roc_auc >= 0.85 ? 'text-green-600 dark:text-green-400' : run.roc_auc >= 0.8 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>
        {run.roc_auc?.toFixed(3) || '—'}
      </span>
    )},
    { key: 'f1', label: 'F1 Score', sortable: true, render: (run) => (
      <span className="font-mono">{run.f1?.toFixed(3) || '—'}</span>
    )},
    { key: 'mse', label: 'Test MSE', sortable: true, render: (run) => (
      <span className="font-mono text-slate-600 dark:text-slate-400">{run.mse?.toFixed(4) || '—'}</span>
    )},
  ]
  
  return (
    <UI.Card className="overflow-hidden">
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search runs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {selectedRuns.length > 0 && (
              <UI.Button variant="ghost" size="sm" onClick={() => { window.open(`/experiments?runs=${selectedRuns.join(',')}`, '_blank') }}>
                <BarChart2 className="w-4 h-4" />
                Compare {selectedRuns.length}
              </UI.Button>
            )}
            <UI.Button variant="secondary" size="sm" onClick={() => window.open('/api/registry', '_blank')}>
              <Download className="w-4 h-4" />
              Export Registry
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
                  checked={selectedRuns.length === sortedRuns.length && sortedRuns.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              {columns.map(col => (
                <th 
                  key={col.key}
                  className={clsx('p-4 pr-4 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-800', col.sortable && 'hover:text-slate-900 dark:hover:text-slate-100')}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <svg className={clsx('w-4 h-4 text-slate-400', sortConfig.key === col.key ? 'rotate-180' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    )}
                  </div>
                </th>
              ))}
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
                    onChange={() => toggleSelect(run.run)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                {columns.map(col => (
                  <td key={col.key} className="p-4 pr-4">
                    {col.render(run)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {sortedRuns.length === 0 && (
        <div className="p-12 text-center">
          <Table className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No runs match your search</p>
        </div>
      )}
      
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{sortedRuns.length} of {runs.length} runs</span>
        {selectedRuns.length > 0 && (
          <span className="text-primary-600 dark:text-primary-400">{selectedRuns.length} selected</span>
        )}
      </div>
    </UI.Card>
  )
}

export default function Research() {
  const { runs, loading: runsLoading, error: runsError } = useRuns()
  const { registry, loading: registryLoading } = useRegistry()
  
  const [activeTab, setActiveTab] = useState('figures')
  const [selectedFigure, setSelectedFigure] = useState(null)
  const [selectedRun, setSelectedRun] = useState('')
  
  const availableFigures = useMemo(() => {
    if (!selectedRun) return []
    return FIGURE_CATEGORIES.map(fig => ({
      ...fig,
      id: fig.id,
      run: selectedRun
    }))
  }, [selectedRun])
  
  useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0].run)
    }
  }, [runs, selectedRun])
  
  if (runsLoading || registryLoading) {
    return (
      <div className="page-container">
        <div className="glass-card p-8">
          <Skeleton variant="title" className="mb-8" />
          <div className="flex gap-4 mb-6">
            <Skeleton variant="text" className="w-32 h-8" />
            <Skeleton variant="text" className="w-32 h-8" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Research Gallery</h1>
        <p className="text-slate-500 dark:text-slate-400">Explore trained model figures, metrics, and comparative analysis</p>
      </motion.div>
      
      <div className="space-y-6">
        <motion.div 
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {['figures', 'results', 'comparison'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                activeTab === tab
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              )}
            >
              {tab === 'figures' && <><Image className="w-4 h-4 inline mr-1" /> Figures</>}
              {tab === 'results' && <><Table className="w-4 h-4 inline mr-1" /> Results Table</>}
              {tab === 'comparison' && <><BarChart2 className="w-4 h-4 inline mr-1" /> Comparison</>}
            </button>
          ))}
        </motion.div>
        
        <AnimatePresence mode="wait">
          {activeTab === 'figures' && (
            <motion.div
              key="figures"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Model Figures</h2>
                <UI.Select
                  value={selectedRun}
                  onChange={(e) => { setSelectedRun(e.target.value); setSelectedFigure(null) }}
                  options={runs.map(r => ({ value: r.run, label: r.run }))}
                  className="w-auto sm:w-64"
                />
              </div>
              
              {availableFigures.length === 0 ? (
                <UI.Card className="p-12 text-center">
                  <Image className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">No figures available</h3>
                  <p className="text-slate-500 dark:text-slate-400">Select a model run to view its figures</p>
                </UI.Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableFigures.map((figure, index) => (
                    <FigureCard
                      key={figure.id}
                      figure={figure}
                      run={selectedRun}
                      onClick={() => setSelectedFigure(figure)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ResultsTable runs={runs} />
            </motion.div>
          )}
          
          {activeTab === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <UI.Card className="p-6">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Model Comparison</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Select multiple runs from the Results Table tab to compare metrics side-by-side with deltas.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {runs.slice(0, 3).map((run, index) => (
                    <motion.div
                      key={run.run}
                      className="glass-panel p-4 relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{run.run}</span>
                        <UI.Badge variant="primary" className="text-xs">{run.model?.toUpperCase()}</UI.Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">ROC-AUC</span>
                          <span className="font-mono font-bold text-green-600 dark:text-green-400">{run.roc_auc?.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">F1 Score</span>
                          <span className="font-mono">{run.f1?.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">MSE</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">{run.mse?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Params</span>
                          <span className="font-mono">{run.params?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Epochs</span>
                          <span className="font-mono">{run.epochs}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Quick Insights</h4>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Conv models generally achieve higher ROC-AUC with fewer parameters</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Denoising Conv improves robustness but slightly reduces peak ROC-AUC</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> FC models overfit faster (higher params, no spatial inductive bias)</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Disabling BN or Dropout reduces regularization, affecting generalization</li>
                  </ul>
                </div>
              </UI.Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <FigureModal
        figure={selectedFigure}
        run={selectedRun}
        isOpen={!!selectedFigure}
        onClose={() => setSelectedFigure(null)}
      />
    </div>
  )
}