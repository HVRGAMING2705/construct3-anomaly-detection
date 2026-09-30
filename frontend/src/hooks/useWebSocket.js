import { useEffect, useRef, useState } from 'react'

const EMPTY_HISTORY = { train_loss: [], val_loss: [] }
const TERMINAL_STATUSES = new Set(['completed', 'error'])

export function useTrainingWebSocket(sessionId) {
  const [status, setStatus] = useState('idle')
  const [history, setHistory] = useState(EMPTY_HISTORY)
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [totalEpochs, setTotalEpochs] = useState(0)
  const [error, setError] = useState(null)
  const statusRef = useRef('idle')

  useEffect(() => {
    if (!sessionId) {
      statusRef.current = 'idle'
      setStatus('idle')
      return undefined
    }

    let disposed = false
    let reconnectTimer
    const connect = () => {
      if (disposed || TERMINAL_STATUSES.has(statusRef.current)) return
      const socket = new WebSocket(`ws://${window.location.host}/ws/train/${sessionId}`)
      statusRef.current = 'connecting'
      setStatus('connecting')

      socket.onopen = () => {
        if (!disposed) {
          statusRef.current = 'connected'
          setStatus('connected')
          setError(null)
        }
      }

      socket.onmessage = (event) => {
        if (disposed) return
        try {
          const data = JSON.parse(event.data)
          if (data.status) {
            statusRef.current = data.status
            setStatus(data.status)
          }
          if (data.current_epoch !== undefined) setCurrentEpoch(data.current_epoch)
          if (data.total_epochs !== undefined) setTotalEpochs(data.total_epochs)
          if (data.history) setHistory(data.history)
          if (data.error) setError(data.error)
        } catch {
          setError('Unable to read a training update.')
        }
      }

      socket.onerror = () => {
        if (!disposed) setError('WebSocket connection error')
      }

      socket.onclose = () => {
        if (!disposed && !TERMINAL_STATUSES.has(statusRef.current)) {
          reconnectTimer = window.setTimeout(connect, 1000)
        }
      }
    }

    setHistory(EMPTY_HISTORY)
    setCurrentEpoch(0)
    setTotalEpochs(0)
    setError(null)
    connect()

    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
    }
  }, [sessionId])

  const progress = totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : 0
  return {
    status,
    history,
    currentEpoch,
    totalEpochs,
    progress,
    error,
    isTraining: ['connecting', 'connected', 'starting', 'training'].includes(status),
    isCompleted: status === 'completed',
    hasError: status === 'error',
  }
}
