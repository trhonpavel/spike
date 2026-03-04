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
    return (
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className={`text-sm truncate ${s1 > s2 ? 'font-medium text-white' : 'text-zinc-500'}`}>
            {team1}
          </div>
          <div className={`text-sm truncate ${s2 > s1 ? 'font-medium text-white' : 'text-zinc-500'}`}>
            {team2}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <div className="text-right">
            <div className={`text-lg font-mono ${s1 > s2 ? 'font-bold text-brand' : 'text-zinc-600'}`}>
              {s1}
            </div>
            <div className={`text-lg font-mono ${s2 > s1 ? 'font-bold text-brand' : 'text-zinc-600'}`}>
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
              className="p-1.5 text-zinc-600 hover:text-brand transition-colors rounded"
              title="Edit score"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
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
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-400 truncate">{team1}</div>
            <div className="text-[10px] text-zinc-700 my-0.5">vs</div>
            <div className="text-sm text-zinc-400 truncate">{team2}</div>
          </div>
          <span className="text-[10px] font-mono text-zinc-700 ml-2">--:--</span>
        </div>
      </div>
    )
  }

  // Score entry form with steppers
  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-300 flex-1 min-w-0 truncate">{team1}</span>
        <ScoreStepper value={score1} onChange={setScore1} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-300 flex-1 min-w-0 truncate">{team2}</span>
        <ScoreStepper value={score2} onChange={setScore2} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex-1 py-2.5 bg-brand text-surface text-sm font-semibold rounded-lg hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {mutation.isPending ? 'Saving...' : 'Save Score'}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(false)
              setScore1(match.score_team1 ?? 0)
              setScore2(match.score_team2 ?? 0)
            }}
            className="px-4 py-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      {mutation.isError && (
        <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
      )}
    </div>
  )
}
