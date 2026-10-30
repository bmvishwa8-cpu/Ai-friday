import type { KbArticle, Severity, Signal, Ticket } from './tickets'

export type TestTicketInput = {
  subject: string
  body: string
  severity: Severity
  channel: Ticket['channel']
  customerName: string
  company: string
  plan: string
}

type Rule = {
  keywords: string[]
  product: string
  module: string
  destination: string
  kb: KbArticle[]
}

const RULES: Rule[] = [
  {
    keywords: ['database', 'replica', 'query', 'schema migration', 'migration', 'backup', 'point-in-time recovery', 'index'],
    product: 'Managed Postgres',
    module: 'Replication & Recovery',
    destination: 'Tier 2 – Database Team',
    kb: [
      { id: 'KB-1042', title: 'Diagnosing replication lag on managed clusters', snippet: 'Step-by-step checks for WAL throughput, long-running transactions, and replica sizing.', relevance: 0.86 },
      { id: 'KB-1107', title: 'Restoring with point-in-time recovery (PITR)', snippet: 'How to restore a cluster to a precise timestamp without affecting the primary.', relevance: 0.78 },
    ],
  },
  {
    keywords: ['sso', 'saml', 'okta', 'login', 'password', 'mfa', 'sign in'],
    product: 'Identity Platform',
    module: 'SSO / SAML',
    destination: 'Tier 2 – Identity & Access',
    kb: [
      { id: 'KB-2210', title: 'Rotating SAML signing certificates', snippet: 'Upload the new IdP certificate and validate the connection before the old one expires.', relevance: 0.84 },
      { id: 'KB-2231', title: 'Troubleshooting SSO redirect loops', snippet: 'Common causes include clock skew, mismatched ACS URLs, and stale certificates.', relevance: 0.75 },
    ],
  },
  {
    keywords: ['invoice', 'billing', 'charge', 'refund', 'seat', 'credit'],
    product: 'Billing',
    module: 'Invoices & Seats',
    destination: 'Tier 2 – Billing Operations',
    kb: [
      { id: 'KB-3015', title: 'Understanding prorated seat charges', snippet: 'Explains how mid-cycle seat changes appear on the next invoice.', relevance: 0.82 },
      { id: 'KB-3040', title: 'Requesting a billing credit', snippet: 'Eligibility criteria and the approval flow for invoice adjustments.', relevance: 0.7 },
    ],
  },
  {
    keywords: ['webhook', 'api', 'integration', '429', '401', 'rate limit', 'token'],
    product: 'Developer Platform',
    module: 'Webhooks & API',
    destination: 'Tier 2 – Integrations Team',
    kb: [
      { id: 'KB-4102', title: 'Webhook signature verification', snippet: 'Validate payloads with the signing secret and handle secret rotation safely.', relevance: 0.83 },
      { id: 'KB-4120', title: 'API rate limits by plan', snippet: 'Per-plan request limits, burst behavior, and how 429 retries should back off.', relevance: 0.74 },
    ],
  },
]

const FALLBACK: Rule = {
  keywords: [],
  product: 'Analytics Workspace',
  module: 'General',
  destination: 'Tier 1 – General Support',
  kb: [
    { id: 'KB-0101', title: 'Getting started with your workspace', snippet: 'Overview of core settings, members, and common configuration tasks.', relevance: 0.62 },
    { id: 'KB-0150', title: 'How to contact support effectively', snippet: 'What details help the team resolve requests faster.', relevance: 0.55 },
  ],
}

export function buildTestTicket(input: TestTicketInput, id: string): Ticket & { signals: Signal[] } {
  const text = `${input.subject} ${input.body}`.toLowerCase()
  const scored = RULES.map((rule) => ({
    rule,
    hits: rule.keywords.filter((k) => text.includes(k)),
  })).sort((a, b) => b.hits.length - a.hits.length)
  const best = scored[0].hits.length > 0 ? scored[0] : { rule: FALLBACK, hits: [] as string[] }
  const confidence = Math.min(0.97, 0.62 + best.hits.length * 0.08)
  const firstName = input.customerName.split(' ')[0] || 'there'

  const signals: Signal[] = best.hits
    .filter((k) => input.body.toLowerCase().includes(k))
    .slice(0, 4)
    .map((term, i) => ({ term, kind: i === 0 ? 'Product' : i === 1 ? 'Module' : 'Context' }))

  return {
    id,
    subject: input.subject,
    body: input.body,
    minutesAgo: 0,
    severity: input.severity,
    channel: input.channel,
    customer: { name: input.customerName, company: input.company, plan: input.plan },
    classification: {
      product: { value: best.rule.product, confidence },
      module: { value: best.rule.module, confidence: Math.max(0.5, confidence - 0.06) },
      severity: { value: input.severity, confidence: 0.81 },
    },
    kb: best.rule.kb,
    draft: `Hi ${firstName},

Thanks for reaching out about "${input.subject}". I've reviewed the details you shared and this looks related to ${best.rule.product} (${best.rule.module}).

Our ${best.rule.destination.replace(/^Tier \d – /, '')} specialists are taking a closer look now. In the meantime, the article "${best.rule.kb[0].title}" covers the most common causes and may help you move forward.

We'll follow up with an update shortly.

Best regards,
Support Team`,
    routing: {
      destination: best.rule.destination,
      reason:
        best.hits.length > 0
          ? `Matched ${best.hits.length} ${best.rule.product} signal${best.hits.length > 1 ? 's' : ''}: ${best.hits.slice(0, 3).join(', ')}.`
          : 'No specialist signals detected; defaulting to general support.',
      confidence,
    },
    signals,
  }
}

export const TEST_PRESETS: TestTicketInput[] = [
  {
    subject: 'Rows missing after schema migration on ledger database',
    body: 'After last night\'s schema migration the ledger database reports fewer rows than expected. We need to know whether point-in-time recovery can restore the missing data without downtime.',
    severity: 'High',
    channel: 'Email',
    customerName: 'Daniel Okafor',
    company: 'Northwind Finance',
    plan: 'Enterprise',
  },
  {
    subject: 'Webhook deliveries failing with 401',
    body: 'Since this morning our webhook endpoint receives 401 errors for most events. We rotated the API token yesterday — could that be related to the integration failing?',
    severity: 'Medium',
    channel: 'Portal',
    customerName: 'Lena Fischer',
    company: 'Brightloop',
    plan: 'Business',
  },
  {
    subject: 'Unexpected seat charge on latest invoice',
    body: 'Our latest invoice includes a charge for 5 extra seats we never added. Can you review the billing and issue a credit?',
    severity: 'Low',
    channel: 'Chat',
    customerName: 'Marco Ruiz',
    company: 'Atlas Studio',
    plan: 'Starter',
  },
]
