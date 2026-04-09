import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, getAdminToken, clearAdminToken, type TournamentListItem, type LeagueListItem } from '../api/admin-client'
import { useTheme } from '../hooks/useTheme'
import ConfirmDialog from '../components/ConfirmDialog'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authed, setAuthed] = useState(!!getAdminToken())
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; variant: 'danger' | 'warning'; onConfirm: () => void } | null>(null)
  const queryClient = useQueryClient()
  const { theme, toggle: toggleTheme } = useTheme()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoginLoading(true)
    setError('')
    try {
      await adminApi.login(password)
      setAuthed(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    clearAdminToken()
    setAuthed(false)
  }

  const { data: status } = useQuery({
    queryKey: ['admin-status'],
    queryFn: () => adminApi.getServerStatus(),
    enabled: authed,
    refetchInterval: 30000,
  })

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => adminApi.listTournaments(),
    enabled: authed,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteTournament(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] }),
  })

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['admin-leagues'],
    queryFn: () => adminApi.listLeagues(),
    enabled: authed,
  })

  const deleteLeagueMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteLeague(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-leagues'] }),
  })

  const finishMutation = useMutation({
    mutationFn: (id: number) => adminApi.finishTournament(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] }),
  })

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Login form
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-xs relative z-10 stagger">
          <div className="text-center mb-10">
            <h1 className="font-display text-5xl font-black tracking-tight text-white neon-text uppercase">
              Admin
            </h1>
            <p className="text-xs font-display font-semibold uppercase tracking-[0.4em] text-zinc-500 mt-3">
              Spike Server
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-4 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 focus:shadow-[0_0_20px_rgba(228,255,26,0.1)] transition-all text-base"
              autoFocus
            />
            {error && <p className="text-accent-red text-sm font-medium anim-fade">{error}</p>}
            <button
              type="submit"
              disabled={loginLoading || !password.trim()}
              className="btn-brand w-full py-4 rounded-xl text-base font-display font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loginLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full anim-spin" />
                  Verifying
                </span>
              ) : 'Login'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-zinc-600 text-sm hover:text-brand transition-colors">Back to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // Admin dashboard
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-xl font-black text-brand uppercase tracking-tight cursor-pointer">
              Spike
            </Link>
            <h1 className="font-display text-base font-bold text-white uppercase tracking-wide">
              Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button"
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
            <button type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-accent-red border border-border hover:border-accent-red/30 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 anim-fade">
        {/* Server status */}
        {status && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${status.db_ok ? 'bg-qualify' : 'bg-accent-red'}`} />
              <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">DB</div>
            </div>
            <div className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <div className="score-num text-xl text-white">{status.tournaments_count}</div>
              <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Tournaments</div>
            </div>
            <div className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <div className="score-num text-xl text-white">{status.players_count}</div>
              <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Players</div>
            </div>
            <div className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <div className="score-num text-lg text-white">{formatUptime(status.uptime_seconds)}</div>
              <div className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">Uptime</div>
            </div>
          </div>
        )}

        {/* Tournament list */}
        <div>
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
            Tournaments
          </h2>

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
            </div>
          )}

          {!isLoading && tournaments.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm">No tournaments yet</div>
          )}

          <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {tournaments.map((t: TournamentListItem) => {
              const badge = t.status === 'finished'
                ? { text: 'Done', cls: 'text-qualify bg-qualify/10 border-qualify/20' }
                : { text: 'Active', cls: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' }
              return (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <Link to={`/t/${t.slug}`} className="flex-1 min-w-0 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{t.name}</span>
                      <span className={`inline-flex font-display text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                      <span>{t.player_count}P</span>
                      <span>{t.round_count}R</span>
                      <span className="text-zinc-700">{t.slug}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.status === 'active' && (
                      <button type="button"
                        onClick={() => setConfirmAction({
                          title: 'Finish Tournament?',
                          description: `Mark "${t.name}" as finished. This changes its status but does not delete any data.`,
                          variant: 'warning',
                          onConfirm: () => finishMutation.mutate(t.id),
                        })}
                        className="p-2 text-zinc-600 hover:text-status-draft transition-colors cursor-pointer"
                        title="Finish tournament"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <button type="button"
                      onClick={() => setConfirmAction({
                        title: 'Delete Tournament?',
                        description: `Permanently delete "${t.name}" and all its data. This cannot be undone.`,
                        variant: 'danger',
                        onConfirm: () => deleteMutation.mutate(t.id),
                      })}
                      className="p-2 text-zinc-600 hover:text-accent-red transition-colors cursor-pointer"
                      title="Delete tournament"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Leagues list */}
        <div>
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-500 mb-3">
            Leagues
          </h2>

          {leaguesLoading && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
            </div>
          )}

          {!leaguesLoading && leagues.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-sm">No leagues yet</div>
          )}

          <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {leagues.map((l: LeagueListItem) => (
              <div key={l.id} className="px-4 py-3 flex items-center gap-3">
                <Link to={`/l/${l.slug}`} className="flex-1 min-w-0 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{l.name}</span>
                    <span className={`inline-flex font-display text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${l.status === 'finished' ? 'text-qualify bg-qualify/10 border-qualify/20' : 'text-accent-blue bg-accent-blue/10 border-accent-blue/20'}`}>
                      {l.status === 'finished' ? 'Done' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                    <span>{l.player_count}P</span>
                    <span className="text-zinc-700">{l.slug}</span>
                  </div>
                </Link>
                <button type="button"
                  onClick={() => setConfirmAction({
                    title: 'Delete League?',
                    description: `Permanently delete "${l.name}" and all its data. This cannot be undone.`,
                    variant: 'danger',
                    onConfirm: () => deleteLeagueMutation.mutate(l.id),
                  })}
                  className="p-2 text-zinc-600 hover:text-accent-red transition-colors cursor-pointer"
                  title="Delete league"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {confirmAction && (
        <ConfirmDialog
          open={true}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel="Confirm"
          variant={confirmAction.variant}
          onConfirm={() => {
            confirmAction.onConfirm()
            setConfirmAction(null)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
