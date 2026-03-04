import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { RoundData } from '../api/client'
import GroupCard from './GroupCard'

interface Props {
  slug: string
  admin: boolean
  token: string | null
}

export default function RoundsTab({ slug, admin, token }: Props) {
  const queryClient = useQueryClient()

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ['rounds', slug],
    queryFn: () => api.listRounds(slug),
  })

  const drawMutation = useMutation({
    mutationFn: () => api.drawRound(slug, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rounds', slug] }),
  })

  const confirmMutation = useMutation({
    mutationFn: (roundId: number) => api.confirmRound(slug, roundId, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rounds', slug] }),
  })

  const finalizeMutation = useMutation({
    mutationFn: (roundId: number) => api.finalizeRound(slug, roundId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      queryClient.invalidateQueries({ queryKey: ['standings', slug] })
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
    },
  })

  const canDraw = rounds.every((r: RoundData) => r.status === 'finalized')

  const allScoresEntered = (round: RoundData) =>
    round.groups.every((g) =>
      g.matches.every((m) => m.score_team1 !== null && m.score_team2 !== null)
    )

  const statusLabel = (status: string) => {
    switch (status) {
      case 'finalized': return { text: 'Finalized', cls: 'bg-qualify/10 text-qualify border-qualify/20' }
      case 'confirmed': return { text: 'In Progress', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
      default: return { text: 'Draft', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
    }
  }

  return (
    <div className="space-y-6">
      {admin && canDraw && (
        <button
          onClick={() => drawMutation.mutate()}
          disabled={drawMutation.isPending}
          className="w-full py-3 bg-brand text-surface font-bold rounded-xl hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all text-lg"
        >
          {drawMutation.isPending ? 'Drawing...' : 'Draw New Round'}
        </button>
      )}

      {drawMutation.isError && (
        <p className="text-red-400 text-sm">{(drawMutation.error as Error).message}</p>
      )}

      {isLoading && <p className="text-zinc-600 text-center py-8">Loading...</p>}

      {[...rounds].reverse().map((round: RoundData) => {
        const st = statusLabel(round.status)
        return (
          <div key={round.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Round {round.round_number}
              </h3>
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${st.cls}`}>
                {st.text}
              </span>
            </div>

            {round.waiting_players.length > 0 && (
              <div className="text-xs text-zinc-500 bg-surface-3 rounded-lg px-3 py-2 border border-border">
                <span className="text-zinc-600">Sitting out:</span>{' '}
                {round.waiting_players.map((p) => p.name).join(', ')}
              </div>
            )}

            {admin && round.status === 'drawn' && (
              <button
                onClick={() => confirmMutation.mutate(round.id)}
                disabled={confirmMutation.isPending}
                className="w-full py-2.5 border border-blue-500/30 text-blue-400 font-semibold rounded-lg hover:bg-blue-500/10 transition-all"
              >
                {confirmMutation.isPending ? 'Confirming...' : 'Confirm Draw'}
              </button>
            )}

            {admin && round.status === 'confirmed' && allScoresEntered(round) && (
              <button
                onClick={() => {
                  if (confirm('Finalize this round? Player stats will be updated.')) {
                    finalizeMutation.mutate(round.id)
                  }
                }}
                disabled={finalizeMutation.isPending}
                className="w-full py-2.5 border border-qualify/30 text-qualify font-semibold rounded-lg hover:bg-qualify/10 transition-all"
              >
                {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize Round'}
              </button>
            )}

            {round.groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                slug={slug}
                admin={admin && round.status === 'confirmed'}
                token={token}
              />
            ))}
          </div>
        )
      })}

      {!isLoading && rounds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-600">No rounds yet</p>
          {admin && <p className="text-zinc-700 text-sm mt-1">Draw the first round to begin</p>}
        </div>
      )}
    </div>
  )
}
