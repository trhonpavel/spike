import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, Standing } from '../api/client'
import PlayerDetailModal from './PlayerDetailModal'

const QUALIFY_COUNT = 10

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
  if (rank === 2) return 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20'
  if (rank === 3) return 'bg-amber-600/15 text-amber-500 border-amber-600/20'
  return 'bg-surface-4 text-zinc-500 border-transparent'
}

interface Props {
  slug: string
}

export default function StandingsTable({ slug }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  const { data: standings = [], isLoading } = useQuery({
    queryKey: ['standings', slug],
    queryFn: () => api.getStandings(slug),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin-slow" />
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-3 flex items-center justify-center border border-border">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-700" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <p className="text-zinc-500 font-medium">No results yet</p>
        <p className="text-zinc-700 text-sm">Standings will appear after the first round</p>
      </div>
    )
  }

  const hasAnyPoints = standings.some((s: Standing) => s.player.rating > 0)
  const topRating = standings[0]?.player.rating || 1

  return (
    <div className="space-y-3">
      {/* Qualification banner */}
      {hasAnyPoints && standings.length > QUALIFY_COUNT && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-qualify/5 border border-qualify/10">
          <span className="w-2 h-2 rounded-full bg-qualify animate-pulse-dot shrink-0" />
          <span className="text-xs text-zinc-400">
            Top {QUALIFY_COUNT} qualify for <span className="text-qualify font-semibold">Worlds 2026 Paris</span>
          </span>
          <img src="/img/worlds-2026.png" alt="" className="h-5 ml-auto opacity-60" />
        </div>
      )}

      {/* Table */}
      <div className="glass-card-strong rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-border/50">
              <th className="px-3 py-3 text-left w-12">#</th>
              <th className="px-3 py-3 text-left">Player</th>
              <th className="px-3 py-3 text-right w-10">W</th>
              <th className="px-3 py-3 text-right w-16">Balls</th>
              <th className="px-3 py-3 text-right w-16">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s: Standing, idx: number) => {
              const qualifies = hasAnyPoints && s.rank <= QUALIFY_COUNT && standings.length > QUALIFY_COUNT
              const isQualifyBorder = s.rank === QUALIFY_COUNT && standings.length > QUALIFY_COUNT
              return (
                <tr
                  key={s.player.id}
                  onClick={() => setSelectedPlayer(s.player)}
                  className={`transition-all hover:bg-surface-4/40 cursor-pointer border-b border-border/30 last:border-b-0 ${
                    qualifies ? 'bg-qualify/[0.03]' : ''
                  } ${isQualifyBorder ? 'border-b-2 !border-b-qualify/20' : ''} ${
                    idx % 2 === 1 && !qualifies ? 'bg-surface-3/20' : ''
                  }`}
                >
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold font-mono border ${rankBadge(s.rank)}`}>
                      {s.rank}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">{s.player.name}</div>
                    {hasAnyPoints && (
                      <div className="h-1 mt-1.5 bg-surface-4 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            qualifies
                              ? 'bg-gradient-to-r from-qualify/80 to-qualify'
                              : 'bg-gradient-to-r from-zinc-700 to-zinc-600'
                          }`}
                          style={{ width: `${topRating > 0 ? (s.player.rating / topRating) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-mono text-zinc-400">{s.player.wins}</td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-zinc-600">
                    {s.player.balls_won}/{s.player.balls_total}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-base font-bold font-mono ${qualifies ? 'text-qualify' : 'text-brand'}`}>
                      {s.player.rating.toFixed(1)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
