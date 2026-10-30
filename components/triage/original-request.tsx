'use client'

import { useState } from 'react'
import { Mail, ScanSearch, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AI_SIGNALS, type Signal, type SignalKind } from '@/lib/tickets'
import { Panel } from './panel'
import type { QueueTicket } from './types'

const SIGNAL_STYLES: Record<SignalKind, { mark: string; dot: string }> = {
  Product: {
    mark: 'bg-primary/10 decoration-primary/50',
    dot: 'bg-primary',
  },
  Module: {
    mark: 'bg-chart-2/12 decoration-chart-2/60',
    dot: 'bg-chart-2',
  },
  Severity: {
    mark: 'bg-severity-medium/12 decoration-severity-medium/60',
    dot: 'bg-severity-medium',
  },
  Context: {
    mark: 'bg-foreground/[0.05] decoration-muted-foreground/50',
    dot: 'bg-muted-foreground',
  },
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderHighlighted(text: string, signals: Signal[], enabled: boolean) {
  if (!enabled || signals.length === 0) return text
  const pattern = new RegExp(`(${signals.map((s) => escapeRegExp(s.term)).join('|')})`, 'gi')
  return text.split(pattern).map((part, i) => {
    const signal = signals.find((s) => s.term.toLowerCase() === part.toLowerCase())
    if (!signal) return part
    return (
      <mark
        key={i}
        title={`AI signal · ${signal.kind}`}
        className={cn(
          'rounded-[5px] px-0.5 text-foreground underline decoration-dotted decoration-[1.5px] underline-offset-[3px] transition-colors',
          SIGNAL_STYLES[signal.kind].mark,
        )}
      >
        {part}
        <span className="sr-only"> (AI-extracted {signal.kind.toLowerCase()} signal)</span>
      </mark>
    )
  })
}

export function OriginalRequest({
  ticket,
  className,
  onAnalyzeTicket,
  hasAnalysis,
  onViewAnalysis,
}: {
  ticket: QueueTicket
  className?: string
  onAnalyzeTicket?: (ticket: QueueTicket) => Promise<string>
  hasAnalysis?: boolean
  onViewAnalysis?: () => void
}) {
  const [showSignals, setShowSignals] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const signals = ticket.signals ?? AI_SIGNALS[ticket.id] ?? []
  const kinds = (['Product', 'Module', 'Severity', 'Context'] as const).filter((k) =>
    signals.some((s) => s.kind === k),
  )
  const initials = ticket.customer.name
    .split(' ')
    .map((p) => p[0])
    .join('')

  return (
    <Panel
      id="request"
      title="Original Request"
      icon={Mail}
      className={className}
      bodyClassName="flex flex-col"
      dense
      action={
        <div className="flex items-center gap-1.5">
          {hasAnalysis && onViewAnalysis && (
            <button
              type="button"
              onClick={onViewAnalysis}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              <span>AI Diagnostic</span>
            </button>
          )}
          {onAnalyzeTicket && (
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={async () => {
                if (!onAnalyzeTicket) return
                setIsAnalyzing(true)
                try {
                  await onAnalyzeTicket(ticket)
                } finally {
                  setIsAnalyzing(false)
                }
              }}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              {isAnalyzing ? 'Analyzing...' : hasAnalysis ? 'Re-Analyze' : 'AI Analysis'}
            </button>
          )}
          {signals.length > 0 && (
            <button
              type="button"
              aria-pressed={showSignals}
              onClick={() => setShowSignals((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                showSignals
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <ScanSearch className="size-3" aria-hidden="true" />
              {signals.length} AI signals
            </button>
          )}
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            via {ticket.channel}
          </span>
        </div>
      }
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground"
          >
            {initials}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium">{ticket.customer.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {ticket.customer.company} · {ticket.customer.plan} plan
            </p>
          </div>
        </div>
        {showSignals && kinds.length > 0 && (
          <ul
            aria-label="Signal legend"
            className="hidden shrink-0 items-center gap-2.5 text-[10.5px] text-muted-foreground sm:flex"
          >
            {kinds.map((k) => (
              <li key={k} className="inline-flex items-center gap-1">
                <span className={cn('size-1.5 rounded-full', SIGNAL_STYLES[k].dot)} aria-hidden="true" />
                {k}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
        <p className="text-[13px] leading-relaxed whitespace-pre-line text-foreground/90 text-pretty">
          {renderHighlighted(ticket.body, signals, showSignals)}
        </p>
      </div>

      {(ticket.errorSummary || ticket.screenshot) && (
        <div className="mt-3 space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
          {ticket.errorSummary && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Error summary
              </p>
              <p className="text-[12px] leading-relaxed text-foreground/85">{ticket.errorSummary}</p>
            </div>
          )}

          {ticket.screenshot && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Screenshot
              </p>
              <img
                src={ticket.screenshot}
                alt="Captured error screenshot"
                className="max-h-64 w-full rounded-lg border border-border object-contain bg-card"
              />
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
