export function daysUntil(dateString: string): number {
  const target = new Date(dateString)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function startOfTodayIso(): string {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export function daysAgoLabel(days: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
