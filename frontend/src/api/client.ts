const BASE = '/api/v1/tournaments'
const SESSION_KEY = 'spike_session'

export function getSessionToken(): string {
  return localStorage.getItem(SESSION_KEY) || ''
}

export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_KEY, token)
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_KEY)
}

export async function login(password: string): Promise<string> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Login failed')
  }
  const data = await res.json()
  setSessionToken(data.token)
  return data.token
}

function headers(adminToken?: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (adminToken) h['X-Admin-Token'] = adminToken
  const session = getSessionToken()
  if (session) h['Authorization'] = `Bearer ${session}`
  return h
}

export interface Tournament {
  id: number
  name: string
  slug: string
  status: string
  admin_token?: string
}

export interface Player {
  id: number
  name: string
  wins: number
  balls_won: number
  balls_total: number
  waitings: number
  rating: number
  elo_rating: number
  point_differential: number
  games_played: number
  losses: number
}

export interface MatchData {
  id: number
  match_index: number
  team1_p1: Player
  team1_p2: Player
  team2_p1: Player
  team2_p2: Player
  score_team1: number | null
  score_team2: number | null
}

export interface GroupData {
  id: number
  group_index: number
  players: Player[]
  matches: MatchData[]
}

export interface RoundData {
  id: number
  round_number: number
  status: string
  groups: GroupData[]
  waiting_players: Player[]
}

export interface Standing {
  rank: number
  player: Player
}

export interface PartnerStat {
  partner_id: number
  partner_name: string
  games: number
  wins: number
  point_diff: number
  avg_diff: number
  win_rate: number
}

export interface PlayerStats {
  games_played: number
  wins: number
  losses: number
  point_differential: number
  avg_point_diff: number
  win_rate: number
  consistency: number
  clutch_score: number
  form: number
  adaptability: number
  partner_stats: PartnerStat[]
}

export interface MatchPlayerStatData {
  id: number
  match_id: number
  player_id: number
  side: string
  partner_id: number
  score_for: number
  score_against: number
  won: boolean
  elo_before: number
  elo_after: number
}

export interface PartnerRecord {
  id: number
  tournament_id: number
  player1_id: number
  player2_id: number
  player1_name: string
  player2_name: string
  games_together: number
  wins_together: number
  point_diff_together: number
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const session = getSessionToken()
  if (session) {
    const h = new Headers(init?.headers)
    if (!h.has('Authorization')) h.set('Authorization', `Bearer ${session}`)
    init = { ...init, headers: h }
  }
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  createTournament: (name: string) =>
    request<Tournament>(`${BASE}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name }),
    }),

  getTournament: (slug: string) =>
    request<Tournament>(`${BASE}/${slug}`),

  listPlayers: (slug: string) =>
    request<Player[]>(`${BASE}/${slug}/players`),

  addPlayer: (slug: string, name: string, token: string) =>
    request<Player>(`${BASE}/${slug}/players`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name }),
    }),

  removePlayer: (slug: string, playerId: number, token: string) =>
    request<void>(`${BASE}/${slug}/players/${playerId}`, {
      method: 'DELETE',
      headers: headers(token),
    }),

  renamePlayer: (slug: string, playerId: number, name: string, token: string) =>
    request<Player>(`${BASE}/${slug}/players/${playerId}`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ name }),
    }),

  listRounds: (slug: string) =>
    request<RoundData[]>(`${BASE}/${slug}/rounds`),

  getRounds: (slug: string) =>
    request<RoundData[]>(`${BASE}/${slug}/rounds`),

  drawRound: (slug: string, token: string) =>
    request<RoundData>(`${BASE}/${slug}/rounds/draw`, {
      method: 'POST',
      headers: headers(token),
    }),

  confirmRound: (slug: string, roundId: number, token: string) =>
    request<RoundData>(`${BASE}/${slug}/rounds/${roundId}/confirm`, {
      method: 'POST',
      headers: headers(token),
    }),

  setScore: (slug: string, matchId: number, score1: number, score2: number, token: string) =>
    request<MatchData>(`${BASE}/${slug}/matches/${matchId}/score`, {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({ score_team1: score1, score_team2: score2 }),
    }),

  deleteRound: (slug: string, roundId: number, token: string) =>
    request<void>(`${BASE}/${slug}/rounds/${roundId}`, {
      method: 'DELETE',
      headers: headers(token),
    }),

  finalizeRound: (slug: string, roundId: number, token: string) =>
    request<RoundData>(`${BASE}/${slug}/rounds/${roundId}/finalize`, {
      method: 'POST',
      headers: headers(token),
    }),

  getStandings: (slug: string, sortBy: string = 'rating') =>
    request<Standing[]>(`${BASE}/${slug}/standings?sort_by=${sortBy}`),

  getPlayerStats: (slug: string, playerId: number) =>
    request<PlayerStats>(`${BASE}/${slug}/players/${playerId}/stats`),

  getPartnerRecords: (slug: string, playerId: number) =>
    request<PartnerRecord[]>(`${BASE}/${slug}/partner-records?player_id=${playerId}`),

  getMatchPlayerStats: (slug: string, playerId: number) =>
    request<MatchPlayerStatData[]>(`${BASE}/${slug}/match-player-stats?player_id=${playerId}`),

  bulkAddPlayers: (slug: string, players: { name: string; elo_rating?: number }[], token: string) =>
    request<Player[]>(`${BASE}/${slug}/players/bulk`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(players),
    }),

  exportStandings: async (slug: string, format: 'csv' | 'json' | 'pdf', sortBy: string = 'rating') => {
    const session = getSessionToken()
    const h: HeadersInit = {}
    if (session) h['Authorization'] = `Bearer ${session}`
    const res = await fetch(`${BASE}/${slug}/export/standings.${format}?sort_by=${sortBy}`, { headers: h })
    if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-standings.${format}`
    a.click()
    URL.revokeObjectURL(url)
  },
}
