const PREFIX = 'spike_admin_'

function safeStorage() {
  try {
    const key = '__spike_test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function getAdminToken(slug: string): string | null {
  if (!safeStorage()) return null
  return localStorage.getItem(`${PREFIX}${slug}`)
}

export function setAdminToken(slug: string, token: string) {
  if (!safeStorage()) return
  localStorage.setItem(`${PREFIX}${slug}`, token)
}

export function isAdmin(slug: string): boolean {
  return !!getAdminToken(slug)
}
