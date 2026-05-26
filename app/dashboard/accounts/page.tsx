// @ts-nocheck
'use client'
// app/dashboard/accounts/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users2, Plus, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import type { InstagramAccount } from '@/types'

const STATUS_ICON: Record<string, React.ReactNode> = {
  connected: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  pending:   <Clock       className="h-4 w-4 text-yellow-400" />,
  revoked:   <XCircle     className="h-4 w-4 text-red-400" />,
  failed:    <XCircle     className="h-4 w-4 text-red-400" />,
}

export default function AccountsPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<InstagramAccount[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
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

  return (
    <div className="space-y-6 animate-fade-in">
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
        <button className="btn-primary">
          <Plus className="h-4 w-4" /> Connect Account
        </button>
      </div>

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
              Connect your Instagram account to start tracking analytics,
              scheduling posts, and generating AI captions.
            </p>
          </div>
          <button className="btn-primary mt-2">
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
                  <p className="text-xs text-gray-500 capitalize">{acc.account_type}</p>
                </div>
                {STATUS_ICON[acc.verification_status] ?? STATUS_ICON.pending}
              </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}