import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { MatchData } from '../api/client'
import ScoreStepper from './ScoreStepper'
import { toast } from '../hooks/useToast'

interface Props {
  match: MatchData
  slug: string
  admin: boolean
  token: string | null
}

export default function MatchScoreInput({ match, slug, admin, token }: Props) {
  const [score1, setScore1] = useState(match.score_team1 ?? 0)
  const [score2, setScore2] = useState(match.score_team2 ?? 0)
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      api.setScore(slug, match.id, score1, score2, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
      setEditing(false)
      toast.success('Score saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const hasScore = match.score_team1 !== null
  const team1 = `${match.team1_p1.name} & ${match.team1_p2.name}`
  const team2 = `${match.team2_p1.name} & ${match.team2_p2.name}`

  // ═══ SCOREBOARD VIEW (has score, not editing) ═══
  if (hasScore && !editing) {
    const s1 = match.score_team1!
    const s2 = match.score_team2!
    const t1Won = s1 > s2
    const t2Won = s2 > s1
    return (
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Teams + scores */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Team 1 */}
          <div className="flex items-center gap-3">
            <span className={`score-num text-2xl w-8 text-center ${t1Won ? 'text-brand' : 'text-zinc-500'}`}>
              {s1}
            </span>
            <div className={`h-5 w-0.5 rounded-full ${t1Won ? 'bg-brand' : 'bg-transparent'}`} />
            <span className={`text-sm truncate ${t1Won ? 'font-semibold text-white' : 'text-zinc-500'}`}>
              {team1}
            </span>
          </div>
          {/* Team 2 */}
          <div className="flex items-center gap-3">
            <span className={`score-num text-2xl w-8 text-center ${t2Won ? 'text-brand' : 'text-zinc-500'}`}>
              {s2}
            </span>
            <div className={`h-5 w-0.5 rounded-full ${t2Won ? 'bg-brand' : 'bg-transparent'}`} />
            <span className={`text-sm truncate ${t2Won ? 'font-semibold text-white' : 'text-zinc-500'}`}>
              {team2}
            </span>
          </div>
        </div>

        {/* Edit button */}
        {admin && (
          <button type="button"
            onClick={() => { setScore1(s1); setScore2(s2); setEditing(true) }}
            className="p-2 text-zinc-700 hover:text-brand transition-colors cursor-pointer"
            aria-label="Edit score"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  // ═══ PENDING VIEW (non-admin, no score) ═══
  if (!admin && !hasScore) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-zinc-500 truncate">{team1}</p>
            <p className="text-sm text-zinc-500 truncate">{team2}</p>
          </div>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-surface-4 px-2 py-1 rounded">
            TBD
          </span>
        </div>
      </div>
    )
  }

  // ═══ SCORE ENTRY ═══
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Team 1 */}
      <div>
        <p className="font-display text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{team1}</p>
        <ScoreStepper value={score1} onChange={setScore1} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500">vs</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Team 2 */}
      <div>
        <p className="font-display text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{team2}</p>
        <ScoreStepper value={score2} onChange={setScore2} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="btn-brand flex-1 py-3.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full anim-spin" />
              Saving
            </span>
          ) : 'Save Score'}
        </button>
        {editing && (
          <button type="button"
            onClick={() => { setEditing(false); setScore1(match.score_team1 ?? 0); setScore2(match.score_team2 ?? 0) }}
            className="px-5 py-3.5 text-zinc-500 hover:text-white font-display font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-surface-3 transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
