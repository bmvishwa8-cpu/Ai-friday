import { ChevronDown, GitBranch, RotateCcw, Sparkles, UserCheck } from 'lucide-react'
import { ROUTING_OPTIONS, type Ticket } from '@/lib/tickets'
import { Panel } from './panel'
import type { AssignmentLog } from './types'

function matchRoute(val1: string, val2: string): boolean {
  if (!val1 || !val2) return false
  return val1.replace(/[-–—]/g, '-').trim().toLowerCase() === val2.replace(/[-–—]/g, '-').trim().toLowerCase()
}

export function RoutingPanel({
  routing,
  value,
  onChange,
  disabled,
  assignment,
}: {
  routing: Ticket['routing']
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  assignment?: AssignmentLog
}) {
  const normalizedValue = ROUTING_OPTIONS.find((opt) => matchRoute(opt, value)) ?? value
  const normalizedDestination = ROUTING_OPTIONS.find((opt) => matchRoute(opt, routing.destination)) ?? routing.destination
  const overridden = !matchRoute(normalizedValue, normalizedDestination)

  return (
    <Panel
      id="routing"
      title="Routing Recommendation"
      icon={GitBranch}
      dense
      action={
        <span className="font-mono text-[11px] text-primary/80 tabular-nums">
          {Math.round(routing.confidence * 100)}% conf.
        </span>
      }
    >
      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/[0.03] px-3 py-2.5 ring-1 ring-primary/15 ring-inset">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium tracking-wide text-primary uppercase">
          <Sparkles className="size-3" aria-hidden="true" />
          AI Suggested
        </span>
        <p className="mt-0.5 text-[13px] font-semibold tracking-tight">{normalizedDestination}</p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {routing.reason}
        </p>
      </div>

      {assignment && (
        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">{assignment.assignedTo}</span>
          </div>
          <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
            Assigned {new Date(assignment.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="routing-override" className="text-xs font-medium">
            Route to
          </label>
          {overridden && (
            <button
              type="button"
              onClick={() => onChange(normalizedDestination)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded text-[11px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Use suggestion
            </button>
          )}
        </div>
        <div className="relative mt-1.5">
          <select
            id="routing-override"
            value={normalizedValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-[13px] shadow-xs transition-shadow outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-60"
          >
            {ROUTING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
                {matchRoute(opt, normalizedDestination) ? '  (AI suggested)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        {overridden && (
          <p className="mt-1.5 text-[11px] text-severity-medium">
            Overridden by agent — feedback will be logged to improve routing.
          </p>
        )}
      </div>
    </Panel>
  )
}
