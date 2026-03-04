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
      <header className="bg-surface-2 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={`/t/${slug}`} className="text-brand font-black text-lg tracking-tighter">
              SPIKE
            </Link>
            <div>
              <h1 className="text-white font-semibold">
                {tournament?.name || slug}
              </h1>
              <p className="text-xs text-zinc-500">Live Standings</p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-4">
        <StandingsTable slug={slug} />
        <div className="mt-6 text-center">
          <Link
            to={`/t/${slug}`}
            className="text-sm text-zinc-500 hover:text-brand transition-colors"
          >
            View full tournament
          </Link>
        </div>
      </main>
    </div>
  )
}
