import { NextRequest, NextResponse } from 'next/server'
import { Agent } from 'undici'
import {
  AVAILABLE_MODELS,
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
  isVisionCapableModel,
  resolveModelId,
} from '@/lib/ai-models'
import {
  generateSmartAssistantResponse,
  generateSmartDashboardSummary,
  generateSmartKbArticle,
  generateSmartRoutingSuggestion,
  generateSmartTableInsights,
  generateSmartTriageAnalysis,
} from '@/lib/ai-fallback'

const AI_BASE_URL =
  process.env.OPENAI_BASE_URL?.trim() ||
  process.env.AI_BASE_URL?.trim() ||
  (process.env.OPENAI_API_KEY ? 'https://api.openai.com' : 'https://genailab.tcs.in')

const AI_API_KEY =
  process.env.OPENAI_API_KEY?.trim() ||
  process.env.AI_API_KEY?.trim() ||
  'sk-8arXBbsPa-sroHLpc1HJcA'

const AI_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  process.env.AI_MODEL ||
  (process.env.OPENAI_API_KEY ? 'gpt-4o' : 'genailab-maas-gpt-4o')

const AI_VISION_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  process.env.AI_VISION_MODEL ||
  (process.env.OPENAI_API_KEY ? 'gpt-4o' : 'genailab-maas-gpt-4o')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt =
      body?.prompt ||
      `You are a support triage AI assistant. Analyze the ticket and return: 1) summary, 2) likely root cause, 3) recommended next steps.`

    const imageData = body?.imageData
    const imageName = body?.imageName
    const mode = body?.mode || 'general'
    const context = body?.context || ''
    const requestedModel = typeof body?.model === 'string' ? body.model : undefined
    const requestedVisionModel = typeof body?.visionModel === 'string' ? body.visionModel : undefined
    const requestBaseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl.trim() : ''
    const requestApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
    const effectiveBaseUrl = requestBaseUrl || AI_BASE_URL
    const effectiveApiKey = requestApiKey || AI_API_KEY

    if (!effectiveBaseUrl || !effectiveApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'AI is not configured. Add AI_BASE_URL / OPENAI_API_KEY to your .env.local file or configure your API key in AI Settings.',
        },
        { status: 500 },
      )
    }

    const hasImage = Boolean(imageData)
    const selectedModel = resolveModelId(
      hasImage ? requestedVisionModel || requestedModel || AI_VISION_MODEL : requestedModel || AI_MODEL,
      hasImage,
    )

    if (hasImage && !isVisionCapableModel(selectedModel)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'The selected model cannot read image attachments. Choose a vision-capable model such as Gemini 2.5 Flash or GPT-4o from the selector, or describe the screenshot manually.',
        },
        { status: 400 },
      )
    }

    if (!AVAILABLE_MODELS.some((model) => model.id === selectedModel)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported model: ${selectedModel}`,
        },
        { status: 400 },
      )
    }

    // Map to OpenAI model identifier if targeting api.openai.com
    let apiModelName = selectedModel
    if (effectiveBaseUrl.includes('api.openai.com')) {
      if (selectedModel.startsWith('genailab-maas-gpt-4o') || selectedModel === 'genailab-maas-gpt-4o') {
        apiModelName = 'gpt-4o'
      } else if (selectedModel.includes('gpt-4o-mini')) {
        apiModelName = 'gpt-4o-mini'
      } else if (selectedModel.includes('gpt-35-turbo') || selectedModel.includes('gpt-3.5-turbo')) {
        apiModelName = 'gpt-3.5-turbo'
      }
    }

    // Build specific system prompt based on mode
    let systemPrompt = ''
    if (mode === 'routing-suggestion') {
      systemPrompt = `You are an expert IT triage routing AI. Analyze the support ticket and determine the optimal team and specialist to handle it.
Available teams:
- Tier 1 - General Support
- Tier 2 - Database Team
- Tier 2 - Identity & Access
- Tier 2 - Billing Operations
- Tier 2 - Integrations Team
- Tier 3 - Platform Engineering
- Customer Success Manager

Respond ONLY with valid JSON in this exact structure (no markdown fences, no extra text):
{
  "destination": "<One of the available teams above>",
  "assignedTo": "<Full Name and role, e.g. Dave Chen (Senior DBA), Maya Patel (IAM Specialist), Samir Gupta (API Integrations Eng), Jordan Taylor (Billing Lead), Alex Rivera (Tier 1 Support)>",
  "reason": "<Specific technical reason for this routing>",
  "confidence": 0.95
}`
    } else if (mode === 'kb-generation') {
      systemPrompt = `You are a senior technical writer and support architect. Generate a comprehensive Knowledge Base troubleshooting playbook article for this reported issue.
Respond ONLY with valid JSON in this exact structure (no markdown fences, no extra text):
{
  "id": "KB-${Math.floor(1000 + Math.random() * 9000)}",
  "title": "<Concise descriptive title>",
  "category": "<Category name, e.g. Cloud Infrastructure, Identity & Access, Billing, Integrations>",
  "symptoms": "<Detailed description of client symptoms and alerts>",
  "rootCause": "<Technical root cause explanation>",
  "snippet": "<Quick 1-2 sentence resolution summary>",
  "playbook": [
    "<Step 1 action>",
    "<Step 2 action>",
    "<Step 3 action>",
    "<Step 4 action>"
  ],
  "keywords": ["<tag1>", "<tag2>", "<tag3>", "<tag4>"],
  "relevance": 0.95
}`
    } else if (
      mode === 'dashboard-summary' ||
      context.toLowerCase().includes('total tickets:') ||
      context.toLowerCase().includes('dashboard metrics:')
    ) {
      systemPrompt = `You are an IT operations and support director. Analyze the support dashboard metrics and provide a high-level Executive Operations Briefing covering: 1) System Health & Workload Trends, 2) Team Capacity & Allocation Bottlenecks, 3) Critical SLA Escalation Risks, and 4) Actionable Recommendations for Engineering Managers.`
    } else if (
      mode === 'assistant' ||
      mode === 'general' ||
      prompt.toLowerCase().includes('how to use') ||
      prompt.toLowerCase().includes('navigate')
    ) {
      systemPrompt = `You are an expert AI assistant guiding the user through this support triage platform. Explain workflows, describe the 3 views (Triage Desk, Data Tables Hub, Operations Dashboard), show how to filter tickets and generate KB articles, and guide user navigation.`
    } else if (mode === 'ticket-analysis') {
      systemPrompt = `You are an expert IT support triage AI. Analyze tickets, identify likely root causes, summarize actions, and reference similar past incidents. When an image is provided, inspect it for UI errors, logs, stack traces, screenshots, or browser issues. Return a structured answer with:
