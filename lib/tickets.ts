export type Severity = 'High' | 'Medium' | 'Low'
export type TicketStatus = 'open' | 'routed' | 'escalated'

export type KbArticle = {
  id: string
  title: string
  snippet: string
  relevance: number
}

export type Ticket = {
  id: string
  subject: string
  body: string
  minutesAgo: number
  severity: Severity
  channel: 'Email' | 'Portal' | 'Chat'
  screenshot?: string
  errorSummary?: string
  customer: { name: string; company: string; plan: string }
  classification: {
    product: { value: string; confidence: number }
    module: { value: string; confidence: number }
    severity: { value: Severity; confidence: number }
  }
  kb: KbArticle[]
  draft: string
  routing: { destination: string; reason: string; confidence: number }
  signals?: Signal[]
}

export type SignalKind = 'Product' | 'Module' | 'Severity' | 'Context'
export type Signal = { term: string; kind: SignalKind }

export const AI_SIGNALS: Record<string, Signal[]> = {
  'TCK-48213': [
    { term: 'read replicas', kind: 'Product' },
    { term: 'Replication lag', kind: 'Module' },
    { term: 'serving stale data to customers', kind: 'Severity' },
    { term: 'WAL volume jumped about 3x', kind: 'Context' },
    { term: '09:30 maintenance window', kind: 'Context' },
  ],
  'TCK-48209': [
    { term: 'Okta SAML signing certificate', kind: 'Module' },
    { term: 'endless loop', kind: 'Context' },
    { term: '1,200 staff are currently unable to access the platform', kind: 'Severity' },
    { term: '"Last validated" timestamp', kind: 'Context' },
  ],
  'TCK-48201': [
    { term: 'webhook integration', kind: 'Product' },
    { term: '401 Unauthorized', kind: 'Module' },
    { term: 'about half of the event deliveries', kind: 'Context' },
    { term: 'delays in our lead pipeline', kind: 'Severity' },
  ],
  'TCK-48196': [
    { term: 'October invoice (INV-20931)', kind: 'Product' },
    { term: '"Additional seats (10)"', kind: 'Module' },
    { term: 'extra $450', kind: 'Severity' },
    { term: 'issue a credit', kind: 'Context' },
  ],
  'TCK-48188': [
    { term: 'export the "Weekly Active Accounts" report to CSV', kind: 'Module' },
    { term: 'exactly 10,000 rows', kind: 'Context' },
    { term: 'Is there a setting', kind: 'Severity' },
  ],
  'TCK-48175': [
    { term: 'sales_events table', kind: 'Product' },
    { term: '~2s to 40s+', kind: 'Severity' },
    { term: 'index issue', kind: 'Module' },
    { term: 'query planner', kind: 'Module' },
  ],
  'TCK-48162': [
    { term: 'rename my workspace', kind: 'Module' },
    { term: 'quick one', kind: 'Severity' },
  ],
  'TCK-48217': [
    { term: 'API limit', kind: 'Product' },
    { term: '1,000 req/min with 429 responses', kind: 'Module' },
    { term: 'upgraded to the Business plan', kind: 'Context' },
  ],
  'TCK-48219': [
    { term: 'schema migration', kind: 'Context' },
    { term: 'ledger database', kind: 'Product' },
    { term: '~2,300 fewer rows', kind: 'Severity' },
    { term: 'point-in-time recovery', kind: 'Module' },
    { term: 'compliance-critical system', kind: 'Severity' },
  ],
}

export const ROUTING_OPTIONS = [
  'Tier 1 – General Support',
  'Tier 2 – Database Team',
  'Tier 2 – Identity & Access',
  'Tier 2 – Billing Operations',
  'Tier 2 – Integrations Team',
  'Tier 3 – Platform Engineering',
  'Customer Success Manager',
] as const

