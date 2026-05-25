'use client'
// app/dashboard/campaigns/page.tsx
// Full campaigns management page — list, create, filter, delete.

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Plus, Search, Filter, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { cn, isoToDisplay } from '@/lib/utils'
import type { Campaign } from '@/types'

const STATUS_OPTS = ['all', 'draft', 'active', 'paused', 'completed', 'archived'] as const
const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray', active: 'badge-green', paused: 'badge-yellow',
  completed: 'badge-blue', archived: 'badge-gray',
}

export default function CampaignsPage() {
  const supabase = createClient()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTS[number]>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating,   setCreating]  = useState(false)
  const [form, setForm] = useState({ campaign_name: '', niche: '', description: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search) params.set('niche', search)

    const res = await fetch(`/api/campaigns?${params}`)
    const json = await res.json()

    if (!json.success) setError(json.error ?? 'Failed to load campaigns')
    else setCampaigns(json.data?.campaigns ?? [])
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  const handleCreate = async () => {
    if (!form.campaign_name.trim() || !form.niche.trim()) {
      setFormError('Campaign name and niche are required.')
      return
    }
    setCreating(true)
    setFormError(null)

    const res = await fetch('/api/campaigns', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!json.success) {
      setFormError(json.error ?? 'Failed to create campaign')
    } else {
      setShowCreate(false)
      setForm({ campaign_name: '', niche: '', description: '' })
      loadCampaigns()
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' })
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  // Client-side name search filter
  const filtered = campaigns.filter(c =>
    c.campaign_name.toLowerCase().includes(search.toLowerCase()) ||
    c.niche.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or niche…"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all',
                statusFilter === s
                  ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30'
                  : 'bg-white/[0.03] text-gray-400 border border-white/[0.06] hover:bg-white/[0.07]'
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center">
              <Megaphone className="h-6 w-6 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">No campaigns found</p>
              <p className="text-sm text-gray-500 mt-1">
                {search ? 'Try a different search term' : 'Create your first campaign to get started'}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Campaign', 'Niche', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(c => (
                <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{c.campaign_name}</p>
                        {c.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{c.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">{c.niche}</td>
                  <td className="px-5 py-4">
                    <span className={STATUS_BADGE[c.status] ?? 'badge-gray'}>{c.status}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{isoToDisplay(c.created_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create campaign modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="font-display text-lg font-semibold text-white mb-5">New Campaign</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Campaign Name *</label>
                <input className="input" placeholder="e.g. Summer Fitness Push"
                  value={form.campaign_name}
                  onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Niche *</label>
                <input className="input" placeholder="e.g. fitness, food, travel, fashion"
                  value={form.niche}
                  onChange={e => setForm(p => ({ ...p, niche: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea className="input resize-none" rows={3} placeholder="What is this campaign about?"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
