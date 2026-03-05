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

  const statusConfig = (status: string) => {
    switch (status) {
      case 'finalized': return { text: 'Done', color: 'text-qualify', bg: 'bg-qualify/10', border: 'border-qualify/20' }
      case 'confirmed': return { text: 'Live', color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/20' }
      default: return { text: 'Draft', color: 'text-status-draft', bg: 'bg-status-draft/10', border: 'border-status-draft/20' }
    }
  }

  return (
    <div className="space-y-5">
      {/* Draw CTA */}
      {admin && canDraw && (
        <button
          onClick={() => drawMutation.mutate()}
          disabled={drawMutation.isPending}
          className="w-full py-4 rounded-2xl font-display text-lg font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] neon-box border border-brand/30 bg-gradient-to-r from-brand/15 via-brand/10 to-brand/15 text-brand hover:from-brand/20 hover:to-brand/20 anim-gradient"
        >
          {drawMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full anim-spin" />
              Drawing
            </span>
          ) : '+ Draw New Round'}
        </button>
      )}

      {drawMutation.isError && (
        <p className="text-accent-red text-sm font-medium anim-fade">{(drawMutation.error as Error).message}</p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
        </div>
      )}

      {/* Rounds */}
      {[...rounds].reverse().map((round: RoundData) => {
        const st = statusConfig(round.status)
        return (
          <div key={round.id} className="space-y-3">
            {/* Round header */}
            <div className="flex items-center gap-3">
              <span className="score-num text-3xl text-white">{round.round_number}</span>
              <div>
                <span className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Round</span>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                    {round.status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-accent-blue anim-live" />}
                    {st.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Sitting out */}
            {round.waiting_players.length > 0 && (
              <div className="text-xs text-zinc-600 bg-surface-3 rounded-xl px-3 py-2 border border-border">
                <span className="text-zinc-500 font-medium">Sitting out:</span>{' '}
                {round.waiting_players.map((p) => p.name).join(', ')}
              </div>
            )}

            {/* Action buttons */}
            {admin && round.status === 'drawn' && (
              <button
                onClick={() => confirmMutation.mutate(round.id)}
                disabled={confirmMutation.isPending}
                className="w-full py-3 border border-accent-blue/30 text-accent-blue font-display font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-accent-blue/10 transition-all cursor-pointer disabled:opacity-30"
              >
                {confirmMutation.isPending ? 'Confirming...' : 'Confirm Draw'}
              </button>
            )}

            {admin && round.status === 'confirmed' && allScoresEntered(round) && (
              <button
                onClick={() => {
                  if (confirm('Finalize this round? Stats will update.')) finalizeMutation.mutate(round.id)
                }}
                disabled={finalizeMutation.isPending}
                className="w-full py-3 border border-qualify/30 text-qualify font-display font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-qualify/10 transition-all cursor-pointer disabled:opacity-30"
              >
                {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize Round'}
              </button>
            )}

            {/* Groups */}
            <div className="space-y-3">
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
          </div>
        )
      })}

      {/* Empty */}
      {!isLoading && rounds.length === 0 && (
        <div className="text-center py-20 space-y-2">
          <div className="score-num text-5xl text-zinc-800">0</div>
          <p className="font-display text-sm text-zinc-600 uppercase tracking-wider">No rounds yet</p>
          {admin && <p className="text-zinc-700 text-sm">Draw the first round to begin</p>}
        </div>
      )}
    </div>
  )
}
