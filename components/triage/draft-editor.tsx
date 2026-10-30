'use client'

import { useLayoutEffect } from 'react'
import { Bold, Italic, List, PenLine, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOOLS = [
  { label: 'Bold', icon: Bold, before: '**', after: '**' },
  { label: 'Italic', icon: Italic, before: '_', after: '_' },
  { label: 'Bulleted list', icon: List, before: '\n- ', after: '' },
] as const

export function DraftEditor({
  value,
  original,
  editing,
  reviewed,
  disabled,
  textareaRef,
  onChange,
  onReviewedChange,
  onToggleEdit,
  className,
}: {
  className?: string
  value: string
  original: string
  editing: boolean
  reviewed: boolean
  disabled?: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onReviewedChange: (value: boolean) => void
  onToggleEdit: () => void
}) {
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el.parentElement ?? el)
    return () => observer.disconnect()
  }, [value, textareaRef])

  const edited = value !== original
  const words = value.trim() ? value.trim().split(/\s+/).length : 0

  function applyFormat(before: string, after: string) {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, e + before.length)
    })
  }

  return (
    <section
      aria-labelledby="draft-heading"
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_-6px_rgba(16,24,40,0.06)]',
        className,
      )}
    >
      <div
        role="note"
        className="flex shrink-0 items-center gap-2.5 border-b border-severity-medium/25 bg-gradient-to-r from-severity-medium/15 via-severity-medium/8 to-transparent px-4 py-2"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-severity-medium text-white shadow-sm shadow-severity-medium/30">
          <ShieldAlert className="size-3.5" aria-hidden="true" />
        </span>
        <p className="min-w-0 text-xs leading-snug text-muted-foreground">
          <span className="font-semibold tracking-tight text-foreground">
            {'AI Draft – Human Review Required'}
          </span>
          <span className="hidden xl:inline">
            {' · Verify accuracy, tone, and any commitments (SLAs, credits) before sending.'}
          </span>
        </p>
      </div>

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <h2 id="draft-heading" className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          AI Drafted Response
          {edited && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              Edited
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <div
            role="toolbar"
            aria-label="Formatting"
            className={cn(
              'flex items-center gap-0.5 rounded-lg border border-border/70 p-0.5 transition-opacity',
              !editing && 'pointer-events-none opacity-40',
            )}
          >
            {TOOLS.map((tool) => (
              <button
                key={tool.label}
                type="button"
                aria-label={tool.label}
                title={tool.label}
                disabled={!editing}
                onClick={() => applyFormat(tool.before, tool.after)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <tool.icon className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(original)}
            disabled={!edited || disabled}
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Restore AI draft
          </button>
        </div>
      </header>

      <div className="flex flex-col px-4 pt-2.5 pb-3">
        <label htmlFor="draft" className="sr-only">
          Draft response
        </label>
        <div
          className={cn(
            'relative flex flex-col rounded-xl border transition-all duration-200',
            editing
              ? 'border-ring bg-card ring-3 ring-ring/20'
              : 'border-border/70 bg-muted/30 hover:border-border',
          )}
        >
          <textarea
            id="draft"
            ref={textareaRef}
            value={value}
            readOnly={!editing}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onDoubleClick={() => !editing && !disabled && onToggleEdit()}
            className="block min-h-24 w-full resize-none overflow-hidden rounded-xl bg-transparent px-4 py-3 pb-10 text-[13px] leading-relaxed text-foreground/90 outline-none disabled:opacity-70"
          />
          {!editing && !disabled && (
            <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-[11px] text-muted-foreground shadow-xs ring-1 ring-border">
              <PenLine className="size-3" aria-hidden="true" />
              Read-only · click Edit Draft
            </span>
          )}
        </div>

        <div className="mt-2.5 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium select-none">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={disabled}
              onChange={(e) => onReviewedChange(e.target.checked)}
              className="size-4 cursor-pointer rounded border-input accent-primary"
            />
            I have reviewed this draft for accuracy
          </label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {words} words · {value.length} chars
          </span>
        </div>
      </div>
    </section>
  )
}
