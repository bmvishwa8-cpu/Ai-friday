'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Search, Table, TrendingUp, TriangleAlert } from 'lucide-react'
import { QueueKpis } from './queue-kpis'
import { cn } from '@/lib/utils'
import type { Severity } from '@/lib/tickets'
import { formatElapsed } from '@/lib/time'
import { SeverityBadge } from './severity-badge'
import type { QueueTicket } from './types'

const FILTERS: Array<'All' | Severity> = ['All', 'High', 'Medium', 'Low']

export function TicketQueue({
  tickets,
  selectedId,
  newIds,
  now,
  onSelect,
  onOpenInsights,
  onCreateTicket,
  onSwitchToTables,
  onSwitchToDashboard,
  activeView = 'workspace',
}: {
  tickets: QueueTicket[]
  selectedId: string
  newIds: Set<string>
  now: number
  onSelect: (id: string) => void
  onOpenInsights?: () => void
  onCreateTicket?: () => void
  onSwitchToTables?: () => void
  onSwitchToDashboard?: () => void
  activeView?: 'workspace' | 'tables' | 'dashboard'
}) {
  const [filter, setFilter] = useState<'All' | Severity>('All')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open')
    return {
      All: open.length,
      High: open.filter((t) => t.severity === 'High').length,
      Medium: open.filter((t) => t.severity === 'Medium').length,
      Low: open.filter((t) => t.severity === 'Low').length,
      routed: tickets.filter((t) => t.status === 'routed').length,
    }
  }, [tickets])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets.filter(
      (t) =>
        (filter === 'All' || t.severity === filter) &&
        (!q ||
          t.subject.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.customer.company.toLowerCase().includes(q)),
    )
  }, [tickets, filter, query])

  return (
    <aside
      aria-label="Ticket queue"
      className="flex h-full min-h-0 w-full flex-col border-r border-sidebar-border bg-sidebar"
    >
      <div className="px-4 pt-4 pb-3 xl:px-5">
        <QueueKpis autoRouted={142 + counts.routed} onOpenInsights={onOpenInsights} />
      </div>

      <div className="px-4 pb-3 xl:px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold tracking-tight">Ticket Queue</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-severity-low/10 px-2 py-0.5 text-[11px] font-medium text-severity-low">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-severity-low opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-severity-low" />
            </span>
            Live
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {counts.All} open · {counts.High} high priority
        </p>

        <label className="relative mt-3 block">
          <span className="sr-only">Search tickets</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, subject, company"
            className="h-8 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-xs shadow-xs transition-shadow outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          />
        </label>

        <div
          role="group"
          aria-label="Filter by severity"
          className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-all outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                filter === f && 'bg-card text-foreground shadow-sm',
              )}
            >
              {f}
              <span className="ml-1 tabular-nums opacity-60">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 h-px bg-sidebar-border xl:mx-5" />

      <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={onCreateTicket}
          className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          + Create new ticket
        </button>
        {onSwitchToTables && (
          <button
            type="button"
            onClick={onSwitchToTables}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              activeView === 'tables'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <Table className="size-3.5" />
            <span>Data Tables Hub</span>
          </button>
        )}
        {onSwitchToDashboard && (
          <button
            type="button"
            onClick={onSwitchToDashboard}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              activeView === 'dashboard'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <TrendingUp className="size-3.5" />
            <span>Operations Dashboard</span>
          </button>
        )}
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-live="polite">
        {visible.length === 0 && (
          <li className="px-3 py-10 text-center text-xs text-muted-foreground">
            No tickets match your filters.
          </li>
        )}
        {visible.map((t) => {
          const active = t.id === selectedId
          const done = t.status !== 'open'
          return (
            <li key={t.id} className={cn(newIds.has(t.id) && 'animate-ticket-in rounded-xl')}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'group relative w-full rounded-xl px-3 py-3 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  active
                    ? 'bg-card shadow-sm ring-1 ring-primary/20'
                    : 'hover:bg-sidebar-accent/70',
                  done && !active && 'opacity-60',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-primary transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    {t.id}
                    {newIds.has(t.id) && (
                      <span className="rounded bg-primary px-1 py-px font-sans text-[9px] font-semibold tracking-wide text-primary-foreground uppercase">
                        New
                      </span>
                    )}
                  </span>
                  <time
                    suppressHydrationWarning
                    dateTime={new Date(t.createdAt).toISOString()}
                    className="text-[11px] whitespace-nowrap text-muted-foreground tabular-nums"
                  >
                    {formatElapsed(t.createdAt, now)}
                  </time>
                </div>
                <p
                  className={cn(
                    'mt-1 line-clamp-2 text-[13px] leading-snug font-medium text-pretty',
                    active ? 'text-foreground' : 'text-foreground/85',
                  )}
                >
                  {t.subject}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <SeverityBadge severity={t.severity} />
                  <span className="truncate text-[11px] text-muted-foreground">
                    {t.customer.company}
                  </span>
                  {t.status === 'routed' && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-severity-low">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Routed
                    </span>
                  )}
                  {t.status === 'escalated' && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-severity-high">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      Escalated
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
