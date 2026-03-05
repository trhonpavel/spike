import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, RoundData, PlayerStats, PartnerRecord, MatchPlayerStatData } from '../api/client'

interface Props {
  player: Player
  slug: string
  onClose: () => void
}

interface MatchRecord {
  roundNumber: number
  matchId: number
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
          matchId: match.id,
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

  const { data: advancedStats } = useQuery<PlayerStats>({
    queryKey: ['playerStats', slug, player.id],
    queryFn: () => api.getPlayerStats(slug, player.id),
  })

  const { data: partnerRecords } = useQuery<PartnerRecord[]>({
    queryKey: ['partnerRecords', slug, player.id],
    queryFn: () => api.getPartnerRecords(slug, player.id),
  })

  const { data: matchStats } = useQuery<MatchPlayerStatData[]>({
    queryKey: ['matchPlayerStats', slug, player.id],
    queryFn: () => api.getMatchPlayerStats(slug, player.id),
  })

  // Build match_id → elo delta map
  const eloDeltas: Record<number, number> = {}
  if (matchStats) {
    for (const ms of matchStats) {
      eloDeltas[ms.match_id] = Math.round((ms.elo_after - ms.elo_before) * 10) / 10
    }
  }

  const matches = extractPlayerMatches(rounds, player.id)
  const totalMatches = matches.length
  const wins = matches.filter(m => m.won).length
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const ballRate = player.balls_total > 0 ? Math.round((player.balls_won / player.balls_total) * 100) : 0

  // Partner synergy: prefer Phase 3 records, fallback to Phase 1 computed
  const partnerSynergy = partnerRecords && partnerRecords.length > 0
    ? partnerRecords.map(r => {
        const isPlayer1 = r.player1_id === player.id
        const partnerName = isPlayer1 ? r.player2_name : r.player1_name
        const winRt = r.games_together > 0 ? (r.wins_together / r.games_together * 100) : 0
        const avgDiff = r.games_together > 0 ? r.point_diff_together / r.games_together : 0
        return {
          name: partnerName,
          games: r.games_together,
          wins: r.wins_together,
          winRate: winRt,
          avgDiff,
        }
      }).sort((a, b) => b.games - a.games)
    : advancedStats?.partner_stats.map(ps => ({
        name: ps.partner_name,
        games: ps.games,
        wins: ps.wins,
        winRate: ps.win_rate,
        avgDiff: ps.avg_diff,
      })) ?? []

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-surface overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-md mx-auto px-5 pt-4 pb-8">
        {/* Back button — first thing visible */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 mb-5 text-zinc-400 hover:text-brand transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="font-display text-sm font-bold uppercase tracking-wider">Back</span>
        </button>

        {/* Name + rating */}
        <div className="mb-5">
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">
            {player.name}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="score-num text-xl text-brand">{player.rating.toFixed(1)}</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Pts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="score-num text-xl text-blue-400">{player.elo_rating.toFixed(0)}</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Elo</span>
            </div>
          </div>
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

        {/* Advanced stats */}
        {advancedStats && advancedStats.games_played > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { val: advancedStats.point_differential > 0 ? `+${advancedStats.point_differential}` : advancedStats.point_differential, label: 'Pt Diff', color: advancedStats.point_differential >= 0 ? 'text-qualify' : 'text-accent-red' },
              { val: advancedStats.avg_point_diff > 0 ? `+${advancedStats.avg_point_diff.toFixed(1)}` : advancedStats.avg_point_diff.toFixed(1), label: 'Avg Diff', color: advancedStats.avg_point_diff >= 0 ? 'text-qualify' : 'text-accent-red' },
              { val: advancedStats.consistency.toFixed(1), label: 'Consist.', color: 'text-white' },
              { val: `${advancedStats.clutch_score.toFixed(0)}%`, label: 'Clutch', color: 'text-white' },
              { val: `${advancedStats.form.toFixed(0)}%`, label: 'Form', color: advancedStats.form >= 50 ? 'text-qualify' : 'text-accent-red' },
              { val: advancedStats.adaptability, label: 'Adapt.', color: 'text-white' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-2 rounded-xl p-3 text-center border border-border">
                <div className={`score-num text-lg ${stat.color}`}>{stat.val}</div>
                <div className="font-display text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Partner synergy */}
        {partnerSynergy.length > 0 && (
          <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden mb-5">
            <h3 className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-b border-border">
              Partner Synergy
            </h3>
            <div className="divide-y divide-border/50">
              {partnerSynergy.map((ps, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">{ps.name}</div>
                    <div className="text-xs text-zinc-700">{ps.games} games, {ps.wins}W</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`score-num text-sm ${ps.winRate >= 50 ? 'text-qualify' : 'text-accent-red'}`}>
                      {ps.winRate.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-zinc-700">
                      {ps.avgDiff > 0 ? '+' : ''}{ps.avgDiff.toFixed(1)} avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match history */}
        <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
          <h3 className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-b border-border">
            Match History
          </h3>
          {matches.length === 0 ? (
            <p className="px-4 py-5 text-zinc-700 text-sm">No matches played yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {matches.map((m, i) => {
                const eloDelta = eloDeltas[m.matchId]
                return (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <span className="font-display text-[10px] font-bold text-zinc-700 w-7 shrink-0">R{m.roundNumber}</span>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.won ? 'bg-qualify' : 'bg-accent-red'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-300 truncate">
                        <span className="text-zinc-600">w/</span> {m.partner}
                      </div>
                      <div className="text-xs text-zinc-700 truncate">vs {m.opponents}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`score-num text-sm ${m.won ? 'text-qualify' : 'text-accent-red'}`}>
                        {m.score}
                      </span>
                      {eloDelta !== undefined && (
                        <div className={`text-[10px] font-bold ${eloDelta >= 0 ? 'text-blue-400' : 'text-blue-600'}`}>
                          {eloDelta >= 0 ? '+' : ''}{eloDelta.toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
