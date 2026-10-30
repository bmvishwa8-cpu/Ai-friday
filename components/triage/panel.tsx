import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  dense,
  id,
}: {
  title: string
  icon: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  dense?: boolean
  id?: string
}) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_-6px_rgba(16,24,40,0.06)]',
        className,
      )}
    >
      <header
        className={cn(
          'flex shrink-0 items-center justify-between gap-3 border-b border-border/70',
          dense ? 'px-4 py-2.5' : 'px-5 py-3',
        )}
      >
        <h2 id={headingId} className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          {title}
        </h2>
        {action}
      </header>
      <div className={cn('min-h-0', dense ? 'p-3.5' : 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
