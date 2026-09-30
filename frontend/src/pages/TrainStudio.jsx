'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Square, RotateCcw, Save, Trash2, CheckCircle, AlertCircle, Loader2, Target, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useTrainingWebSocket } from '../hooks/useWebSocket'
import { apiEndpoints } from '../utils/api'
import { UI, Skeleton } from '../components/UI'
import { clsx } from 'clsx'

const MODEL_OPTIONS = [
  { value: 'fc', label: 'Fully Connected (FC)', description: '784 → 512 → 256 → 32 → 256 → 512 → 784' },
  { value: 'conv', label: 'Convolutional (Conv)', description: '1×28×28 → 32×14×14 → 64×7×7 → 32 → 64×7×7 → 32×14×14 → 1×28×28' },
  { value: 'denoising_conv', label: 'Denoising Convolutional', description: 'Conv backbone with Gaussian noise corruption (σ=0.3)' },
]

export default function TrainStudio() {
  const [config, setConfig] = useState({
    model: 'fc',
    run: '',
    epochs: 8,
    lr: 1e-3,
    latent: 32,
    dropout: 0.1,
    no_bn: false,
    noise_std: 0.3,
    seed: 42,
  })
  const [sessionId, setSessionId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [availableRuns, setAvailableRuns] = useState([])
  const runNameRef = useRef(null)

  const { history, currentEpoch, totalEpochs, progress, isTraining, isCompleted, hasError } = useTrainingWebSocket(sessionId)

  useEffect(() => {
    const base = config.model === 'fc' ? 'fc' : (config.model === 'conv' ? 'conv' : 'den')
    const suffix = config.no_bn ? '_no_bn' : (config.dropout === 0 ? '_no_drop' : '_base')
    setConfig(prev => ({ ...prev, run: `${base}${suffix}` }))
  }, [config.model, config.no_bn, config.dropout])

  useEffect(() => {
    apiEndpoints.runs().then(res => setAvailableRuns(res.data.runs || [])).catch(console.error)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (availableRuns.some(r => r.run === config.run)) {
      setError(`Run name "${config.run}" already exists. Please choose a different name.`)
      return
    }

    try {
      const response = await apiEndpoints.train(config)
      setSessionId(response.data.session_id)
      setStatus('training')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start training')
    }
  }

  const handleCancel = () => {
    setSessionId(null)
    setStatus('idle')
  }

  const formatLoss = (loss) => loss?.toFixed(5) ?? '—'

  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Train Studio</h1>
        <p className="text-slate-500 dark:text-slate-400">Configure and launch training runs with live WebSocket metrics streaming</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Training Configuration</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <UI.Select
                  label="Model Architecture"
                  value={config.model}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  options={MODEL_OPTIONS}
                />
                
                <UI.Input
                  label="Run Name"
                  value={config.run}
                  onChange={(e) => setConfig(prev => ({ ...prev, run: e.target.value }))}
                  placeholder="fc_base"
                  ref={runNameRef}
                  disabled={isTraining}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <UI.Input
                  label="Epochs"
                  type="number"
                  value={config.epochs}
                  onChange={(e) => setConfig(prev => ({ ...prev, epochs: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={100}
                  disabled={isTraining}
                />
                
                <UI.Input
                  label="Learning Rate"
                  type="number"
                  step="0.0001"
                  value={config.lr}
                  onChange={(e) => setConfig(prev => ({ ...prev, lr: parseFloat(e.target.value) }))}
                  placeholder="0.001"
                  disabled={isTraining}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <UI.Input
                  label="Latent Dimension"
                  type="number"
                  value={config.latent}
                  onChange={(e) => setConfig(prev => ({ ...prev, latent: parseInt(e.target.value) || 32 }))}
                  min={8}
                  max={256}
                  disabled={isTraining}
                />
                
                <UI.Input
                  label="Dropout Rate"
                  type="number"
                  step="0.05"
                  value={config.dropout}
                  onChange={(e) => setConfig(prev => ({ ...prev, dropout: parseFloat(e.target.value) }))}
                  min={0}
                  max={0.5}
                  disabled={isTraining}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <UI.Input
                  label="Noise Std (Denoising)"
                  type="number"
                  step="0.05"
                  value={config.noise_std}
                  onChange={(e) => setConfig(prev => ({ ...prev, noise_std: parseFloat(e.target.value) }))}
                  min={0}
                  max={1}
                  disabled={isTraining || config.model !== 'denoising_conv'}
                />
                
                <UI.Input
                  label="Random Seed"
                  type="number"
                  value={config.seed}
                  onChange={(e) => setConfig(prev => ({ ...prev, seed: parseInt(e.target.value) || 42 }))}
                  disabled={isTraining}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.no_bn}
                    onChange={(e) => setConfig(prev => ({ ...prev, no_bn: e.target.checked }))}
                    disabled={isTraining}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Disable Batch Normalization</span>
                </label>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <UI.Button 
                  type="submit" 
                  disabled={isTraining || !config.run}
                  loading={status === 'starting'}
                  className="flex-1"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Training...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Training
                    </>
                  )}
                </UI.Button>
                
                {isTraining && (
                  <UI.Button 
                    variant="danger"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    <Square className="w-5 h-5" />
                    Cancel
                  </UI.Button>
                )}

                {!isTraining && status === 'completed' && (
                  <UI.Button 
                    variant="secondary"
                    onClick={() => { setStatus('idle'); setSessionId(null); }}
                  >
                    <RotateCcw className="w-5 h-5" />
                    New Run
                  </UI.Button>
                )}
              </div>

              {error && (
                <motion.div 
                  className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </form>
          </UI.Card>

          <AnimatePresence>
            {(isTraining || isCompleted || hasError) && (
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <UI.Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Live Training Metrics</h2>
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-3 h-3 rounded-full', 
                        isTraining ? 'bg-green-500 animate-pulse' : 
                        isCompleted ? 'bg-green-500' : 'bg-red-500'
                      )} />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{isTraining ? 'training' : isCompleted ? 'completed' : 'error'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <UI.StatCard label="Current Epoch" value={`${currentEpoch}/${totalEpochs}`} icon={<Loader2 className="w-5 h-5" />} />
                    <UI.StatCard label="Progress" value={`${Math.round(progress)}%`} icon={<TrendingUp className="w-5 h-5" />} />
                    <UI.StatCard label="Train Loss" value={formatLoss(history.train_loss[history.train_loss.length - 1])} icon={<TrendingUp className="w-5 h-5" />} />
                    <UI.StatCard label="Val Loss" value={formatLoss(history.val_loss[history.val_loss.length - 1])} icon={<Target className="w-5 h-5" />} />
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history.train_loss.map((loss, i) => ({
                        epoch: i + 1,
                        train: loss,
                        val: history.val_loss[i] ?? null,
                      }))}>
                        <defs>
                          <linearGradient id="trainColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="valColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="epoch" 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '12px',
                            color: '#f1f5f9',
                          }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="train" 
                          stroke="#0ea5e9" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#trainColor)"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="val" 
                          stroke="#d946ef" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#valColor)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {isCompleted && (
                    <motion.div 
                      className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mt-4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                        <CheckCircle className="w-6 h-6 flex-shrink-0" />
                        <span className="font-medium">Training completed successfully! Run <code className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 rounded">{config.run}</code> is registered.</span>
                      </div>
                    </motion.div>
                  )}
                </UI.Card>

                <UI.Card className="p-6">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Epoch History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/50">
                          <th className="pb-2 pr-4 font-medium">Epoch</th>
                          <th className="pb-2 pr-4 font-medium">Train Loss</th>
                          <th className="pb-2 pr-4 font-medium">Val Loss</th>
                          <th className="pb-2 font-medium">Improvement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                        {history.train_loss.map((train, i) => (
                          <tr key={i} className="hover:bg-white/50 dark:hover:bg-slate-800/50">
                            <td className="py-2 pr-4 font-mono font-medium">{i + 1}</td>
                            <td className="py-2 pr-4 font-mono text-slate-600 dark:text-slate-400">{train.toFixed(5)}</td>
                            <td className="py-2 pr-4 font-mono text-slate-600 dark:text-slate-400">{(history.val_loss[i] ?? 0).toFixed(5)}</td>
                            <td className="py-2 font-mono">
                              {i > 0 ? (
                                <span className={clsx('font-medium', 
                                  history.val_loss[i] < history.val_loss[i-1] ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                )}>
                                  {(history.val_loss[i-1] - (history.val_loss[i] ?? 0)).toFixed(5)}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </UI.Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
        >
          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Model Architecture Preview</h2>
            
            <div className="space-y-4">
              {MODEL_OPTIONS.map(model => (
                <motion.button
                  key={model.value}
                  onClick={() => setConfig(prev => ({ ...prev, model: model.value }))}
                  className={clsx(
                    'w-full p-4 rounded-xl text-left transition-all duration-200 border-2',
                    config.model === model.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                  disabled={isTraining}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{model.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{model.description}</p>
                    </div>
                    {config.model === model.value && (
                      <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </UI.Card>

          <UI.Card className="p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Existing Runs</h2>
            {availableRuns.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">No runs yet. Train your first model!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableRuns.map(run => (
                  <motion.div
                    key={run.run}
                    className={clsx(
                      'flex items-center justify-between p-3 rounded-xl transition-colors',
                      run.run === config.run ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: availableRuns.indexOf(run) * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <UI.Badge variant="primary" className="text-xs">{run.model?.toUpperCase() || 'FC'}</UI.Badge>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{run.run}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{run.epochs} epochs</span>
                      {run.roc_auc && <span>• ROC-AUC: {run.roc_auc.toFixed(3)}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </UI.Card>
        </motion.div>
      </div>
    </div>
  )
}


