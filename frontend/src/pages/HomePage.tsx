import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { setAdminToken } from '../hooks/useAdminToken'

export default function HomePage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault()
    const s = slug.trim().replace(/^.*\/t\//, '').replace(/\/.*$/, '')
    if (s) navigate(`/t/${s}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-pattern">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md stagger-children">
          {/* Logo */}
          <div className="text-center mb-2">
            <img src="/img/czech-roundnet.svg" alt="Czech Roundnet" className="h-14 mx-auto block" />
          </div>

          {/* Title with glow */}
          <div className="text-center brand-glow mb-8">
            <h1 className="text-6xl font-black tracking-tighter text-white relative z-10">
              SPIKE
            </h1>
            <div className="mt-2 text-xs font-mono uppercase tracking-[0.3em] text-zinc-500 relative z-10">
              Tournament System
            </div>
          </div>

          {/* Worlds 2026 banner */}
          <div className="glass-card rounded-2xl p-5 text-center relative overflow-hidden mb-6">
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />
            <div className="relative z-10">
              <img
                src="/img/worlds-2026.png"
                alt="Roundnet World Championship 2026"
                className="h-14 mx-auto"
              />
              <div className="mt-3 space-y-1">
                <div className="text-sm font-medium text-zinc-200">
                  Czech National Team Qualifier
                </div>
                <div className="text-xs font-mono text-zinc-500">
                  Parc du Tremblay, Paris &middot; September 2–6, 2026
                </div>
              </div>
            </div>
          </div>

          {/* Create tournament */}
          <div className="glass-card-strong rounded-2xl p-6 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
              New Tournament
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tournament name"
                className="w-full px-4 py-3.5 bg-surface-3/80 border border-border rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
                maxLength={200}
                autoFocus
              />
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="glow-btn w-full py-3.5 bg-brand text-surface font-bold rounded-xl hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-wider"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin-slow" />
                    Creating...
                  </span>
                ) : (
                  'Create Tournament'
                )}
              </button>
            </form>
          </div>

          {/* Open existing */}
          <div className="glass-card-strong rounded-2xl p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
              Open Existing
            </h2>
            <form onSubmit={handleOpen} className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Code or link"
                className="flex-1 px-4 py-3.5 bg-surface-3/80 border border-border rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
              />
              <button
                type="submit"
                disabled={!slug.trim()}
                className="px-6 py-3.5 border border-border-light text-white font-semibold rounded-xl hover:bg-surface-3 hover:border-brand/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Open
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-6">
            Share the tournament link so players can follow results live
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4">
        <div className="flex items-center justify-center gap-2 opacity-40">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            Powered by Czech Roundnet
          </span>
        </div>
      </footer>
    </div>
  )
}