export const SEED_TICKETS: Ticket[] = [
  {
    id: 'TCK-48213',
    subject: 'Production database replication lag exceeding 15 minutes',
    minutesAgo: 4,
    severity: 'High',
    channel: 'Portal',
    customer: { name: 'Priya Raman', company: 'Northwind Logistics', plan: 'Enterprise' },
    body: `Hi team,

Since roughly 09:40 UTC our read replicas in the eu-west region have been falling behind the primary. Replication lag is currently sitting at 15–18 minutes and climbing. Our order-tracking dashboards are serving stale data to customers and our ops team is escalating internally.

We haven't changed anything on our side. The primary is at ~40% CPU, so it doesn't look like load. We did notice the WAL volume jumped about 3x after the 09:30 maintenance window.

Cluster ID: nw-prod-eu-01
Can someone please look at this urgently?

Thanks,
Priya`,
    classification: {
      product: { value: 'Cloud Database', confidence: 0.97 },
      module: { value: 'Replication', confidence: 0.92 },
      severity: { value: 'High', confidence: 0.94 },
    },
    kb: [
      {
        id: 'KB-1042',
        title: 'Diagnosing read replica lag after maintenance windows',
        snippet:
          'Explains how WAL volume spikes from post-maintenance vacuum jobs can saturate replica apply throughput — matches the 3x WAL increase reported.',
        relevance: 0.93,
      },
      {
        id: 'KB-0877',
        title: 'Tuning max_wal_senders and replica apply workers',
        snippet:
          'Step-by-step guidance for increasing parallel apply workers on Enterprise clusters to recover from sustained lag.',
        relevance: 0.86,
      },
      {
        id: 'KB-1210',
        title: 'Incident playbook: stale reads on customer-facing replicas',
        snippet:
          'Recommends temporarily routing critical reads to the primary while lag recovers, minimizing customer impact.',
        relevance: 0.79,
      },
    ],
    draft: `Hi Priya,

Thank you for the detailed report — the cluster ID and WAL observation are extremely helpful.

Based on the timing, the lag appears related to a post-maintenance vacuum job that significantly increased WAL volume on nw-prod-eu-01. Our Database team is reviewing the replica apply throughput now.

In the meantime, we recommend temporarily routing latency-sensitive reads (such as order tracking) to the primary to avoid serving stale data. We'll follow up within 30 minutes with an update on recovery progress.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 2 – Database Team',
      reason: 'Replication issue on an Enterprise production cluster with active customer impact.',
      confidence: 0.91,
    },
  },
  {
    id: 'TCK-48209',
    subject: 'SSO login loop after rotating SAML certificate',
    minutesAgo: 12,
    severity: 'High',
    channel: 'Email',
    customer: { name: 'Marcus Chen', company: 'Helix Health', plan: 'Enterprise' },
    body: `Hello,

We rotated our Okta SAML signing certificate this morning per our security policy. Since then, every user who attempts to sign in via SSO is redirected back to the login page in an endless loop. Around 1,200 staff are currently unable to access the platform.

We uploaded the new certificate in Admin > Security > SSO, but the "Last validated" timestamp still shows yesterday.

Please advise ASAP.
Marcus`,
    classification: {
      product: { value: 'Identity Platform', confidence: 0.95 },
      module: { value: 'SAML SSO', confidence: 0.96 },
      severity: { value: 'High', confidence: 0.9 },
    },
    kb: [
      {
        id: 'KB-0533',
        title: 'Rotating SAML certificates without downtime',
        snippet:
          'Covers the dual-certificate window and the need to re-validate the IdP metadata — the stale "Last validated" timestamp suggests this step was missed.',
        relevance: 0.95,
      },
      {
        id: 'KB-0611',
        title: 'Troubleshooting SSO redirect loops',
        snippet:
          'Lists common causes of redirect loops, including signature mismatch and cached IdP metadata.',
        relevance: 0.88,
      },
    ],
    draft: `Hi Marcus,

Thanks for reaching out — we understand this is blocking a large number of your staff.

The behavior you describe typically occurs when the new certificate is uploaded but the IdP metadata hasn't been re-validated. Please try clicking "Re-validate metadata" under Admin > Security > SSO. If the timestamp doesn't update, our Identity team can force a metadata refresh on your tenant.

We're monitoring this closely and will update you shortly.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 2 – Identity & Access',
      reason: 'SAML configuration issue blocking tenant-wide access.',
      confidence: 0.93,
    },
  },
  {
    id: 'TCK-48201',
    subject: 'Webhook deliveries to Salesforce failing with 401',
    minutesAgo: 27,
    severity: 'Medium',
    channel: 'Portal',
    customer: { name: 'Elena Novak', company: 'Brightline CRM', plan: 'Business' },
    body: `Hi,

Our webhook integration to Salesforce started returning 401 Unauthorized for about half of the event deliveries since yesterday afternoon. The other half succeed. We haven't changed the connected app credentials.

Is there a known issue? Retries eventually go through but it's causing delays in our lead pipeline.

Thanks,
Elena`,
    classification: {
      product: { value: 'Integrations Hub', confidence: 0.93 },
      module: { value: 'Webhooks', confidence: 0.89 },
      severity: { value: 'Medium', confidence: 0.84 },
    },
    kb: [
      {
        id: 'KB-0921',
        title: 'Intermittent 401s from Salesforce OAuth token refresh',
        snippet:
          'Describes race conditions when multiple workers refresh the same OAuth token — explains the ~50% failure rate.',
        relevance: 0.9,
      },
      {
        id: 'KB-0702',
        title: 'Configuring webhook retry policies',
        snippet: 'How to adjust retry backoff to reduce pipeline delays while a fix is applied.',
        relevance: 0.74,
      },
    ],
    draft: `Hi Elena,

Thanks for the report. Intermittent 401 responses with a roughly 50% failure rate are often caused by concurrent OAuth token refreshes against the same Salesforce connected app.

Our Integrations team will review your connector's token refresh logs. In the meantime, enabling "Single-flight token refresh" under Integrations > Salesforce > Advanced should reduce the failures.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 2 – Integrations Team',
      reason: 'Third-party OAuth behavior in the webhook pipeline.',
      confidence: 0.88,
    },
  },
  {
    id: 'TCK-48196',
    subject: 'Invoice shows duplicate charge for seat add-on',
    minutesAgo: 48,
    severity: 'Medium',
    channel: 'Email',
    customer: { name: 'Jordan Ellis', company: 'Fable Studio', plan: 'Team' },
    body: `Hi there,

Our October invoice (INV-20931) shows the "Additional seats (10)" line item twice, totaling an extra $450. We only added seats once on Oct 3.

Can you correct this and issue a credit?

Thanks,
Jordan`,
    classification: {
      product: { value: 'Billing', confidence: 0.98 },
      module: { value: 'Invoicing', confidence: 0.91 },
      severity: { value: 'Medium', confidence: 0.77 },
    },
    kb: [
      {
        id: 'KB-0310',
        title: 'Understanding prorated seat charges',
        snippet:
          'Clarifies when two seat line items appear legitimately (proration + renewal) versus a true duplicate.',
        relevance: 0.87,
      },
      {
        id: 'KB-0318',
        title: 'Requesting invoice corrections and credits',
        snippet: 'Policy and SLA for issuing account credits on verified billing errors.',
        relevance: 0.82,
      },
    ],
    draft: `Hi Jordan,

Thanks for flagging this. We've located invoice INV-20931 and are reviewing the two "Additional seats (10)" line items.

If we confirm a duplicate charge, we'll issue a $450 credit to your account within 2 business days and send you a corrected invoice.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 2 – Billing Operations',
      reason: 'Invoice correction requires billing system access.',
      confidence: 0.95,
    },
  },
  {
    id: 'TCK-48188',
    subject: 'Dashboard export to CSV truncates at 10,000 rows',
    minutesAgo: 73,
    severity: 'Low',
    channel: 'Chat',
    customer: { name: 'Sam Whitaker', company: 'Orbit Analytics', plan: 'Business' },
    body: `When I export the "Weekly Active Accounts" report to CSV, the file always stops at exactly 10,000 rows even though the report shows ~14,500. Is there a setting to export everything?`,
    classification: {
      product: { value: 'Analytics', confidence: 0.94 },
      module: { value: 'Exports', confidence: 0.95 },
      severity: { value: 'Low', confidence: 0.9 },
    },
    kb: [
      {
        id: 'KB-0455',
        title: 'Export limits and asynchronous large exports',
        snippet:
          'Documents the 10,000-row synchronous export cap and how to use "Email me the full export" for larger datasets.',
        relevance: 0.97,
      },
      {
        id: 'KB-0460',
        title: 'Scheduling recurring report exports',
        snippet: 'Set up weekly exports delivered to email or S3 without row limits.',
        relevance: 0.71,
      },
    ],
    draft: `Hi Sam,

Great question! Instant CSV exports are capped at 10,000 rows for performance reasons. For larger reports, choose "Email me the full export" from the export menu — you'll receive a download link with all rows within a few minutes.

You can also schedule recurring exports to email or S3 with no row limit.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 1 – General Support',
      reason: 'Known product limitation with documented workaround.',
      confidence: 0.96,
    },
  },
  {
    id: 'TCK-48175',
    subject: 'Slow query performance on analytics workspace',
    minutesAgo: 112,
    severity: 'Medium',
    channel: 'Portal',
    customer: { name: 'Aisha Bello', company: 'Kestrel Retail', plan: 'Enterprise' },
    body: `Queries against our sales_events table have gone from ~2s to 40s+ over the past week. Row count has grown, but not dramatically (~8%). We suspect an index issue but don't have visibility into the query planner from the UI.`,
    classification: {
      product: { value: 'Cloud Database', confidence: 0.9 },
      module: { value: 'Query Engine', confidence: 0.86 },
      severity: { value: 'Medium', confidence: 0.81 },
    },
    kb: [
      {
        id: 'KB-0989',
        title: 'Identifying stale statistics and bloated indexes',
        snippet:
          'A sudden 20x slowdown with modest row growth often indicates stale planner statistics — recommends ANALYZE and REINDEX.',
        relevance: 0.89,
      },
      {
        id: 'KB-1003',
        title: 'Using Query Insights to inspect execution plans',
        snippet: 'Shows Enterprise users how to enable plan visibility in the workspace UI.',
        relevance: 0.84,
      },
      {
        id: 'KB-0870',
        title: 'Autovacuum tuning for high-write tables',
        snippet: 'Prevents recurrence by adjusting autovacuum thresholds on frequently updated tables.',
        relevance: 0.72,
      },
    ],
    draft: `Hi Aisha,

Thanks for the details. A large slowdown with only modest row growth is commonly caused by stale planner statistics or index bloat.

You can enable Query Insights (Workspace > Settings > Performance) to view execution plans directly. Our Database team will also review sales_events and recommend whether an ANALYZE or REINDEX is needed.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 2 – Database Team',
      reason: 'Query planner investigation on an Enterprise workspace.',
      confidence: 0.87,
    },
  },
  {
    id: 'TCK-48162',
    subject: 'How to change workspace display name?',
    minutesAgo: 185,
    severity: 'Low',
    channel: 'Chat',
    customer: { name: 'Leo Martins', company: 'Pinecrest Labs', plan: 'Starter' },
    body: `Hey, quick one — how do I rename my workspace? I can't find the option anywhere in settings.`,
    classification: {
      product: { value: 'Workspace', confidence: 0.92 },
      module: { value: 'Settings', confidence: 0.94 },
      severity: { value: 'Low', confidence: 0.97 },
    },
    kb: [
      {
        id: 'KB-0102',
        title: 'Renaming your workspace',
        snippet: 'Workspace owners can change the display name under Settings > General > Workspace details.',
        relevance: 0.98,
      },
      {
        id: 'KB-0108',
        title: 'Workspace roles and permissions',
        snippet: 'Explains that only Owners can rename a workspace — useful if the option is hidden.',
        relevance: 0.8,
      },
    ],
    draft: `Hi Leo,

Happy to help! Workspace owners can rename the workspace under Settings > General > Workspace details. If you don't see the option, you may need the Owner role — your current owner can update this under Settings > Members.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 1 – General Support',
      reason: 'How-to question fully answered by KB content.',
      confidence: 0.98,
    },
  },
]

export const INCOMING_TICKETS: Ticket[] = [
  {
    id: 'TCK-48217',
    subject: 'API rate limit errors after plan upgrade',
    minutesAgo: 0,
    severity: 'Medium',
    channel: 'Portal',
    customer: { name: 'Hannah Lee', company: 'Quanta Labs', plan: 'Business' },
    body: `We upgraded to the Business plan yesterday, which should raise our API limit to 5,000 req/min. We're still being throttled at 1,000 req/min with 429 responses. Is there a delay before the new limits apply?`,
    classification: {
      product: { value: 'Developer API', confidence: 0.95 },
      module: { value: 'Rate Limiting', confidence: 0.93 },
      severity: { value: 'Medium', confidence: 0.82 },
    },
    kb: [
      {
        id: 'KB-0740',
        title: 'Plan changes and API rate limit propagation',
        snippet:
          'New limits apply once existing API keys are rotated or after a 24-hour cache expiry — matches the reported timing.',
        relevance: 0.94,
      },
      {
        id: 'KB-0745',
        title: 'Handling 429 responses gracefully',
        snippet: 'Best practices for exponential backoff using the Retry-After header.',
        relevance: 0.76,
      },
    ],
    draft: `Hi Hannah,

Thanks for upgrading! New rate limits apply once your API keys are rotated, or automatically after a 24-hour cache window. Rotating your key under Developer > API Keys will apply the 5,000 req/min limit immediately.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 1 – General Support',
      reason: 'Known propagation behavior with self-serve fix.',
      confidence: 0.89,
    },
  },
  {
    id: 'TCK-48219',
    subject: 'Data loss suspected after failed schema migration',
    minutesAgo: 0,
    severity: 'High',
    channel: 'Email',
    customer: { name: 'Tomás Ortega', company: 'Meridian Finance', plan: 'Enterprise' },
    body: `URGENT: A schema migration on our ledger database failed midway and the transactions table now reports ~2,300 fewer rows than before. We need to understand whether point-in-time recovery is possible for the 14:05 UTC mark. This is a compliance-critical system.`,
    classification: {
      product: { value: 'Cloud Database', confidence: 0.96 },
      module: { value: 'Backup & Recovery', confidence: 0.94 },
      severity: { value: 'High', confidence: 0.98 },
    },
    kb: [
      {
        id: 'KB-1101',
        title: 'Point-in-time recovery to a branch database',
        snippet:
          'Restoring to a new branch at 14:05 UTC allows verification of missing rows without affecting production.',
        relevance: 0.95,
      },
      {
        id: 'KB-1115',
        title: 'Safe schema migrations with transactional DDL',
        snippet: 'Explains why partial migrations can occur and how to prevent them in future.',
        relevance: 0.81,
      },
    ],
    draft: `Hi Tomás,

We understand the urgency. Point-in-time recovery is available for your cluster, and we recommend restoring to a separate branch at 14:05 UTC so we can verify the missing rows without touching production.

Our Database team is engaged and will contact you directly within 15 minutes.

Best regards,
Support Team`,
    routing: {
      destination: 'Tier 3 – Platform Engineering',
      reason: 'Potential data loss on a compliance-critical Enterprise system.',
      confidence: 0.9,
    },
  },
]
