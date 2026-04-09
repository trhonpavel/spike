import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { RoundData } from '../api/client'
import GroupCard from './GroupCard'
import ConfirmDialog from './ConfirmDialog'
import ManualDrawModal from './ManualDrawModal'
import { SkeletonCard } from './Skeleton'
import { toast } from '../hooks/useToast'

interface Props {
  slug: string
  admin: boolean
  token: string | null
}

const totalMatches = (r: RoundData) =>
  r.groups.reduce((s, g) => s + g.matches.length, 0)

const doneMatches = (r: RoundData) =>
  r.groups.reduce(
    (s, g) => s + g.matches.filter((m) => m.score_team1 !== null).length,
    0,
  )

export default function RoundsTab({ slug, admin, token }: Props) {
  const queryClient = useQueryClient()
  const [finalizeTarget, setFinalizeTarget] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [unfinalizeTarget, setUnfinalizeTarget] = useState<number | null>(null)
  const [showManualDraw, setShowManualDraw] = useState(false)

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ['rounds', slug],
    queryFn: () => api.listRounds(slug),
  })

  const { data: players = [] } = useQuery({
    queryKey: ['players', slug],
    queryFn: () => api.listPlayers(slug),
  })
  const activePlayers = players.filter((p) => p.active)

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

  const deleteMutation = useMutation({
    mutationFn: (roundId: number) => api.deleteRound(slug, roundId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      toast.success('Round deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const unfinalizeMutation = useMutation({
    mutationFn: (roundId: number) => api.unfinalizeRound(slug, roundId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      queryClient.invalidateQueries({ queryKey: ['standings', slug] })
      queryClient.invalidateQueries({ queryKey: ['players', slug] })
      toast.info('Round reopened')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const manualDrawMutation = useMutation({
    mutationFn: ({ groups, waitingIds }: { groups: number[][], waitingIds: number[] }) =>
      api.manualDrawRound(slug, groups, waitingIds, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rounds', slug] }),
  })

  const canDraw = rounds.every((r: RoundData) => r.status === 'finalized')

  const lastFinalizedId = rounds
    .filter((r: RoundData) => r.status === 'finalized')
    .reduce((last: RoundData | null, r: RoundData) => (!last || r.round_number > last.round_number ? r : last), null)?.id ?? null

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
        <div className="flex gap-2">
          <button type="button"
            onClick={() => drawMutation.mutate()}
            disabled={drawMutation.isPending}
            className="flex-1 py-4 rounded-2xl font-display text-lg font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] neon-box border border-brand/30 bg-gradient-to-r from-brand/15 via-brand/10 to-brand/15 text-brand hover:from-brand/20 hover:to-brand/20 anim-gradient"
          >
            {drawMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full anim-spin" />
                Drawing
              </span>
            ) : '+ Auto Draw'}
          </button>
          <button type="button"
            onClick={() => setShowManualDraw(true)}
            className="px-5 py-4 rounded-2xl font-display text-sm font-bold uppercase tracking-wider border border-border text-zinc-400 hover:text-white hover:border-zinc-500 transition-all cursor-pointer"
          >
            Manual
          </button>
        </div>
      )}


      {isLoading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Rounds */}
      {[...rounds].reverse().map((round: RoundData) => {
        const st = statusConfig(round.status)
        const total = totalMatches(round)
        const done = doneMatches(round)
        return (
          <div key={round.id} className="space-y-3 anim-tab-enter">
            {/* Round header */}
            <div className="flex items-center gap-3">
              <span className="score-num text-3xl text-white">{round.round_number}</span>
              <div className="flex-1">
                <span className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Round</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                    {round.status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-accent-blue anim-live" />}
                    {st.text}
                  </span>
                  {round.status !== 'finalized' && (
                    <span className={`font-display text-[10px] font-bold tabular-nums ${done === total ? 'text-qualify' : done > 0 ? 'text-accent-blue' : 'text-zinc-500'}`}>
                      {done}/{total}
                    </span>
                  )}
                </div>
              </div>
              {/* Delete button for non-finalized rounds */}
              {admin && round.status !== 'finalized' && (
                <button type="button"
                  onClick={() => setDeleteTarget(round.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-zinc-500 hover:text-accent-red transition-colors cursor-pointer disabled:opacity-30"
                  aria-label={`Delete round ${round.round_number}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              {/* Undo button for last finalized round */}
              {admin && round.status === 'finalized' && round.id === lastFinalizedId && (
                <button type="button"
                  onClick={() => setUnfinalizeTarget(round.id)}
                  disabled={unfinalizeMutation.isPending}
                  className="p-2 text-zinc-500 hover:text-status-draft transition-colors cursor-pointer disabled:opacity-30"
                  aria-label={`Undo round ${round.round_number}`}
                  title="Undo finalization"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sitting out */}
            {round.waiting_players.length > 0 && (
              <div className="text-xs text-zinc-400 bg-surface-3 rounded-xl px-3 py-2 border border-border">
                <span className="text-zinc-400 font-medium">Sitting out:</span>{' '}
                {round.waiting_players.map((p) => p.name).join(', ')}
              </div>
            )}

            {/* Action buttons */}
            {admin && round.status === 'drawn' && (
              <button type="button"
                onClick={() => confirmMutation.mutate(round.id)}
                disabled={confirmMutation.isPending}
                className="w-full py-3 border border-accent-blue/30 text-accent-blue font-display font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-accent-blue/10 transition-all cursor-pointer disabled:opacity-30"
              >
                {confirmMutation.isPending ? 'Confirming...' : 'Confirm Draw'}
              </button>
            )}

            {admin && round.status === 'confirmed' && allScoresEntered(round) && (
              <button type="button"
                onClick={() => setFinalizeTarget(round.id)}
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
        <div className="text-center py-16 space-y-2">
          <div className="score-num text-5xl text-zinc-600">0</div>
          <p className="font-display text-sm text-zinc-400 uppercase tracking-wider">No rounds yet</p>
          {admin
            ? <p className="text-zinc-500 text-sm">Use Auto Draw above to begin</p>
            : <p className="text-zinc-500 text-sm">Waiting for the organizer to start</p>
          }
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Round?"
        description="This will remove the round and all its matches. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget !== null) deleteMutation.mutate(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={unfinalizeTarget !== null}
        title="Undo Round Finalization?"
        description="This will reverse all stats and Elo changes from this round and reopen it for score editing."
        confirmLabel="Undo"
        variant="warning"
        onConfirm={() => {
          if (unfinalizeTarget !== null) unfinalizeMutation.mutate(unfinalizeTarget)
          setUnfinalizeTarget(null)
        }}
        onCancel={() => setUnfinalizeTarget(null)}
      />

      {showManualDraw && (
        <ManualDrawModal
          players={activePlayers}
          onConfirm={(groups, waitingIds) => {
            manualDrawMutation.mutate({ groups, waitingIds })
            setShowManualDraw(false)
          }}
          onCancel={() => setShowManualDraw(false)}
          isPending={manualDrawMutation.isPending}
        />
      )}
    </div>
  )
}
