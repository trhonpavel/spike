import { useState, useCallback } from 'react'
import { useToastListener, type ToastItem } from '../hooks/useToast'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((item: ToastItem) => {
    setToasts(prev => [...prev, item])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== item.id))
    }, 3000)
  }, [])

  useToastListener(add)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-display text-sm font-bold uppercase tracking-wider shadow-lg anim-slide pointer-events-auto ${
            t.type === 'success' ? 'bg-qualify text-black' :
            t.type === 'error'   ? 'bg-accent-red text-white' :
                                   'bg-accent-blue text-white'
          }`}
        >
          {t.type === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {t.type === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
