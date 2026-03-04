import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { getAdminToken, isAdmin } from '../hooks/useAdminToken'
import { getSessionToken } from '../api/client'
import { useLiveUpdates } from '../hooks/useLiveUpdates'
import PlayersTab from '../components/PlayersTab'
import RoundsTab from '../components/RoundsTab'
import StandingsTable from '../components/StandingsTable'

type Tab = 'players' | 'rounds' | 'standings'

export default function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<Tab>('players')
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()
  const appAuth = !!getSessionToken()
  const admin = appAuth || (slug ? isAdmin(slug) : false)
  const token = slug ? getAdminToken(slug) : null

  const { data: tournament } = useQuery({
    queryKey: ['tournament', slug],
    queryFn: () => api.getTournament(slug!),
    enabled: !!slug,
  })

  const { data: rounds } = useQuery({
    queryKey: ['rounds', slug],
    queryFn: () => api.getRounds(slug!),
    enabled: !!slug,
  })

  useLiveUpdates(slug!, (_event) => {
    queryClient.invalidateQueries({ queryKey: ['rounds', slug] })
    queryClient.invalidateQueries({ queryKey: ['standings', slug] })
    queryClient.invalidateQueries({ queryKey: ['players', slug] })
  })

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  if (!slug) return null

  const totalRounds = rounds?.length ?? 0
  const finishedRounds = rounds?.filter(r => r.status === 'finalized').length ?? 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'players', label: 'Players' },
    { key: 'rounds', label: 'Rounds' },
    { key: 'standings', label: 'Standings' },
  ]

  const handleShare = async () => {
    const url = `${location.origin}/t/${slug}/standings`
    if (navigator.share) {
      try {
        await navigator.share({ title: tournament?.name, url })
      } catch {
        // User cancelled share dialog
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-surface-2 border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/" className="text-brand font-black text-lg tracking-tighter shrink-0">
                SPIKE
              </Link>
              <div className="min-w-0">
                <h1 className="text-white font-semibold truncate">
                  {tournament?.name || slug}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono">{slug}</span>
                  {totalRounds > 0 && (
                    <span className="text-[10px] font-mono text-zinc-600">
                      Round {finishedRounds}/{totalRounds}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-surface-3 text-zinc-400 hover:text-brand border border-border hover:border-brand/30'
              }`}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>

          {/* Tabs */}
          <nav className="flex mt-3 gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-sm font-medium text-center rounded-lg transition-all ${
                  tab === t.key
                    ? 'bg-brand text-surface'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-3'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {tab === 'players' && <PlayersTab slug={slug} admin={admin} token={token} />}
        {tab === 'rounds' && <RoundsTab slug={slug} admin={admin} token={token} />}
        {tab === 'standings' && <StandingsTable slug={slug} />}
      </main>
    </div>
  )
}
