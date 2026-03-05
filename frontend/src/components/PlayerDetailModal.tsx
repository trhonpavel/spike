import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, RoundData } from '../api/client'

interface Props {
  player: Player
  slug: string
  onClose: () => void
}

interface MatchRecord {
  roundNumber: number
  partner: string
  opponents: string
  score: string
  won: boolean
}

function extractPlayerMatches(rounds: RoundData[], playerId: number): MatchRecord[] {
  const records: MatchRecord[] = []
  for (const round of rounds) {
    for (const group of round.groups) {
      for (const match of group.matches) {
        if (match.score_team1 === null) continue
        const inTeam1 = match.team1_p1.id === playerId || match.team1_p2.id === playerId
        const inTeam2 = match.team2_p1.id === playerId || match.team2_p2.id === playerId
        if (!inTeam1 && !inTeam2) continue

        const isTeam1 = inTeam1
        const partner = isTeam1
          ? (match.team1_p1.id === playerId ? match.team1_p2.name : match.team1_p1.name)
          : (match.team2_p1.id === playerId ? match.team2_p2.name : match.team2_p1.name)
        const opp1 = isTeam1 ? match.team2_p1.name : match.team1_p1.name
        const opp2 = isTeam1 ? match.team2_p2.name : match.team1_p2.name
        const myScore = isTeam1 ? match.score_team1! : match.score_team2!
        const theirScore = isTeam1 ? match.score_team2! : match.score_team1!

        records.push({
          roundNumber: round.round_number,
          partner,
          opponents: `${opp1} & ${opp2}`,
          score: `${myScore}:${theirScore}`,
          won: myScore > theirScore,
        })
      }
    }
  }
  return records
}

export default function PlayerDetailModal({ player, slug, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)

  const { data: rounds = [] } = useQuery({
    queryKey: ['rounds', slug],
    queryFn: () => api.getRounds(slug),
  })

  // Block background scroll — only touch-level blocking works on iOS PWA
  useEffect(() => {
    const sheetEl = sheetRef.current

    const blockBgScroll = (e: TouchEvent) => {
      if (sheetEl?.contains(e.target as Node)) return
      e.preventDefault()
    }

    document.addEventListener('touchmove', blockBgScroll, { passive: false })
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('touchmove', blockBgScroll)
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const matches = extractPlayerMatches(rounds, player.id)
  const totalMatches = matches.length
  const wins = matches.filter(m => m.won).length
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const ballRate = player.balls_total > 0 ? Math.round((player.balls_won / player.balls_total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 anim-fade" onClick={onClose} />

      {/* Sheet — clear CSS transform after entry animation so iOS allows scroll */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 inset-x-0 mx-auto w-full max-w-md bg-surface-2 border border-border rounded-t-3xl sm:rounded-2xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 max-h-[85vh] overflow-y-scroll ${entered ? '' : 'anim-sheet sm:anim-scale'}`}
        onAnimationEnd={() => setEntered(true)}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-800" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">
              {player.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="score-num text-lg text-brand">{player.rating.toFixed(1)}</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Rating</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-600 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Stats — big numbers */}
        <div className="px-5 grid grid-cols-4 gap-2 pb-4">
          {[
            { val: player.wins, label: 'Wins' },
            { val: totalMatches, label: 'Games' },
            { val: `${winRate}%`, label: 'Win%' },
            { val: `${ballRate}%`, label: 'Ball%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-3 rounded-xl p-3 text-center border border-border">
              <div className="score-num text-xl text-white">{stat.val}</div>
              <div className="font-display text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Extra */}
        <div className="px-5 pb-3 flex gap-4 text-xs text-zinc-600">
          <span>Balls {player.balls_won}/{player.balls_total}</span>
          <span>Sat out {player.waitings}x</span>
        </div>

        {/* Match history */}
        <div className="border-t border-border">
          <h3 className="px-5 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Match History
          </h3>
          {matches.length === 0 ? (
            <p className="px-5 pb-5 text-zinc-700 text-sm">No matches played yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {matches.map((m, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className="font-display text-[10px] font-bold text-zinc-700 w-7 shrink-0">R{m.roundNumber}</span>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${m.won ? 'bg-qualify' : 'bg-accent-red'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">
                      <span className="text-zinc-600">w/</span> {m.partner}
                    </div>
                    <div className="text-xs text-zinc-700 truncate">vs {m.opponents}</div>
                  </div>
                  <span className={`score-num text-sm ${m.won ? 'text-qualify' : 'text-accent-red'}`}>
                    {m.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
