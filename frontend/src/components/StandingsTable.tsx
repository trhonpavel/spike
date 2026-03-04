import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Player, Standing } from '../api/client'
import PlayerDetailModal from './PlayerDetailModal'

const QUALIFY_COUNT = 10

interface Props {
  slug: string
}

export default function StandingsTable({ slug }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  const { data: standings = [], isLoading } = useQuery({
    queryKey: ['standings', slug],
    queryFn: () => api.getStandings(slug),
  })

  if (isLoading) return <p className="text-zinc-600 text-center py-8">Loading...</p>
  if (standings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600">No results yet</p>
        <p className="text-zinc-700 text-sm mt-1">Standings will appear after the first round</p>
      </div>
    )
  }

  const hasAnyPoints = standings.some((s: Standing) => s.player.rating > 0)
  const topRating = standings[0]?.player.rating || 1

  return (
    <div className="space-y-3">
      {hasAnyPoints && standings.length > QUALIFY_COUNT && (
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-qualify"></span>
          <span className="text-zinc-500">
            Top {QUALIFY_COUNT} qualify for <span className="text-qualify font-medium">Worlds 2026 Paris</span>
          </span>
          <img src="/img/worlds-2026.png" alt="" className="h-4 ml-auto opacity-50" />
        </div>
      )}

      <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2.5 text-left w-10">#</th>
              <th className="px-3 py-2.5 text-left">Player</th>
              <th className="px-3 py-2.5 text-right w-10">W</th>
              <th className="px-3 py-2.5 text-right w-16">Balls</th>
              <th className="px-3 py-2.5 text-right w-14">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standings.map((s: Standing) => {
              const qualifies = hasAnyPoints && s.rank <= QUALIFY_COUNT && standings.length > QUALIFY_COUNT
              const isQualifyBorder = s.rank === QUALIFY_COUNT && standings.length > QUALIFY_COUNT
              return (
                <tr
                  key={s.player.id}
                  onClick={() => setSelectedPlayer(s.player)}
                  className={`transition-colors hover:bg-surface-3 cursor-pointer ${
                    qualifies ? 'bg-qualify/5' : ''
                  } ${isQualifyBorder ? 'border-b-2 border-qualify/30' : ''}`}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {qualifies && <span className="w-1.5 h-1.5 rounded-full bg-qualify shrink-0"></span>}
                      <span className="text-sm font-mono text-zinc-500">{s.rank}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">{s.player.name}</div>
                    {hasAnyPoints && (
                      <div className="h-0.5 mt-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${qualifies ? 'bg-qualify' : 'bg-zinc-600'}`}
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
                    <span className={`font-bold font-mono ${qualifies ? 'text-qualify' : 'text-brand'}`}>
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
