import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useLiveUpdates } from '../hooks/useLiveUpdates'
import { useTheme } from '../hooks/useTheme'
import StandingsTable from '../components/StandingsTable'

export default function StandingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const { theme, toggle: toggleTheme } = useTheme()

  const { data: tournament } = useQuery({
    queryKey: ['tournament', slug],
    queryFn: () => api.getTournament(slug!),
    enabled: !!slug,
  })

  useLiveUpdates(slug!, () => {
    queryClient.invalidateQueries({ queryKey: ['standings', slug] })
  })

  if (!slug) return null

  return (
    <div className="min-h-screen">
      {/* Header with LIVE badge */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-10"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/t/${slug}`} className="font-display text-xl font-black text-brand uppercase tracking-tight cursor-pointer">
              Spike
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
                {tournament?.name || slug}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
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
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-red/10">
              <span className="w-2 h-2 rounded-full bg-accent-red anim-live" />
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-accent-red">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 anim-fade">
        <StandingsTable slug={slug} />

        <div className="mt-8 text-center">
          <Link
            to={`/t/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-sm uppercase tracking-wider text-zinc-500 hover:text-brand border border-border hover:border-brand/30 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Full Tournament
          </Link>
        </div>
      </main>
    </div>
  )
}
