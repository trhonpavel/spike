import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, RoundData } from '../api/client'
import PlayerDetailModal from './PlayerDetailModal'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonTable } from './Skeleton'

interface Props {
  slug: string
  admin: boolean
  token: string | null
}

export default function PlayersTab({ slug, admin, token }: Props) {
  const [newName, setNewName] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Player | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const queryClient = useQueryClient()

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players', slug],
    queryFn: () => api.listPlayers(slug),
  })

  const { data: rounds = [] } = useQuery<RoundData[]>({
    queryKey: ['rounds', slug],
    queryFn: () => api.listRounds(slug),
  })

  const hasFinalizedRound = rounds.some((r) => r.status === 'finalized')
  const avgElo =
    players.length > 0
      ? Math.round(players.reduce((s, p) => s + p.elo_rating, 0) / players.length)
      : 1500

  const addMutation = useMutation({
    mutationFn: (name: string) => api.addPlayer(slug, name, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
      setNewName('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.removePlayer(slug, id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.setPlayerActive(slug, id, active, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.renamePlayer(slug, id, name, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
      setEditingId(null)
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (players: { name: string; elo_rating?: number }[]) =>
      api.bulkAddPlayers(slug, players, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
      setShowBulkImport(false)
      setBulkText('')
    },
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addMutation.mutate(newName.trim())
  }

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').filter((l) => l.trim())
    const players = lines.map((line) => {
      const parts = line.split(':')
      const name = parts[0].trim()
      const elo = parts[1] ? parseFloat(parts[1].trim()) : undefined
      return { name, ...(elo && !isNaN(elo) ? { elo_rating: elo } : {}) }
    }).filter((p) => p.name)
    if (players.length > 0) bulkMutation.mutate(players)
  }

  const startEdit = (e: React.MouseEvent, p: Player) => {
    e.stopPropagation()
    setEditingId(p.id)
    setEditName(p.name)
  }

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editName.trim() || editingId === null) return
    renameMutation.mutate({ id: editingId, name: editName.trim() })
  }

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-lg text-white uppercase tracking-wide">
            Players
          </h2>
          <span className="font-display text-sm font-bold text-brand">{players.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {admin && (
            <button
              onClick={() => setShowBulkImport(!showBulkImport)}
              className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-brand px-2.5 py-1 rounded-lg border border-border hover:border-brand/30 transition-all cursor-pointer"
            >
              Import
            </button>
          )}
          {players.length > 0 && players.length < 4 && (
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-accent-red bg-accent-red/10 px-2.5 py-1 rounded-lg border border-accent-red/20 anim-fade">
              Min 4 needed
            </span>
          )}
        </div>
      </div>

      {/* Bulk import */}
      {showBulkImport && admin && (
        <div className="bg-surface-2 rounded-2xl border border-border p-4 space-y-3 anim-fade">
          <label className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">
            Bulk Import (one per line, optional name:elo)
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Alice\nBob:1600\nCharlie"}
            className="w-full px-4 py-3 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 transition-all text-sm resize-none h-28"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBulkImport}
              disabled={bulkMutation.isPending || !bulkText.trim()}
              className="btn-brand px-5 py-2.5 rounded-xl font-display font-bold text-sm uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {bulkMutation.isPending ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => { setShowBulkImport(false); setBulkText('') }}
              className="px-5 py-2.5 rounded-xl font-display font-bold text-sm uppercase tracking-wider text-zinc-500 border border-border hover:bg-surface-3 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
          {bulkMutation.isError && (
            <p className="text-accent-red text-sm">{(bulkMutation.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Add form */}
      {admin && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <label htmlFor="add-player" className="sr-only">Player name</label>
          <input
            id="add-player"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            className="flex-1 min-w-0 px-4 py-3 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 transition-all text-base"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={addMutation.isPending || !newName.trim()}
            className="btn-brand px-6 py-3 rounded-xl font-display font-bold text-sm uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {addMutation.isPending ? (
              <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full anim-spin inline-block" />
            ) : 'Add'}
          </button>
        </form>
      )}

      {addMutation.isError && (
        <p className="text-accent-red text-sm font-medium anim-fade">{(addMutation.error as Error).message}</p>
      )}

      {/* Fair Elo warning */}
      {admin && hasFinalizedRound && (
        <p className="text-xs text-status-draft anim-fade">
          Tournament in progress — new player starts at avg Elo ({avgElo})
        </p>
      )}

      {/* Inactive players note */}
      {admin && players.some(p => !p.active) && (
        <p className="text-xs text-zinc-600 anim-fade">
          Inactive players are excluded from future rounds but their stats are kept.
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : players.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <div className="score-num text-5xl text-zinc-800">0</div>
          <p className="font-display text-sm text-zinc-600 uppercase tracking-wider">No players yet</p>
          {admin && <p className="text-zinc-700 text-sm">Add players to get started</p>}
        </div>
      ) : (
        <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-surface-3/50 active:bg-surface-4/50 transition-colors anim-fade ${!p.active ? 'opacity-50' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => editingId !== p.id && setSelectedPlayer(p)}
            >
              <span className="font-display text-base font-bold text-zinc-600 w-7 text-right shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {editingId === p.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(e as unknown as React.MouseEvent)
                      if (e.key === 'Escape') cancelEdit(e as unknown as React.MouseEvent)
                    }}
                    className="w-full px-2 py-1 bg-surface-3 border border-brand/50 rounded-lg text-white text-sm focus:outline-none"
                    maxLength={100}
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate block ${p.active ? 'text-white' : 'text-zinc-600 line-through'}`}>
                      {p.name}
                    </span>
                    {!p.active && (
                      <span className="font-display text-[9px] font-bold uppercase tracking-widest text-zinc-700 border border-zinc-800 px-1 rounded shrink-0">
                        left
                      </span>
                    )}
                  </div>
                )}
              </div>
              {editingId === p.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={saveEdit}
                    disabled={renameMutation.isPending || !editName.trim()}
                    className="px-2.5 py-1 rounded-lg bg-qualify/20 text-qualify font-display text-[10px] font-bold uppercase tracking-wider hover:bg-qualify/30 transition-colors cursor-pointer disabled:opacity-30"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-2.5 py-1 rounded-lg text-zinc-500 font-display text-[10px] font-bold uppercase tracking-wider hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  {p.rating > 0 && p.active && (
                    <span className="font-display text-xs font-bold text-zinc-600 shrink-0 tabular-nums">
                      {p.rating.toFixed(1)}
                    </span>
                  )}
                  {admin && (
                    <div className="flex items-center shrink-0">
                      {p.active && (
                        <button
                          onClick={(e) => startEdit(e, p)}
                          className="p-2 text-zinc-700 hover:text-brand transition-colors cursor-pointer"
                          aria-label={`Rename ${p.name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      )}
                      {/* Toggle active — always visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleActiveMutation.mutate({ id: p.id, active: !p.active })
                        }}
                        disabled={toggleActiveMutation.isPending}
                        className={`p-2 transition-colors cursor-pointer disabled:opacity-30 ${p.active ? 'text-zinc-700 hover:text-accent-orange' : 'text-zinc-700 hover:text-qualify'}`}
                        aria-label={p.active ? `Deactivate ${p.name}` : `Reactivate ${p.name}`}
                        title={p.active ? 'Mark as left (exclude from draw)' : 'Return to tournament'}
                      >
                        {p.active ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      {/* Delete — only if never been in any round */}
                      {p.games_played === 0 && p.waitings === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRemoveTarget(p)
                          }}
                          className="p-2 -mr-2 text-zinc-700 hover:text-accent-red transition-colors cursor-pointer"
                          aria-label={`Remove ${p.name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {renameMutation.isError && (
        <p className="text-accent-red text-sm font-medium anim-fade">{(renameMutation.error as Error).message}</p>
      )}

      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          slug={slug}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Player?"
        description={`Remove ${removeTarget?.name} from the tournament. This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget.id)
          setRemoveTarget(null)
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
