import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'
export interface ToastItem { id: number; message: string; type: ToastType }

type Listener = (item: ToastItem) => void
const listeners = new Set<Listener>()
let counter = 0

function emit(message: string, type: ToastType) {
  const item: ToastItem = { id: ++counter, message, type }
  listeners.forEach(fn => fn(item))
}

export const toast = {
  success: (message: string) => emit(message, 'success'),
  error: (message: string) => emit(message, 'error'),
  info: (message: string) => emit(message, 'info'),
}

export function useToastListener(fn: Listener) {
  useEffect(() => {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [fn])
}
