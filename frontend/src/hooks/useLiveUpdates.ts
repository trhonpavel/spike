import { useEffect, useRef, useCallback } from 'react'
import { getSessionToken } from '../api/client'

export function useLiveUpdates(slug: string, onEvent: (event: string) => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const token = getSessionToken()
    const qs = token ? `?token=${encodeURIComponent(token)}` : ''
    const ws = new WebSocket(`${proto}//${location.host}/ws/${slug}${qs}`)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onEventRef.current(msg.event)
      } catch { /* malformed message */ }
    }

    ws.onerror = () => {
      ws.close()
    }

    return ws
  }, [slug])

  useEffect(() => {
    let ws = connect()
    let retryTimeout: ReturnType<typeof setTimeout>
    let retries = 0

    ws.onclose = scheduleReconnect

    function scheduleReconnect() {
      if (retries >= 10) return
      const delay = Math.min(1000 * 2 ** retries, 30000)
      retries++
      retryTimeout = setTimeout(() => {
        ws = connect()
        ws.onopen = () => { retries = 0 }
        ws.onclose = scheduleReconnect
      }, delay)
    }

    function handleVisibilityChange() {
      if (!document.hidden && ws.readyState === WebSocket.CLOSED) {
        clearTimeout(retryTimeout)
        retries = 0
        ws = connect()
        ws.onopen = () => { retries = 0 }
        ws.onclose = scheduleReconnect
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(retryTimeout)
      retries = 10 // prevent reconnect during cleanup
      ws.close()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connect])
}
