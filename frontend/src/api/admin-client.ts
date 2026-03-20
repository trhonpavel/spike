const ADMIN_TOKEN_KEY = 'spike_admin_global'

export function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function setAdminGlobalToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

function authHeaders(): HeadersInit {
  const token = getAdminToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function adminRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface TournamentListItem {
  id: number
  name: string
  slug: string
  status: string
  player_count: number
  round_count: number
  created_at: string | null
}

export interface ServerStatus {
  db_ok: boolean
  tournaments_count: number
  players_count: number
  uptime_seconds: number
}

export const adminApi = {
  login: async (password: string): Promise<string> => {
    const data = await adminRequest<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    setAdminGlobalToken(data.token)
    return data.token
  },

  listTournaments: () =>
    adminRequest<TournamentListItem[]>('/api/admin/tournaments'),

  deleteTournament: (id: number) =>
    adminRequest<void>(`/api/admin/tournaments/${id}`, { method: 'DELETE' }),

  finishTournament: (id: number) =>
    adminRequest<{ status: string }>(`/api/admin/tournaments/${id}/finish`, { method: 'POST' }),

  getServerStatus: () =>
    adminRequest<ServerStatus>('/api/admin/status'),
}
