// @ts-nocheck
// app/api/instagram/sync/route.ts
// POST /api/instagram/sync
// Pulls real data from the Instagram Graph API using a stored access token
// and updates the instagram_accounts row + creates an analytics snapshot.

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/utils'

export const runtime = 'nodejs'

const IG_API = 'https://graph.instagram.com'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { account_id, access_token } = body

    if (!account_id || !access_token) {
      return apiError('account_id and access_token are required', 422)
    }

    // 1. Verify the account belongs to this user
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (!account) return apiError('Account not found', 404)

    // 2. Fetch the IG user profile (followers, media count, etc.)
    const profileFields = 'user_id,username,account_type,media_count,followers_count,follows_count,biography,profile_picture_url,website'
    const profileRes = await fetch(
      `${IG_API}/me?fields=${profileFields}&access_token=${access_token}`
    )

    if (!profileRes.ok) {
      const err = await profileRes.json()
      console.error('[ig/sync] profile error:', err)
      return apiError(`Instagram API error: ${err.error?.message ?? 'Failed to fetch profile'}`, 502)
    }

    const profile = await profileRes.json()

    // 3. Update the account row with fresh data
    const { data: updatedAccount } = await supabase
      .from('instagram_accounts')
      .update({
        username:            profile.username ?? account.username,
        followers_count:     profile.followers_count ?? account.followers_count,
        following_count:     profile.follows_count ?? account.following_count,
        media_count:         profile.media_count ?? account.media_count,
        biography:           profile.biography ?? account.biography,
        website:             profile.website ?? account.website,
        profile_picture_url: profile.profile_picture_url ?? account.profile_picture_url,
        account_type:        (profile.account_type ?? account.account_type)?.toLowerCase(),
        instagram_user_id:   profile.user_id ?? account.instagram_user_id,
        verification_status: 'connected',
        is_verified:         true,
      })
      .eq('id', account_id)
      .select()
      .single()

    // 4. Fetch recent media to compute engagement metrics
    let totalLikes = 0, totalComments = 0, reelViews = 0, mediaPulled = 0
    try {
      const mediaRes = await fetch(
        `${IG_API}/me/media?fields=id,media_type,like_count,comments_count,media_product_type&limit=25&access_token=${access_token}`
      )
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json()
        const items = mediaData.data ?? []
        mediaPulled = items.length
        for (const m of items) {
          totalLikes    += m.like_count ?? 0
          totalComments += m.comments_count ?? 0
        }
      }
    } catch (e) {
      console.warn('[ig/sync] media fetch skipped:', e)
    }

    // 5. Create today's analytics snapshot
    const today = new Date().toISOString().slice(0, 10)
    const followers = profile.followers_count ?? account.followers_count ?? 0
    const engagementRate = followers > 0
      ? ((totalLikes + totalComments) / followers) * 100
      : 0

    await supabase.from('analytics_snapshots').upsert({
      account_id:       account_id,
      user_id:          user.id,
      snapshot_date:    today,
      followers_count:  followers,
      following_count:  profile.follows_count ?? 0,
      reel_views:       reelViews,
      likes:            totalLikes,
      comments:         totalComments,
      reach:            0,       // requires insights endpoint (business accounts)
      impressions:      0,
      saves:            0,
      shares:           0,
      profile_visits:   0,
      conversion_rate:  0,
      raw_payload:      profile,
    }, { onConflict: 'account_id,snapshot_date' })

    // 6. Notify the user
    await supabase.from('notifications').insert({
      user_id: user.id,
      title:   'Instagram Synced',
      body:    `@${profile.username} synced — ${followers.toLocaleString()} followers, ${mediaPulled} posts analyzed.`,
      type:    'success',
    })

    return apiSuccess({
      account: updatedAccount,
      synced: {
        followers,
        media_count: profile.media_count,
        total_likes: totalLikes,
        total_comments: totalComments,
        engagement_rate: engagementRate.toFixed(2),
      },
    })

  } catch (err) {
    console.error('[ig/sync] unexpected error:', err)
    return apiError('Internal server error', 500)
  }
}