import { useState, useEffect, type ReactNode } from 'react'
import {
  login,
  getSessionToken,
  clearSessionToken,
  webauthnStatus,
  webauthnRegister,
  webauthnLogin,
} from '../api/client'

type Phase = 'checking' | 'login' | 'offer-passkey' | 'authed'

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)

  const webauthnSupported = typeof PublicKeyCredential !== 'undefined'

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = getSessionToken()
    if (!token) {
      // Check if auth is required
      const res = await fetch('/api/v1/tournaments/__probe__', {
        headers: { 'Authorization': 'Bearer __invalid__' },
      }).catch(() => null)
      if (!res || res.status !== 401) {
        setPhase('authed')
        return
      }
      // Auth required — check for passkeys
      if (webauthnSupported) {
        const enabled = await webauthnStatus().catch(() => false)
        setHasPasskey(enabled)
      }
      setPhase('login')
      return
    }

    // Verify existing token
    const res = await fetch('/api/v1/tournaments/__probe__', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => null)
    if (res && res.status === 401) {
      clearSessionToken()
      if (webauthnSupported) {
        const enabled = await webauthnStatus().catch(() => false)
        setHasPasskey(enabled)
      }
      setPhase('login')
    } else {
      setPhase('authed')
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      await login(password)
      // After password login, offer passkey setup if supported and not yet registered
      if (webauthnSupported) {
        const enabled = await webauthnStatus().catch(() => false)
        if (!enabled) {
          setPhase('offer-passkey')
          return
        }
      }
      setPhase('authed')
    } catch (err: any) {
      setError(err.message === 'Wrong password' ? 'Wrong password' : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFaceId = async () => {
    setLoading(true)
    setError('')
    try {
      await webauthnLogin()
      setPhase('authed')
    } catch {
      setError('Biometric authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterPasskey = async () => {
    setLoading(true)
    setError('')
    try {
      await webauthnRegister()
      setPhase('authed')
    } catch {
      setError('Passkey setup failed')
      // Still let them into the app
      setTimeout(() => setPhase('authed'), 1500)
    } finally {
      setLoading(false)
    }
  }

  // Loading
  if (phase === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    )
  }

  // Authenticated
  if (phase === 'authed') return <>{children}</>

  // Offer passkey registration after password login
  if (phase === 'offer-passkey') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter text-white">SPIKE</h1>
            <div className="mt-1 text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
              Tournament System
            </div>
          </div>

          <div className="bg-surface-2 rounded-xl border border-border p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="text-3xl">
                {/* Face ID icon */}
                <svg className="w-12 h-12 mx-auto text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
                  <path d="M9 15c1.5 1.5 4.5 1.5 6 0" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-white font-semibold">Enable Face ID?</h2>
              <p className="text-zinc-400 text-sm">
                Next time you can sign in with biometrics instead of typing the password.
              </p>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={handleRegisterPasskey}
              disabled={loading}
              className="w-full py-3 bg-brand text-surface font-bold rounded-lg hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Setting up...' : 'Enable Face ID'}
            </button>
            <button
              onClick={() => setPhase('authed')}
              className="w-full py-2 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Login screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white">SPIKE</h1>
          <div className="mt-1 text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
            Tournament System
          </div>
        </div>

        {/* Face ID button (if passkey registered) */}
        {hasPasskey && (
          <div className="bg-surface-2 rounded-xl border border-border p-6">
            <button
              onClick={handleFaceId}
              disabled={loading}
              className="w-full py-4 bg-brand text-surface font-bold rounded-lg hover:bg-brand-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
                <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
                <path d="M9 15c1.5 1.5 4.5 1.5 6 0" strokeLinecap="round" />
              </svg>
              {loading ? 'Verifying...' : 'Sign in with Face ID'}
            </button>
          </div>
        )}

        {/* Password form */}
        <div className="bg-surface-2 rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
            {hasPasskey ? 'Or enter password' : 'Enter Password'}
          </h2>
          <form onSubmit={handlePasswordLogin} className="space-y-3">
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
              autoFocus={!hasPasskey}
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
