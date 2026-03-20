import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { setAdminToken } from '../hooks/useAdminToken'
import { leagueApi, setLeagueToken } from '../api/league-client'
import { useTheme } from '../hooks/useTheme'

export default function HomePage() {
  const [name, setName] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [leagueLoading, setLeagueLoading] = useState(false)
  const [error, setError] = useState('')
  const [leagueError, setLeagueError] = useState('')
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const t = await api.createTournament(name.trim())
      if (t.admin_token) setAdminToken(t.slug, t.admin_token)
      navigate(`/t/${t.slug}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leagueName.trim()) return
    setLeagueLoading(true)
    setLeagueError('')
    try {
      const l = await leagueApi.create(leagueName.trim())
      if (l.admin_token) setLeagueToken(l.slug, l.admin_token)
      navigate(`/l/${l.slug}`)
    } catch (err: any) {
      setLeagueError(err.message)
    } finally {
      setLeagueLoading(false)
    }
  }

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault()
    const raw = slug.trim()
    // Support l/slug or /l/slug for leagues
    const leagueMatch = raw.match(/(?:^|\/)l\/([^/]+)/)
    if (leagueMatch) {
      navigate(`/l/${leagueMatch[1]}`)
      return
    }
    const s = raw.replace(/^.*\/t\//, '').replace(/\/.*$/, '')
    if (s) navigate(`/t/${s}`)
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
         style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] h-[600px] bg-brand/6 rounded-full blur-[150px] pointer-events-none" />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-5 relative z-10">
        <div className="w-full max-w-sm stagger">

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src="/img/czech-roundnet.svg" alt="Czech Roundnet" className="h-12 home-czech-logo" />
          </div>

          {/* Hero title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-8xl font-black tracking-tight text-white neon-text uppercase leading-none">
              Spike
            </h1>
            <p className="text-[11px] font-display font-semibold uppercase tracking-[0.4em] text-zinc-500 mt-2">
              Tournament System
            </p>
          </div>

          {/* Worlds 2026 */}
          <div className="relative rounded-2xl overflow-hidden mb-6 neon-border border border-brand/10 bg-surface-3/80">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative px-5 py-4 flex items-center gap-4">
              <div className="home-worlds-badge h-12 shrink-0 flex items-center justify-center">
                <img
                  src="/img/worlds-2026.png"
                  alt="Roundnet World Championship 2026"
                  className="h-10 home-worlds-logo"
                />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm text-white uppercase tracking-wide">
                  Czech Qualifier
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Worlds 2026 &middot; Paris &middot; Sep 2–6
                </div>
              </div>
            </div>
          </div>

          {/* Create tournament */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 mb-3">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
              New Tournament
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tournament name"
                className="w-full px-4 py-3.5 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 focus:shadow-[0_0_20px_rgba(228,255,26,0.08)] transition-all text-base"
                maxLength={200}
                autoFocus
              />
              {error && <p className="text-accent-red text-sm font-medium anim-fade">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-brand w-full py-3.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full anim-spin" />
                    Creating
                  </span>
                ) : 'Create Tournament'}
              </button>
            </form>
          </div>

          {/* Create league */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 mb-3">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
              New League
            </h2>
            <form onSubmit={handleCreateLeague} className="space-y-3">
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="League name"
                className="w-full px-4 py-3.5 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 focus:shadow-[0_0_20px_rgba(228,255,26,0.08)] transition-all text-base"
                maxLength={200}
              />
              {leagueError && <p className="text-accent-red text-sm font-medium anim-fade">{leagueError}</p>}
              <button
                type="submit"
                disabled={leagueLoading || !leagueName.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider border border-brand/30 text-brand hover:bg-brand/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {leagueLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
                    Creating
                  </span>
                ) : 'Create League'}
              </button>
            </form>
          </div>

          {/* Open existing */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 mb-6">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
              Open Existing
            </h2>
            <form onSubmit={handleOpen} className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Code or link"
                className="flex-1 min-w-0 px-4 py-3.5 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 transition-all text-base"
              />
              <button
                type="submit"
                disabled={!slug.trim()}
                className="px-6 py-3.5 border border-border-bright text-white font-display font-bold uppercase tracking-wider rounded-xl hover:bg-surface-3 hover:border-brand/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-4">
            <p className="text-xs text-zinc-700">
              Share the link so players can follow live
            </p>
            <span className="text-zinc-800">|</span>
            <a href="/tournaments" onClick={(e) => { e.preventDefault(); navigate('/tournaments') }} className="text-xs text-zinc-600 hover:text-brand transition-colors">
              Browse All
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-5 flex items-center justify-center gap-4">
        <span className="text-[10px] font-display uppercase tracking-[0.3em] text-zinc-700">
          Czech Roundnet Association
        </span>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-zinc-600 hover:text-brand transition-colors cursor-pointer"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </footer>
    </div>
  )
}
