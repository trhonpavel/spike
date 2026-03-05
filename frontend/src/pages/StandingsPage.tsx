import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useLiveUpdates } from '../hooks/useLiveUpdates'
import StandingsTable from '../components/StandingsTable'

export default function StandingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()

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
    <div className="min-h-screen bg-pattern">
      <header className="bg-surface-2/95 backdrop-blur-lg gradient-border-bottom">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={`/t/${slug}`} className="text-brand font-black text-xl tracking-tighter hover:opacity-80 transition-opacity">
                SPIKE
              </Link>
              <div>
                <h1 className="text-white font-bold text-lg">
                  {tournament?.name || slug}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Live</span>
                  </div>
                  <span className="text-[10px] text-zinc-600">Standings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5 animate-fade-in">
        <StandingsTable slug={slug} />
        <div className="mt-8 text-center">
          <Link
            to={`/t/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-brand border border-border hover:border-brand/30 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            View full tournament
          </Link>
        </div>
      </main>
    </div>
  )
}
