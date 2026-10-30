import { cn } from '@/lib/utils'
import type { Severity } from '@/lib/tickets'

const styles: Record<Severity, string> = {
  High: 'bg-severity-high/10 text-severity-high ring-severity-high/25',
  Medium: 'bg-severity-medium/10 text-severity-medium ring-severity-medium/25',
  Low: 'bg-severity-low/10 text-severity-low ring-severity-low/25',
}

const dot: Record<Severity, string> = {
  High: 'bg-severity-high',
  Medium: 'bg-severity-medium',
  Low: 'bg-severity-low',
}

export function SeverityBadge({
  severity,
  size = 'sm',
  className,
}: {
  severity: Severity
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        styles[severity],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot[severity])} aria-hidden="true" />
      {severity}
      <span className="sr-only"> severity</span>
    </span>
  )
}
