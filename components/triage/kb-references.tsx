import { ArrowUpRight, BookOpen, FileText } from 'lucide-react'
import type { KbArticle } from '@/lib/tickets'
import { Panel } from './panel'

export function KbReferences({ articles }: { articles: KbArticle[] }) {
  return (
    <Panel
      id="kb"
      title="Similar Knowledge Content"
      icon={BookOpen}
      dense
      action={<span className="text-[11px] text-muted-foreground">{articles.length} sources</span>}
    >
      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.id}>
            <a
              href={`https://docs.example.com/kb/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={a.snippet}
              className="group flex gap-2.5 rounded-xl border border-border/70 px-3 py-2.5 transition-all duration-200 outline-none hover:-translate-y-px hover:border-primary/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="line-clamp-1 text-[12.5px] leading-snug font-medium text-foreground group-hover:text-primary">
                    {a.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="font-mono text-[10.5px] font-medium text-primary tabular-nums">
                      {Math.round(a.relevance * 100)}%
                    </span>
                    <ArrowUpRight
                      className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground text-pretty">
                  {a.snippet}
                </span>
              </span>
              <span className="sr-only">
                {a.id}, {Math.round(a.relevance * 100)}% match (opens in new tab)
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
