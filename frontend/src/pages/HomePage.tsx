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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] h-[600px] bg-brand/6 rounded-full blur-[150px] pointer-events-none" />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-5 relative z-10">
        <div className="w-full max-w-sm stagger">

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src="/img/czech-roundnet.svg" alt="Czech Roundnet" className="h-12" />
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
              <img
                src="/img/worlds-2026.png"
                alt="Roundnet World Championship 2026"
                className="h-12 shrink-0"
              />
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

          <p className="text-center text-xs text-zinc-700">
            Share the link so players can follow live
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-5 text-center">
        <span className="text-[10px] font-display uppercase tracking-[0.3em] text-zinc-700">
          Czech Roundnet Association
        </span>
      </footer>
    </div>
  )
}
