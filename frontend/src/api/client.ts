const BASE = '/api/v1/tournaments'

function headers(adminToken?: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (adminToken) h['X-Admin-Token'] = adminToken
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
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

  finalizeRound: (slug: string, roundId: number, token: string) =>
    request<RoundData>(`${BASE}/${slug}/rounds/${roundId}/finalize`, {
      method: 'POST',
      headers: headers(token),
    }),

  getStandings: (slug: string) =>
    request<Standing[]>(`${BASE}/${slug}/standings`),
}
