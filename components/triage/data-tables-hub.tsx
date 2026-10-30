'use client'

import { useMemo, useState } from 'react'
import {
  AlertOctagon,
  ArrowUpDown,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  Layers,
  Mail,
  MessageSquare,
  MessageSquareText,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatElapsed } from '@/lib/time'
import { AI_SIGNALS, type Severity, type TicketStatus } from '@/lib/tickets'
import { SeverityBadge } from './severity-badge'
import { getMergedAiPayload } from '@/lib/ai-client'
import type { QueueTicket } from './types'

export type TableTab = 'open' | 'routed' | 'escalated' | 'accounts' | 'kb'

interface DataTablesHubProps {
  tickets: QueueTicket[]
  now: number
  onSelectTicket: (id: string) => void
  onSwitchToTriage: (id: string) => void
  onSwitchToWorkspace?: () => void
  onSwitchToDashboard?: () => void
  onCreateTicket?: () => void
  onOpenInsights?: () => void
  onUpdateTicketRoute?: (ticketId: string, destination: string, assignedTo: string, reason: string) => void
  onOpenAiSettings?: () => void
  onOpenAiGuide?: () => void
}

type AccountRow = {
  company: string
  contact: string
  plan: string
  totalTickets: number
  openTickets: number
  highPriority: number
  products: string[]
  slaStatus: 'Healthy' | 'Warning' | 'Critical'
  latestTicketId: string
  latestTicketSubject: string
}

type KbSignalRow = {
  id: string
  title: string
  type: 'KB Article' | 'Product Signal' | 'Module Signal' | 'Severity Signal' | 'Context Signal'
  snippet: string
  ticketIds: string[]
  relevance: number
}

