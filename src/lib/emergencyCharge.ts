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

// Mirrors the server's eligibility rules so the card only shows up when a charge can succeed.
export const isEmergencyChargeAvailable = ({
  status,
  dataLimit,
  usedTraffic,
}: {
  status: string
  dataLimit: number
  usedTraffic: number
}) => {
  if (!EMERGENCY_CHARGE_URL || !dataLimit || dataLimit <= 0) return false
  if (status === 'limited') return true
  return status === 'active' && dataLimit - (usedTraffic || 0) < EMERGENCY_CHARGE_THRESHOLD_BYTES
}

export type EmergencyChargeErrorCode =
  | 'already_used'
  | 'not_eligible'
  | 'not_needed'
  | 'invalid_token'
  | 'rate_limited'
  | 'network'
  | 'unknown'

export type EmergencyChargeResult =
  | { ok: true; addedBytes: number }
  | { ok: false; code: EmergencyChargeErrorCode }

const KNOWN_ERROR_CODES: EmergencyChargeErrorCode[] = [
  'already_used',
  'not_eligible',
  'not_needed',
  'invalid_token',
  'rate_limited',
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

  let body: { ok?: boolean; code?: string; added_bytes?: number } | null = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (response.ok && body?.ok) {
    return { ok: true, addedBytes: body.added_bytes ?? EMERGENCY_CHARGE_MB * MB }
  }

  const code = KNOWN_ERROR_CODES.find(known => known === body?.code) ?? 'unknown'
  return { ok: false, code }
}
