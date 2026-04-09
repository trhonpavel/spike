import { useState, useMemo } from 'react'
import type { Player } from '../api/client'

interface Props {
  players: Player[]
  onConfirm: (groups: number[][], waitingIds: number[]) => void
  onCancel: () => void
  isPending: boolean
}

export default function ManualDrawModal({ players, onConfirm, onCancel, isPending }: Props) {
  const [assignment, setAssignment] = useState<Record<number, number>>({})
  const [numGroups, setNumGroups] = useState(1)

  const groupSizes = useMemo(() =>
    Array.from({ length: numGroups }, (_, i) =>
      Object.values(assignment).filter(g => g === i).length
    ), [assignment, numGroups])

  const currentGroupIdx = groupSizes.findIndex(size => size < 4)
  const assignedIds = new Set(Object.keys(assignment).map(Number))
  const unassigned = players.filter(p => !assignedIds.has(p.id))

  const tap = (playerId: number) => {
    if (assignedIds.has(playerId)) {
      setAssignment(prev => { const next = { ...prev }; delete next[playerId]; return next })
    } else {
      if (currentGroupIdx < 0) return
      const newSize = groupSizes[currentGroupIdx] + 1
      setAssignment(prev => ({ ...prev, [playerId]: currentGroupIdx }))
      if (newSize === 4 && players.length - (assignedIds.size + 1) >= 4) {
        setNumGroups(n => n + 1)
      }
    }
  }

  const completeCount = groupSizes.filter(s => s === 4).length
  const canSubmit = !isPending && completeCount >= 1 && currentGroupIdx < 0

  const handleSubmit = () => {
    const groups = Array.from({ length: numGroups }, (_, gi) =>
      players.filter(p => assignment[p.id] === gi).map(p => p.id)
    ).filter(g => g.length === 4)
    onConfirm(groups, unassigned.map(p => p.id))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-2 rounded-2xl border border-border overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-bold text-sm uppercase tracking-widest text-white">Manual Draw</h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            {currentGroupIdx >= 0
              ? `Building Group ${currentGroupIdx + 1} — ${groupSizes[currentGroupIdx]}/4`
              : completeCount > 0 ? `${completeCount} groups ready` : 'Tap players to assign'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {Array.from({ length: numGroups }, (_, gi) => {
            const groupPlayers = players.filter(p => assignment[p.id] === gi)
            const isActive = gi === currentGroupIdx
            return (
              <div key={gi} className={`rounded-xl p-3 border ${isActive ? 'border-brand/40 bg-brand/5' : 'border-border bg-surface-3'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-display text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-brand' : 'text-zinc-500'}`}>Group {gi + 1}</span>
                  <span className={`font-display text-[10px] font-bold ${groupSizes[gi] === 4 ? 'text-qualify' : 'text-zinc-600'}`}>{groupSizes[gi]}/4</span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {groupPlayers.map(p => (
                    <button type="button" key={p.id} onClick={() => tap(p.id)}
                      className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-white text-xs font-medium hover:border-accent-red/40 hover:text-accent-red transition-all cursor-pointer">
                      {p.name} ✕
                    </button>
                  ))}
                  {Array.from({ length: 4 - groupSizes[gi] }).map((_, i) => (
                    <div key={i} className="w-14 h-7 rounded-lg border border-dashed border-zinc-800" />
                  ))}
                </div>
              </div>
            )
          })}

          {unassigned.length > 0 && (
            <div>
              <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                {currentGroupIdx >= 0 ? 'Tap to assign' : 'Sitting out'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map(p => (
                  <button type="button" key={p.id} onClick={() => tap(p.id)} disabled={currentGroupIdx < 0}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      currentGroupIdx >= 0
                        ? 'border-border bg-surface-3 text-zinc-300 hover:border-brand/50 hover:bg-brand/10 hover:text-white cursor-pointer'
                        : 'border-border bg-surface-3 text-zinc-600 cursor-default'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
              {currentGroupIdx < 0 && (
                <p className="text-xs text-zinc-700 mt-1.5">{unassigned.length} player{unassigned.length !== 1 ? 's' : ''} will sit out</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button type="button" onClick={handleSubmit} disabled={!canSubmit}
            className="btn-brand flex-1 py-3 rounded-xl text-sm font-display font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
            {isPending ? 'Creating...' : `Start (${completeCount * 4} players)`}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-3 rounded-xl border border-border text-zinc-500 font-display text-sm font-bold uppercase tracking-wider cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
