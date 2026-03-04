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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Players <span className="text-zinc-600">({players.length})</span>
        </h2>
        {players.length < 4 && players.length > 0 && (
          <span className="text-xs text-red-400 font-mono">min 4 required</span>
        )}
      </div>

      {admin && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            className="flex-1 px-3 py-2.5 bg-surface-3 border border-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={addMutation.isPending || !newName.trim()}
            className="px-5 py-2.5 bg-brand text-surface font-semibold rounded-lg hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {addMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}

      {addMutation.isError && (
        <p className="text-red-400 text-sm">{(addMutation.error as Error).message}</p>
      )}

      {isLoading ? (
        <p className="text-zinc-600 text-center py-8">Loading...</p>
      ) : players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600">No players registered</p>
          {admin && <p className="text-zinc-700 text-sm mt-1">Add players above to get started</p>}
        </div>
      ) : (
        <ul className="divide-y divide-border bg-surface-2 rounded-xl border border-border overflow-hidden">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => setSelectedPlayer(p)}
              >
                <span className="text-xs font-mono text-zinc-600 w-5 text-right">{i + 1}</span>
                <span className="font-medium text-white truncate">{p.name}</span>
                {p.rating > 0 && (
                  <span className="text-xs font-mono text-zinc-500 shrink-0">
                    {p.rating.toFixed(1)}
                  </span>
                )}
              </div>
              {admin && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${p.name}?`)) removeMutation.mutate(p.id)
                  }}
                  className="text-zinc-600 hover:text-red-400 text-xs font-mono uppercase tracking-wider transition-colors"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
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
