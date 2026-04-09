import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, RoundData, Standing } from '../api/client'
import PlayerDetailModal from './PlayerDetailModal'
import ConfirmDialog from './ConfirmDialog'
import { toast } from '../hooks/useToast'

interface Props {
  slug: string
  admin: boolean
  token: string | null
  onSwitchTab: (tab: string) => void
}

export default function OverviewTab({ slug, admin, token, onSwitchTab }: Props) {
  const queryClient = useQueryClient()
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [finalizeTarget, setFinalizeTarget] = useState<number | null>(null)

  const { data: players = [] } = useQuery({
    queryKey: ['players', slug],
    queryFn: () => api.listPlayers(slug),
  })

  const { data: rounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: ['rounds', slug],
    queryFn: () => api.listRounds(slug),
  })

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', slug],
    queryFn: () => api.getStandings(slug),
  })

  const drawMutation = useMutation({
    mutationFn: () => api.drawRound(slug, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      toast.success('Round drawn!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmMutation = useMutation({
    mutationFn: (roundId: number) => api.confirmRound(slug, roundId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      toast.success('Round confirmed')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const finalizeMutation = useMutation({
    mutationFn: (roundId: number) => api.finalizeRound(slug, roundId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      queryClient.invalidateQueries({ queryKey: ['standings', slug] })
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
      toast.success('Round finalized — stats updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const totalRounds = rounds.length
  const finishedRounds = rounds.filter((r: RoundData) => r.status === 'finalized').length
  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
  const leader = standings.length > 0 ? standings[0] : null

  const allScoresEntered = (round: RoundData) =>
    round.groups.every((g) =>
      g.matches.every((m) => m.score_team1 !== null && m.score_team2 !== null)
    )

  const totalMatches = latestRound
    ? latestRound.groups.reduce((sum, g) => sum + g.matches.length, 0)
    : 0
  const scoredMatches = latestRound
    ? latestRound.groups.reduce(
        (sum, g) => sum + g.matches.filter((m) => m.score_team1 !== null && m.score_team2 !== null).length,
        0
      )
    : 0

  const canDraw = rounds.every((r: RoundData) => r.status === 'finalized')
  const anyMutating = drawMutation.isPending || confirmMutation.isPending || finalizeMutation.isPending

  // Determine admin action
  let adminAction: { label: string; onClick: () => void; style: string } | null = null
  if (admin) {
    if (rounds.length === 0) {
      adminAction = {
        label: 'Draw Round 1',
        onClick: () => drawMutation.mutate(),
        style: 'neon-box border border-brand/30 bg-gradient-to-r from-brand/15 via-brand/10 to-brand/15 text-brand hover:from-brand/20 hover:to-brand/20 anim-gradient',
      }
    } else if (latestRound?.status === 'drawn') {
      adminAction = {
        label: `Confirm Round ${latestRound.round_number}`,
        onClick: () => confirmMutation.mutate(latestRound.id),
        style: 'border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10',
      }
    } else if (latestRound?.status === 'confirmed' && allScoresEntered(latestRound)) {
      adminAction = {
        label: `Finalize Round ${latestRound.round_number}`,
        onClick: () => setFinalizeTarget(latestRound.id),
        style: 'border border-qualify/30 text-qualify hover:bg-qualify/10',
      }
    } else if (latestRound?.status === 'confirmed' && !allScoresEntered(latestRound)) {
      adminAction = {
        label: 'Enter Scores →',
        onClick: () => onSwitchTab('rounds'),
        style: 'border border-status-draft/30 text-status-draft hover:bg-status-draft/10',
      }
    } else if (canDraw && rounds.length > 0) {
      adminAction = {
        label: 'Draw Next Round',
        onClick: () => drawMutation.mutate(),
        style: 'neon-box border border-brand/30 bg-gradient-to-r from-brand/15 via-brand/10 to-brand/15 text-brand hover:from-brand/20 hover:to-brand/20 anim-gradient',
      }
    }
  }

  const statusText = (status: string) => {
    switch (status) {
      case 'finalized': return { text: 'Done', color: 'text-qualify', bg: 'bg-qualify/10', border: 'border-qualify/20' }
      case 'confirmed': return { text: 'Live', color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/20' }
      default: return { text: 'Draft', color: 'text-status-draft', bg: 'bg-status-draft/10', border: 'border-status-draft/20' }
    }
  }

  return (
    <div className="space-y-4 stagger">
      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 rounded-2xl border border-border p-4 text-center">
          <div className="score-num text-3xl text-white">{players.length}</div>
          <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Players</div>
        </div>
        <div className="bg-surface-2 rounded-2xl border border-border p-4 text-center">
          <div className="score-num text-3xl text-white">
            {totalRounds > 0 ? `${finishedRounds}/${totalRounds}` : '—'}
          </div>
          <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Rounds</div>
        </div>
        <div className="bg-surface-2 rounded-2xl border border-border p-4 text-center overflow-hidden">
          <div className="score-num text-xl text-white truncate" title={leader?.player.name}>
            {leader ? leader.player.name : '—'}
          </div>
          <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Leader</div>
        </div>
      </div>

      {/* Current round card */}
      {latestRound ? (
        <button type="button"
          onClick={() => onSwitchTab('rounds')}
          className="w-full bg-surface-2 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-surface-3/50 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="score-num text-lg text-white">Round {latestRound.round_number}</span>
              {(() => {
                const st = statusText(latestRound.status)
                return (
                  <span className={`inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                    {latestRound.status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-accent-blue anim-live" />}
                    {st.text}
                  </span>
                )
              })()}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          {latestRound.status !== 'finalized' && totalMatches > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {scoredMatches}/{totalMatches} matches scored
                </span>
                <span className="font-display text-[10px] font-bold text-zinc-500">
                  {totalMatches > 0 ? Math.round((scoredMatches / totalMatches) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${scoredMatches === totalMatches ? 'bg-qualify' : 'bg-brand'}`}
                  style={{ width: `${totalMatches > 0 ? (scoredMatches / totalMatches) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {latestRound.status === 'finalized' && (
            <span className="font-display text-xs text-zinc-500">
              All {totalMatches} matches completed
            </span>
          )}
        </button>
      ) : !roundsLoading ? (
        <div className="bg-surface-2 rounded-2xl border border-border p-8 text-center space-y-2">
          <div className="score-num text-5xl text-zinc-600 mb-1">0</div>
          <p className="font-display text-sm text-zinc-400 uppercase tracking-wider">No rounds yet</p>
          {admin
            ? <p className="text-zinc-500 text-xs">Use the button below to draw round 1</p>
            : <p className="text-zinc-500 text-xs">Waiting for the organizer to start</p>
          }
        </div>
      ) : null}

      {/* Admin action strip */}
      {adminAction && (
        <button type="button"
          onClick={adminAction.onClick}
          disabled={anyMutating}
          className={`w-full py-4 rounded-2xl font-display text-base font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] ${adminAction.style}`}
        >
          {anyMutating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full anim-spin" />
              Working...
            </span>
          ) : adminAction.label}
        </button>
      )}

      {/* Top 5 mini-leaderboard */}
      {standings.length > 0 && (
        <div>
          <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-border text-zinc-500">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest w-10">#</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest flex-1">Player</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest w-14 text-right">Pts</span>
            </div>
            {standings.slice(0, 5).map((s: Standing) => (
              <div
                key={s.player.id}
                onClick={() => setSelectedPlayer(s.player)}
                className="flex items-center px-4 py-2.5 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors active:bg-surface-4/50 hover:bg-surface-3/50"
              >
                <span className={`font-display text-base font-black w-10 shrink-0 ${
                  s.rank === 1 ? 'rank-1' :
                  s.rank === 2 ? 'rank-2' :
                  s.rank === 3 ? 'rank-3' :
                  'text-zinc-500'
                }`}>
                  {s.rank}
                </span>
                <span className="flex-1 min-w-0 font-medium text-white truncate">{s.player.name}</span>
                <span className="font-display text-base font-black w-14 text-right tabular-nums text-brand">
                  {s.player.rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          <button type="button"
            onClick={() => onSwitchTab('standings')}
            className="w-full mt-2 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-brand border border-border hover:border-brand/30 transition-all cursor-pointer"
          >
            View Full Standings
          </button>
        </div>
      )}

      <ConfirmDialog
        open={finalizeTarget !== null}
        title="Finalize Round?"
        description="This will process all scores and update player statistics. This cannot be undone."
        confirmLabel="Finalize"
        variant="warning"
        onConfirm={() => {
          if (finalizeTarget !== null) finalizeMutation.mutate(finalizeTarget)
          setFinalizeTarget(null)
        }}
        onCancel={() => setFinalizeTarget(null)}
      />

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
