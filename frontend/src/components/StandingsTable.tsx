import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, Standing } from '../api/client'
import PlayerDetailModal from './PlayerDetailModal'

const QUALIFY_COUNT = 10

type SortMode = 'rating' | 'elo' | 'win_rate'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'rating', label: 'Pts' },
  { value: 'elo', label: 'Elo' },
  { value: 'win_rate', label: 'Win%' },
]

interface Props {
  slug: string
}

export default function StandingsTable({ slug }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [sortBy, setSortBy] = useState<SortMode>('rating')

  const { data: standings = [], isLoading } = useQuery({
    queryKey: ['standings', slug, sortBy],
    queryFn: () => api.getStandings(slug, sortBy),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="text-center py-20 space-y-2">
        <div className="score-num text-5xl text-zinc-800">—</div>
        <p className="font-display text-sm text-zinc-600 uppercase tracking-wider">No results yet</p>
        <p className="text-zinc-700 text-sm">Standings appear after round 1</p>
      </div>
    )
  }

  const hasAnyPoints = standings.some((s: Standing) => s.player.rating > 0)
  const showQualify = hasAnyPoints && standings.length > QUALIFY_COUNT

  function getSortValue(player: Player): string {
    if (sortBy === 'elo') return player.elo_rating.toFixed(0)
    if (sortBy === 'win_rate') return player.games_played > 0 ? `${(player.wins / player.games_played * 100).toFixed(0)}%` : '0%'
    return player.rating.toFixed(1)
  }

  function getTopValue(): number {
    if (standings.length === 0) return 1
    const p = standings[0].player
    if (sortBy === 'elo') return p.elo_rating || 1500
    if (sortBy === 'win_rate') return p.games_played > 0 ? (p.wins / p.games_played * 100) : 1
    return p.rating || 1
  }

  function getBarValue(player: Player): number {
    const top = getTopValue()
    if (top === 0) return 0
    if (sortBy === 'elo') return (player.elo_rating / top) * 100
    if (sortBy === 'win_rate') return player.games_played > 0 ? ((player.wins / player.games_played * 100) / top) * 100 : 0
    return (player.rating / top) * 100
  }

  const columnLabel = sortBy === 'elo' ? 'Elo' : sortBy === 'win_rate' ? 'W%' : 'Pts'

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      <div className="flex items-center justify-center gap-1 bg-surface-2 rounded-xl p-1 border border-border">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`flex-1 px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              sortBy === opt.value
                ? 'bg-brand text-black'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Qualify banner */}
      {showQualify && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-qualify/5 border border-qualify/10">
          <img src="/img/worlds-2026.png" alt="" className="h-6 shrink-0" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-zinc-400">
            Top {QUALIFY_COUNT} <span className="text-qualify">qualify for Worlds</span>
          </span>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center px-4 py-2.5 border-b border-border text-zinc-600">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest w-10">#</span>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest flex-1">Player</span>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest w-8 text-right">W</span>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest w-14 text-right">Balls</span>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest w-14 text-right">{columnLabel}</span>
        </div>

        {/* Rows */}
        {standings.map((s: Standing) => {
          const qualifies = showQualify && s.rank <= QUALIFY_COUNT
          const isQualifyEdge = s.rank === QUALIFY_COUNT && showQualify

          return (
            <div
              key={s.player.id}
              onClick={() => setSelectedPlayer(s.player)}
              className={`flex items-center px-4 py-3 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors active:bg-surface-4/50 hover:bg-surface-3/50 ${
                qualifies ? 'bg-qualify/[0.03]' : ''
              } ${isQualifyEdge ? 'border-b-2 !border-b-qualify/20' : ''}`}
            >
              {/* Rank */}
              <span className={`font-display text-base font-black w-10 shrink-0 ${
                s.rank === 1 ? 'rank-1' :
                s.rank === 2 ? 'rank-2' :
                s.rank === 3 ? 'rank-3' :
                'text-zinc-600'
              }`}>
                {s.rank}
              </span>

              {/* Player name + bar */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{s.player.name}</div>
                {hasAnyPoints && (
                  <div className="h-1 mt-1.5 bg-surface-4 rounded-full overflow-hidden max-w-[120px]">
                    <div
                      className={`h-full rounded-full ${qualifies ? 'bg-qualify' : 'bg-zinc-700'}`}
                      style={{ width: `${Math.min(getBarValue(s.player), 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Stats */}
              <span className="font-display text-sm font-bold text-zinc-400 w-8 text-right tabular-nums">{s.player.wins}</span>
              <span className="text-xs text-zinc-600 w-14 text-right tabular-nums">{s.player.balls_won}/{s.player.balls_total}</span>
              <span className={`font-display text-base font-black w-14 text-right tabular-nums ${qualifies ? 'text-qualify' : sortBy === 'elo' ? 'text-blue-400' : 'text-brand'}`}>
                {getSortValue(s.player)}
              </span>
            </div>
          )
        })}
      </div>

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
