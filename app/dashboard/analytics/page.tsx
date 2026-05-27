// @ts-nocheck
// app/dashboard/analytics/page.tsx
import { createClient } from '@/lib/supabase/server'
import { AnalyticsChart } from '@/components/ui/AnalyticsChart'
import { BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Get connected account
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('verification_status', 'connected')
    .limit(1)
    .single()

  // 2. Get snapshots ONLY for their account
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: snapshots } = account
    ? await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('account_id', account.id)
        .eq('user_id', user.id)
        .gte('snapshot_date', thirtyDaysAgo.toISOString().slice(0, 10))
        .order('snapshot_date', { ascending: true })
    : { data: [] }

  const hasAccount = !!account
  const hasData    = (snapshots?.length ?? 0) > 0

  // 3. Real stats only — no fallbacks
  const stats = [
    {
      label: 'Avg. Engagement Rate',
      value: hasData
        ? `${(snapshots.reduce((s, r) => s + Number(r.engagement_rate ?? 0), 0) / snapshots.length).toFixed(2)}%`
        : '—',
    },
    {
      label: 'Total Impressions',
      value: hasData
        ? snapshots.reduce((s, r) => s + (r.impressions ?? 0), 0).toLocaleString()
        : '—',
    },
    {
      label: 'Total Saves',
      value: hasData
        ? snapshots.reduce((s, r) => s + (r.saves ?? 0), 0).toLocaleString()
        : '—',
    },
    {
      label: 'Total Profile Visits',
      value: hasData
        ? snapshots.reduce((s, r) => s + (r.profile_visits ?? 0), 0).toLocaleString()
        : '—',
    },
  ]

  // 4. Chart data from real snapshots only
  const chartData = hasData
    ? snapshots.map(s => ({
        date:            s.snapshot_date,
        followers:       s.followers_count ?? 0,
        reel_views:      s.reel_views ?? 0,
        engagement_rate: Number(s.engagement_rate ?? 0),
        reach:           s.reach ?? 0,
      }))
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-violet-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {!hasAccount
              ? 'Connect an Instagram account to see your analytics'
              : hasData
              ? `Live data · @${account.username} · Last 30 days`
              : `@${account.username} connected · Waiting for first sync`}
          </p>
        </div>
      </div>

      {/* No account state */}
      {!hasAccount && (
        <div className="card p-10 flex flex-col items-center justify-center text-center gap-4 border-dashed">
          <BarChart3 className="h-10 w-10 text-violet-400" />
          <div>
            <p className="text-gray-200 font-semibold">No Instagram account connected</p>
            <p className="text-sm text-gray-500 mt-1">Connect your account to start tracking real analytics</p>
          </div>
          <a href="/dashboard/accounts" className="btn-primary">+ Connect Instagram</a>
        </div>
      )}

      {/* Stats cards — real data only */}
      {hasAccount && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-5">
              <p className="text-2xl font-display font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart — real data only */}
      {hasAccount && (
        <div className="card p-6">
          <h2 className="font-display text-base font-semibold text-white mb-6">
            Growth Trends — 30 Days
          </h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 border border-dashed border-white/[0.06] rounded-xl">
              <BarChart3 className="h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">
                Analytics data will appear here once your account syncs
              </p>
              <p className="text-xs text-gray-600">
                Data syncs daily via the Instagram Graph API
              </p>
            </div>
          ) : (
            <AnalyticsChart data={chartData} />
          )}
        </div>
      )}
    </div>
  )
}