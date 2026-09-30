import { useState, useEffect, useCallback } from 'react'
import { apiEndpoints } from '../utils/api'

export function useRuns() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiEndpoints.runs()
      const allRuns = response.data.runs || []
      // Filter out runs with error field
      setRuns(allRuns.filter(r => !r.error))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  return { runs, loading, error, refetch: fetchRuns }
}

export function useRunMetrics(run) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMetrics = useCallback(async () => {
    if (!run) return
    try {
      setLoading(true)
      const response = await apiEndpoints.evaluate(run, 'fc')
      setMetrics(response.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [run])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { metrics, loading, error, refetch: fetchMetrics }
}

export function useLatent(run) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLatent = useCallback(async () => {
    if (!run) return
    try {
      setLoading(true)
      const response = await apiEndpoints.latent(run)
      setData(response.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [run])

  useEffect(() => {
    fetchLatent()
  }, [fetchLatent])

  return { data, loading, error, refetch: fetchLatent }
}

export function useThresholdSweep(run) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSweep = useCallback(async (percentile = 95) => {
    if (!run) return
    try {
      setLoading(true)
      const response = await apiEndpoints.threshold(run, percentile)
      setData(response.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [run])

  useEffect(() => {
    fetchSweep()
  }, [fetchSweep])

  return { data, loading, error, fetchSweep }
}

export function useCompare(runs) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCompare = useCallback(async () => {
    if (!runs || runs.length < 2) return
    try {
      setLoading(true)
      const response = await apiEndpoints.compare(runs)
      setData(response.data.comparison)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [runs])

  useEffect(() => {
    fetchCompare()
  }, [fetchCompare])

  return { data, loading, error, refetch: fetchCompare }
}

export function useRegistry() {
  const [registry, setRegistry] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRegistry = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiEndpoints.registry()
      setRegistry(response.data.registry || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRun = useCallback(async (run) => {
    try {
      await apiEndpoints.deleteRun(run)
      setRegistry(prev => prev.filter(r => r.run !== run))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    fetchRegistry()
  }, [fetchRegistry])

  return { registry, loading, error, refetch: fetchRegistry, deleteRun }
}