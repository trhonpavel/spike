import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, getAdminToken, type TournamentListItem, type LeagueListItem } from '../api/admin-client'
import { api, getSessionToken, type Tournament } from '../api/client'
import { leagueApi, type League } from '../api/league-client'
import { useTheme } from '../hooks/useTheme'

type Filter = 'all' | 'active' | 'finished'

type AnyTournament = TournamentListItem | Tournament
type AnyLeague = LeagueListItem | League

export default function TournamentsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { theme, toggle: toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const hasAdminToken = !!getAdminToken()
  const hasSession = !!getSessionToken()

  const { data: adminTournaments = [], isLoading: adminLoading } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => adminApi.listTournaments(),
    enabled: hasAdminToken,
  })

  const { data: publicTournaments = [], isLoading: publicLoading } = useQuery({
    queryKey: ['tournaments-list'],
    queryFn: () => api.listTournaments(),
    enabled: !hasAdminToken,
  })

  const { data: adminLeagues = [], isLoading: adminLeaguesLoading } = useQuery({
    queryKey: ['admin-leagues'],
    queryFn: () => adminApi.listLeagues(),
    enabled: hasAdminToken,
  })

  const { data: publicLeagues = [], isLoading: publicLeaguesLoading } = useQuery({
    queryKey: ['leagues-list'],
    queryFn: () => leagueApi.list(),
    enabled: !hasAdminToken,
  })

  const tournaments: AnyTournament[] = hasAdminToken ? adminTournaments : publicTournaments
  const leagues: AnyLeague[] = hasAdminToken ? adminLeagues : publicLeagues
  const isLoading = hasAdminToken
    ? adminLoading || adminLeaguesLoading
    : publicLoading || publicLeaguesLoading

  const filteredTournaments = tournaments.filter((t: AnyTournament) => {
    if (filter === 'active') return t.status === 'active'
    if (filter === 'finished') return t.status === 'finished'
    return true
  })

  const filteredLeagues = leagues.filter((l: AnyLeague) => {
    if (filter === 'active') return l.status === 'active'
    if (filter === 'finished') return l.status === 'finished'
    return true
  })

  const tabCounts: Record<Filter, number> = {
    all: tournaments.length + leagues.length,
    active: tournaments.filter((t: AnyTournament) => t.status === 'active').length + leagues.filter((l: AnyLeague) => l.status === 'active').length,
    finished: tournaments.filter((t: AnyTournament) => t.status === 'finished').length + leagues.filter((l: AnyLeague) => l.status === 'finished').length,
  }

  const statusBadge = (status: string) => {
    if (status === 'finished') return { text: 'Finished', cls: 'bg-qualify/10 text-qualify border-qualify/20' }
    return { text: 'Active', cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' }
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
    queryClient.invalidateQueries({ queryKey: ['tournaments-list'] })
    queryClient.invalidateQueries({ queryKey: ['admin-leagues'] })
    queryClient.invalidateQueries({ queryKey: ['leagues-list'] })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-xl font-black text-brand uppercase tracking-tight cursor-pointer">
              Spike
            </Link>
            <h1 className="font-display text-base font-bold text-white uppercase tracking-wide">
              Browse
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={handleRefresh}
              className="p-2 rounded-lg text-zinc-500 hover:text-brand transition-colors cursor-pointer"
              aria-label="Refresh"
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
            <button type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-500 hover:text-brand transition-colors cursor-pointer"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6 anim-fade">
        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-1 bg-surface-2 rounded-xl p-1 border border-border">
          {(['all', 'active', 'finished'] as Filter[]).map((f) => (
            <button type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                filter === f ? 'bg-brand text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f}
              {!isLoading && tabCounts[f] > 0 && (
                <span className={`font-display text-[10px] font-black tabular-nums ${filter === f ? 'text-black/50' : 'text-zinc-600'}`}>
                  {tabCounts[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        {!hasSession && !hasAdminToken && (
          <div className="text-center py-20 space-y-2">
            <p className="font-display text-sm text-zinc-600 uppercase tracking-wider">Login required</p>
            <Link to="/" className="text-brand text-sm hover:underline">← Back</Link>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
          </div>
        )}

        {!isLoading && (hasSession || hasAdminToken) && (
          <>
            {/* Leagues */}
            <section>
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
                Leagues
              </h2>
              {filteredLeagues.length === 0 ? (
                <p className="text-center py-6 text-zinc-700 text-sm">No leagues</p>
              ) : (
                <div className="space-y-2">
                  {filteredLeagues.map((l) => {
                    const badge = statusBadge(l.status)
                    return (
                      <Link
                        key={l.id}
                        to={`/l/${l.slug}`}
                        className="block bg-surface-2 rounded-2xl border border-border p-4 hover:bg-surface-3/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
                            {l.name}
                          </span>
                          <span className={`inline-flex font-display text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badge.cls}`}>
                            {badge.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          {'player_count' in l && <span>{l.player_count} players</span>}
                          <span className="text-zinc-500">{l.slug}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Tournaments */}
            <section>
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
                Tournaments
              </h2>
              {filteredTournaments.length === 0 ? (
                <p className="text-center py-6 text-zinc-700 text-sm">No tournaments</p>
              ) : (
                <div className="space-y-2">
                  {filteredTournaments.map((t) => {
                    const badge = statusBadge(t.status)
                    return (
                      <Link
                        key={t.id}
                        to={`/t/${t.slug}`}
                        className="block bg-surface-2 rounded-2xl border border-border p-4 hover:bg-surface-3/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
                            {t.name}
                          </span>
                          <span className={`inline-flex font-display text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badge.cls}`}>
                            {badge.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          {'player_count' in t && <span>{t.player_count} players</span>}
                          {'round_count' in t && <span>{t.round_count} rounds</span>}
                          {'created_at' in t && t.created_at && (
                            <span>{new Date(t.created_at).toLocaleDateString('cs-CZ')}</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