1) Executive Problem Summary
2) Root Cause Diagnosis
3) Recommended Action Plan / Technical Resolution
4) Similar Tasks & Precedents (Root Cause & Resolution)
5) Suggested Customer Reply Draft`
    } else {
      systemPrompt = `You are a helpful AI assistant for support operations. Respond clearly and concisely.`
    }

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text',
            text: `${context ? `Context:\n${context}\n\n` : ''}${prompt}`,
          },
          ...(hasImage
            ? [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                    detail: 'high',
                  },
                },
              ]
            : []),
        ],
      },
    ]

    function resolveSmartFallback(): any {
      if (mode === 'routing-suggestion') {
        const routing = generateSmartRoutingSuggestion(context)
        return { ok: true, routing, answer: JSON.stringify(routing), model: selectedModel, fallback: true, source: 'smart-triage-engine' }
      }
      if (mode === 'kb-generation') {
        const kb = generateSmartKbArticle(context, prompt)
        return { ok: true, kb, answer: JSON.stringify(kb), model: selectedModel, fallback: true, source: 'smart-triage-engine' }
      }
      if (
        mode === 'dashboard-summary' ||
        context.toLowerCase().includes('total tickets:') ||
        context.toLowerCase().includes('dashboard metrics:')
      ) {
        const answer = generateSmartDashboardSummary(context, prompt)
        return { ok: true, answer, model: selectedModel, fallback: true, source: 'smart-triage-engine' }
      }
      if (mode === 'assistant' || prompt.toLowerCase().includes('navigate') || prompt.toLowerCase().includes('how to use')) {
        const answer = generateSmartAssistantResponse(context, prompt)
        return { ok: true, answer, model: selectedModel, fallback: true, source: 'smart-triage-engine' }
      }
      const tableMatch = context.match(/table:?\s*"?(open|routed|escalated|accounts|kb)"?/i)?.[1]?.toLowerCase()
      if (tableMatch) {
        const answer = generateSmartTableInsights(tableMatch, context)
        return { ok: true, answer, model: selectedModel, fallback: true, source: 'smart-triage-engine' }
      }
      const answer = generateSmartTriageAnalysis(context, prompt)
      return { ok: true, answer, model: selectedModel, fallback: true, source: 'smart-triage-engine' }
    }

    let aiResponse: Response
    try {
      const sslDisabledDispatcher = new Agent({
        connect: {
          rejectUnauthorized: false,
        },
      })

      const isGpt5Family = /gpt-5|gpt-5\./i.test(apiModelName)
      const requestBody: Record<string, unknown> = {
        model: apiModelName,
        messages,
      }

      if (mode === 'routing-suggestion' || mode === 'kb-generation') {
        requestBody.response_format = { type: 'json_object' }
      }

      if (!isGpt5Family) {
        requestBody.temperature = mode === 'routing-suggestion' || mode === 'kb-generation' ? 0.2 : 0.4
      }

      // Real live OpenAI-compatible chat completions API call
      aiResponse = await fetch(`${effectiveBaseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${effectiveApiKey}`,
        },
        dispatcher: sslDisabledDispatcher,
        body: JSON.stringify(requestBody),
      } as RequestInit & { dispatcher?: any })
    } catch (fetchError) {
      console.warn(`Upstream AI gateway unreachable. Using intelligent fallback triage engine:`, fetchError)
      const fallbackPayload = resolveSmartFallback()
      return NextResponse.json(fallbackPayload)
    }

    const rawText = await aiResponse.text()

    if (!aiResponse.ok) {
      let detail = rawText || 'The AI service returned an error.'
      try {
        const parsed = JSON.parse(rawText)
        if (parsed?.error?.message) {
          detail = parsed.error.message
        }
      } catch {
        // keep raw text fallback
      }

      console.warn(`Upstream AI gateway returned ${aiResponse.status} (${detail}). Activating intelligent fallback engine.`)
      const fallbackPayload = resolveSmartFallback()
      fallbackPayload.gatewayNotice = `Upstream gateway (${effectiveBaseUrl}) returned: ${detail}`
      return NextResponse.json(fallbackPayload)
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid response from the AI service.' }, { status: 500 })
    }

    const answer = parsed?.choices?.[0]?.message?.content || parsed?.answer || ''

    if (mode === 'routing-suggestion') {
      try {
        const cleanJson = answer.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
        const routing = JSON.parse(cleanJson)
        return NextResponse.json({
          ok: true,
          routing,
          answer: JSON.stringify(routing),
          model: selectedModel,
          source: 'openai-api',
        })
      } catch (err) {
        console.warn('Could not parse routing JSON from model, using fallback:', err)
        const routing = generateSmartRoutingSuggestion(context)
        return NextResponse.json({
          ok: true,
          routing,
          answer: JSON.stringify(routing),
          model: selectedModel,
          source: 'smart-triage-engine',
        })
      }
    }

    if (mode === 'kb-generation') {
      try {
        const cleanJson = answer.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
        const kb = JSON.parse(cleanJson)
        return NextResponse.json({
          ok: true,
          kb,
          answer: JSON.stringify(kb),
          model: selectedModel,
          source: 'openai-api',
        })
      } catch (err) {
        console.warn('Could not parse KB JSON from model, using fallback:', err)
        const kb = generateSmartKbArticle(context, prompt)
        return NextResponse.json({
          ok: true,
          kb,
          answer: JSON.stringify(kb),
          model: selectedModel,
          source: 'smart-triage-engine',
        })
      }
    }

    return NextResponse.json({
      ok: true,
      answer,
      model: selectedModel,
      source: 'openai-api',
      imageName,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected AI error.',
      },
      { status: 500 },
    )
  }
}
