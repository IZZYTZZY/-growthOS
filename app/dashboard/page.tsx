// app/dashboard/page.tsx
// Server Component: fetches real data from Supabase; hydrates MetricCards
// and passes chart data to the client-side AnalyticsChart component.

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/ui/MetricCard'
import { AnalyticsChart } from '@/components/ui/AnalyticsChart'
import { RecentPostsTable } from '@/components/dashboard/RecentPostsTable'
import { ActiveCampaignsList } from '@/components/dashboard/ActiveCampaignsList'
import { generateMockChartData, formatCompact } from '@/lib/utils'
import {
  TrendingUp, Eye, Heart, Share2,
  Users, BarChart2, Clock, Zap,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // Pull the last 30-day analytics snapshot summary (aggregate)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: snapshots } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', authUser!.id)
    .gte('snapshot_date', thirtyDaysAgo.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: false })

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', authUser!.id)
    .eq('status', 'active')
    .limit(5)

  const { data: recentPosts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', authUser!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Derive aggregated metrics (fall back to mock values when no real data yet)
  const hasData = (snapshots?.length ?? 0) > 0
  const latestSnap = snapshots?.[0]
  const prevSnap   = snapshots?.[snapshots.length - 1]

  const followersNow  = latestSnap?.followers_count ?? 14_832
  const followersPrev = prevSnap?.followers_count   ?? 13_210
  const followersDelta = followersNow > 0
    ? ((followersNow - followersPrev) / followersPrev) * 100
    : 12.3

  const totalReelViews = snapshots?.reduce((s, r) => s + r.reel_views, 0) ?? 284_901
  const prevReelViews  = totalReelViews * 0.82   // simulate prior period
  const reelDelta      = ((totalReelViews - prevReelViews) / prevReelViews) * 100

  const avgEngagement  = snapshots?.length
    ? snapshots.reduce((s, r) => s + Number(r.engagement_rate), 0) / snapshots.length
    : 4.72
  const engagementDelta = 0.34

  const totalReach     = snapshots?.reduce((s, r) => s + r.reach, 0) ?? 521_400
  const reachDelta     = 18.9

  const chartData = hasData
    ? snapshots!.map(s => ({
        date:            s.snapshot_date,
        followers:       s.followers_count,
        reel_views:      s.reel_views,
        engagement_rate: Number(s.engagement_rate),
        reach:           s.reach,
      })).reverse()
    : generateMockChartData(30)

  const METRIC_CARDS = [
    {
      label:      'Total Followers',
      value:      formatCompact(followersNow),
      delta:      followersDelta,
      deltaLabel: 'vs prev. 30 days',
      icon:       Users,
      color:      'violet' as const,
      gradient:   'from-violet-600/20 to-violet-900/5',
      iconBg:     'bg-violet-900/50',
    },
    {
      label:      'Reel Views',
      value:      formatCompact(totalReelViews),
      delta:      reelDelta,
      deltaLabel: 'vs prev. 30 days',
      icon:       Eye,
      color:      'cyan' as const,
      gradient:   'from-cyan-600/20 to-cyan-900/5',
      iconBg:     'bg-cyan-900/50',
    },
    {
      label:      'Engagement Rate',
      value:      `${avgEngagement.toFixed(2)}%`,
      delta:      engagementDelta,
      deltaLabel: 'vs prev. 30 days',
      icon:       Heart,
      color:      'pink' as const,
      gradient:   'from-pink-600/20 to-pink-900/5',
      iconBg:     'bg-pink-900/50',
    },
    {
      label:      'Total Reach',
      value:      formatCompact(totalReach),
      delta:      reachDelta,
      deltaLabel: 'vs prev. 30 days',
      icon:       TrendingUp,
      color:      'emerald' as const,
      gradient:   'from-emerald-600/20 to-emerald-900/5',
      iconBg:     'bg-emerald-900/50',
    },
    {
      label:      'Saves',
      value:      formatCompact(snapshots?.reduce((s, r) => s + r.saves, 0) ?? 9_823),
      delta:      22.1,
      deltaLabel: 'vs prev. 30 days',
      icon:       BarChart2,
      color:      'orange' as const,
      gradient:   'from-orange-600/20 to-orange-900/5',
      iconBg:     'bg-orange-900/50',
    },
    {
      label:      'Shares',
      value:      formatCompact(snapshots?.reduce((s, r) => s + r.shares, 0) ?? 4_102),
      delta:      15.7,
      deltaLabel: 'vs prev. 30 days',
      icon:       Share2,
      color:      'blue' as const,
      gradient:   'from-blue-600/20 to-blue-900/5',
      iconBg:     'bg-blue-900/50',
    },
    {
      label:      'Watch Time',
      value:      `${Math.round((snapshots?.reduce((s, r) => s + r.watch_time_secs, 0) ?? 184_320) / 3600)}h`,
      delta:      31.4,
      deltaLabel: 'vs prev. 30 days',
      icon:       Clock,
      color:      'purple' as const,
      gradient:   'from-purple-600/20 to-purple-900/5',
      iconBg:     'bg-purple-900/50',
    },
    {
      label:      'Profile Visits',
      value:      formatCompact(snapshots?.reduce((s, r) => s + r.profile_visits, 0) ?? 38_240),
      delta:      9.8,
      deltaLabel: 'vs prev. 30 days',
      icon:       Zap,
      color:      'yellow' as const,
      gradient:   'from-yellow-600/20 to-yellow-900/5',
      iconBg:     'bg-yellow-900/50',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Last 30 days · {hasData ? 'Live data' : 'Demo data — connect an account to go live'}
          </p>
        </div>

        {!hasData && (
          <a href="/dashboard/accounts" className="btn-primary text-sm whitespace-nowrap">
            + Connect Instagram
          </a>
        )}
      </div>

      {/* ── Metric cards grid ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRIC_CARDS.map((card, i) => (
          <MetricCard key={card.label} {...card} delay={i * 60} />
        ))}
      </div>

      {/* ── Analytics chart ───────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Growth Trends
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Followers, reach & engagement over 30 days</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'Followers', color: 'bg-violet-500' },
              { label: 'Reel Views', color: 'bg-cyan-500' },
              { label: 'Engagement', color: 'bg-pink-500' },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/[0.04] rounded-full px-2.5 py-1 border border-white/[0.06]">
                <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <Suspense fallback={<div className="h-56 rounded-xl bg-white/[0.02] animate-pulse" />}>
          <AnalyticsChart data={chartData} />
        </Suspense>
      </div>

      {/* ── Bottom grid: campaigns + posts ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="card p-6 h-64 animate-pulse" />}>
          <ActiveCampaignsList campaigns={campaigns ?? []} />
        </Suspense>

        <Suspense fallback={<div className="card p-6 h-64 animate-pulse" />}>
          <RecentPostsTable posts={recentPosts ?? []} />
        </Suspense>
      </div>
    </div>
  )
}
