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

// --- WebAuthn helpers ---

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function webauthnStatus(): Promise<boolean> {
  const res = await fetch('/api/auth/webauthn/status')
  if (!res.ok) return false
  const data = await res.json()
  return data.enabled
}

export async function webauthnRegister(): Promise<void> {
  // Get registration options (requires auth token)
  const optRes = await fetch('/api/auth/webauthn/register/options', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getSessionToken()}` },
  })
  if (!optRes.ok) throw new Error('Failed to get registration options')
  const options = await optRes.json()

  // Decode base64url fields for the browser API
  options.challenge = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  options.user.id = Uint8Array.from(atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  if (options.excludeCredentials) {
    for (const c of options.excludeCredentials) {
      c.id = Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    }
  }

  // Call browser WebAuthn API (triggers Face ID / Touch ID / biometric)
  const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential
  if (!credential) throw new Error('Registration cancelled')

  const attestation = credential.response as AuthenticatorAttestationResponse
  const body = JSON.stringify({
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufferToBase64url(attestation.attestationObject),
      clientDataJSON: bufferToBase64url(attestation.clientDataJSON),
    },
  })

  const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSessionToken()}`,
    },
    body,
  })
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    throw new Error(err.detail || 'Registration failed')
  }
}

export async function webauthnLogin(): Promise<string> {
  // Get authentication options
  const optRes = await fetch('/api/auth/webauthn/login/options', { method: 'POST' })
  if (!optRes.ok) throw new Error('Failed to get login options')
  const options = await optRes.json()

  // Decode base64url fields
  options.challenge = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  if (options.allowCredentials) {
    for (const c of options.allowCredentials) {
      c.id = Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    }
  }

  // Call browser WebAuthn API (triggers Face ID / Touch ID / biometric)
  const credential = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential
  if (!credential) throw new Error('Authentication cancelled')

  const assertion = credential.response as AuthenticatorAssertionResponse
  const body = JSON.stringify({
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: bufferToBase64url(assertion.authenticatorData),
      clientDataJSON: bufferToBase64url(assertion.clientDataJSON),
      signature: bufferToBase64url(assertion.signature),
      userHandle: assertion.userHandle ? bufferToBase64url(assertion.userHandle) : null,
    },
  })

  const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    throw new Error(err.detail || 'Authentication failed')
  }
  const data = await verifyRes.json()
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
