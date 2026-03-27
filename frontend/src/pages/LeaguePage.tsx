import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  leagueApi,
  getLeagueToken,
  clearLeagueToken,
  type LeaguePlayer,
  type LeagueSession,
} from '../api/league-client'
import { getSessionToken } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'

type Tab = 'standings' | 'sessions' | 'roster'

export default function LeaguePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const appAuth = !!getSessionToken()
  const storedToken = slug ? getLeagueToken(slug) : null
  const admin = appAuth || !!storedToken
  const token = storedToken || ''

  const [tab, setTab] = useState<Tab>('standings')
  const [showNewSession, setShowNewSession] = useState(false)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [attendingIds, setAttendingIds] = useState<Set<number>>(new Set())
  const [matchesPerGroup, setMatchesPerGroup] = useState(1)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null)
  const [editPlayerName, setEditPlayerName] = useState('')
  const [confirmAction, setConfirmAction] = useState<{
    title: string; description: string; variant: 'danger' | 'warning'; onConfirm: () => void
  } | null>(null)
  const [formError, setFormError] = useState('')

  const { data: league, isLoading } = useQuery({
    queryKey: ['league', slug],
    queryFn: () => leagueApi.get(slug!),
    enabled: !!slug,
  })

  const addPlayerMutation = useMutation({
    mutationFn: (name: string) => leagueApi.addPlayer(slug!, name, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', slug] })
      setNewPlayerName('')
      setShowAddPlayer(false)
      setFormError('')
    },
    onError: (e: any) => setFormError(e.message),
  })

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; active?: boolean } }) =>
      leagueApi.updatePlayer(slug!, id, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', slug] })
      setEditingPlayerId(null)
    },
    onError: (e: any) => setFormError(e.message),
  })

  const createSessionMutation = useMutation({
    mutationFn: () =>
      leagueApi.createSession(slug!, {
        session_date: sessionDate,
        attending_player_ids: Array.from(attendingIds),
        matches_per_group: matchesPerGroup,
      }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['league', slug] })
      setShowNewSession(false)
      navigate(`/t/${data.tournament_slug}`)
    },
    onError: (e: any) => setFormError(e.message),
  })

  const closeSessionMutation = useMutation({
    mutationFn: (tournamentId: number) => leagueApi.closeSession(slug!, tournamentId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['league', slug] }),
  })

  if (!slug) return null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
      </div>
    )
  }

  if (!league) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Liga nenalezena</p>
          <Link to="/" className="text-brand text-sm">← Zpět na hlavní stránku</Link>
        </div>
      </div>
    )
  }

  const activePlayers = league.players.filter(p => p.active)

  // --- Standings tab ---
  const StandingsTab = () => (
    <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
      {league.players.length === 0 ? (
        <p className="px-4 py-8 text-center text-zinc-600 text-sm">Zatím žádní hráči</p>
      ) : (
        <div className="divide-y divide-border/50">
          {league.players.map((p, i) => {
            const winRate = p.total_games > 0 ? Math.round(p.total_wins / p.total_games * 100) : 0
            return (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                <span className="font-display text-xs font-bold text-zinc-600 w-5 shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${p.active ? 'text-white' : 'text-zinc-600'}`}>
                      {p.name}
                    </span>
                    {!p.active && (
                      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-700 border border-zinc-800 px-1 rounded">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {p.sessions_attended} tréninků · {p.total_wins}W {p.total_losses}L · {winRate}% win
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="score-num text-lg text-blue-400">{p.elo_rating.toFixed(0)}</div>
                  <div className="font-display text-[9px] font-bold uppercase tracking-widest text-zinc-700">Elo</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // --- Sessions tab ---
  const SessionsTab = () => (
    <div className="space-y-2">
      {league.sessions.length === 0 ? (
        <p className="text-center py-8 text-zinc-600 text-sm">Zatím žádné tréninky</p>
      ) : (
        league.sessions.map((s: LeagueSession) => {
          const dateLabel = s.session_date
            ? new Date(s.session_date + 'T12:00:00').toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short' })
            : s.name
          const badge = s.status === 'finished'
            ? { text: 'Uzavřeno', cls: 'text-qualify bg-qualify/10 border-qualify/20' }
            : { text: 'Aktivní', cls: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' }
          return (
            <div key={s.id} className="bg-surface-2 rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
              <Link to={`/t/${s.slug}`} className="flex-1 min-w-0 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{dateLabel}</span>
                  <span className={`inline-flex font-display text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">{s.player_count} hráčů</div>
              </Link>
              {admin && s.status === 'active' && (
                <button
                  onClick={() => setConfirmAction({
                    title: 'Uzavřít trénink?',
                    description: 'Výsledky se propíší do ligového žebříčku. Tuto akci nelze vrátit.',
                    variant: 'warning',
                    onConfirm: () => closeSessionMutation.mutate(s.id),
                  })}
                  className="shrink-0 px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-qualify border border-border hover:border-qualify/30 transition-all cursor-pointer"
                >
                  Uzavřít
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  // --- Roster tab ---
  const RosterTab = () => (
    <div>
      <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
        {league.players.length === 0 ? (
          <p className="px-4 py-8 text-center text-zinc-600 text-sm">Žádní hráči</p>
        ) : (
          league.players.map((p: LeaguePlayer) => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
              {editingPlayerId === p.id ? (
                <>
                  <input
                    type="text"
                    value={editPlayerName}
                    onChange={e => setEditPlayerName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-surface-3 border border-brand/40 rounded-lg text-white text-sm focus:outline-none"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') updatePlayerMutation.mutate({ id: p.id, data: { name: editPlayerName } })
                      if (e.key === 'Escape') setEditingPlayerId(null)
                    }}
                  />
                  <button
                    onClick={() => updatePlayerMutation.mutate({ id: p.id, data: { name: editPlayerName } })}
                    className="px-2.5 py-1.5 rounded-lg bg-brand text-black font-display text-xs font-bold uppercase cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setEditingPlayerId(null)}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-zinc-500 font-display text-xs font-bold uppercase cursor-pointer"
                  >
                    Zrušit
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate ${p.active ? 'text-white' : 'text-zinc-600 line-through'}`}>
                      {p.name}
                    </span>
                  </div>
                  {admin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingPlayerId(p.id); setEditPlayerName(p.name); setFormError('') }}
                        className="p-2 text-zinc-600 hover:text-brand transition-colors cursor-pointer"
                        title="Přejmenovat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => updatePlayerMutation.mutate({ id: p.id, data: { active: !p.active } })}
                        className={`p-2 transition-colors cursor-pointer ${p.active ? 'text-zinc-600 hover:text-accent-red' : 'text-zinc-700 hover:text-qualify'}`}
                        title={p.active ? 'Deaktivovat' : 'Aktivovat'}
                      >
                        {p.active ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {admin && (
        <div className="mt-3">
          {showAddPlayer ? (
            <div className="bg-surface-2 rounded-2xl border border-border p-4 space-y-3">
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                placeholder="Jméno hráče"
                className="w-full px-4 py-3 bg-surface-3 border border-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand/50 transition-all text-sm"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && newPlayerName.trim()) addPlayerMutation.mutate(newPlayerName.trim())
                  if (e.key === 'Escape') { setShowAddPlayer(false); setFormError('') }
                }}
              />
              {formError && <p className="text-accent-red text-xs">{formError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => newPlayerName.trim() && addPlayerMutation.mutate(newPlayerName.trim())}
                  disabled={!newPlayerName.trim() || addPlayerMutation.isPending}
                  className="btn-brand px-4 py-2 rounded-xl text-sm font-display font-bold uppercase tracking-wider disabled:opacity-30 cursor-pointer"
                >
                  Přidat
                </button>
                <button
                  onClick={() => { setShowAddPlayer(false); setFormError('') }}
                  className="px-4 py-2 rounded-xl border border-border text-zinc-500 font-display text-sm font-bold uppercase tracking-wider cursor-pointer"
                >
                  Zrušit
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowAddPlayer(true); setFormError('') }}
              className="w-full py-3 rounded-2xl border border-dashed border-border text-zinc-600 hover:text-brand hover:border-brand/30 text-sm font-display font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              + Přidat hráče
            </button>
          )}
        </div>
      )}
    </div>
  )

  // --- New session modal ---
  const NewSessionModal = () => {
    const toggleAll = () => {
      if (attendingIds.size === activePlayers.length) {
        setAttendingIds(new Set())
      } else {
        setAttendingIds(new Set(activePlayers.map(p => p.id)))
      }
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface-2 rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-display font-bold text-sm uppercase tracking-widest text-white">
              Nový trénink
            </h2>
          </div>
          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-1.5">
                Datum
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="w-full px-4 py-3 bg-surface-3 border border-border rounded-xl text-white focus:outline-none focus:border-brand/50 transition-all text-sm"
              />
            </div>

            <div>
              <label className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-1.5">
                Formát kola
              </label>
              <div className="flex gap-2">
                {[
                  { value: 1, label: '1 zápas', sub: 'rychlá rotace' },
                  { value: 2, label: '2 zápasy', sub: 'střední' },
                  { value: 3, label: '3 zápasy', sub: 'round-robin' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMatchesPerGroup(opt.value)}
                    className={`flex-1 py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      matchesPerGroup === opt.value
                        ? 'border-brand/40 bg-brand/5 text-white'
                        : 'border-border text-zinc-500 hover:border-border-bright'
                    }`}
                  >
                    <div className="font-display text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  Kdo přišel ({attendingIds.size}/{activePlayers.length})
                </label>
                <button
                  onClick={toggleAll}
                  className="font-display text-[10px] font-bold uppercase tracking-widest text-brand cursor-pointer"
                >
                  {attendingIds.size === activePlayers.length ? 'Zrušit vše' : 'Vybrat vše'}
                </button>
              </div>
              <div className="space-y-1">
                {activePlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const next = new Set(attendingIds)
                      if (next.has(p.id)) next.delete(p.id)
                      else next.add(p.id)
                      setAttendingIds(next)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                      attendingIds.has(p.id)
                        ? 'border-brand/40 bg-brand/5 text-white'
                        : 'border-border text-zinc-500 hover:border-border-bright'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                      attendingIds.has(p.id) ? 'border-brand bg-brand' : 'border-zinc-700'
                    }`}>
                      {attendingIds.has(p.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-black" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="ml-auto font-display text-[10px] text-zinc-700 tabular-nums">{p.elo_rating.toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="text-accent-red text-xs">{formError}</p>}
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-2">
            <button
              onClick={() => createSessionMutation.mutate()}
              disabled={attendingIds.size < 4 || createSessionMutation.isPending}
              className="btn-brand flex-1 py-3 rounded-xl text-sm font-display font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {createSessionMutation.isPending ? 'Vytvářím...' : `Spustit (${attendingIds.size} hráčů)`}
            </button>
            <button
              onClick={() => { setShowNewSession(false); setFormError('') }}
              className="px-4 py-3 rounded-xl border border-border text-zinc-500 font-display text-sm font-bold uppercase tracking-wider cursor-pointer"
            >
              Zrušit
            </button>
          </div>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'standings', label: 'Žebříček' },
    { key: 'sessions', label: 'Tréninky' },
    { key: 'roster', label: 'Hráči' },
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="font-display text-xl font-black text-brand uppercase tracking-tight shrink-0 cursor-pointer">
              Spike
            </Link>
            <h1 className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
              {league.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {admin && (
              <button
                onClick={() => {
                  setAttendingIds(new Set(activePlayers.map(p => p.id)))
                  setSessionDate(new Date().toISOString().slice(0, 10))
                  setMatchesPerGroup(1)
                  setFormError('')
                  setShowNewSession(true)
                }}
                className="btn-brand px-3 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider cursor-pointer"
              >
                + Trénink
              </button>
            )}
            {admin && !appAuth && (
              <button
                onClick={() => { clearLeagueToken(slug); window.location.reload() }}
                className="px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-accent-red border border-border hover:border-accent-red/30 transition-all cursor-pointer"
              >
                Odhlásit
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-0">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                  tab === t.key
                    ? 'text-brand border-brand'
                    : 'text-zinc-600 border-transparent hover:text-zinc-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 anim-fade">
        {tab === 'standings' && <StandingsTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'roster' && <RosterTab />}
      </main>

      {showNewSession && <NewSessionModal />}

      {confirmAction && (
        <ConfirmDialog
          open
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel="Potvrdit"
          variant={confirmAction.variant}
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
