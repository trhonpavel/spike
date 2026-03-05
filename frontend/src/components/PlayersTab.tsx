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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Players
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-surface-3 text-[10px] font-bold font-mono text-zinc-500 border border-border">
            {players.length}
          </span>
        </div>
        {players.length > 0 && players.length < 4 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Min 4</span>
          </div>
        )}
      </div>

      {/* Add player form */}
      {admin && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            className="flex-1 px-4 py-3 bg-surface-3/80 border border-border rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={addMutation.isPending || !newName.trim()}
            className="glow-btn px-5 py-3 bg-brand text-surface font-bold rounded-xl hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
          >
            {addMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin-slow inline-block" />
            ) : (
              'Add'
            )}
          </button>
        </form>
      )}

      {addMutation.isError && (
        <div className="flex items-center gap-2 text-red-400 text-sm animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {(addMutation.error as Error).message}
        </div>
      )}

      {/* Player list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin-slow" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-3 flex items-center justify-center border border-border">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-700" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <p className="text-zinc-500 font-medium">No players registered</p>
          {admin && <p className="text-zinc-700 text-sm">Add players above to get started</p>}
        </div>
      ) : (
        <ul className="divide-y divide-border/50 glass-card-strong rounded-2xl overflow-hidden">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-4/50 transition-colors">
              <div
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => setSelectedPlayer(p)}
              >
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-4 text-[11px] font-bold font-mono text-zinc-500 shrink-0">
                  {i + 1}
                </span>
                <span className="font-medium text-white truncate">{p.name}</span>
                {p.rating > 0 && (
                  <span className="text-xs font-mono text-zinc-600 shrink-0">
                    {p.rating.toFixed(1)}
                  </span>
                )}
              </div>
              {admin && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${p.name}?`)) removeMutation.mutate(p.id)
                  }}
                  className="p-2 text-zinc-700 hover:text-red-400 transition-colors rounded-lg shrink-0"
                  title={`Remove ${p.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
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
