export const CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'CAD', 'INR']

export function money(cents, currency = 'USD', { compact = false } = {}) {
  const value = (cents || 0) / 100
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
    notation: compact && Math.abs(value) >= 10000 ? 'compact' : 'standard',
  }).format(value)
}

/** Signed amount for deltas: +$12.00 / −$12.00 / $0.00 */
export function signedMoney(cents, currency = 'USD', opts = {}) {
  if (!cents) return money(0, currency, opts)
  const sign = cents > 0 ? '+' : '\u2212'
  return `${sign}${money(Math.abs(cents), currency, opts)}`
}

export function centsFromInput(raw) {
  const clean = String(raw).replace(/[^0-9.-]/g, '')
  const value = Number.parseFloat(clean)
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.abs(value) * 100)
}

export function centsToInput(cents) {
  return ((cents || 0) / 100).toFixed(2)
}

export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function currentMonthKey() {
  return todayISO().slice(0, 7)
}

export function monthLabel(key, { short = false } = {}) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString(undefined, {
    month: short ? 'short' : 'long',
    year: 'numeric',
  })
}

export function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function dayLabel(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function relativeDay(iso) {
  const today = todayISO()
  if (iso === today) return 'Today'
  const d = new Date(`${iso}T00:00:00`)
  const t = new Date(`${today}T00:00:00`)
  const diff = Math.round((t - d) / 86400000)
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function pct(value, digits = 1) {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}
