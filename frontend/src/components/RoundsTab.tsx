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
      case 'finalized': return {
        text: 'Finalized',
        cls: 'bg-qualify/10 text-qualify border-qualify/20',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
      }
      case 'confirmed': return {
        text: 'In Progress',
        cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        ),
      }
      default: return {
        text: 'Draft',
        cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        ),
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Draw button */}
      {admin && canDraw && (
        <button
          onClick={() => drawMutation.mutate()}
          disabled={drawMutation.isPending}
          className="glow-btn w-full py-4 bg-brand text-surface font-bold rounded-2xl hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all text-lg animate-pulse-glow"
        >
          {drawMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-surface/30 border-t-surface rounded-full animate-spin-slow" />
              Drawing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Draw New Round
            </span>
          )}
        </button>
      )}

      {drawMutation.isError && (
        <div className="flex items-center gap-2 text-red-400 text-sm animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {(drawMutation.error as Error).message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin-slow" />
        </div>
      )}

      {/* Rounds list */}
      {[...rounds].reverse().map((round: RoundData, idx) => {
        const st = statusLabel(round.status)
        return (
          <div key={round.id} className={`space-y-3 ${idx > 0 ? 'pt-3 border-t border-border/30' : ''}`}>
            {/* Round header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-3 text-sm font-bold font-mono text-white border border-border">
                  {round.round_number}
                </span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  Round
                </h3>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-lg border ${st.cls}`}>
                {st.icon}
                {st.text}
              </span>
            </div>

            {/* Sitting out */}
            {round.waiting_players.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-zinc-500 bg-surface-3/50 rounded-xl px-3 py-2.5 border border-border/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                  <span className="text-zinc-600 font-medium">Sitting out: </span>
                  {round.waiting_players.map((p) => p.name).join(', ')}
                </span>
              </div>
            )}

            {/* Confirm button */}
            {admin && round.status === 'drawn' && (
              <button
                onClick={() => confirmMutation.mutate(round.id)}
                disabled={confirmMutation.isPending}
                className="w-full py-3 border border-blue-500/30 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
              >
                {confirmMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin-slow" />
                    Confirming...
                  </span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Confirm Draw
                  </>
                )}
              </button>
            )}

            {/* Finalize button */}
            {admin && round.status === 'confirmed' && allScoresEntered(round) && (
              <button
                onClick={() => {
                  if (confirm('Finalize this round? Player stats will be updated.')) {
                    finalizeMutation.mutate(round.id)
                  }
                }}
                disabled={finalizeMutation.isPending}
                className="w-full py-3 border border-qualify/30 text-qualify font-semibold rounded-xl hover:bg-qualify/10 transition-all flex items-center justify-center gap-2"
              >
                {finalizeMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-qualify/30 border-t-qualify rounded-full animate-spin-slow" />
                    Finalizing...
                  </span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Finalize Round
                  </>
                )}
              </button>
            )}

            {/* Groups */}
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

      {/* Empty state */}
      {!isLoading && rounds.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-3 flex items-center justify-center border border-border">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-700" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-zinc-500 font-medium">No rounds yet</p>
          {admin && <p className="text-zinc-700 text-sm">Draw the first round to begin</p>}
        </div>
      )}
    </div>
  )
}
