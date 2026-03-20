import { useEffect, useRef, useCallback } from 'react'

const PERMISSION_KEY = 'spike_notif_asked'

export function usePushNotifications(tournamentName?: string) {
  const permissionRef = useRef(Notification?.permission || 'default')

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (localStorage.getItem(PERMISSION_KEY)) return false

    localStorage.setItem(PERMISSION_KEY, '1')
    const result = await Notification.requestPermission()
    permissionRef.current = result
    return result === 'granted'
  }, [])

  const notify = useCallback((event: string) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!document.hidden) return // Only notify when tab is in background

    const name = tournamentName || 'Tournament'
    let title = 'Spike'
    let body = ''

    switch (event) {
      case 'round_drawn':
        title = 'New Round Drawn'
        body = `${name}: A new round has been drawn!`
        break
      case 'round_finalized':
        title = 'Round Finalized'
        body = `${name}: Results are in — check the standings!`
        break
      case 'score_updated':
        title = 'Score Updated'
        body = `${name}: A match score was updated.`
        break
      default:
        return
    }

    try {
      new Notification(title, {
        body,
        icon: '/pwa-192.png',
        tag: `spike-${event}`, // Prevents duplicate notifications
      })
    } catch {
      // Notification constructor failed (e.g., service worker context)
    }
  }, [tournamentName])

  // Request permission on mount (once per session)
  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  return { notify, requestPermission }
}
