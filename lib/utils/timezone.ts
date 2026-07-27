// ============================================================
// COMMERCO Africa/Algiers Timezone Utility Engine
// IANA Timezone: Africa/Algiers (UTC+1, no Daylight Saving Time)
// ============================================================

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export interface DateRangeISO {
  startISO: string
  endISO: string
  prevStartISO: string
  prevEndISO: string
  label: string
  preset: DatePreset
}

/**
 * Returns UTC Date object formatted in Africa/Algiers timezone
 */
export function getAlgiersNow(): Date {
  const now = new Date()
  const algiersTimeString = now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' })
  return new Date(algiersTimeString)
}

/**
 * Calculates start and end ISO strings for any preset in Africa/Algiers local time,
 * as well as the previous equivalent period ISO strings for comparison metrics.
 */
export function getAlgiersDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string
): DateRangeISO {
  const now = getAlgiersNow()
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()

  // Base dates in Algiers time
  const startOfToday = new Date(year, month, date, 0, 0, 0, 0)
  const endOfToday = new Date(year, month, date, 23, 59, 59, 999)

  let start: Date
  let end: Date
  let prevStart: Date
  let prevEnd: Date
  let label = 'اليوم'

  if (preset === 'today') {
    start = startOfToday
    end = endOfToday
    // Previous period: Yesterday
    prevStart = new Date(year, month, date - 1, 0, 0, 0, 0)
    prevEnd = new Date(year, month, date - 1, 23, 59, 59, 999)
    label = 'اليوم'
  } else if (preset === 'yesterday') {
    start = new Date(year, month, date - 1, 0, 0, 0, 0)
    end = new Date(year, month, date - 1, 23, 59, 59, 999)
    // Previous period: Day before yesterday
    prevStart = new Date(year, month, date - 2, 0, 0, 0, 0)
    prevEnd = new Date(year, month, date - 2, 23, 59, 59, 999)
    label = 'أمس'
  } else if (preset === '7d') {
    start = new Date(year, month, date - 6, 0, 0, 0, 0)
    end = endOfToday
    // Previous 7 days
    prevStart = new Date(year, month, date - 13, 0, 0, 0, 0)
    prevEnd = new Date(year, month, date - 7, 23, 59, 59, 999)
    label = 'آخر 7 أيام'
  } else if (preset === '30d') {
    start = new Date(year, month, date - 29, 0, 0, 0, 0)
    end = endOfToday
    // Previous 30 days
    prevStart = new Date(year, month, date - 59, 0, 0, 0, 0)
    prevEnd = new Date(year, month, date - 30, 23, 59, 59, 999)
    label = 'آخر 30 يوم'
  } else if (preset === 'custom' && customStart && customEnd) {
    const sParts = customStart.split('-').map(Number)
    const eParts = customEnd.split('-').map(Number)
    start = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0)
    end = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999)

    const durationMs = end.getTime() - start.getTime()
    prevEnd = new Date(start.getTime() - 1)
    prevStart = new Date(prevEnd.getTime() - durationMs)
    label = `مخصص (${customStart} - ${customEnd})`
  } else {
    // Default fallback to today
    start = startOfToday
    end = endOfToday
    prevStart = new Date(year, month, date - 1, 0, 0, 0, 0)
    prevEnd = new Date(year, month, date - 1, 23, 59, 59, 999)
    label = 'اليوم'
  }

  // To map local Algiers time to ISO strings (UTC offset is +1 hour / 60 mins)
  // Algiers time = UTC + 1 hour. Therefore, UTC = Algiers - 1 hour.
  const toAlgiersISO = (d: Date) => {
    const utcTime = d.getTime() - (60 * 60 * 1000)
    return new Date(utcTime).toISOString()
  }

  return {
    startISO: toAlgiersISO(start),
    endISO: toAlgiersISO(end),
    prevStartISO: toAlgiersISO(prevStart),
    prevEndISO: toAlgiersISO(prevEnd),
    label,
    preset,
  }
}

/**
 * Returns Algiers local hour (0 to 23) for a given ISO string or Date
 */
export function getAlgiersHour(isoString: string): number {
  const d = new Date(isoString)
  const algiersTimeString = d.toLocaleString('en-US', { timeZone: 'Africa/Algiers', hour12: false, hour: '2-digit' })
  const hour = parseInt(algiersTimeString, 10)
  return isNaN(hour) ? 0 : hour % 24
}

/**
 * Returns Algiers date string (YYYY-MM-DD) for a given ISO string or Date
 */
export function getAlgiersDateString(isoString: string): string {
  const d = new Date(isoString)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(d)
  return parts // Returns YYYY-MM-DD
}

/**
 * Formats Algiers date for display in charts e.g. "27 Jul" or "27/07"
 */
export function formatAlgiersChartDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('ar-DZ', { timeZone: 'Africa/Algiers', day: 'numeric', month: 'short' })
}
