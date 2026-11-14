const MB = 1024 * 1024

const parseMegabytes = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const EMERGENCY_CHARGE_URL = (import.meta.env.VITE_EMERGENCY_CHARGE_URL || '').trim()
export const EMERGENCY_CHARGE_MB = parseMegabytes(import.meta.env.VITE_EMERGENCY_CHARGE_MB, 500)
export const EMERGENCY_CHARGE_THRESHOLD_BYTES =
  parseMegabytes(import.meta.env.VITE_EMERGENCY_CHARGE_THRESHOLD_MB, 500) * MB
export const TELEGRAM_BOT_URL = (import.meta.env.VITE_TELEGRAM_BOT_URL || '').trim()
// Hours of validity the service gives an expired user along with the traffic (EXPIRED_EXTEND_HOURS there).
export const EMERGENCY_CHARGE_EXTEND_HOURS = parseMegabytes(import.meta.env.VITE_EMERGENCY_CHARGE_EXTEND_HOURS, 24)

export const isSubscriptionExpired = (status: string, expire: string | null | undefined) => {
  if (status === 'expired') return true
  if (!expire) return false
  const time = new Date(expire.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(expire) ? expire : `${expire}Z`).getTime()
  return Number.isFinite(time) && time <= Date.now()
}

// Mirrors the server's eligibility rules so the card only shows up when a charge can succeed.
export const isEmergencyChargeAvailable = ({
  status,
  dataLimit,
  usedTraffic,
  expire,
}: {
  status: string
  dataLimit: number
  usedTraffic: number
  expire: string | null | undefined
}) => {
  if (!EMERGENCY_CHARGE_URL || !dataLimit || dataLimit <= 0) return false
  if (status === 'limited' || isSubscriptionExpired(status, expire)) return true
  return status === 'active' && dataLimit - (usedTraffic || 0) < EMERGENCY_CHARGE_THRESHOLD_BYTES
}

export type EmergencyChargeErrorCode =
  | 'already_used'
  | 'not_eligible'
  | 'not_needed'
  | 'invalid_token'
  | 'rate_limited'
  | 'expired'
  | 'unavailable'
  | 'network'
  | 'unknown'

export type EmergencyChargeResult =
  | { ok: true; addedBytes: number; extendedUntil: string | null }
  | { ok: false; code: EmergencyChargeErrorCode }

const KNOWN_ERROR_CODES: EmergencyChargeErrorCode[] = [
  'already_used',
  'not_eligible',
  'not_needed',
  'invalid_token',
  'rate_limited',
  'expired',
]

// The page lives at /<sub-path>/<token>/, so the token is the last path segment.
export const getSubscriptionToken = () =>
  window.location.pathname
    .replace(/\/info\/?$/, '')
    .split('/')
    .filter(Boolean)
    .pop() ?? ''

export const requestEmergencyCharge = async (): Promise<EmergencyChargeResult> => {
  let response: Response
  try {
    response = await fetch(EMERGENCY_CHARGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getSubscriptionToken() }),
    })
  } catch {
    return { ok: false, code: 'network' }
  }

  let body: { ok?: boolean; code?: string; added_bytes?: number; extended_until?: string | null } | null = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (response.ok && body?.ok) {
    return {
      ok: true,
      addedBytes: body.added_bytes ?? EMERGENCY_CHARGE_MB * MB,
      extendedUntil: body.extended_until ?? null,
    }
  }

  const known = KNOWN_ERROR_CODES.find(code => code === body?.code)
  if (known) return { ok: false, code: known }
  // Panel/service failures, or a relay in front answering with its own error page.
  return { ok: false, code: response.status >= 500 || !body ? 'unavailable' : 'unknown' }
}
