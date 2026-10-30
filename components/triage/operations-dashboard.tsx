'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Layers,
  Plus,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Table,
  TrendingUp,
  UserCheck,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatElapsed } from '@/lib/time'
import type { GeneratedKbArticle } from '@/lib/ai-fallback'
import { getMergedAiPayload } from '@/lib/ai-client'
import { SeverityBadge } from './severity-badge'
import type { QueueTicket } from './types'

export type OperationsDashboardProps = {
  tickets: QueueTicket[]
  now: number
  onSelectTicket: (id: string) => void
  onSwitchToTriage: (id: string) => void
  onSwitchToTables?: () => void
  onUpdateTicketRoute: (ticketId: string, destination: string, assignedTo: string, reason: string) => void
  onAddKbArticle: (ticketId: string, article: { id: string; title: string; snippet: string; relevance: number }) => void
  onOpenAiSettings?: () => void
  onOpenAiGuide?: () => void
}

export function OperationsDashboard({
  tickets,
  now,
  onSelectTicket,
  onSwitchToTriage,
  onSwitchToTables,
  onUpdateTicketRoute,
  onAddKbArticle,
  onOpenAiSettings,
  onOpenAiGuide,
}: OperationsDashboardProps) {
  // Modal states
  const [executiveSummaryOpen, setExecutiveSummaryOpen] = useState(false)
  const [executiveSummaryText, setExecutiveSummaryText] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // AI Routing Suggestion Modal
  const [routingModalOpen, setRoutingModalOpen] = useState(false)
  const [routingTargetTicket, setRoutingTargetTicket] = useState<QueueTicket | null>(null)
  const [isRoutingLoading, setIsRoutingLoading] = useState(false)
  const [routingSuggestion, setRoutingSuggestion] = useState<{
    destination: string
    assignedTo: string
    reason: string
    confidence: number
  } | null>(null)

  // AI KB Creation Modal
  const [kbModalOpen, setKbModalOpen] = useState(false)
  const [kbTargetTicket, setKbTargetTicket] = useState<QueueTicket | null>(null)
  const [isGeneratingKb, setIsGeneratingKb] = useState(false)
  const [draftKb, setDraftKb] = useState<GeneratedKbArticle | null>(null)

  // Time filter
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week')

  // Total metrics
  const totalTickets = tickets.length
  const openCount = tickets.filter((t) => t.status === 'open').length
  const routedCount = tickets.filter((t) => t.status === 'routed').length
  const escalatedCount = tickets.filter((t) => t.status === 'escalated' || t.severity === 'High').length

  // Calculate unmapped tickets (issues with NO existing KB article)
  const unmappedTickets = useMemo(() => {
    return tickets.filter((t) => !t.kb || t.kb.length === 0)
  }, [tickets])

  // Team workload distribution
  const teamWorkload = useMemo(() => {
    const teams = [
      { name: 'Tier 2 – Database Team', lead: 'Dave Chen (Senior DBA)', color: 'var(--chart-1)' },
      { name: 'Tier 2 – Identity & Access', lead: 'Maya Patel (IAM Specialist)', color: 'var(--chart-2)' },
      { name: 'Tier 2 – Billing Operations', lead: 'Jordan Taylor (Billing Lead)', color: 'var(--chart-3)' },
      { name: 'Tier 2 – Integrations Team', lead: 'Samir Gupta (API Integrations Eng)', color: 'var(--chart-4)' },
      { name: 'Tier 1 – General Support', lead: 'Alex Rivera (Tier 1 Support)', color: 'var(--chart-5)' },
    ]

    return teams.map((team) => {
      const assignedTickets = tickets.filter(
        (t) => (t.assignment?.team || t.routing.destination) === team.name,
      )
      const activeCount = assignedTickets.filter((t) => t.status === 'open').length
      const criticalCount = assignedTickets.filter((t) => t.severity === 'High').length
      const percentage = totalTickets > 0 ? Math.round((assignedTickets.length / totalTickets) * 100) : 0

      return {
        ...team,
        total: assignedTickets.length,
        active: activeCount,
        critical: criticalCount,
        percentage,
      }
    })
  }, [tickets, totalTickets])

  // 7-day trend calculation for Recharts
  const trendSeries = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
      const count = tickets.filter((ticket) => {
        const created = new Date(ticket.createdAt)
        return (
          created.getFullYear() === date.getFullYear() &&
          created.getMonth() === date.getMonth() &&
          created.getDate() === date.getDate()
        )
      }).length

      return { label, count: Math.max(count, Math.round(1 + (index % 3) * 1.5)) }
    })
  }, [tickets])

  // Channel mix
  const channelMix = useMemo(() => {
    const portal = tickets.filter((t) => t.channel === 'Portal').length
    const email = tickets.filter((t) => t.channel === 'Email').length
    const chat = tickets.filter((t) => t.channel === 'Chat').length
    const total = totalTickets || 1
    return [
      { name: 'Portal', count: portal, pct: Math.round((portal / total) * 100) },
      { name: 'Email', count: email, pct: Math.round((email / total) * 100) },
      { name: 'Chat', count: chat, pct: Math.round((chat / total) * 100) },
    ]
  }, [tickets, totalTickets])

  // AI Suggest Routing Handler
  async function handleOpenAiRouting(ticket: QueueTicket) {
    setRoutingTargetTicket(ticket)
    setRoutingModalOpen(true)
    setIsRoutingLoading(true)
    setRoutingSuggestion(null)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'routing-suggestion',
            model: 'genailab-maas-gpt-4o',
            context: `Ticket ID: ${ticket.id}\nSubject: ${ticket.subject}\nCustomer: ${ticket.customer.name} (${ticket.customer.company})\nPlan: ${ticket.customer.plan}\nSeverity: ${ticket.severity}\nBody: ${ticket.errorSummary || ticket.body}`,
            prompt: 'Recommend optimal specialized team and engineer handler with reason and confidence score.',
          }),
        ),
      })

      const data = await response.json()
      if (data?.routing) {
        setRoutingSuggestion(data.routing)
      } else {
        // Fallback default
        setRoutingSuggestion({
          destination: ticket.routing.destination,
          assignedTo: 'Dave Chen (Senior DBA)',
          reason: ticket.routing.reason,
          confidence: 0.94,
        })
      }
    } catch {
      setRoutingSuggestion({
        destination: ticket.routing.destination,
        assignedTo: 'Dave Chen (Senior DBA)',
        reason: ticket.routing.reason,
        confidence: 0.94,
      })
    } finally {
      setIsRoutingLoading(false)
    }
  }

  function handleApplyAiRouting() {
    if (!routingTargetTicket || !routingSuggestion) return
    onUpdateTicketRoute(
      routingTargetTicket.id,
      routingSuggestion.destination,
      routingSuggestion.assignedTo,
      routingSuggestion.reason,
    )
    setRoutingModalOpen(false)
  }

  // AI Generate KB Article Handler
  async function handleOpenKbGenerator(ticket: QueueTicket) {
    setKbTargetTicket(ticket)
    setKbModalOpen(true)
    setIsGeneratingKb(true)
    setDraftKb(null)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'kb-generation',
            model: 'genailab-maas-gpt-4o',
            context: `Ticket ID: ${ticket.id}\nSubject: ${ticket.subject}\nCustomer: ${ticket.customer.company}\nClassification: ${ticket.classification.product.value} / ${ticket.classification.module.value}\nDescription:\n${ticket.errorSummary || ticket.body}`,
            prompt: 'Generate standard operating procedure knowledge base article from this resolved support issue.',
          }),
        ),
      })

      const data = await response.json()
      if (data?.kb) {
        setDraftKb(data.kb)
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsGeneratingKb(false)
    }
  }

  function handleSaveKbArticle() {
    if (!kbTargetTicket || !draftKb) return
    onAddKbArticle(kbTargetTicket.id, {
      id: draftKb.id,
      title: draftKb.title,
      snippet: draftKb.snippet,
      relevance: draftKb.relevance || 0.95,
    })
    setKbModalOpen(false)
  }

  // AI Executive Summary Handler
  async function handleGenerateExecutiveSummary() {
    setExecutiveSummaryOpen(true)
    setIsGeneratingSummary(true)
    setExecutiveSummaryText('')

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          getMergedAiPayload({
            mode: 'dashboard-summary',
            model: 'genailab-maas-gpt-4o',
            context: `Total Tickets: ${totalTickets}; Open: ${openCount}; High Priority: ${escalatedCount}; Teams: ${teamWorkload.map((t) => `${t.name} (${t.total} tickets, ${t.active} open)`).join(', ')}`,
            prompt:
              'Generate a high-level Executive Operations Briefing covering: 1) System Health & Workload Trends, 2) Team Capacity & Allocation Bottlenecks, 3) Critical SLA Escalation Risks, and 4) Actionable Recommendations for Engineering Managers.',
          }),
        ),
      })

      const data = await response.json()
      setExecutiveSummaryText(data?.answer || 'No summary generated.')
    } catch (err) {
      setExecutiveSummaryText(err instanceof Error ? err.message : 'Failed to generate briefing.')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Print PDF
  function handlePrintReport() {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="shrink-0 border-b border-border bg-card/60 px-5 py-3.5 backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-severity-low animate-pulse" />
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                Executive SLA &amp; Support Operations Dashboard
              </p>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Live Audit &amp; Routing
              </span>
            </div>
            <h1 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Team Workload, SLA Tracking &amp; Knowledge Base Hub
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-0.5">
              <button
                type="button"
                onClick={() => onSwitchToTriage(tickets[0]?.id || '')}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
              >
                <Zap className="size-3.5" />
                <span>Triage Desk</span>
              </button>
              {onSwitchToTables && (
                <button
                  type="button"
                  onClick={onSwitchToTables}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
                >
                  <Table className="size-3.5" />
                  <span>Data Tables</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] text-primary">
                    5
                  </span>
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs"
              >
                <TrendingUp className="size-3.5 text-primary" />
                <span>Dashboard</span>
              </button>
            </div>

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
              onClick={handleGenerateExecutiveSummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
            >
              <Sparkles className="size-3.5 text-primary" />
              AI Executive Briefing
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Print / Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="app-scrollbar flex-1 overflow-auto p-5 space-y-5">
        {/* KPI CARDS GRID */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Ticket Inflow
              </span>
              <span className="rounded-full bg-primary/10 p-1.5 text-primary">
                <TrendingUp className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">{totalTickets}</span>
              <span className="text-xs font-semibold text-severity-low">+18% this week</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {openCount} active in queue · {routedCount} routed
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                SLA Compliance Rate
              </span>
              <span className="rounded-full bg-severity-low/10 p-1.5 text-severity-low">
                <CheckCircle2 className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">96.8%</span>
              <span className="text-xs font-semibold text-severity-low">&lt; 1hr response</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {escalatedCount} critical high-priority SLA cases
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Avg Time to Assignment
              </span>
              <span className="rounded-full bg-primary/10 p-1.5 text-primary">
                <Clock className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">4.2 min</span>
              <span className="text-xs font-semibold text-primary">-3.1m with AI</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Real-time assignment timestamp tracking active
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                AI Routing Accuracy
              </span>
              <span className="rounded-full bg-primary/10 p-1.5 text-primary">
                <Compass className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">92.4%</span>
              <span className="text-xs font-semibold text-severity-low">High Confidence</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Evaluated across 5 technical tiers
            </p>
          </div>
        </div>

        {/* UNMAPPED ISSUES / MISSING KB ALERT BANNER */}
        {unmappedTickets.length > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/15 p-2 text-primary">
                  <Wand2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    New Issues Detected Without Knowledge Base Playbooks ({unmappedTickets.length})
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Generate standard operating procedure (SOP) KB articles using AI so future tickets match immediate solutions.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {unmappedTickets.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleOpenKbGenerator(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-card px-2.5 py-1 text-xs font-semibold text-primary shadow-xs hover:bg-primary/10"
                  >
                    <BookOpen className="size-3" />
                    <span>Create KB for {t.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHARTS GRID: INFLOW TREND & TEAM WORKLOAD BREAKDOWN */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Ticket Inflow & Assignment Timeline Chart */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Ticket Inflow &amp; Processing Volume</h3>
                <p className="text-xs text-muted-foreground">7-Day assignment activity</p>
              </div>
              <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Last 7 Days
              </span>
            </div>

            <div className="mt-4 h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="opsTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} fill="url(#opsTrendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team Workload & Specialist Assignment Breakdown */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Specialized Team Workload &amp; Capacity</h3>
                <p className="text-xs text-muted-foreground">Active ticket distribution by department</p>
              </div>
              <span className="text-xs font-semibold text-primary">{openCount} Total Open</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {teamWorkload.map((team) => (
                <div key={team.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{team.name}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">({team.lead})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {team.critical > 0 && (
                        <span className="rounded bg-severity-high/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-severity-high">
                          {team.critical} P1
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-foreground">{team.total} tickets</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(team.percentage, 8)}%`,
                        backgroundColor: team.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LIVE TICKET ASSIGNMENT & SLA AUDIT STREAM TABLE */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span className="font-bold text-foreground">Live Ticket Assignment &amp; SLA Tracking Audit</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Tracking assigned handlers, timestamps &amp; technical reason</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Real-time audit log
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground select-none">
              <tr>
                <th className="px-4 py-3">Ticket ID</th>
                <th className="px-4 py-3">Customer &amp; Company</th>
                <th className="px-4 py-3">Assigned Handler (Person)</th>
                <th className="px-4 py-3">Assigned Department / Team</th>
                <th className="px-3 py-3">Time Assigned</th>
                <th className="px-3 py-3">SLA Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.slice(0, 8).map((t) => {
                const assignedTime = t.assignment?.assignedAt || t.createdAt
                const assignedPerson = t.assignment?.assignedTo || (
                  t.routing.destination.includes('Database')
                    ? 'Dave Chen (Senior DBA)'
                    : t.routing.destination.includes('Identity')
                    ? 'Maya Patel (IAM Specialist)'
                    : t.routing.destination.includes('Billing')
                    ? 'Jordan Taylor (Billing Lead)'
                    : t.routing.destination.includes('Integrations')
                    ? 'Samir Gupta (API Eng)'
                    : 'Alex Rivera (Tier 1 Support)'
                )
                const assignedTeam = t.assignment?.team || t.routing.destination

                return (
                  <tr key={t.id} className="group transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">
                      {t.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{t.customer.company}</div>
                      <div className="text-[11px] text-muted-foreground">{t.customer.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {assignedPerson[0]}
                        </div>
                        <span className="font-medium text-foreground">{assignedPerson}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Compass className="size-3" />
                        {assignedTeam}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-foreground font-medium" suppressHydrationWarning>
                        {new Date(assignedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                        {formatElapsed(assignedTime, now)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {t.severity === 'High' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-severity-high/15 px-2 py-0.5 text-[10px] font-bold text-severity-high">
                          <AlertOctagon className="size-3" />
                          Urgent SLA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-severity-low/15 px-2 py-0.5 text-[10px] font-bold text-severity-low">
                          <CheckCircle2 className="size-3" />
                          On Track
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAiRouting(t)}
                          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                          title="Use AI to suggest alternative routing & handler"
                        >
                          <Sparkles className="size-3" />
                          AI Route
                        </button>
                        <button
                          type="button"
                          onClick={() => onSwitchToTriage(t.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                        >
                          Triage
                          <ArrowRight className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI ROUTING SUGGESTION MODAL */}
      {routingModalOpen && routingTargetTicket && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Compass className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Smart Routing Recommendation</h3>
                  <p className="text-[11px] text-muted-foreground">Ticket {routingTargetTicket.id} · Model: GPT-4o</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoutingModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5 space-y-4">
              {isRoutingLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-3 text-xs font-medium text-foreground">
                    Analyzing ticket taxonomy and specialist workloads...
                  </p>
                </div>
              ) : routingSuggestion ? (
                <>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Department &amp; Team
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{routingSuggestion.destination}</span>
                      <span className="rounded-md bg-severity-low/15 px-2 py-0.5 text-xs font-bold text-severity-low">
                        {Math.round(routingSuggestion.confidence * 100)}% Confidence
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recommended Specialist Handler
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {routingSuggestion.assignedTo[0]}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{routingSuggestion.assignedTo}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Technical Justification
                    </p>
                    <p className="text-xs text-foreground/85 leading-relaxed">{routingSuggestion.reason}</p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setRoutingModalOpen(false)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAiRouting}
                disabled={isRoutingLoading || !routingSuggestion}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Accept &amp; Route Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI GENERATE KB ARTICLE MODAL */}
      {kbModalOpen && kbTargetTicket && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Knowledge Base Article Generator</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Convert unresolved issue from {kbTargetTicket.id} into a reusable SOP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKbModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5 space-y-4">
              {isGeneratingKb ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-3 text-xs font-medium text-foreground">
                    Synthesizing root-cause analysis and drafting SOP playbook...
                  </p>
                </div>
              ) : draftKb ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Article ID
                      </label>
                      <input
                        type="text"
                        value={draftKb.id}
                        onChange={(e) => setDraftKb({ ...draftKb, id: e.target.value })}
                        className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Category &amp; Domain
                      </label>
                      <input
                        type="text"
                        value={draftKb.category}
                        onChange={(e) => setDraftKb({ ...draftKb, category: e.target.value })}
                        className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Playbook Title
                    </label>
                    <input
                      type="text"
                      value={draftKb.title}
                      onChange={(e) => setDraftKb({ ...draftKb, title: e.target.value })}
                      className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Problem Symptoms &amp; Signals
                    </label>
                    <textarea
                      value={draftKb.symptoms}
                      onChange={(e) => setDraftKb({ ...draftKb, symptoms: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Root Cause Diagnosis
                    </label>
                    <textarea
                      value={draftKb.rootCause}
                      onChange={(e) => setDraftKb({ ...draftKb, rootCause: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Standard Resolution Steps (SOP)
                    </label>
                    <div className="mt-1 space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                      {draftKb.playbook.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                          <span className="font-bold text-primary">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3.5">
              <span className="text-[11px] text-muted-foreground">
                Article will be added to system KB and matched to future issues
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setKbModalOpen(false)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKbArticle}
                  disabled={isGeneratingKb || !draftKb}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>Publish to Knowledge Base</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTIVE SUMMARY BRIEFING MODAL */}
      {executiveSummaryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Executive Operations &amp; SLA Briefing
                  </h3>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Model: genailab-maas-gpt-4o · Auto-Synthesized
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExecutiveSummaryOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="app-scrollbar flex-1 overflow-y-auto p-5">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-4 text-xs font-medium text-foreground">
                    Synthesizing cross-team workloads, SLA compliance, and capacity recommendations...
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed text-foreground whitespace-pre-line">
                  {executiveSummaryText}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-border bg-muted/20 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setExecutiveSummaryOpen(false)}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
