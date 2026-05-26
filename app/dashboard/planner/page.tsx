// @ts-nocheck
'use client'
// app/dashboard/planner/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, Plus, Clock, FileVideo, Image,
  Loader2, Sparkles, Trash2, X, Link as LinkIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduledPost, Campaign } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge-yellow', publishing: 'badge-blue',
  published: 'badge-green', failed: 'badge-red', cancelled: 'badge-gray',
}

const MEDIA_TYPES = ['reel', 'image', 'carousel', 'story']

const DEFAULT_FORM = {
  caption: '',
  content_url: '',
  media_type: 'reel',
  campaign_id: '',
  scheduled_time: '',
  hook: '',
  cta: '',
  hashtags: [] as string[],
  quality_score: null as number | null,
}

export default function ContentPlannerPage() {
  const supabase = createClient()
  const [posts,      setPosts]      = useState<ScheduledPost[]>([])
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const [showModal,  setShowModal]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiNiche,    setAiNiche]    = useState('')
  const [formError,  setFormError]  = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...DEFAULT_FORM })
  const [userId,     setUserId]     = useState<string | null>(null)
  const [accountId,  setAccountId]  = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: postsData }, { data: campData }, { data: accData }] = await Promise.all([
        supabase.from('scheduled_posts').select('*').eq('user_id', user.id).order('scheduled_time', { ascending: true }),
        supabase.from('campaigns').select('*').eq('user_id', user.id).in('status', ['draft', 'active']),
        supabase.from('instagram_accounts').select('id').eq('user_id', user.id).limit(1).single(),
      ])

      setPosts(postsData ?? [])
      setCampaigns(campData ?? [])
      if (accData) setAccountId(accData.id)
      setLoading(false)
    }
    load()
  }, [])

  const generateAI = async () => {
    if (!aiNiche.trim()) return
    setAiLoading(true)
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche: aiNiche, tone: 'casual' }),
    })
    const json = await res.json()
    if (json.success) {
      const data = json.data
      const allHashtags = [
        ...(data.hashtags.broad ?? []),
        ...(data.hashtags.medium ?? []),
        ...(data.hashtags.niche ?? []),
      ]
      const fullCaption = `${data.hook}\n\n${data.caption}\n\n${data.cta}\n\n${allHashtags.map(h => `#${h}`).join(' ')}`
      setForm(p => ({
        ...p,
        caption:       fullCaption,
        hook:          data.hook,
        cta:           data.cta,
        hashtags:      allHashtags,
        quality_score: data.qualityScore,
      }))
    }
    setAiLoading(false)
  }

  const savePost = async () => {
    if (!form.caption.trim())        { setFormError('Caption is required'); return }
    if (!form.content_url.trim())    { setFormError('Content URL is required'); return }
    if (!form.scheduled_time)        { setFormError('Scheduled time is required'); return }
    if (!accountId)                  { setFormError('Please connect an Instagram account first'); return }

    setSaving(true)
    setFormError(null)

    const { data, error } = await supabase.from('scheduled_posts').insert({
      user_id:        userId,
      account_id:     accountId,
      campaign_id:    form.campaign_id || null,
      caption:        form.caption,
      content_url:    form.content_url,
      media_type:     form.media_type,
      scheduled_time: new Date(form.scheduled_time).toISOString(),
      hook:           form.hook || null,
      cta:            form.cta || null,
      hashtags:       form.hashtags.length > 0 ? form.hashtags : null,
      quality_score:  form.quality_score,
      status:         'pending',
    }).select().single()

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }

    setPosts(prev => [...prev, data].sort((a, b) =>
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    ))
    setShowModal(false)
    setForm({ ...DEFAULT_FORM })
    setSaving(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm('Cancel and delete this post?')) return
    await supabase.from('scheduled_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Content Planner</h1>
            <p className="text-sm text-gray-400 mt-0.5">{posts.length} post{posts.length !== 1 ? 's' : ''} scheduled</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Schedule Post
        </button>
      </div>

      {/* No account warning */}
      {!loading && !accountId && (
        <div className="card p-4 border-yellow-700/30 bg-yellow-900/10 flex items-center gap-3">
          <span className="text-yellow-400 text-sm">⚠️ Connect an Instagram account first to schedule posts.</span>
          <a href="/dashboard/accounts" className="btn-secondary text-xs ml-auto">Connect Account</a>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {['all', 'pending', 'published', 'failed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all border',
              filter === s
                ? 'bg-violet-600/30 text-violet-200 border-violet-500/30'
                : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.07]')}>
            {s}
          </button>
        ))}
      </div>

      {/* Posts table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-12 w-12 rounded-2xl bg-cyan-900/30 border border-cyan-700/20 flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">No posts scheduled</p>
              <p className="text-sm text-gray-500 mt-1">Click "Schedule Post" to get started</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Schedule Post
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Content', 'Type', 'Campaign', 'Scheduled', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(post => (
                <tr key={post.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-200 truncate max-w-[200px]">{post.caption.slice(0, 50)}…</p>
                    {post.hook && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{post.hook}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 capitalize">
                      {post.media_type === 'reel' ? <FileVideo className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                      {post.media_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {post.campaign_id
                      ? campaigns.find(c => c.id === post.campaign_id)?.campaign_name ?? '—'
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(post.scheduled_time).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={STATUS_STYLES[post.status] ?? 'badge-gray'}>{post.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    {post.status === 'pending' && (
                      <button onClick={() => deletePost(post.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Schedule Post Modal ────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="font-display text-lg font-semibold text-white">Schedule Post</h2>
              <button onClick={() => { setShowModal(false); setForm({ ...DEFAULT_FORM }); setFormError(null) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* AI Generator strip */}
              <div className="rounded-xl border border-violet-500/20 bg-violet-900/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-300">Generate Caption with AI</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={aiNiche}
                    onChange={e => setAiNiche(e.target.value)}
                    placeholder="Enter your niche (e.g. fitness, food, travel)"
                    className="input flex-1 text-sm"
                    onKeyDown={e => e.key === 'Enter' && generateAI()}
                  />
                  <button onClick={generateAI} disabled={aiLoading || !aiNiche.trim()}
                    className="btn-primary text-xs whitespace-nowrap">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiLoading ? 'Generating…' : 'Generate'}
                  </button>
                </div>
                {form.quality_score && (
                  <p className="text-xs text-violet-400 mt-2">
                    ✨ AI caption generated — Quality Score: {form.quality_score.toFixed(1)}/10
                  </p>
                )}
              </div>

              {/* Content URL */}
              <div>
                <label className="label">Content URL *</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <input type="url" value={form.content_url}
                    onChange={e => setForm(p => ({ ...p, content_url: e.target.value }))}
                    placeholder="https://... (link to your Reel or image)"
                    className="input pl-9 text-sm" />
                </div>
                <p className="text-xs text-gray-600 mt-1">Paste a direct link to your video or image file</p>
              </div>

              {/* Caption */}
              <div>
                <label className="label">Caption *</label>
                <textarea value={form.caption}
                  onChange={e => setForm(p => ({ ...p, caption: e.target.value }))}
                  placeholder="Write your caption here, or generate one with AI above…"
                  className="input resize-none text-sm" rows={5} />
              </div>

              {/* Media type + Campaign */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Media Type</label>
                  <select value={form.media_type}
                    onChange={e => setForm(p => ({ ...p, media_type: e.target.value }))}
                    style={{ backgroundColor: '#1a1a26', color: '#f2f2fa' }}
                    className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all">
                    {MEDIA_TYPES.map(t => (
                      <option key={t} value={t} style={{ backgroundColor: '#1a1a26' }} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Link to Campaign</label>
                  <select value={form.campaign_id}
                    onChange={e => setForm(p => ({ ...p, campaign_id: e.target.value }))}
                    style={{ backgroundColor: '#1a1a26', color: '#f2f2fa' }}
                    className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all">
                    <option value="" style={{ backgroundColor: '#1a1a26' }}>No campaign</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: '#1a1a26' }}>{c.campaign_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scheduled time */}
              <div>
                <label className="label">Schedule Date & Time *</label>
                <input type="datetime-local" value={form.scheduled_time}
                  onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{ backgroundColor: '#1a1a26', color: '#f2f2fa', colorScheme: 'dark' }}
                  className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowModal(false); setForm({ ...DEFAULT_FORM }); setFormError(null) }}
                  className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={savePost} disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Schedule Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}