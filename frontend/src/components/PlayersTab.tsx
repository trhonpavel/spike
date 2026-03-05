import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player } from '../api/client'
import PlayerDetailModal from './PlayerDetailModal'

interface Props {
  slug: string
  admin: boolean
  token: string | null
}

export default function PlayersTab({ slug, admin, token }: Props) {
  const [newName, setNewName] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const queryClient = useQueryClient()

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players', slug],
    queryFn: () => api.listPlayers(slug),
  })

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addMutation.mutate(newName.trim())
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
        {players.length > 0 && players.length < 4 && (
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-accent-red bg-accent-red/10 px-2.5 py-1 rounded-lg border border-accent-red/20 anim-fade">
            Min 4 needed
          </span>
        )}
      </div>

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

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
        </div>
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
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-surface-3/50 active:bg-surface-4/50 transition-colors"
              onClick={() => setSelectedPlayer(p)}
            >
              {/* Rank number */}
              <span className="font-display text-base font-bold text-zinc-600 w-7 text-right shrink-0">
                {i + 1}
              </span>

              {/* Name + rating */}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-white truncate block">{p.name}</span>
              </div>

              {p.rating > 0 && (
                <span className="font-display text-xs font-bold text-zinc-600 shrink-0 tabular-nums">
                  {p.rating.toFixed(1)}
                </span>
              )}

              {/* Remove */}
              {admin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Remove ${p.name}?`)) removeMutation.mutate(p.id)
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
          ))}
        </div>
      )}

      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          slug={slug}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
