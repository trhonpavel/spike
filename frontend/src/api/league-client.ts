const BASE = '/api/v1/leagues'
const LEAGUE_TOKEN_PREFIX = 'spike_league_token_'

export function getLeagueToken(slug: string): string | null {
  return localStorage.getItem(`${LEAGUE_TOKEN_PREFIX}${slug}`)
}

export function setLeagueToken(slug: string, token: string) {
  localStorage.setItem(`${LEAGUE_TOKEN_PREFIX}${slug}`, token)
}

export function clearLeagueToken(slug: string) {
  localStorage.removeItem(`${LEAGUE_TOKEN_PREFIX}${slug}`)
}

export function isLeagueAdmin(slug: string): boolean {
  return !!getLeagueToken(slug)
}

export interface LeaguePlayer {
  id: number
  name: string
  elo_rating: number
  total_wins: number
  total_losses: number
  total_games: number
  total_balls_won: number
  total_balls_total: number
  total_point_differential: number
  sessions_attended: number
  active: boolean
}

export interface LeagueSession {
  id: number
  name: string
  slug: string
  status: string
  session_date: string | null
  player_count: number
}

export interface League {
  id: number
  name: string
  slug: string
  status: string
  admin_token?: string
}

export interface LeagueDetail {
  id: number
  name: string
  slug: string
  status: string
  player_count: number
  players: LeaguePlayer[]
  sessions: LeagueSession[]
}

function sessionToken(): string {
  return localStorage.getItem('spike_session') || ''
}

function headers(adminToken?: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (adminToken) h['X-Admin-Token'] = adminToken
  const sess = sessionToken()
  if (sess) h['Authorization'] = `Bearer ${sess}`
  return h
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const leagueApi = {
  create: (name: string) =>
    request<League>(BASE, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name }),
    }),

  list: () => request<League[]>(BASE),

  get: (slug: string) => request<LeagueDetail>(`${BASE}/${slug}`),

  addPlayer: (slug: string, name: string, token: string) =>
    request<LeaguePlayer>(`${BASE}/${slug}/players`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name }),
    }),

  updatePlayer: (
    slug: string,
    playerId: number,
    data: { name?: string; active?: boolean },
    token: string,
  ) =>
    request<LeaguePlayer>(`${BASE}/${slug}/players/${playerId}`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify(data),
    }),

  createSession: (
    slug: string,
    data: { session_date?: string; attending_player_ids: number[]; matches_per_group?: number },
    token: string,
  ) =>
    request<{ tournament_slug: string; session_id: number }>(`${BASE}/${slug}/sessions`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(data),
    }),

  closeSession: (slug: string, tournamentId: number, token: string) =>
    request<{ ok: boolean }>(`${BASE}/${slug}/sessions/${tournamentId}/close`, {
      method: 'POST',
      headers: headers(token),
    }),
}
