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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white">SPIKE</h1>
          <div className="mt-1 text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
            Tournament System
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
            Enter Password
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              autoComplete="username"
              value="spike"
              readOnly
              className="hidden"
              tabIndex={-1}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50"
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-brand text-surface font-bold rounded-lg hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
