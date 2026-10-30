import { Boxes, BrainCircuit, Layers, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/lib/tickets'
import { Panel } from './panel'
import { SeverityBadge } from './severity-badge'

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex w-16 shrink-0 items-center gap-1.5">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Model confidence"
        className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right font-mono text-[10.5px] text-muted-foreground tabular-nums">
        {pct}%
      </span>
    </div>
  )
}

function Chip({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'slate' }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tone === 'blue'
          ? 'bg-primary/8 text-primary ring-primary/20'
          : 'bg-secondary text-secondary-foreground ring-border',
      )}
    >
      {children}
    </span>
  )
}

export function ClassificationPanel({ classification }: { classification: Ticket['classification'] }) {
  const rows = [
    {
      label: 'Product',
      icon: Boxes,
      value: <Chip tone="blue">{classification.product.value}</Chip>,
      confidence: classification.product.confidence,
    },
    {
      label: 'Module',
      icon: Layers,
      value: <Chip tone="slate">{classification.module.value}</Chip>,
      confidence: classification.module.confidence,
    },
    {
      label: 'Severity',
      icon: Gauge,
      value: <SeverityBadge severity={classification.severity.value} size="md" />,
      confidence: classification.severity.confidence,
    },
  ]

  return (
    <Panel
      id="classification"
      title="AI Classification"
      icon={BrainCircuit}
      dense
      action={<span className="font-mono text-[11px] text-muted-foreground">triage-v3</span>}
    >
      <dl className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent/30"
          >
            <dt className="flex w-[68px] shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <row.icon className="size-3.5" aria-hidden="true" />
              {row.label}
            </dt>
            <dd className="flex min-w-0 flex-1 items-center">{row.value}</dd>
            <ConfidenceMeter value={row.confidence} />
          </div>
        ))}
      </dl>
    </Panel>
  )
}
