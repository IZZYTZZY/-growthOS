// @ts-nocheck
// app/api/campaigns/route.ts
// Edge-compatible route handler (Node.js serverless on Vercel free tier).
//
// POST /api/campaigns  — create a new campaign
// GET  /api/campaigns  — list authenticated user's campaigns (with filters)

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, isValidCampaignName, isValidNiche, planAllows } from '@/lib/utils'
import type { CreateCampaignRequest } from '@/types'

export const runtime = 'nodejs'    // use 'edge' if you remove pgcrypto calls

// ── POST /api/campaigns ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('Unauthorized', 401)
    }

    // 2. Parse & validate body
    let body: CreateCampaignRequest
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const { campaign_name, niche, description, account_id, target_reach, budget_usd, starts_at, ends_at } = body

    if (!campaign_name || !isValidCampaignName(campaign_name)) {
      return apiError('campaign_name must be between 3 and 120 characters', 422)
    }
    if (!niche || !isValidNiche(niche)) {
      return apiError('niche must be between 2 and 80 characters', 422)
    }
    if (starts_at && ends_at && new Date(starts_at) >= new Date(ends_at)) {
      return apiError('ends_at must be after starts_at', 422)
    }

    // 3. Enforce plan limits
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('id', user.id)
      .single()

    const plan = (profile?.subscription_plan ?? 'starter') as 'starter' | 'pro' | 'agency'

    const { count: existingCount } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (!planAllows(plan, 'campaigns', existingCount ?? 0)) {
      return apiError(
        `Campaign limit reached for your ${plan} plan. Please upgrade to create more campaigns.`,
        403
      )
    }

    // 4. Validate account ownership (if account_id provided)
    if (account_id) {
      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('id')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .single()

      if (!account) {
        return apiError('Instagram account not found or does not belong to you', 404)
      }
    }

    // 5. Insert campaign (RLS ensures user_id = auth.uid())
    const { data: campaign, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        user_id:       user.id,
        campaign_name: campaign_name.trim(),
        niche:         niche.trim(),
        description:   description?.trim() ?? null,
        account_id:    account_id ?? null,
        target_reach:  target_reach ?? 0,
        budget_usd:    budget_usd ?? 0,
        starts_at:     starts_at ?? null,
        ends_at:       ends_at ?? null,
        status:        'draft',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[campaigns/POST] insert error:', insertError)
      return apiError('Failed to create campaign. Please try again.', 500)
    }

    // 6. Return success
    return apiSuccess(campaign, 201)

  } catch (err) {
    console.error('[campaigns/POST] unexpected error:', err)
    return apiError('Internal server error', 500)
  }
}

// ── GET /api/campaigns ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return apiError('Unauthorized', 401)

    // Parse query filters
    const { searchParams } = new URL(request.url)
    const status    = searchParams.get('status')
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const offset    = parseInt(searchParams.get('offset') ?? '0', 10)
    const niche     = searchParams.get('niche')
    const accountId = searchParams.get('account_id')

    let query = supabase
      .from('campaigns')
      .select('*, instagram_accounts(username, profile_picture_url)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (niche)  query = query.ilike('niche', `%${niche}%`)
    if (accountId) query = query.eq('account_id', accountId)

    const { data: campaigns, error: listError, count } = await query

    if (listError) {
      console.error('[campaigns/GET] list error:', listError)
      return apiError('Failed to fetch campaigns', 500)
    }

    return apiSuccess({ campaigns, total: count ?? 0, limit, offset })

  } catch (err) {
    console.error('[campaigns/GET] unexpected error:', err)
    return apiError('Internal server error', 500)
  }
}

// ── DELETE /api/campaigns ────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return apiError('Missing campaign id', 400)

    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)   // RLS enforces this too, but defence in depth

    if (deleteError) return apiError('Failed to delete campaign', 500)

    return apiSuccess({ deleted: true })

  } catch (err) {
    console.error('[campaigns/DELETE] unexpected error:', err)
    return apiError('Internal server error', 500)
  }
}
