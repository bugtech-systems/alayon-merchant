// utils/dateRange.ts

export type RangeInput =
  | "7d"
  | "30d"
  | "90d"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "today"
  | "yesterday"
  | string

export function resolveDateRange(range: RangeInput) {
  const now = new Date()

  const to = new Date(now)
  const from = new Date(now)

  const setDaysBack = (days: number) => {
    from.setDate(from.getDate() - days)
  }

  const setMonthsBack = (months: number) => {
    from.setMonth(from.getMonth() - months)
  }

  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0)
      break

    case "yesterday":
      from.setDate(from.getDate() - 1)
      from.setHours(0, 0, 0, 0)
      to.setDate(to.getDate() - 1)
      to.setHours(23, 59, 59, 999)
      break

    case "7d":
      setDaysBack(7)
      break

    case "30d":
      setDaysBack(30)
      break

    case "90d":
      setDaysBack(90)
      break

    case "1m":
      setMonthsBack(1)
      break

    case "3m":
      setMonthsBack(3)
      break

    case "6m":
      setMonthsBack(6)
      break

    case "1y":
      setMonthsBack(12)
      break

    default:
      // fallback: treat unknown as 30d
      setDaysBack(30)
      break
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}