// @ts-nocheck
'use client'
// app/dashboard/accounts/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users2, Plus, CheckCircle, XCircle, Clock,
  Loader2, X, ExternalLink, Key, AtSign,
  Trash2, RefreshCw, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InstagramAccount } from '@/types'

const STATUS_ICON: Record<string, React.ReactNode> = {
  connected: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  pending:   <Clock       className="h-4 w-4 text-yellow-400" />,
  revoked:   <XCircle     className="h-4 w-4 text-red-400" />,
  failed:    <XCircle     className="h-4 w-4 text-red-400" />,
}

const STATUS_BADGE: Record<string, string> = {
  connected: 'badge-green',
  pending:   'badge-yellow',
  revoked:   'badge-red',
  failed:    'badge-red',
}

export default function AccountsPage() {
  const supabase = createClient()
  const [accounts,    setAccounts]    = useState<InstagramAccount[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [tab,         setTab]         = useState<'manual' | 'oauth'>('manual')
  const [saving,      setSaving]      = useState(false)
  const [formError,   setFormError]   = useState<string | null>(null)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [form, setForm] = useState({
    username:         '',
    display_name:     '',
    instagram_user_id:'',
    account_type:     'creator',
    followers_count:  '',
    following_count:  '',
    media_count:      '',
    biography:        '',
    website:          '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setAccounts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const saveManual = async () => {
    if (!form.username.trim())          { setFormError('Username is required'); return }
    if (!form.instagram_user_id.trim()) { setFormError('Instagram User ID is required'); return }
    setSaving(true)
    setFormError(null)

    const { data, error } = await supabase
      .from('instagram_accounts')
      .insert({
        user_id:            userId,
        instagram_user_id:  form.instagram_user_id.trim(),
        username:           form.username.trim().replace('@', ''),
        display_name:       form.display_name.trim() || form.username.trim(),
        account_type:       form.account_type,
        followers_count:    parseInt(form.followers_count) || 0,
        following_count:    parseInt(form.following_count) || 0,
        media_count:        parseInt(form.media_count) || 0,
        biography:          form.biography.trim() || null,
        website:            form.website.trim() || null,
        verification_status:'connected',
        is_verified:        true,
      })
      .select()
      .single()

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }

    setAccounts(prev => [data, ...prev])
    setShowModal(false)
    setForm({
      username: '', display_name: '', instagram_user_id: '',
      account_type: 'creator', followers_count: '', following_count: '',
      media_count: '', biography: '', website: '',
    })
    setSaving(false)
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('Remove this Instagram account? This will also remove its analytics data.')) return
    await supabase.from('instagram_accounts').delete().eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users2 className="h-6 w-6 text-violet-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Instagram Accounts</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Connect Account
        </button>
      </div>

      {/* Info banner */}
      <div className="card p-4 border-blue-700/30 bg-blue-900/10 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-300 font-medium">Instagram API Integration</p>
          <p className="text-xs text-blue-400/70 mt-0.5">
            Full OAuth requires a Meta Developer App. For now, add your account details manually to enable scheduling and analytics tracking.
            {' '}<a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">Set up Meta App →</a>
          </p>
        </div>
      </div>

      {/* Accounts grid */}
      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-16 w-16 rounded-3xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <p className="text-gray-200 font-semibold text-lg">No accounts connected</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Connect your Instagram account to start tracking analytics, scheduling posts, and generating AI captions.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-2">
            <Plus className="h-4 w-4" /> Connect Instagram Account
          </button>
          <p className="text-xs text-gray-600">Requires Instagram Business or Creator account</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc.id} className="card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {acc.profile_picture_url ? (
                  <img src={acc.profile_picture_url} alt={acc.username}
                    className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg">
                    {acc.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 truncate">@{acc.username}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 capitalize">{acc.account_type}</p>
                    <span className={cn('badge text-[10px]', STATUS_BADGE[acc.verification_status] ?? 'badge-gray')}>
                      {acc.verification_status}
                    </span>
                  </div>
                </div>
                {STATUS_ICON[acc.verification_status] ?? STATUS_ICON.pending}
              </div>

              {acc.biography && (
                <p className="text-xs text-gray-500 line-clamp-2">{acc.biography}</p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.05]">
                {[
                  { label: 'Followers', value: acc.followers_count.toLocaleString() },
                  { label: 'Following', value: acc.following_count.toLocaleString() },
                  { label: 'Posts',     value: acc.media_count.toLocaleString()     },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-semibold text-gray-200">{s.value}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button className="btn-secondary text-xs flex-1 justify-center">
                  <RefreshCw className="h-3 w-3" /> Sync
                </button>
                <button onClick={() => deleteAccount(acc.id)}
                  className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-900/20 border border-white/[0.06] transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Connect Account Modal ──────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="font-display text-lg font-semibold text-white">Connect Instagram Account</h2>
              <button onClick={() => { setShowModal(false); setFormError(null) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {[
                { id: 'manual', label: 'Manual Entry', icon: AtSign },
                { id: 'oauth',  label: 'OAuth (Meta App)', icon: Key },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                  className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                    tab === t.id
                      ? 'border-violet-500 text-violet-300'
                      : 'border-transparent text-gray-400 hover:text-gray-200')}>
                  <t.icon className="h-3.5 w-3.5" />{t.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'manual' ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Add your Instagram account details manually. You can find your User ID using tools like
                    {' '}<a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="text-violet-400 underline">Instagram</a> or
                    {' '}<a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="text-violet-400 underline">Graph API Explorer</a>.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Username *</label>
                      <input type="text" value={form.username}
                        onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                        placeholder="@yourusername" className="input text-sm" />
                    </div>
                    <div>
                      <label className="label">Display Name</label>
                      <input type="text" value={form.display_name}
                        onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                        placeholder="Your Name" className="input text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Instagram User ID *</label>
                      <input type="text" value={form.instagram_user_id}
                        onChange={e => setForm(p => ({ ...p, instagram_user_id: e.target.value }))}
                        placeholder="e.g. 17841400008460056" className="input text-sm" />
                    </div>
                    <div>
                      <label className="label">Account Type</label>
                      <select value={form.account_type}
                        onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))}
                        style={{ backgroundColor: '#1a1a26', color: '#f2f2fa', colorScheme: 'dark' }}
                        className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all">
                        <option value="creator"  style={{ backgroundColor: '#1a1a26' }}>Creator</option>
                        <option value="business" style={{ backgroundColor: '#1a1a26' }}>Business</option>
                        <option value="personal" style={{ backgroundColor: '#1a1a26' }}>Personal</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'followers_count', label: 'Followers' },
                      { key: 'following_count', label: 'Following' },
                      { key: 'media_count',     label: 'Posts' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="label">{f.label}</label>
                        <input type="number" value={form[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder="0" className="input text-sm" />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="label">Bio (optional)</label>
                    <textarea value={form.biography}
                      onChange={e => setForm(p => ({ ...p, biography: e.target.value }))}
                      placeholder="Your Instagram bio…" className="input resize-none text-sm" rows={2} />
                  </div>

                  <div>
                    <label className="label">Website (optional)</label>
                    <input type="url" value={form.website}
                      onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                      placeholder="https://yourwebsite.com" className="input text-sm" />
                  </div>

                  {formError && (
                    <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setShowModal(false); setFormError(null) }} className="btn-secondary flex-1">
                      Cancel
                    </button>
                    <button onClick={saveManual} disabled={saving} className="btn-primary flex-1 justify-center">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {saving ? 'Connecting…' : 'Connect Account'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-300">To enable full OAuth:</p>
                    {[
                      'Go to developers.facebook.com and create a Meta App',
                      'Add the Instagram product to your app',
                      'Get your App ID and App Secret approved',
                      'Add NEXT_PUBLIC_META_APP_ID to your Vercel env vars',
                      'The OAuth button below will then work automatically',
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="h-5 w-5 rounded-full bg-violet-900/50 border border-violet-700/30 text-violet-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-gray-400">{step}</p>
                      </div>
                    ))}
                  </div>

                  <button disabled
                    className="btn-primary w-full justify-center opacity-50 cursor-not-allowed">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Connect via Instagram OAuth
                    <span className="text-[10px] ml-1 opacity-60">(requires Meta App)</span>
                  </button>

                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer"
                    className="btn-secondary w-full justify-center text-sm">
                    <ExternalLink className="h-4 w-4" /> Open Meta Developer Console
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}