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
    <div className="min-h-screen">
      {/* Header with LIVE badge */}
      <header className="bg-black/90 backdrop-blur-md border-b border-border sticky top-0 z-10">
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
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-red/10 shrink-0">
            <span className="w-2 h-2 rounded-full bg-accent-red anim-live" />
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-accent-red">Live</span>
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
