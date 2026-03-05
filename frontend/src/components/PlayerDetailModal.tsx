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
  const { data: rounds = [] } = useQuery({
    queryKey: ['rounds', slug],
    queryFn: () => api.getRounds(slug),
  })

  const matches = extractPlayerMatches(rounds, player.id)
  const totalMatches = matches.length
  const wins = matches.filter(m => m.won).length
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const ballRate = player.balls_total > 0 ? Math.round((player.balls_won / player.balls_total) * 100) : 0

  return (
    <div
      className="fixed inset-0 z-50 bg-surface overflow-y-auto anim-fade"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Content — just normal flow, no overflow tricks */}
      <div className="max-w-md mx-auto px-5 py-5">
        {/* Close + name row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">
              {player.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="score-num text-xl text-brand">{player.rating.toFixed(1)}</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Rating</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { val: player.wins, label: 'Wins' },
            { val: totalMatches, label: 'Games' },
            { val: `${winRate}%`, label: 'Win%' },
            { val: `${ballRate}%`, label: 'Ball%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-2 rounded-xl p-3 text-center border border-border">
              <div className="score-num text-xl text-white">{stat.val}</div>
              <div className="font-display text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Extra stats */}
        <div className="flex gap-4 text-xs text-zinc-600 mb-5">
          <span>Balls {player.balls_won}/{player.balls_total}</span>
          <span>Sat out {player.waitings}x</span>
        </div>

        {/* Match history */}
        <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
          <h3 className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-b border-border">
            Match History
          </h3>
          {matches.length === 0 ? (
            <p className="px-4 py-5 text-zinc-700 text-sm">No matches played yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {matches.map((m, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
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

        {/* Back button at bottom */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-xl font-display text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-brand border border-border hover:border-brand/30 transition-all cursor-pointer"
        >
          ← Back
        </button>

        <div className="h-8" />
      </div>
    </div>
  )
}
