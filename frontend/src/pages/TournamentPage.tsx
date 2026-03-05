import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { getAdminToken, isAdmin } from '../hooks/useAdminToken'
import { getSessionToken } from '../api/client'
import { useLiveUpdates } from '../hooks/useLiveUpdates'
import { useTheme } from '../hooks/useTheme'
import OverviewTab from '../components/OverviewTab'
import PlayersTab from '../components/PlayersTab'
import RoundsTab from '../components/RoundsTab'
import StandingsTable from '../components/StandingsTable'

type Tab = 'overview' | 'players' | 'rounds' | 'standings'

const tabItems: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
  { key: 'players', label: 'Players', icon: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' },
  { key: 'rounds', label: 'Rounds', icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z' },
  { key: 'standings', label: 'Standings', icon: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' },
]

export default function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()
  const appAuth = !!getSessionToken()
  const admin = appAuth || (slug ? isAdmin(slug) : false)
  const token = slug ? getAdminToken(slug) : null
  const { theme, toggle: toggleTheme } = useTheme()

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

  const handleShare = async () => {
    const url = `${location.origin}/t/${slug}/standings`
    if (navigator.share) {
      try {
        await navigator.share({ title: tournament?.name, url })
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    }
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="font-display text-xl font-black text-brand uppercase tracking-tight shrink-0 cursor-pointer">
              Spike
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
                {tournament?.name || slug}
              </h1>
              {totalRounds > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-[3px]">
                    {Array.from({ length: totalRounds }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all ${
                          i < finishedRounds ? 'w-4 bg-brand' : 'w-2 bg-surface-5'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-display text-[10px] font-semibold text-zinc-600 uppercase">
                    R{finishedRounds}/{totalRounds}
                  </span>
                </div>
              )}
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

            {/* Share */}
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                copied
                  ? 'bg-qualify/20 text-qualify'
                  : 'bg-surface-3 text-zinc-500 hover:text-brand active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                  Share
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop tabs — inside header */}
        <div className="hidden sm:block max-w-2xl mx-auto px-4 pb-2">
          <nav className="flex gap-1">
            {tabItems.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  tab === t.key
                    ? 'bg-brand text-black'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-3'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d={t.icon} clipRule="evenodd" />
                </svg>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 anim-fade">
        {tab === 'overview' && <OverviewTab slug={slug} admin={admin} token={token} onSwitchTab={(t) => setTab(t as Tab)} />}
        {tab === 'players' && <PlayersTab slug={slug} admin={admin} token={token} />}
        {tab === 'rounds' && <RoundsTab slug={slug} admin={admin} token={token} />}
        {tab === 'standings' && <StandingsTable slug={slug} />}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur-md border-t border-border"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex">
          {tabItems.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 cursor-pointer transition-colors ${
                tab === t.key ? 'text-brand' : 'text-zinc-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d={t.icon} clipRule="evenodd" />
              </svg>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
