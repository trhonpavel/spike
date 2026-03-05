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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'players',
      label: 'Players',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
    {
      key: 'rounds',
      label: 'Rounds',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      key: 'standings',
      label: 'Standings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
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
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <header className="bg-surface-2/95 backdrop-blur-lg sticky top-0 z-10 gradient-border-bottom">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/" className="text-brand font-black text-xl tracking-tighter shrink-0 hover:opacity-80 transition-opacity">
                SPIKE
              </Link>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-lg truncate leading-tight">
                  {tournament?.name || slug}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-zinc-600 font-mono">{slug}</span>
                  {totalRounds > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: totalRounds }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              i < finishedRounds ? 'bg-brand' : 'bg-surface-4'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600">
                        {finishedRounds}/{totalRounds}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 animate-button-press ${
                copied
                  ? 'bg-qualify/20 text-qualify border border-qualify/30'
                  : 'bg-surface-3 text-zinc-400 hover:text-brand border border-border hover:border-brand/30 hover:bg-surface-4'
              }`}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>

          {/* Tabs */}
          <nav className="flex bg-surface-3/60 rounded-xl p-1 gap-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  tab === t.key
                    ? 'bg-brand text-surface shadow-lg shadow-brand/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5 animate-fade-in">
        {tab === 'players' && <PlayersTab slug={slug} admin={admin} token={token} />}
        {tab === 'rounds' && <RoundsTab slug={slug} admin={admin} token={token} />}
        {tab === 'standings' && <StandingsTable slug={slug} />}
      </main>
    </div>
  )
}
