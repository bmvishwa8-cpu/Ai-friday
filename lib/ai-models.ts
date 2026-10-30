export type AiModelOption = {
  id: string
  label: string
  category: 'chat' | 'vision' | 'reasoning' | 'audio' | 'embedding'
  supportsVision: boolean
}

export const AVAILABLE_MODELS: AiModelOption[] = [
  { id: 'gpt-4o', label: 'OpenAI GPT-4o', category: 'vision', supportsVision: true },
  { id: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini', category: 'chat', supportsVision: true },
  { id: 'gpt-4-turbo', label: 'OpenAI GPT-4 Turbo', category: 'vision', supportsVision: true },
  { id: 'gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo', category: 'chat', supportsVision: false },
  { id: 'o1', label: 'OpenAI o1', category: 'reasoning', supportsVision: true },
  { id: 'o3-mini', label: 'OpenAI o3-mini', category: 'reasoning', supportsVision: false },
  { id: 'genailab-maas-gpt-35-turbo', label: 'GPT-3.5 Turbo', category: 'chat', supportsVision: false },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', category: 'vision', supportsVision: true },
  { id: 'azure/genailab-maas-gpt-4o-mini', label: 'GPT-4o Mini', category: 'chat', supportsVision: true },
  { id: 'azure/genailab-maas-text-embedding-3-large', label: 'Text Embedding 3 Large', category: 'embedding', supportsVision: false },
  { id: 'azure/genailab-maas-whisper', label: 'Whisper', category: 'audio', supportsVision: false },
  { id: 'azure_ai/genailab-maas-Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama 4 Maverick 17B', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-4o', label: 'GPT-4o', category: 'vision', supportsVision: true },
  { id: 'azure_ai/genailab-maas-Phi-4-reasoning', label: 'Phi-4 Reasoning', category: 'reasoning', supportsVision: true },
  { id: 'azure/genailab-maas-gpt-4.1-mini', label: 'GPT-4.1 Mini', category: 'chat', supportsVision: true },
  { id: 'azure/genailab-maas-gpt-4.1-nano', label: 'GPT-4.1 Nano', category: 'chat', supportsVision: true },
  { id: 'azure/genailab-maas-gpt-4.1', label: 'GPT-4.1', category: 'vision', supportsVision: true },
  { id: 'azure/genailab-maas-gpt-5-mini', label: 'GPT-5 Mini', category: 'vision', supportsVision: true },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', category: 'vision', supportsVision: true },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', category: 'vision', supportsVision: true },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', category: 'vision', supportsVision: true },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.0', label: 'GPT-5', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.1', label: 'GPT-5.1', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.4', label: 'GPT-5.4', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.4-nano', label: 'GPT-5.4 Nano', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.4-mini', label: 'GPT-5.4 Mini', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.2', label: 'GPT-5.2', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.2-codex', label: 'GPT-5.2 Codex', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-gpt-5.3-codex', label: 'GPT-5.3 Codex', category: 'vision', supportsVision: true },
  { id: 'azure/gpt-realtime-whisper', label: 'GPT Realtime Whisper', category: 'audio', supportsVision: false },
  { id: 'genailab-maas-sonnet-4.6', label: 'Sonnet 4.6', category: 'vision', supportsVision: true },
  { id: 'genailab-maas-Opus-4.6', label: 'Opus 4.6', category: 'vision', supportsVision: true },
]

export const DEFAULT_TEXT_MODEL = 'genailab-maas-gpt-4o'
export const DEFAULT_VISION_MODEL = 'genailab-maas-gpt-4o'

export function getModelLabel(modelId: string) {
  return AVAILABLE_MODELS.find((model) => model.id === modelId)?.label ?? modelId
}

export function isVisionCapableModel(modelId: string) {
  return AVAILABLE_MODELS.some(
    (model) => model.id === modelId && (model.supportsVision || model.category === 'vision'),
  )
}

export function resolveModelId(modelId: string | undefined, hasImage: boolean) {
  const requested = modelId?.trim()
  const fallback = hasImage ? DEFAULT_VISION_MODEL : DEFAULT_TEXT_MODEL

  if (!requested) return fallback

  const isKnown = AVAILABLE_MODELS.some((model) => model.id === requested)
  if (!isKnown) return fallback

  if (hasImage && !isVisionCapableModel(requested)) return fallback

  return requested
}
