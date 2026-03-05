import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { MatchData } from '../api/client'
import ScoreStepper from './ScoreStepper'

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
    },
  })

  const hasScore = match.score_team1 !== null
  const team1 = `${match.team1_p1.name} & ${match.team1_p2.name}`
  const team2 = `${match.team2_p1.name} & ${match.team2_p2.name}`

  // Read-only view
  if (hasScore && !editing) {
    const s1 = match.score_team1!
    const s2 = match.score_team2!
    const t1Won = s1 > s2
    const t2Won = s2 > s1
    return (
      <div className="px-4 py-3 flex items-center justify-between group">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {t1Won && <span className="w-1 h-4 rounded-full bg-brand shrink-0" />}
            <span className={`text-sm truncate ${t1Won ? 'font-semibold text-white' : 'text-zinc-500'}`}>
              {team1}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {t2Won && <span className="w-1 h-4 rounded-full bg-brand shrink-0" />}
            <span className={`text-sm truncate ${t2Won ? 'font-semibold text-white' : 'text-zinc-500'}`}>
              {team2}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <div className="text-right space-y-0.5">
            <div className={`text-lg font-mono leading-tight ${t1Won ? 'font-bold text-brand' : 'text-zinc-600'}`}>
              {s1}
            </div>
            <div className={`text-lg font-mono leading-tight ${t2Won ? 'font-bold text-brand' : 'text-zinc-600'}`}>
              {s2}
            </div>
          </div>
          {admin && (
            <button
              onClick={() => {
                setScore1(s1)
                setScore2(s2)
                setEditing(true)
              }}
              className="p-2 text-zinc-700 hover:text-brand transition-colors rounded-lg opacity-0 group-hover:opacity-100"
              title="Edit score"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Pending (non-admin)
  if (!admin && !hasScore) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm text-zinc-400 truncate">{team1}</div>
            <div className="text-sm text-zinc-400 truncate">{team2}</div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-wider">Pending</span>
          </div>
        </div>
      </div>
    )
  }

  // Score entry form
  return (
    <div className="px-4 py-4 space-y-3">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-300 flex-1 min-w-0 truncate">{team1}</span>
          <ScoreStepper value={score1} onChange={setScore1} />
        </div>

        <div className="flex items-center justify-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-700">vs</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-300 flex-1 min-w-0 truncate">{team2}</span>
          <ScoreStepper value={score2} onChange={setScore2} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="glow-btn flex-1 py-3 bg-brand text-surface text-sm font-bold rounded-xl hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin-slow" />
              Saving...
            </span>
          ) : (
            'Save Score'
          )}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(false)
              setScore1(match.score_team1 ?? 0)
              setScore2(match.score_team2 ?? 0)
            }}
            className="px-5 py-3 text-zinc-500 hover:text-zinc-300 text-sm font-medium rounded-xl hover:bg-surface-3 transition-all"
          >
            Cancel
          </button>
        )}
      </div>
      {mutation.isError && (
        <div className="flex items-center gap-2 text-red-400 text-xs animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {(mutation.error as Error).message}
        </div>
      )}
    </div>
  )
}
