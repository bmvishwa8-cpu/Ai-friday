import { Route, Timer, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: string
  delta: string
  onClick?: () => void
}) {
  const clickable = typeof onClick === 'function'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        'w-full rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200',
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        !clickable && 'cursor-default',
      )}
    >
      <dt className="flex items-start gap-1.5 text-[10.5px] leading-4 font-medium text-muted-foreground">
        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground">
          <Icon className="size-2.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-pretty">{label}</span>
      </dt>
      <dd className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-lg leading-none font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-severity-low">
          <TrendingUp className="size-2.5" aria-hidden="true" />
          {delta}
        </span>
      </dd>
    </button>
  )
}

export function QueueKpis({ autoRouted, onOpenInsights }: { autoRouted: number; onOpenInsights?: () => void }) {
  return (
    <dl aria-label="Today's AI impact" className="grid grid-cols-2 gap-2">
      <KpiCard icon={Timer} label="AI Time Saved" value="12h" delta="18%" onClick={onOpenInsights} />
      <KpiCard icon={Route} label="Auto-routed today" value={autoRouted.toLocaleString()} delta="9%" />
    </dl>
  )
}
