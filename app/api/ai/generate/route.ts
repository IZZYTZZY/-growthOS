// @ts-nocheck
// app/api/ai/generate/route.ts
// POST /api/ai/generate
//
// Accepts a niche + optional tone/audience and returns a fully structured
// AI-generated caption set: { hook, caption, cta, hashtags, qualityScore }.
//
// Strategy: OpenAI gpt-4o-mini (cheap, fast, edge-friendly).
// Falls back to a deterministic template engine if OPENAI_API_KEY is missing
// so the app works on fresh installs without an API key.

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/utils'
import type { AIGenerateRequest, AIGenerateResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30    // Vercel free tier: 30s max for serverless

// ── Prompt builder ───────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are an elite Instagram growth strategist and copywriter with a proven track record of generating viral Reels content.

Your output MUST be valid JSON with this exact structure:
{
  "hook": "string — opening 1-2 sentence attention grabber, max 25 words",
  "caption": "string — full caption body with emojis, 80-150 words, conversational & relatable",
  "cta": "string — single clear call-to-action sentence",
  "hashtags": {
    "broad": ["array of 6 hashtags — 1M+ posts each, very general"],
    "medium": ["array of 15 hashtags — 100K–1M posts each, semi-niche"],
    "niche": ["array of 9 hashtags — under 100K posts each, highly specific"]
  },
  "qualityScore": number between 6.0 and 9.8,
  "suggestedPostTime": "e.g. Tuesday 7–9 PM EST",
  "estimatedReach": "e.g. 15K–40K accounts"
}

Hashtag rules (CRITICAL):
- 6 broad (20%) + 15 medium (50%) + 9 niche (30%) = 30 total
- No spaces inside hashtags
- No # symbol — just the word
- Hashtags must be relevant to the niche
- Mix English and niche-specific community tags

Caption rules:
- Start with the hook on line 1
- Use line breaks for readability
- Include 5–10 relevant emojis naturally embedded (NOT at start of every line)
- Conversational tone — write like a real human creator, not a brand

Respond ONLY with the JSON object. No markdown, no code fences, no preamble.`
}

function buildUserPrompt(req: AIGenerateRequest): string {
  const parts = [
    `Niche: ${req.niche}`,
    req.tone             ? `Tone: ${req.tone}`                           : null,
    req.target_audience  ? `Target audience: ${req.target_audience}`     : null,
    req.product_or_service ? `Product/Service: ${req.product_or_service}` : null,
    req.include_emojis === false ? 'Minimize emoji usage.'               : null,
  ].filter(Boolean)

  return `Generate a complete Instagram Reel caption package for the following context:\n\n${parts.join('\n')}`
}

// ── Deterministic fallback (no API key needed) ───────────────
function generateFallbackResponse(req: AIGenerateRequest): AIGenerateResponse {
  const niche = req.niche.toLowerCase()
  const tone  = req.tone ?? 'casual'

  const hooks: Record<string, string> = {
    fitness:  'This one habit changed EVERYTHING about my morning routine 🔥',
    food:     'Stop making this mistake every time you cook pasta 🍝',
    travel:   'This hidden gem will ruin all other destinations for you ✈️',
    fashion:  'The outfit formula that makes every body shape look incredible 👌',
    business: 'I scaled to $10K/month by ignoring this "expert" advice 💰',
    default:  `The ${niche} secret nobody talks about — until now 👇`,
  }

  const hook = Object.entries(hooks).find(([k]) => niche.includes(k))?.[1] ?? hooks.default

  const caption = `${hook}

Here's the truth most people in the ${niche} space won't tell you:

The game isn't about working harder — it's about working smarter with the right systems 💡

After months of trial and error, I finally cracked the code.

The results? Completely changed my approach (and the numbers don't lie 📊)

Want the exact breakdown? Drop a 🙋 in the comments and I'll share the full framework with you.

Save this post — you'll want to come back to it.`

  const cta = `Follow for daily ${niche} tips that actually work ✅`

  return {
    hook,
    caption,
    cta,
    hashtags: {
      broad:  ['instagram', 'reels', 'viral', 'trending', 'explore', 'fyp'],
      medium: [
        `${niche}tips`, `${niche}community`, `${niche}life`, `${niche}goals`,
        `${niche}motivation`, `${niche}journey`, `${niche}inspiration`,
        `${niche}hacks`, `${niche}advice`, `${niche}guide`, `${niche}mindset`,
        `${niche}content`, `${niche}creator`, `${niche}strategy`, `${niche}growth`,
      ],
      niche: [
        `${niche}nerd`, `${niche}obsessed`, `${niche}daily`, `micro${niche}`,
        `${niche}secrets`, `${niche}insider`, `honest${niche}`, `real${niche}`, `${niche}truth`,
      ],
    },
    qualityScore:       7.4,
    suggestedPostTime:  'Tuesday or Thursday, 7–9 PM local time',
    estimatedReach:     '8K–25K accounts',
  }
}

// ── Main handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Auth gate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return apiError('Unauthorized', 401)

    // 2. Parse body
    let body: AIGenerateRequest
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    if (!body.niche || body.niche.trim().length < 2) {
      return apiError('niche is required (min 2 characters)', 422)
    }

    const sanitized: AIGenerateRequest = {
      niche:              body.niche.trim().slice(0, 80),
      tone:               body.tone ?? 'casual',
      include_emojis:     body.include_emojis ?? true,
      target_audience:    body.target_audience?.trim().slice(0, 120),
      product_or_service: body.product_or_service?.trim().slice(0, 120),
    }

    // 3. Check plan — starter gets 5 free AI gens/day, pro/agency unlimited
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('id', user.id)
      .single()

    const plan = (profile as any)?.subscription_plan ?? 'starter'

    // (Rate limiting via Supabase Edge Functions or Upstash would go here for production)

    // 4. Call OpenAI if key is present, else use fallback
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      // Deterministic fallback for environments without OpenAI configured
      const fallback = generateFallbackResponse(sanitized)
      return apiSuccess({ ...fallback, _source: 'template' })
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        max_tokens:  1200,
        temperature: 0.85,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user',   content: buildUserPrompt(sanitized) },
        ],
      }),
      signal: AbortSignal.timeout(25_000),    // 25s hard timeout
    })

    if (!openAIResponse.ok) {
      const errText = await openAIResponse.text()
      console.error('[ai/generate] OpenAI error:', openAIResponse.status, errText)

      // Gracefully fall back rather than surfacing an API error to the user
      const fallback = generateFallbackResponse(sanitized)
      return apiSuccess({ ...fallback, _source: 'template_fallback' })
    }

    const openAIData = await openAIResponse.json()
    const rawContent: string = openAIData.choices?.[0]?.message?.content ?? ''

    // 5. Parse JSON — strip code fences if model added them
    let parsed: AIGenerateResponse
    try {
      const clean = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim()
      parsed = JSON.parse(clean)
    } catch (parseErr) {
      console.error('[ai/generate] JSON parse error:', parseErr, '\nRaw:', rawContent)
      const fallback = generateFallbackResponse(sanitized)
      return apiSuccess({ ...fallback, _source: 'parse_fallback' })
    }

    // 6. Validate structure
    if (!parsed.hook || !parsed.caption || !parsed.cta || !parsed.hashtags) {
      const fallback = generateFallbackResponse(sanitized)
      return apiSuccess({ ...fallback, _source: 'validation_fallback' })
    }

    // 7. Persist usage log (optional — useful for rate-limiting analytics)
    await supabase.from('notifications').insert({
      user_id: user.id,
      title:   'AI Caption Generated',
      body:    `Generated for niche: ${sanitized.niche}. Quality score: ${parsed.qualityScore ?? 'N/A'}`,
      type:    'success',
    }).then(() => {}) // fire-and-forget, don't block response

    return apiSuccess({ ...parsed, _source: 'openai' })

  } catch (err) {
    console.error('[ai/generate] unexpected error:', err)
    return apiError('Internal server error', 500)
  }
}
