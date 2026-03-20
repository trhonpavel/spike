import { useState, useEffect, useCallback, useRef } from 'react'

interface QueueEntry {
  id: string
  method: string
  url: string
  body?: string
  headers: Record<string, string>
  timestamp: number
}

const QUEUE_KEY = 'spike_offline_queue'

function loadQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(queue: QueueEntry[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>(loadQueue)
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  const enqueue = useCallback((entry: Omit<QueueEntry, 'id' | 'timestamp'>) => {
    const newEntry: QueueEntry = {
      ...entry,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    }
    setQueue((prev) => {
      const next = [...prev, newEntry]
      saveQueue(next)
      return next
    })
  }, [])

  const flush = useCallback(async () => {
    if (syncingRef.current) return
    const current = loadQueue()
    if (current.length === 0) return

    syncingRef.current = true
    setSyncing(true)

    const remaining: QueueEntry[] = []
    for (const entry of current) {
      try {
        await fetch(entry.url, {
          method: entry.method,
          headers: entry.headers,
          body: entry.body,
        })
      } catch {
        remaining.push(entry)
      }
    }

    saveQueue(remaining)
    setQueue(remaining)
    syncingRef.current = false
    setSyncing(false)
  }, [])

  // Auto-flush when coming online
  useEffect(() => {
    const handleOnline = () => {
      flush()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [flush])

  return { queue, syncing, enqueue, flush, pending: queue.length }
}
