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
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logos row */}
          <div className="text-center">
            <img src="/img/czech-roundnet.svg" alt="Czech Roundnet" className="h-14 mx-auto block" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter text-white">
              SPIKE
            </h1>
            <div className="mt-1 text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
              Tournament System
            </div>
          </div>

          {/* Worlds 2026 banner */}
          <div className="bg-surface-2 rounded-xl border border-border p-5 text-center space-y-3">
            <img
              src="/img/worlds-2026.png"
              alt="Roundnet World Championship 2026"
              className="h-14 mx-auto"
            />
            <div className="space-y-1">
              <div className="text-sm text-zinc-300">
                Czech National Team Qualifier
              </div>
              <div className="text-xs font-mono text-zinc-500">
                Parc du Tremblay, Paris &middot; September 2–6, 2026
              </div>
            </div>
          </div>

          {/* Create tournament */}
          <div className="bg-surface-2 rounded-xl border border-border p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              New Tournament
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tournament name"
                className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50"
                maxLength={200}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full py-3 bg-brand text-surface font-bold rounded-lg hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating...' : 'Create Tournament'}
              </button>
            </form>
          </div>

          {/* Open existing tournament */}
          <div className="bg-surface-2 rounded-xl border border-border p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Open Existing
            </h2>
            <form onSubmit={handleOpen} className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Tournament code or link"
                className="flex-1 px-4 py-3 bg-surface-3 border border-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50"
              />
              <button
                type="submit"
                disabled={!slug.trim()}
                className="px-5 py-3 border border-zinc-600 text-white font-semibold rounded-lg hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Open
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-zinc-600">
            Share the tournament link so players can follow results live
          </p>
        </div>
      </div>

      {/* Footer logos */}
      <footer className="py-6 px-4">
        <div className="flex items-center justify-center gap-4 opacity-40">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
            Powered by Czech Roundnet
          </span>
        </div>
      </footer>
    </div>
  )
}
