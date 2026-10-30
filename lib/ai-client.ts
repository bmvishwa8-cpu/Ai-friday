export type StoredAiConfig = {
  baseUrl?: string
  apiKey?: string
  model?: string
}

const STORAGE_KEY = 'triage_ai_custom_config'

export function getStoredAiConfig(): StoredAiConfig {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export function saveStoredAiConfig(config: StoredAiConfig) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearStoredAiConfig() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function getMergedAiPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const stored = getStoredAiConfig()
  return {
    ...payload,
    ...(stored.baseUrl ? { baseUrl: stored.baseUrl } : {}),
    ...(stored.apiKey ? { apiKey: stored.apiKey } : {}),
    ...(stored.model ? { model: stored.model } : {}),
  }
}

