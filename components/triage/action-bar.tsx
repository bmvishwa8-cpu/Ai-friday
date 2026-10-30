import { Check, CheckCircle2, PenLine, Send, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/lib/tickets'

const secondary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-xs transition-all outline-none hover:bg-muted active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50'

export function ActionBar({
  status,
  editing,
  reviewed,
  destination,
  onApprove,
  onEdit,
  onEscalate,
}: {
  status: TicketStatus
  editing: boolean
  reviewed: boolean
  destination: string
  onApprove: () => void
  onEdit: () => void
  onEscalate: () => void
}) {
  const closed = status !== 'open'

  return (
    <div className="shrink-0 border-t border-border/80 bg-card/85 px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(16,24,40,0.12)] backdrop-blur-md sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 truncate text-xs text-muted-foreground" aria-live="polite">
          {status === 'routed' && (
            <span className="inline-flex items-center gap-1.5 font-medium text-severity-low">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Approved and routed
            </span>
          )}
          {status === 'escalated' && (
            <span className="inline-flex items-center gap-1.5 font-medium text-severity-high">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Escalated to on-call lead
            </span>
          )}
          {status === 'open' &&
            (reviewed ? (
              <>
                Ready to route to <span className="font-medium text-foreground">{destination}</span>
              </>
            ) : (
              'Confirm draft review to enable approval.'
            ))}
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2 whitespace-nowrap sm:flex sm:items-center">
          <button type="button" onClick={onEscalate} disabled={closed} className={cn(secondary, 'text-severity-high hover:bg-severity-high/8')}>
            <TriangleAlert className="size-4" aria-hidden="true" />
            Escalate
          </button>
          <button type="button" onClick={onEdit} disabled={closed} aria-pressed={editing} className={cn(secondary, editing && 'border-primary/40 bg-accent text-accent-foreground')}>
            {editing ? <Check className="size-4" aria-hidden="true" /> : <PenLine className="size-4" aria-hidden="true" />}
            {editing ? 'Done Editing' : 'Edit Draft'}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={closed || !reviewed}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all outline-none hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="size-4" aria-hidden="true" />
            {'Approve & Route'}
          </button>
        </div>
      </div>
    </div>
  )
}
