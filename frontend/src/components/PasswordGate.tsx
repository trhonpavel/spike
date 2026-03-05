import { useState, useEffect, type ReactNode } from 'react'
import { login, getSessionToken, clearSessionToken } from '../api/client'

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      fetch('/api/v1/tournaments/__probe__', {
        headers: { 'Authorization': 'Bearer __invalid__' },
      }).then((res) => {
        setAuthed(res.status !== 401)
      }).catch(() => setAuthed(true))
      return
    }

    fetch('/api/v1/tournaments/__probe__', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then((res) => {
      if (res.status === 401) {
        clearSessionToken()
        setAuthed(false)
      } else {
        setAuthed(true)
      }
    }).catch(() => setAuthed(true))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      await login(password)
      setAuthed(true)
    } catch (err: any) {
      setError(err.message === 'Wrong password' ? 'Wrong password' : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pattern">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin-slow" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">Loading</span>
        </div>
      </div>
    )
  }

  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-pattern">
      <div className="w-full max-w-sm stagger-children">
        {/* Title with glow */}
        <div className="text-center brand-glow mb-8">
          <h1 className="text-5xl font-black tracking-tighter text-white relative z-10">
            SPIKE
          </h1>
          <div className="mt-2 text-xs font-mono uppercase tracking-[0.3em] text-zinc-500 relative z-10">
            Tournament System
          </div>
        </div>

        {/* Password card */}
        <div className="glass-card-strong rounded-2xl p-6 animate-slide-up">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-5">
            Enter Password
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              autoComplete="username"
              value="spike"
              readOnly
              className="hidden"
              tabIndex={-1}
            />
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3.5 bg-surface-3/80 border border-border rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
                autoFocus
                autoComplete="current-password"
              />
            </div>
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
              disabled={loading || !password}
              className="glow-btn w-full py-3.5 bg-brand text-surface font-bold rounded-xl hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-wider"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin-slow" />
                  Checking...
                </span>
              ) : (
                'Enter'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
