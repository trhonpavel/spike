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
  const winRate = matches.length > 0
    ? Math.round((matches.filter(m => m.won).length / matches.length) * 100)
    : 0
  const ballRate = player.balls_total > 0
    ? Math.round((player.balls_won / player.balls_total) * 100)
    : 0

  const statCards = [
    { value: player.wins, label: 'Wins', color: 'border-t-brand' },
    { value: matches.length, label: 'Games', color: 'border-t-blue-500' },
    { value: `${winRate}%`, label: 'Win%', color: 'border-t-qualify' },
    { value: `${ballRate}%`, label: 'Ball%', color: 'border-t-amber-500' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/70 animate-fade-backdrop" />
      <div
        className="relative w-full max-w-md bg-surface-2 rounded-t-3xl sm:rounded-2xl border border-border/50 max-h-[85vh] overflow-y-auto animate-slide-up-modal sm:animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{player.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-zinc-500">Rating</span>
              <span className="text-sm font-bold font-mono text-brand">{player.rating.toFixed(1)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-600 hover:text-white transition-colors rounded-xl hover:bg-surface-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Stats grid */}
        <div className="px-5 grid grid-cols-4 gap-2 pb-4">
          {statCards.map((stat) => (
            <div key={stat.label} className={`bg-surface-3 rounded-xl p-3 text-center border-t-2 ${stat.color}`}>
              <div className="text-lg font-bold font-mono text-white">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Extra stats */}
        <div className="px-5 pb-3 flex gap-4 text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            Balls: {player.balls_won}/{player.balls_total}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            Waitings: {player.waitings}
          </span>
        </div>

        {/* Match history */}
        <div className="border-t border-border/50">
          <h3 className="px-5 py-3 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Match History
          </h3>
          {matches.length === 0 ? (
            <p className="px-5 pb-5 text-zinc-600 text-sm">No matches played yet</p>
          ) : (
            <div className="divide-y divide-border/30">
              {matches.map((m, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-3/30 transition-colors">
                  <span className="text-[10px] font-mono text-zinc-600 w-6 shrink-0 text-center">R{m.roundNumber}</span>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${m.won ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">
                      <span className="text-zinc-600">w/</span> {m.partner}
                    </div>
                    <div className="text-xs text-zinc-600 truncate">vs {m.opponents}</div>
                  </div>
                  <span className={`font-mono font-bold text-sm ${m.won ? 'text-green-400' : 'text-red-400'}`}>
                    {m.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacing for mobile safe area */}
        <div className="h-6" />
      </div>
    </div>
  )
}
