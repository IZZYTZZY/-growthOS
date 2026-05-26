// @ts-nocheck
// app/api/analytics/snapshot/route.ts
// POST /api/analytics/snapshot
// Called by a Vercel CRON job (vercel.json) or a webhook from the IG Graph API.
// Upserts today's analytics snapshot for a given account.
//
// SECURITY: Uses the service-role client (bypasses RLS) since this is a
// trusted server-to-server call. Protect with CRON_SECRET header.

import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/utils'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Verify the request comes from our Vercel CRON (or a trusted caller)
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return apiError('Forbidden', 403)
  }

  let body: {
    account_id: string
    user_id: string
    metrics: {
      followers_count: number
      following_count: number
      unfollowers_delta?: number
      reel_views: number
      reel_plays?: number
      watch_time_secs?: number
      saves?: number
      shares?: number
      comments?: number
      likes?: number
      profile_visits?: number
      reach?: number
      impressions?: number
      conversion_rate?: number
      raw_payload?: Record<string, unknown>
    }
  }

  try { body = await request.json() }
  catch { return apiError('Invalid JSON', 400) }

  if (!body.account_id || !body.user_id || !body.metrics) {
    return apiError('Missing required fields: account_id, user_id, metrics', 422)
  }

  const today = new Date().toISOString().slice(0, 10)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('analytics_snapshots')
    .upsert(
      {
        account_id:       body.account_id,
        user_id:          body.user_id,
        snapshot_date:    today,
        followers_count:  body.metrics.followers_count,
        following_count:  body.metrics.following_count,
        unfollowers_delta: body.metrics.unfollowers_delta ?? 0,
        reel_views:       body.metrics.reel_views,
        reel_plays:       body.metrics.reel_plays ?? 0,
        watch_time_secs:  body.metrics.watch_time_secs ?? 0,
        saves:            body.metrics.saves ?? 0,
        shares:           body.metrics.shares ?? 0,
        comments:         body.metrics.comments ?? 0,
        likes:            body.metrics.likes ?? 0,
        profile_visits:   body.metrics.profile_visits ?? 0,
        reach:            body.metrics.reach ?? 0,
        impressions:      body.metrics.impressions ?? 0,
        conversion_rate:  body.metrics.conversion_rate ?? 0,
        raw_payload:      body.metrics.raw_payload ?? null,
      },
      { onConflict: 'account_id,snapshot_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[analytics/snapshot] upsert error:', error)
    return apiError('Failed to save snapshot', 500)
  }

  return apiSuccess(data, 200)
}

// GET /api/analytics/snapshot?account_id=...&days=30
// Returns the last N snapshots for an account (authenticated user must own it).
export async function GET(request: NextRequest) {
  // For GET, use the user's session (RLS enforced)
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const days      = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365)

  if (!accountId) return apiError('account_id is required', 400)

  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .gte('snapshot_date', from.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true })

  if (error) return apiError('Failed to fetch snapshots', 500)

  return apiSuccess(data)
}
