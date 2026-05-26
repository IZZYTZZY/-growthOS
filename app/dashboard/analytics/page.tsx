// @ts-nocheck
// app/dashboard/analytics/page.tsx
import { createClient } from '@/lib/supabase/server'
import { AnalyticsChart } from '@/components/ui/AnalyticsChart'
import { generateMockChartData } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: snapshots } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', user!.id)
    .gte('snapshot_date', thirtyDaysAgo.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true })

  const hasData = (snapshots?.length ?? 0) > 0

  const chartData = hasData
    ? snapshots!.map(s => ({
        date: s.snapshot_date,
        followers: s.followers_count,
        reel_views: s.reel_views,
        engagement_rate: Number(s.engagement_rate),
        reach: s.reach,
      }))
    : generateMockChartData(30)

  const stats = [
    { label: 'Avg. Engagement Rate', value: hasData ? `${(snapshots!.reduce((s, r) => s + Number(r.engagement_rate), 0) / snapshots!.length).toFixed(2)}%` : '—' },
    { label: 'Total Impressions',    value: hasData ? snapshots!.reduce((s, r) => s + r.impressions, 0).toLocaleString() : '—' },
    { label: 'Total Saves',          value: hasData ? snapshots!.reduce((s, r) => s + r.saves, 0).toLocaleString() : '—' },
    { label: 'Total Profile Visits', value: hasData ? snapshots!.reduce((s, r) => s + r.profile_visits, 0).toLocaleString() : '—' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-violet-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Last 30 days · {hasData ? 'Live data' : 'Connect an Instagram account to see real data'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-2xl font-display font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-base font-semibold text-white mb-6">Growth Trends — 30 Days</h2>
        <AnalyticsChart data={chartData} />
      </div>

      {!hasData && (
        <div className="card p-8 flex flex-col items-center justify-center text-center">
          <BarChart3 className="h-10 w-10 text-violet-400 mb-3" />
          <p className="text-gray-300 font-medium">No analytics data yet</p>
          <p className="text-sm text-gray-500 mt-1">Connect an Instagram account and data will start appearing here</p>
          <a href="/dashboard/accounts" className="btn-primary mt-4">Connect Instagram</a>
        </div>
      )}
    </div>
  )
}