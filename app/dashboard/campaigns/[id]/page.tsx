// @ts-nocheck
'use client'
// app/dashboard/campaigns/[id]/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Megaphone, Calendar, Target, DollarSign,
  Edit2, Trash2, Play, Pause, CheckCheck, Archive,
  FileVideo, Clock, Loader2, Plus, BarChart2
} from 'lucide-react'
import { cn, isoToDisplay, formatCompact } from '@/lib/utils'
import type { Campaign, ScheduledPost } from '@/types'

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any; color: string }> = {
  draft:     { next: 'active',    label: 'Activate',  icon: Play,    color: 'btn-primary' },
  active:    { next: 'paused',    label: 'Pause',     icon: Pause,   color: 'btn-secondary' },
  paused:    { next: 'active',    label: 'Resume',    icon: Play,    color: 'btn-primary' },
  completed: { next: 'archived',  label: 'Archive',   icon: Archive, color: 'btn-secondary' },
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray', active: 'badge-green',
  paused: 'badge-yellow', completed: 'badge-blue', archived: 'badge-gray',
}

const POST_STATUS_STYLES: Record<string, string> = {
  pending: 'badge-yellow', publishing: 'badge-blue',
  published: 'badge-green', failed: 'badge-red', cancelled: 'badge-gray',
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router   = useRouter()

  const [campaign,  setCampaign]  = useState<Campaign | null>(null)
  const [posts,     setPosts]     = useState<ScheduledPost[]>([])
  const [loading,   setLoading]   = useState(true)
  const [updating,  setUpdating]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [editForm,  setEditForm]  = useState({ campaign_name: '', niche: '', description: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: camp } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (!camp) { router.push('/dashboard/campaigns'); return }

      setCampaign(camp)
      setEditForm({ campaign_name: camp.campaign_name, niche: camp.niche, description: camp.description ?? '' })

      const { data: campPosts } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('campaign_id', params.id)
        .order('scheduled_time', { ascending: true })

      setPosts(campPosts ?? [])
      setLoading(false)
    }
    load()
  }, [params.id])

  const updateStatus = async (newStatus: string) => {
    if (!campaign) return
    setUpdating(true)
    const { data } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campaign.id)
      .select()
      .single()
    if (data) setCampaign(data)
    setUpdating(false)
  }

  const saveEdit = async () => {
    if (!campaign) return
    setUpdating(true)
    const { data } = await supabase
      .from('campaigns')
      .update({
        campaign_name: editForm.campaign_name,
        niche:         editForm.niche,
        description:   editForm.description,
      })
      .eq('id', campaign.id)
      .select()
      .single()
    if (data) setCampaign(data)
    setEditing(false)
    setUpdating(false)
  }

  const deleteCampaign = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await supabase.from('campaigns').delete().eq('id', params.id)
    router.push('/dashboard/campaigns')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
    </div>
  )

  if (!campaign) return null

  const statusAction = STATUS_FLOW[campaign.status]
  const publishedPosts = posts.filter(p => p.status === 'published').length
  const pendingPosts   = posts.filter(p => p.status === 'pending').length
  const totalReach     = posts.reduce((s, p) => s + (p.quality_score ?? 0), 0)

  const stats = [
    { label: 'Total Posts',      value: posts.length,     icon: FileVideo,  color: 'text-violet-400' },
    { label: 'Published',        value: publishedPosts,   icon: CheckCheck, color: 'text-emerald-400' },
    { label: 'Pending',          value: pendingPosts,     icon: Clock,      color: 'text-yellow-400' },
    { label: 'Avg Quality Score',value: posts.length > 0 ? (posts.reduce((s, p) => s + (p.quality_score ?? 0), 0) / posts.length).toFixed(1) : '—', icon: BarChart2, color: 'text-cyan-400' },
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back button */}
      <Link href="/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Campaigns
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Megaphone className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              {editing ? (
                <div className="space-y-3">
                  <input value={editForm.campaign_name}
                    onChange={e => setEditForm(p => ({ ...p, campaign_name: e.target.value }))}
                    className="input text-lg font-bold" />
                  <input value={editForm.niche}
                    onChange={e => setEditForm(p => ({ ...p, niche: e.target.value }))}
                    className="input text-sm" placeholder="Niche" />
                  <textarea value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    className="input resize-none text-sm" rows={2} placeholder="Description" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={updating} className="btn-primary text-xs">
                      {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="font-display text-xl font-bold text-white">{campaign.campaign_name}</h1>
                    <span className={STATUS_BADGE[campaign.status] ?? 'badge-gray'}>{campaign.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">{campaign.niche}</p>
                  {campaign.description && (
                    <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!editing && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setEditing(true)}
                className="btn-secondary text-xs">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              {statusAction && (
                <button onClick={() => updateStatus(statusAction.next)}
                  disabled={updating}
                  className={cn(statusAction.color, 'text-xs')}>
                  {updating
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <statusAction.icon className="h-3.5 w-3.5" />}
                  {statusAction.label}
                </button>
              )}
              <button onClick={deleteCampaign}
                className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-900/20 border border-white/[0.06] transition-all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Campaign meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/[0.06]">
          {[
            { label: 'Target Reach',  value: campaign.target_reach > 0 ? formatCompact(campaign.target_reach) : '—',  icon: Target },
            { label: 'Budget',        value: campaign.budget_usd > 0 ? `$${campaign.budget_usd}` : 'Free',              icon: DollarSign },
            { label: 'Start Date',    value: campaign.starts_at ? isoToDisplay(campaign.starts_at) : '—',               icon: Calendar },
            { label: 'End Date',      value: campaign.ends_at   ? isoToDisplay(campaign.ends_at)   : '—',               icon: Calendar },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <item.icon className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-medium text-gray-200">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
              <s.icon className={cn('h-4 w-4', s.color)} />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Posts table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="font-display text-base font-semibold text-white">Campaign Posts</h2>
          <Link href="/dashboard/planner" className="btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" /> Schedule Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center">
              <FileVideo className="h-5 w-5 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">No posts yet</p>
              <p className="text-sm text-gray-500 mt-1">Schedule posts and link them to this campaign</p>
            </div>
            <Link href="/dashboard/planner" className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Schedule First Post
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Content', 'Type', 'Scheduled', 'Status', 'Quality'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-200 truncate max-w-[220px]">{post.caption.slice(0, 50)}…</p>
                    {post.hook && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{post.hook}</p>}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 capitalize">{post.media_type}</td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {new Date(post.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-4">
                    <span className={POST_STATUS_STYLES[post.status] ?? 'badge-gray'}>{post.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    {post.quality_score
                      ? <span className="text-sm font-medium text-yellow-400">{post.quality_score.toFixed(1)}/10</span>
                      : <span className="text-sm text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}