export function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:1880'
  return raw.replace(/\/$/, '')
}

export function apiPath(segment: string): string {
  const s = segment.startsWith('/') ? segment : `/${segment}`
  return `${apiBase()}${s}`
}
