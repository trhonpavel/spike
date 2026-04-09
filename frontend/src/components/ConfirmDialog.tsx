import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'warning',
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmColor = variant === 'danger'
    ? 'bg-accent-red text-white hover:bg-accent-red/90'
    : 'bg-status-draft text-black hover:bg-status-draft/90'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade" />
      <div
        className="relative bg-surface-2 border border-border rounded-2xl p-6 w-full max-w-sm anim-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold text-white uppercase tracking-wide mb-2">
          {title}
        </h3>
        <p className="text-sm text-zinc-400 mb-6">{description}</p>
        <div className="flex gap-3">
          <button type="button"
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-display font-bold text-sm uppercase tracking-wider text-zinc-400 border border-border hover:bg-surface-3 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-display font-bold text-sm uppercase tracking-wider transition-all cursor-pointer ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
