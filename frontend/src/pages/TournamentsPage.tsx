import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi, type TournamentListItem } from '../api/admin-client'
import { getAdminToken } from '../api/admin-client'
import { useTheme } from '../hooks/useTheme'

type Filter = 'all' | 'active' | 'finished'

export default function TournamentsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { theme, toggle: toggleTheme } = useTheme()
  const hasToken = !!getAdminToken()

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => adminApi.listTournaments(),
    enabled: hasToken,
  })

  const filtered = tournaments.filter((t: TournamentListItem) => {
    if (filter === 'active') return t.status === 'active'
    if (filter === 'finished') return t.status === 'finished'
    return true
  })

  const statusBadge = (status: string) => {
    if (status === 'finished') return { text: 'Finished', cls: 'bg-qualify/10 text-qualify border-qualify/20' }
    return { text: 'Active', cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' }
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
              All Tournaments
            </h1>
          </div>
          <button
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
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 anim-fade">
        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-1 bg-surface-2 rounded-xl p-1 border border-border mb-4">
          {(['all', 'active', 'finished'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                filter === f ? 'bg-brand text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {!hasToken && (
          <div className="text-center py-20 space-y-2">
            <p className="font-display text-sm text-zinc-600 uppercase tracking-wider">Admin login required</p>
            <Link to="/admin" className="text-brand text-sm hover:underline">Go to Admin Panel</Link>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
          </div>
        )}

        {!isLoading && hasToken && filtered.length === 0 && (
          <div className="text-center py-20 space-y-2">
            <div className="score-num text-5xl text-zinc-800">0</div>
            <p className="font-display text-sm text-zinc-600 uppercase tracking-wider">No tournaments found</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((t) => {
              const badge = statusBadge(t.status)
              return (
                <Link
                  key={t.id}
                  to={`/t/${t.slug}`}
                  className="block bg-surface-2 rounded-2xl border border-border p-4 hover:bg-surface-3/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
                      {t.name}
                    </span>
                    <span className={`inline-flex font-display text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>{t.player_count} players</span>
                    <span>{t.round_count} rounds</span>
                    {t.created_at && (
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
