// @ts-nocheck
'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, User, CreditCard, Shield, Loader2, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id: 'starter', label: 'Starter', price: 'Free',
    features: ['1 Instagram account', '3 campaigns', 'AI captions', 'Basic analytics'],
  },
  {
    id: 'pro', label: 'Pro', price: '$29/mo',
    features: ['5 Instagram accounts', '20 campaigns', 'Advanced analytics', 'Priority support'],
  },
  {
    id: 'agency', label: 'Agency', price: '$99/mo',
    features: ['50 Instagram accounts', 'Unlimited campaigns', 'Team management', 'White-label', 'API access'],
  },
]

const TABS = [
  { id: 'profile',  label: 'Profile',  icon: User       },
  { id: 'billing',  label: 'Billing',  icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield     },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [profile,   setProfile]   = useState<{ full_name: string; email: string; subscription_plan: string } | null>(null)
  const [name,      setName]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'security'>('profile')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) { setProfile(data); setName(data.full_name ?? '') }
      setLoading(false)
    }
    load()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('users').update({ full_name: name }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, full_name: name } : prev)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-violet-400" />
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === t.id
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display text-base font-semibold text-white">Profile Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    className="input" placeholder="Your name" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={profile?.email ?? ''} disabled
                    className="input opacity-50 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="label">Current Plan</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge bg-violet-900/50 text-violet-300 border border-violet-700/30 capitalize px-3 py-1 text-sm">
                    {profile?.subscription_plan ?? 'starter'}
                  </span>
                  <span className="text-xs text-gray-500">· Upgrade in Billing tab for more features</span>
                </div>
              </div>
              <button onClick={saveProfile} disabled={saving} className="btn-primary">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : saved
                  ? <><CheckCheck className="h-4 w-4" /> Saved!</>
                  : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Choose the plan that fits your needs.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLANS.map(plan => (
                  <div key={plan.id}
                    className={cn(
                      'card p-5 flex flex-col gap-4 transition-all',
                      profile?.subscription_plan === plan.id && 'border-violet-500/40 bg-violet-900/10'
                    )}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-display font-semibold text-white">{plan.label}</p>
                        {profile?.subscription_plan === plan.id && (
                          <span className="badge badge-green text-[10px]">Current</span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-violet-400">{plan.price}</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                          <CheckCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {profile?.subscription_plan !== plan.id && (
                      <button className="btn-primary text-xs justify-center">
                        Upgrade to {plan.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display text-base font-semibold text-white">Security</h2>
              <div>
                <label className="label">New Password</label>
                <input type="password" className="input" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" className="input" placeholder="Repeat password" />
              </div>
              <button className="btn-primary">Update Password</button>
              <div className="pt-4 border-t border-white/[0.06]">
                <p className="text-sm font-medium text-red-400 mb-3">Danger Zone</p>
                <button className="btn-secondary text-xs text-red-400 border-red-700/30 hover:bg-red-900/20">
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}