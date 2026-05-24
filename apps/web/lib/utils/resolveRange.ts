export function resolveRange(range: string) {
  const now = new Date()

  const to = new Date(now)
  const from = new Date(now)

  const map: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  }

  const days = map[range] ?? 30

  from.setDate(from.getDate() - days)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}