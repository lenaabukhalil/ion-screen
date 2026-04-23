export function apiBase(): string {
  return ''
}

export function apiPath(segment: string): string {
  const s = segment.startsWith('/') ? segment : `/${segment}`
  return s
}
