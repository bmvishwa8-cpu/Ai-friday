'use client'

import { useState, useEffect } from 'react'
import { Check, CheckCircle2, KeyRound, Loader2, RefreshCw, Settings, ShieldAlert, Sparkles, X } from 'lucide-react'
import { getStoredAiConfig, saveStoredAiConfig, clearStoredAiConfig, type StoredAiConfig } from '@/lib/ai-client'
import { AVAILABLE_MODELS } from '@/lib/ai-models'

interface AiSettingsModalProps {
  open: boolean
  onClose: () => void
  onSave?: (config: StoredAiConfig) => void
}

export function AiSettingsModal({ open, onClose, onSave }: AiSettingsModalProps) {
  const [providerPreset, setProviderPreset] = useState<'openai' | 'genailab' | 'custom'>('genailab')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('genailab-maas-gpt-4o')
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    if (open) {
      const stored = getStoredAiConfig()
      if (stored.baseUrl?.includes('api.openai.com')) {
        setProviderPreset('openai')
        setBaseUrl('https://api.openai.com')
        setModel(stored.model || 'gpt-4o')
      } else if (stored.baseUrl && !stored.baseUrl.includes('genailab')) {
        setProviderPreset('custom')
        setBaseUrl(stored.baseUrl)
        setModel(stored.model || 'gpt-4o')
      } else {
        setProviderPreset('genailab')
        setBaseUrl(stored.baseUrl || 'https://genailab.tcs.in')
        setModel(stored.model || 'genailab-maas-gpt-4o')
      }
      setApiKey(stored.apiKey || '')
      setTestState('idle')
      setTestMessage('')
    }
  }, [open])

  if (!open) return null

  function handleSelectPreset(preset: 'openai' | 'genailab' | 'custom') {
    setProviderPreset(preset)
    setTestState('idle')
    setTestMessage('')
    if (preset === 'openai') {
      setBaseUrl('https://api.openai.com')
      setModel('gpt-4o')
    } else if (preset === 'genailab') {
      setBaseUrl('https://genailab.tcs.in')
      setModel('genailab-maas-gpt-4o')
    } else {
      setBaseUrl('')
      setModel('gpt-4o')
    }
  }

  async function handleTestConnection() {
    setTestState('testing')
    setTestMessage('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Respond with the single word: Connected',
          baseUrl: baseUrl.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      if (data.source === 'openai-api') {
        setTestState('success')
        setTestMessage(`Live OpenAI API connection successful (${data.model || model})!`)
      } else if (data.fallback) {
        setTestState('error')
        setTestMessage(data.gatewayNotice || 'Upstream gateway returned an authorization or connection error.')
      } else {
        setTestState('success')
        setTestMessage(`AI response verified from ${data.source || 'endpoint'}.`)
      }
    } catch (err) {
      setTestState('error')
      setTestMessage(err instanceof Error ? err.message : 'Connection test failed.')
    }
  }

  function handleSave() {
    const config: StoredAiConfig = {
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || undefined,
    }
    saveStoredAiConfig(config)
    if (onSave) onSave(config)
    onClose()
  }

  function handleReset() {
    clearStoredAiConfig()
    setProviderPreset('genailab')
    setBaseUrl('https://genailab.tcs.in')
    setApiKey('')
    setModel('genailab-maas-gpt-4o')
    setTestState('idle')
    setTestMessage('')
    if (onSave) onSave({})
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <KeyRound className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI API &amp; Model Configuration</h3>
              <p className="text-[11px] text-muted-foreground">
                Connect real OpenAI or TCS GenAI Lab API endpoints
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Provider Preset Buttons */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">API Provider</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('openai')}
                className={`rounded-lg border px-3 py-2 text-center font-medium transition ${
                  providerPreset === 'openai'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-muted/30 hover:bg-muted text-foreground'
                }`}
              >
                OpenAI (Official)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('genailab')}
                className={`rounded-lg border px-3 py-2 text-center font-medium transition ${
                  providerPreset === 'genailab'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-muted/30 hover:bg-muted text-foreground'
                }`}
              >
                TCS GenAI Lab
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={`rounded-lg border px-3 py-2 text-center font-medium transition ${
                  providerPreset === 'custom'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-muted/30 hover:bg-muted text-foreground'
                }`}
              >
                Custom Endpoint
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Endpoint path for /v1/chat/completions
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              API Key ({providerPreset === 'openai' ? 'OpenAI key sk-...' : 'Provider key'})
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Stored locally in your browser session for direct API calls
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {providerPreset === 'openai' && (
                <>
                  <option value="gpt-4o">OpenAI GPT-4o (Recommended)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                  <option value="gpt-4-turbo">OpenAI GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                  <option value="o3-mini">OpenAI o3-mini</option>
                </>
              )}
              {providerPreset === 'genailab' && (
                <>
                  <option value="genailab-maas-gpt-4o">genailab-maas-gpt-4o (Default)</option>
                  <option value="azure/genailab-maas-gpt-4o-mini">azure/genailab-maas-gpt-4o-mini</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="genailab-maas-gpt-35-turbo">genailab-maas-gpt-35-turbo</option>
                </>
              )}
              {providerPreset === 'custom' &&
                AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
            </select>
          </div>

          {/* Test Status Banner */}
          {testState !== 'idle' && (
            <div
              className={`rounded-xl border p-3 text-xs ${
                testState === 'testing'
                  ? 'border-border bg-muted/40 text-foreground'
                  : testState === 'success'
                  ? 'border-severity-low/40 bg-severity-low/10 text-severity-low'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
              }`}
            >
              <div className="flex items-center gap-2">
                {testState === 'testing' && <Loader2 className="size-4 animate-spin text-primary" />}
                {testState === 'success' && <CheckCircle2 className="size-4" />}
                {testState === 'error' && <ShieldAlert className="size-4" />}
                <span className="font-semibold">
                  {testState === 'testing'
                    ? 'Calling AI endpoint...'
                    : testState === 'success'
                    ? 'Connection Successful'
                    : 'Connection Notice'}
                </span>
              </div>
              {testMessage && <p className="mt-1 text-[11px] opacity-90 leading-relaxed">{testMessage}</p>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testState === 'testing'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              {testState === 'testing' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Test Connection
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Check className="size-3.5" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

