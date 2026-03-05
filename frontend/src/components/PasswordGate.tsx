import { useState, useEffect, type ReactNode } from 'react'
import { login, getSessionToken, clearSessionToken } from '../api/client'

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
      </div>
    )
  }

  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xs relative z-10 stagger">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="font-display text-7xl font-black tracking-tight text-white neon-text uppercase">
            Spike
          </h1>
          <p className="text-xs font-display font-semibold uppercase tracking-[0.4em] text-zinc-500 mt-3">
            Tournament System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            autoComplete="username"
            value="spike"
            readOnly
            className="hidden"
            tabIndex={-1}
          />
          <div>
            <label htmlFor="gate-pw" className="block text-[11px] font-display font-semibold uppercase tracking-widest text-zinc-500 mb-2">
              Password
            </label>
            <input
              id="gate-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-4 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 focus:shadow-[0_0_20px_rgba(228,255,26,0.1)] transition-all text-base"
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-accent-red text-sm font-medium anim-fade">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-brand w-full py-4 rounded-xl text-base font-display font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full anim-spin" />
                Verifying
              </span>
            ) : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
