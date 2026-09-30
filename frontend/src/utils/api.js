import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const apiEndpoints = {
  health: () => api.get('/health'),
  runs: () => api.get('/runs'),
  train: (config) => api.post('/train', config),
  evaluate: (run, model) => api.post('/evaluate', { run, model }),
  detect: (run, file) => {
    const formData = new FormData()
    formData.append('run', run)
    formData.append('file', file)
    return api.post('/detect', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  denoise: (run, noiseStd, file) => {
    const formData = new FormData()
    formData.append('run', run)
    formData.append('noise_std', noiseStd)
    formData.append('file', file)
    return api.post('/denoise', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  figures: (run, figure) => api.get(`/figures/${run}/${figure}`),
  compare: (runs) => api.post('/compare', { runs }),
  latent: (run) => api.get(`/latent/${run}`),
  threshold: (run, percentile) => api.post('/threshold', { run, percentile }),
  registry: () => api.get('/registry'),
  deleteRun: (run) => api.delete(`/registry/${run}`),
}

export default api