export function DataTablesHub({
  tickets,
  now,
  onSelectTicket,
  onSwitchToTriage,
  onSwitchToWorkspace,
  onSwitchToDashboard,
  onCreateTicket,
  onOpenInsights,
  onUpdateTicketRoute,
  onOpenAiSettings,
  onOpenAiGuide,
}: DataTablesHubProps) {
  const [activeTab, setActiveTab] = useState<TableTab>('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'All' | Severity>('All')
  const [sortField, setSortField] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedTicket, setSelectedTicket] = useState<QueueTicket | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiTargetTicket, setAiTargetTicket] = useState<QueueTicket | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('')
  const [aiAnalysisError, setAiAnalysisError] = useState<string>('')
  const [copilotPrompt, setCopilotPrompt] = useState('')

  // Batch Auto-Triage State
  const [autoTriageModalOpen, setAutoTriageModalOpen] = useState(false)
  const [isAutoTriaging, setIsAutoTriaging] = useState(false)
  const [autoTriageResult, setAutoTriageResult] = useState('')

  // Table Level AI Summary State
  const [tableAiModalOpen, setTableAiModalOpen] = useState(false)
  const [isTableAiLoading, setIsTableAiLoading] = useState(false)
  const [tableAiResult, setTableAiResult] = useState('')

  // Compute table tab counts
  const tabCounts = useMemo(() => {
    const openCount = tickets.filter((t) => t.status === 'open').length
    const routedCount = tickets.filter((t) => t.status === 'routed').length
    const escalatedCount = tickets.filter((t) => t.status === 'escalated' || t.severity === 'High').length

    const companies = new Set(tickets.map((t) => t.customer.company))
    const accountsCount = companies.size

    // Count unique KB articles
    const kbIds = new Set<string>()
    tickets.forEach((t) => t.kb.forEach((k) => kbIds.add(k.id)))
    const kbCount = kbIds.size + 9 // Including knowledge base catalog

    return {
      open: openCount,
      routed: routedCount,
      escalated: escalatedCount,
      accounts: accountsCount,
      kb: kbCount,
    }
  }, [tickets])

  // Filtered Open Tickets
  const openTickets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return tickets
      .filter((t) => t.status === 'open')
      .filter((t) => {
        if (severityFilter !== 'All' && t.severity !== severityFilter) return false
        if (!q) return true
        return (
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customer.company.toLowerCase().includes(q) ||
          t.customer.name.toLowerCase().includes(q) ||
          t.classification.product.value.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          return sortDirection === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
        }
        if (sortField === 'severity') {
          const map = { High: 3, Medium: 2, Low: 1 }
          return sortDirection === 'desc'
            ? map[b.severity] - map[a.severity]
            : map[a.severity] - map[b.severity]
        }
        if (sortField === 'company') {
          return sortDirection === 'desc'
            ? b.customer.company.localeCompare(a.customer.company)
            : a.customer.company.localeCompare(b.customer.company)
        }
        if (sortField === 'id') {
          return sortDirection === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
        }
        return 0
      })
  }, [tickets, searchQuery, severityFilter, sortField, sortDirection])

  // Filtered Routed Tickets
  const routedTickets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return tickets
      .filter((t) => t.status === 'routed' || t.status === 'open')
      .filter((t) => {
        if (severityFilter !== 'All' && t.severity !== severityFilter) return false
        if (!q) return true
        return (
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.routing.destination.toLowerCase().includes(q) ||
          t.customer.company.toLowerCase().includes(q) ||
          t.routing.reason.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortField === 'confidence') {
          return sortDirection === 'desc'
            ? b.routing.confidence - a.routing.confidence
            : a.routing.confidence - b.routing.confidence
        }
        if (sortField === 'team') {
          return sortDirection === 'desc'
            ? b.routing.destination.localeCompare(a.routing.destination)
            : a.routing.destination.localeCompare(b.routing.destination)
        }
        return sortDirection === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
      })
  }, [tickets, searchQuery, severityFilter, sortField, sortDirection])

  // Filtered Escalated & Critical Tickets
  const criticalTickets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return tickets
      .filter((t) => t.status === 'escalated' || t.severity === 'High')
      .filter((t) => {
        if (!q) return true
        return (
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customer.company.toLowerCase().includes(q) ||
          t.routing.destination.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [tickets, searchQuery])

  // Aggregated Customer Accounts Data
  const accountRows = useMemo<AccountRow[]>(() => {
    const map = new Map<string, AccountRow>()
    const q = searchQuery.toLowerCase().trim()

    tickets.forEach((t) => {
      const company = t.customer.company
      const existing = map.get(company)
      const isHigh = t.severity === 'High'
      const isOpen = t.status === 'open'

      if (existing) {
        existing.totalTickets += 1
        if (isOpen) existing.openTickets += 1
        if (isHigh) existing.highPriority += 1
        if (!existing.products.includes(t.classification.product.value)) {
          existing.products.push(t.classification.product.value)
        }
      } else {
        map.set(company, {
          company,
          contact: t.customer.name,
          plan: t.customer.plan,
          totalTickets: 1,
          openTickets: isOpen ? 1 : 0,
          highPriority: isHigh ? 1 : 0,
          products: [t.classification.product.value],
          slaStatus: isHigh ? 'Critical' : isOpen ? 'Warning' : 'Healthy',
          latestTicketId: t.id,
          latestTicketSubject: t.subject,
        })
      }
    })

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        slaStatus: (row.highPriority > 0 ? 'Critical' : row.openTickets > 1 ? 'Warning' : 'Healthy') as AccountRow['slaStatus'],
      }))
      .filter((row) => {
        if (!q) return true
        return (
          row.company.toLowerCase().includes(q) ||
          row.contact.toLowerCase().includes(q) ||
          row.plan.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortField === 'open') return sortDirection === 'desc' ? b.openTickets - a.openTickets : a.openTickets - b.openTickets
        if (sortField === 'high') return sortDirection === 'desc' ? b.highPriority - a.highPriority : a.highPriority - b.highPriority
        return b.totalTickets - a.totalTickets
      })
  }, [tickets, searchQuery, sortField, sortDirection])

  // Aggregated Knowledge Base & Signals Data
  const kbSignalRows = useMemo<KbSignalRow[]>(() => {
    const q = searchQuery.toLowerCase().trim()
    const rows: KbSignalRow[] = []

    // 1. Articles
    const articleMap = new Map<string, { title: string; snippet: string; tickets: string[]; relevance: number }>()
    tickets.forEach((t) => {
      t.kb.forEach((art) => {
        const item = articleMap.get(art.id)
        if (item) {
          if (!item.tickets.includes(t.id)) item.tickets.push(t.id)
          item.relevance = Math.max(item.relevance, art.relevance)
        } else {
          articleMap.set(art.id, {
            title: art.title,
            snippet: art.snippet,
            tickets: [t.id],
            relevance: art.relevance,
          })
        }
      })
    })

    articleMap.forEach((val, id) => {
      rows.push({
        id,
        title: val.title,
        type: 'KB Article',
        snippet: val.snippet,
        ticketIds: val.tickets,
        relevance: val.relevance,
      })
    })

    // 2. Extracted Signals
    Object.entries(AI_SIGNALS).forEach(([ticketId, sigs]) => {
      sigs.forEach((sig) => {
        rows.push({
          id: `SIG-${sig.kind.slice(0, 3).toUpperCase()}`,
          title: `"${sig.term}"`,
          type: `${sig.kind} Signal` as KbSignalRow['type'],
          snippet: `Extracted intent & root cause signal from ticket ${ticketId}`,
          ticketIds: [ticketId],
          relevance: 0.88,
        })
      })
    })

    return rows.filter((r) => {
      if (!q) return true
      return (
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.snippet.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      )
    })
  }, [tickets, searchQuery])

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  function handleCopy(text: string, id: string) {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // Ask AI Analysis for specific ticket
  async function handleAskAiForTicket(ticket: QueueTicket) {
    setAiTargetTicket(ticket)
    setAiModalOpen(true)
    setIsAiLoading(true)
    setAiAnalysisResult('')
    setAiAnalysisError('')

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'ticket-analysis',
            model: 'genailab-maas-gpt-4o',
            visionModel: 'genailab-maas-gpt-4o',
            imageData: ticket.screenshot || undefined,
            imageName: ticket.subject || 'screenshot.png',
            context: `Ticket ID: ${ticket.id}\nCustomer: ${ticket.customer.name} (${ticket.customer.company})\nPlan: ${ticket.customer.plan}\nSeverity: ${ticket.severity}\nChannel: ${ticket.channel}\nClassification: ${ticket.classification.product.value} / ${ticket.classification.module.value}\nDescription:\n${ticket.errorSummary || ticket.body}`,
            prompt:
              'You are an expert IT triage AI. Analyze this ticket. Provide: 1) Executive Problem Summary, 2) Root Cause Diagnosis, 3) Recommended Technical Resolution Steps, 4) Suggested Customer Draft Reply, and 5) Escalation Risk Assessment.',
          }),
        ),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'AI analysis failed.')
      }

      setAiAnalysisResult(data.answer || 'No analysis returned from the AI model.')
    } catch (err) {
      setAiAnalysisError(err instanceof Error ? err.message : 'Failed to obtain AI analysis.')
    } finally {
      setIsAiLoading(false)
    }
  }

  // Ask AI Table Insights
  async function handleAskTableInsights() {
    setTableAiModalOpen(true)
    setIsTableAiLoading(true)
    setTableAiResult('')

    try {
      let previewInfo = ''
      if (activeTab === 'open') {
        previewInfo = `Open Tickets Count: ${openTickets.length}; High Priority: ${openTickets.filter((t) => t.severity === 'High').length}; Sample Subjects: ${openTickets.slice(0, 5).map((t) => `${t.id}: ${t.subject}`).join(', ')}`
      } else if (activeTab === 'routed') {
        previewInfo = `Routed Tickets: ${routedTickets.length}; Destinations: ${Array.from(new Set(routedTickets.map((t) => t.routing.destination))).join(', ')}`
      } else if (activeTab === 'escalated') {
        previewInfo = `Critical/Escalated Tickets: ${criticalTickets.length}; Companies affected: ${criticalTickets.map((t) => t.customer.company).join(', ')}`
      } else if (activeTab === 'accounts') {
        previewInfo = `Accounts Tracked: ${accountRows.length}; At Risk Accounts: ${accountRows.filter((a) => a.slaStatus === 'Critical').map((a) => a.company).join(', ')}`
      } else {
        previewInfo = `Total KB Articles & Signals: ${kbSignalRows.length}`
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'ticket-analysis',
            model: 'genailab-maas-gpt-4o',
            context: `Support Dashboard active table: "${activeTab}". Overview metrics: ${previewInfo}`,
            prompt: `Analyze the active "${activeTab}" table data. Give a succinct executive triage briefing: 1) Workload Pattern & Key Trends, 2) Immediate Operational Risk Bottlenecks, and 3) Recommended Next Actions for the on-duty support lead. Use clear bullet points.`,
          }),
        ),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Table insight generation failed.')
      setTableAiResult(data.answer || 'No insight generated.')
    } catch (err) {
      setTableAiResult(err instanceof Error ? `Error: ${err.message}` : 'Failed to generate table analysis.')
    } finally {
      setIsTableAiLoading(false)
    }
  }

  function getTicketSentiment(ticket: QueueTicket): { label: string; tone: 'critical' | 'warning' | 'normal' } {
    const text = `${ticket.subject} ${ticket.body}`.toLowerCase()
    if (
      ticket.severity === 'High' ||
      ticket.customer.plan === 'Enterprise' ||
      text.includes('loop') ||
      text.includes('unable to access') ||
      text.includes('stale')
    ) {
      return { label: 'High SLA Risk', tone: 'critical' }
    }
    if (text.includes('duplicate') || text.includes('slow') || text.includes('401') || text.includes('delay')) {
      return { label: 'Needs Attention', tone: 'warning' }
    }
    return { label: 'Standard', tone: 'normal' }
  }

  async function handleRunCopilot(promptText: string) {
    if (!aiTargetTicket) return
    setIsAiLoading(true)
    setAiAnalysisError('')

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'ticket-analysis',
            model: 'genailab-maas-gpt-4o',
            visionModel: 'genailab-maas-gpt-4o',
            imageData: aiTargetTicket.screenshot || undefined,
            imageName: aiTargetTicket.subject || 'screenshot.png',
            context: `Ticket ID: ${aiTargetTicket.id}\nCustomer: ${aiTargetTicket.customer.name} (${aiTargetTicket.customer.company})\nPlan: ${aiTargetTicket.customer.plan}\nSeverity: ${aiTargetTicket.severity}\nChannel: ${aiTargetTicket.channel}\nClassification: ${aiTargetTicket.classification.product.value} / ${aiTargetTicket.classification.module.value}\nDescription:\n${aiTargetTicket.errorSummary || aiTargetTicket.body}`,
            prompt: promptText,
          }),
        ),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'AI Copilot request failed.')
      setAiAnalysisResult(data.answer || 'No analysis returned from the AI model.')
    } catch (err) {
      setAiAnalysisError(err instanceof Error ? err.message : 'AI Copilot error.')
    } finally {
      setIsAiLoading(false)
    }
  }

  async function handleAutoTriageAll() {
    setAutoTriageModalOpen(true)
    setIsAutoTriaging(true)
    setAutoTriageResult('')

    try {
      const openSummaries = openTickets.map((t) => ({
        id: t.id,
        severity: t.severity,
        customer: t.customer.company,
        plan: t.customer.plan,
        subject: t.subject,
      }))

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'ticket-analysis',
            model: 'genailab-maas-gpt-4o',
            context: `Open Queue batch size: ${openTickets.length} tickets. Dataset: ${JSON.stringify(openSummaries)}`,
            prompt:
              'You are an executive IT Support Director. Perform a comprehensive AI Auto-Triage of all open queue tickets. Provide: 1) Priority dispatch sequence ordered by SLA impact, 2) Recommended target engineering tier for each ticket with confidence, 3) Immediate critical operational risks, and 4) Workload balancing recommendations for the support team lead.',
          }),
        ),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Auto-triage failed.')
      setAutoTriageResult(data.answer || 'No auto-triage generated.')
    } catch (err) {
      setAutoTriageResult(err instanceof Error ? `Error: ${err.message}` : 'Auto-triage generation failed.')
    } finally {
      setIsAutoTriaging(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Top Controls Bar */}
      <div className="shrink-0 border-b border-border bg-card/60 px-5 py-3.5 backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-primary" />
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                Support Data Tables &amp; Operations Center
              </p>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                AI Engine: GPT-4o
              </span>
            </div>
            <h1 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Differentiated Ticket &amp; Account Operations
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onSwitchToWorkspace && (
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-0.5">
                <button
                  type="button"
                  onClick={onSwitchToWorkspace}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
                >
                  <Zap className="size-3.5" />
                  <span>Triage Desk</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs"
                >
                  <Layers className="size-3.5 text-primary" />
                  <span>Data Tables</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] text-primary">
                    5
                  </span>
                </button>
                {onSwitchToDashboard && (
                  <button
                    type="button"
                    onClick={onSwitchToDashboard}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
                  >
                    <TrendingUp className="size-3.5" />
                    <span>Dashboard</span>
                  </button>
                )}
              </div>
            )}

            {onOpenAiSettings && (
              <button
                type="button"
                onClick={onOpenAiSettings}
                title="Configure AI API & Model (OpenAI / GenAI Lab)"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground shadow-xs"
              >
                <Settings className="size-3.5 text-primary" />
                <span className="hidden sm:inline">AI Settings</span>
              </button>
            )}

            {onOpenAiGuide && (
              <button
                type="button"
                onClick={onOpenAiGuide}
                title="Open AI Guide & Navigator"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground shadow-xs"
              >
                <Bot className="size-3.5 text-primary" />
                <span className="hidden sm:inline">AI Guide</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAskTableInsights}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Sparkles className="size-3.5 text-primary" />
              Ask AI Table Insights
            </button>

            {onOpenInsights && (
              <button
                type="button"
                onClick={onOpenInsights}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <TrendingUp className="size-3.5 text-muted-foreground" />
                Trends &amp; Metrics
              </button>
            )}

            {onCreateTicket && (
              <button
                type="button"
                onClick={onCreateTicket}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                + New Ticket
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher - Simple and explicit */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === 'open'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Clock className="size-3.5" />
            <span>1. Open Queue</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                activeTab === 'open' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground',
              )}
            >
              {tabCounts.open}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routed')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === 'routed'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Compass className="size-3.5" />
            <span>2. Routed &amp; Dispatched</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                activeTab === 'routed' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground',
              )}
            >
              {tabCounts.routed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escalated')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === 'escalated'
                ? 'bg-severity-high text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <ShieldAlert className="size-3.5" />
            <span>3. Critical &amp; Escalations</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                activeTab === 'escalated' ? 'bg-white/20 text-white' : 'bg-severity-high/15 text-severity-high',
              )}
            >
              {tabCounts.escalated}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === 'accounts'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Building2 className="size-3.5" />
            <span>4. Customer Accounts &amp; SLA</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                activeTab === 'accounts' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground',
              )}
            >
              {tabCounts.accounts}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kb')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === 'kb'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Layers className="size-3.5" />
            <span>5. Knowledge Base &amp; AI Signals</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                activeTab === 'kb' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground',
              )}
            >
              {tabCounts.kb}
            </span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeTab === 'open' ? 'Open Queue' : activeTab === 'routed' ? 'Routed Tickets' : activeTab === 'escalated' ? 'Escalations' : activeTab === 'accounts' ? 'Customer Accounts' : 'Knowledge Base'} (ID, Subject, Customer, Team)...`}
              className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-xs shadow-xs outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {(activeTab === 'open' || activeTab === 'routed') && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-[11px] font-medium text-muted-foreground">Severity:</span>
              <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
                {(['All', 'High', 'Medium', 'Low'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={cn(
                      'rounded-md px-2 py-1 text-[11px] font-medium transition-all',
                      severityFilter === sev
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Content Area */}
      <div className="app-scrollbar flex-1 overflow-auto p-5">
        {/* TABLE 1: OPEN TRIAGE QUEUE */}
        {activeTab === 'open' && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Active Triage Queue</span>
                <span>·</span>
                <span>{openTickets.length} tickets awaiting resolution</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoTriageAll}
                  disabled={isAutoTriaging || openTickets.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Run bulk AI auto-triage and priority dispatch sequence on all open tickets"
                >
                  <Sparkles className="size-3 text-primary" />
                  {isAutoTriaging ? 'Auto-Triaging...' : 'AI Auto-Triage Queue'}
                </button>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground select-none">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-foreground"
                    onClick={() => handleSort('id')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Ticket ID <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-foreground"
                    onClick={() => handleSort('company')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Customer &amp; Plan <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-4 py-3">Subject &amp; Problem Overview</th>
                  <th
                    className="cursor-pointer px-3 py-3 hover:text-foreground"
                    onClick={() => handleSort('severity')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Severity <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-3">AI Classification</th>
                  <th
                    className="cursor-pointer px-3 py-3 hover:text-foreground"
                    onClick={() => handleSort('date')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Age <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {openTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No open tickets match your current filters.
                    </td>
                  </tr>
                ) : (
                  openTickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-primary">
                        <span className="inline-flex items-center gap-1.5">
                          {t.id}
                          {t.screenshot && (
                            <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] text-primary" title="Screenshot attached">
                              IMG
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{t.customer.company}</div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User className="size-3" />
                          <span>{t.customer.name}</span>
                          <span>·</span>
                          <span className="rounded bg-muted px-1.5 py-0.2 font-medium text-[10px]">
                            {t.customer.plan}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="font-medium text-foreground truncate">{t.subject}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {t.errorSummary || t.body.slice(0, 100)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <SeverityBadge severity={t.severity} size="sm" />
                          {(() => {
                            const sent = getTicketSentiment(t)
                            return (
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-semibold w-fit',
                                  sent.tone === 'critical'
                                    ? 'bg-severity-high/15 text-severity-high'
                                    : sent.tone === 'warning'
                                    ? 'bg-severity-medium/15 text-severity-medium'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {sent.label}
                              </span>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="inline-flex flex-col gap-0.5">
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary w-fit">
                            {t.classification.product.value}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.classification.module.value}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
                          <Clock className="size-3" />
                          {formatElapsed(t.createdAt, now)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAskAiForTicket(t)}
                            title="Ask AI to diagnose and draft resolution"
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                          >
                            <Sparkles className="size-3 text-primary" />
                            Ask AI
                          </button>
                          <button
                            type="button"
                            onClick={() => onSwitchToTriage(t.id)}
                            title="Open ticket directly in Triage Desk"
                            className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition-opacity hover:opacity-90"
                          >
                            Triage
                            <ChevronRight className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 2: ROUTED & DISPATCHED TICKETS */}
        {activeTab === 'routed' && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Routed &amp; Dispatched Table</span>
                <span>·</span>
                <span>Specialized Tier routing &amp; automated assignments</span>
              </div>
              <span className="rounded-full bg-severity-low/10 px-2 py-0.5 text-[10px] font-semibold text-severity-low">
                Auto-Triage Active
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground select-none">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Customer &amp; Company</th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-foreground"
                    onClick={() => handleSort('team')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Assigned Destination Team <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-4 py-3">Routing Justification &amp; Rule</th>
                  <th
                    className="cursor-pointer px-3 py-3 hover:text-foreground"
                    onClick={() => handleSort('confidence')}
                  >
                    <span className="inline-flex items-center gap-1">
                      AI Confidence <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {routedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No routed tickets match your query.
                    </td>
                  </tr>
                ) : (
                  routedTickets.map((t) => {
                    const confidencePct = Math.round(t.routing.confidence * 100)
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-primary">{t.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{t.customer.company}</div>
                          <div className="text-[11px] text-muted-foreground">{t.customer.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            <Compass className="size-3" />
                            {t.routing.destination}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <p className="text-foreground/90 line-clamp-2 leading-relaxed">
                            {t.routing.reason}
                          </p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  confidencePct >= 90 ? 'bg-severity-low' : 'bg-primary',
                                )}
                                style={{ width: `${confidencePct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-foreground">
                              {confidencePct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              t.status === 'routed'
                                ? 'bg-severity-low/15 text-severity-low'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <CheckCircle2 className="size-3" />
                            {t.status === 'routed' ? 'Dispatched' : 'Pending Approval'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onSwitchToTriage(t.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                          >
                            <Eye className="size-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 3: CRITICAL & ESCALATIONS TABLE */}
        {activeTab === 'escalated' && (
          <div className="overflow-hidden rounded-xl border border-severity-high/30 bg-card shadow-xs">
            <div className="border-b border-severity-high/20 bg-severity-high/5 px-4 py-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-severity-high" />
                <span className="font-bold text-foreground">High Priority SLA &amp; Incident Escalations</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-severity-high font-medium">Critical items requiring immediate intervention</span>
              </div>
              <span className="rounded-full bg-severity-high px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                P1 / Alerting
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground select-none">
                <tr>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Customer &amp; SLA Tier</th>
                  <th className="px-4 py-3">Incident Subject</th>
                  <th className="px-4 py-3">AI Detected Signal Indicators</th>
                  <th className="px-4 py-3">Assigned Handler</th>
                  <th className="px-4 py-3 text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {criticalTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No active escalated or high-priority tickets.
                    </td>
                  </tr>
                ) : (
                  criticalTickets.map((t) => {
                    const signals = t.signals ?? AI_SIGNALS[t.id] ?? []
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="group cursor-pointer transition-colors hover:bg-severity-high/5"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.status === 'escalated' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-severity-high px-2 py-0.5 text-[10px] font-bold text-white">
                              <AlertOctagon className="size-3" />
                              Escalated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-severity-high/15 px-2 py-0.5 text-[10px] font-bold text-severity-high">
                              <ShieldAlert className="size-3" />
                              P1 - High
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{t.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{t.customer.company}</div>
                          <span className="rounded bg-foreground/10 px-1.5 py-0.2 font-mono text-[10px] font-medium text-foreground">
                            {t.customer.plan} SLA
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <div className="font-semibold text-foreground">{t.subject}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {t.errorSummary || t.body.slice(0, 90)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {signals.length > 0 ? (
                              signals.slice(0, 3).map((sig, i) => (
                                <span
                                  key={i}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                                >
                                  {sig.term}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px]">System failure tag</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-foreground font-medium">{t.routing.destination}</div>
                          <div className="text-[10px] text-muted-foreground">On-Call Lead</div>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAskAiForTicket(t)}
                              className="inline-flex items-center gap-1 rounded-md border border-severity-high/40 bg-severity-high/10 px-2.5 py-1 text-[11px] font-bold text-severity-high hover:bg-severity-high/20"
                            >
                              <Sparkles className="size-3" />
                              AI Advice
                            </button>
                            <button
                              type="button"
                              onClick={() => onSwitchToTriage(t.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-severity-high px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
                            >
                              Resolve
                              <ChevronRight className="size-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 4: CUSTOMER ACCOUNTS & SLA PORTFOLIO */}
        {activeTab === 'accounts' && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Customer Accounts &amp; SLA Overview</span>
                <span>·</span>
                <span>Account-level health metrics and multi-ticket aggregations</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Showing {accountRows.length} enterprise and business accounts
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground select-none">
                <tr>
                  <th className="px-4 py-3">Account / Company</th>
                  <th className="px-4 py-3">Primary Contact</th>
                  <th className="px-4 py-3">Service Tier</th>
                  <th
                    className="cursor-pointer px-3 py-3 hover:text-foreground"
                    onClick={() => handleSort('open')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Open Tickets <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-3 py-3 hover:text-foreground"
                    onClick={() => handleSort('high')}
                  >
                    <span className="inline-flex items-center gap-1">
                      High Priority <ArrowUpDown className="size-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-4 py-3">Products Impacted</th>
                  <th className="px-3 py-3">SLA Health Status</th>
                  <th className="px-4 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accountRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No customer accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  accountRows.map((acc) => (
                    <tr
                      key={acc.company}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span>{acc.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{acc.contact}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 font-medium text-[10px]',
                            acc.plan === 'Enterprise'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {acc.plan}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-foreground">
                        {acc.openTickets}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold">
                        <span
                          className={cn(
                            acc.highPriority > 0 ? 'text-severity-high font-bold' : 'text-muted-foreground',
                          )}
                        >
                          {acc.highPriority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {acc.products.map((p) => (
                            <span
                              key={p}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            acc.slaStatus === 'Critical'
                              ? 'bg-severity-high/15 text-severity-high'
                              : acc.slaStatus === 'Warning'
                              ? 'bg-severity-medium/15 text-severity-medium'
                              : 'bg-severity-low/15 text-severity-low',
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {acc.slaStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('open')
                            setSearchQuery(acc.company)
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                        >
                          Filter Tickets
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 5: KNOWLEDGE BASE & AI SIGNALS DIRECTORY */}
        {activeTab === 'kb' && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Knowledge Base &amp; AI Signal Dictionary</span>
                <span>·</span>
                <span>Standard operating procedures, solution snippets, and intent signals</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Total references: {kbSignalRows.length}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground select-none">
                <tr>
                  <th className="px-4 py-3">Ref ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reference Title / Identified Pattern</th>
                  <th className="px-4 py-3">Solution Summary / Context</th>
                  <th className="px-3 py-3">Matched Tickets</th>
                  <th className="px-3 py-3">Relevance</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kbSignalRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No knowledge base items match your query.
                    </td>
                  </tr>
                ) : (
                  kbSignalRows.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} className="group transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{row.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                            row.type === 'KB Article'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-chart-2/15 text-chart-2',
                          )}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-xs">{row.title}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-sm line-clamp-2">
                        {row.snippet}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.ticketIds.map((tid) => (
                            <button
                              key={tid}
                              type="button"
                              onClick={() => onSwitchToTriage(tid)}
                              className="font-mono text-[10px] text-primary hover:underline"
                            >
                              {tid}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-muted-foreground">
                        {Math.round(row.relevance * 100)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopy(`${row.title} - ${row.snippet}`, `${row.id}-${idx}`)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="size-3" />
                          {copiedId === `${row.id}-${idx}` ? 'Copied' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TICKET DETAILS DRAWER / INSPECTION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/50 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{selectedTicket.id}</span>
                  <SeverityBadge severity={selectedTicket.severity} size="sm" />
                  <span className="text-xs text-muted-foreground">via {selectedTicket.channel}</span>
                </div>
                <h3 className="mt-1 text-base font-semibold text-foreground line-clamp-1">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close drawer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer Box */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer &amp; Account
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedTicket.customer.company}</p>
                    <p className="text-xs text-muted-foreground">{selectedTicket.customer.name}</p>
                  </div>
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {selectedTicket.customer.plan}
                  </span>
                </div>
              </div>

              {/* Message Body */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Original Ticket Description
                </div>
                <div className="text-xs leading-relaxed text-foreground/90 whitespace-pre-line font-sans">
                  {selectedTicket.body}
                </div>
              </div>

              {/* Screenshot if available */}
              {selectedTicket.screenshot && (
                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Attached Screenshot
                  </div>
                  <img
                    src={selectedTicket.screenshot}
                    alt="Ticket attachment"
                    className="max-h-60 w-full rounded-lg border border-border object-contain bg-background"
                  />
                </div>
              )}

              {/* AI Classification */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Auto-Classification
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Product</p>
                    <p className="font-semibold text-foreground">
                      {selectedTicket.classification.product.value}
                    </p>
                    <p className="text-[10px] text-primary">
                      {Math.round(selectedTicket.classification.product.confidence * 100)}% confidence
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Module</p>
                    <p className="font-semibold text-foreground">
                      {selectedTicket.classification.module.value}
                    </p>
                    <p className="text-[10px] text-primary">
                      {Math.round(selectedTicket.classification.module.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>
              </div>

              {/* Routing & Assignment */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Automated Routing &amp; Assignment
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="size-4 text-primary" />
                    <p className="font-semibold text-sm text-foreground">
                      {selectedTicket.routing.destination}
                    </p>
                  </div>
                  {selectedTicket.assignment && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <User className="size-3" />
                      {selectedTicket.assignment.assignedTo}
                    </span>
                  )}
                </div>
                {selectedTicket.assignment?.assignedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Assigned: {new Date(selectedTicket.assignment.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedTicket.routing.reason}
                </p>
              </div>

              {/* Draft Preview */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  AI Generated Customer Reply Draft
                </div>
                <div className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/60">
                  {selectedTicket.draft}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3.5">
              <button
                type="button"
                onClick={() => handleAskAiForTicket(selectedTicket)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <Sparkles className="size-3.5 text-primary" />
                Ask AI Analysis
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = selectedTicket.id
                  setSelectedTicket(null)
                  onSwitchToTriage(id)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Open in Triage Workspace
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI TICKET ANALYSIS DIALOG */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Bot className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    AI Diagnosis &amp; Executive Resolution
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Model: genailab-maas-gpt-4o · Ticket {aiTargetTicket?.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Action Chips & Custom Copilot Input */}
            <div className="border-b border-border bg-muted/20 px-5 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-medium text-muted-foreground">AI Copilot Modes:</span>
                {[
                  {
                    label: 'Full Resolution Plan',
                    prompt:
                      'Provide: 1) Executive Problem Summary, 2) Root Cause Diagnosis, 3) Recommended Technical Resolution Steps, 4) Suggested Customer Draft Reply, and 5) Escalation Risk Assessment.',
                  },
                  {
                    label: 'Draft Customer Reply',
                    prompt:
                      'Draft a polite, empathetic, customer-ready reply addressing this issue and providing next steps and expected timeline.',
                  },
                  {
                    label: 'Technical Root Cause',
                    prompt:
                      'Explain the technical root cause of this failure in detail, citing logs, configuration, and likely architectural bottlenecks.',
                  },
                  {
                    label: 'Escalation Brief',
                    prompt:
                      'Write an internal escalation briefing note for engineering leadership highlighting customer impact, SLA risk, and on-call escalation actions.',
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleRunCopilot(item.prompt)}
                    disabled={isAiLoading}
                    className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (copilotPrompt.trim()) {
                    handleRunCopilot(copilotPrompt.trim())
                    setCopilotPrompt('')
                  }
                }}
                className="mt-2.5 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={copilotPrompt}
                  onChange={(e) => setCopilotPrompt(e.target.value)}
                  placeholder="Ask custom question (e.g., 'explain SAML simply', 'give CLI fix commands')..."
                  className="h-8 flex-1 rounded-lg border border-input bg-card px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                />
                <button
                  type="submit"
                  disabled={!copilotPrompt.trim() || isAiLoading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="size-3" />
                  <span>Ask</span>
                </button>
              </form>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-4 text-xs font-medium text-foreground">
                    Analyzing ticket context, telemetry, and root cause...
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Connecting to AI service with current configuration
                  </p>
                </div>
              ) : aiAnalysisError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                  <p className="font-semibold">AI Analysis Error</p>
                  <p className="mt-1">{aiAnalysisError}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed text-foreground whitespace-pre-line">
                  {aiAnalysisResult}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(aiAnalysisResult, 'ai-modal-copy')}
                  disabled={!aiAnalysisResult || isAiLoading}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Copy className="size-3" />
                  <span>{copiedId === 'ai-modal-copy' ? 'Copied' : 'Copy Analysis'}</span>
                </button>
                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                  Model: genailab-maas-gpt-4o
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Close
                </button>
                {aiTargetTicket && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = aiTargetTicket.id
                      setAiModalOpen(false)
                      onSwitchToTriage(id)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Open in Triage Desk
                    <ChevronRight className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE LEVEL AI SUMMARY MODAL */}
      {tableAiModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Table Intelligence &amp; Operational Briefing
                  </h3>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Tab: {activeTab} · Model: genailab-maas-gpt-4o
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTableAiModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5">
              {isTableAiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-4 text-xs font-medium text-foreground">
                    Synthesizing table records and generating executive triage insights...
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed text-foreground whitespace-pre-line">
                  {tableAiResult}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-border bg-muted/20 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setTableAiModalOpen(false)}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH AUTO-TRIAGE QUEUE MODAL */}
      {autoTriageModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    AI Auto-Triage &amp; Queue Dispatch Sequence
                  </h3>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Batch: {openTickets.length} Open Tickets · Model: genailab-maas-gpt-4o
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoTriageModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5">
              {isAutoTriaging ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-4 text-xs font-medium text-foreground">
                    Analyzing queue volume, SLA deadlines, and team routing rules...
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed text-foreground whitespace-pre-line">
                  {autoTriageResult}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3.5">
              <span className="text-[11px] text-muted-foreground">
                All open tickets evaluated for SLA impact
              </span>
              <button
                type="button"
                onClick={() => setAutoTriageModalOpen(false)}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
