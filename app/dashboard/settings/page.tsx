// @ts-nocheck
'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, User, CreditCard, Shield, Loader2, CheckCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    price: 'Free',
    priceDetail: 'forever',
    color: 'from-gray-600/20 to-gray-900/5',
    border: 'border-white/[0.06]',
    activeBorder: 'border-violet-500/40',
    activeBg: 'bg-violet-900/10',
    features: [
      '1 Instagram account',
      '3 campaigns',
      'AI caption generator',
      'Basic analytics',
      'Content planner',
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$29',
    priceDetail: '/month',
    color: 'from-violet-600/20 to-violet-900/5',
    border: 'border-violet-500/20',
    activeBorder: 'border-violet-500/60',
    activeBg: 'bg-violet-900/20',
    badge: 'Most Popular',
    features: [
      '5 Instagram accounts',
      '20 campaigns',
      'Advanced analytics',
      'Priority AI generation',
      'Hashtag groups manager',
      'Priority support',
    ],
  },
  {
    id: 'agency',
    label: 'Agency',
    price: '$99',
    priceDetail: '/month',
    color: 'from-fuchsia-600/20 to-fuchsia-900/5',
    border: 'border-fuchsia-500/20',
    activeBorder: 'border-fuchsia-500/60',
    activeBg: 'bg-fuchsia-900/20',
    features: [
      '50 Instagram accounts',
      'Unlimited campaigns',
      'Team management',
      'White-label dashboard',
      'API access',
      'Dedicated support',
    ],
  },
]

const TABS = [
  { id: 'profile',  label: 'Profile',  icon: User       },
  { id: 'billing',  label: 'Billing',  icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield     },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [profile,      setProfile]      = useState<any>(null)
  const [name,         setName]         = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<'profile' | 'billing' | 'security'>('profile')
  const [upgradingTo,  setUpgradingTo]  = useState<string | null>(null)
  const [planSuccess,  setPlanSuccess]  = useState<string | null>(null)

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

  const selectPlan = async (planId: string) => {
    if (planId === profile?.subscription_plan) return
    setUpgradingTo(planId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('users')
      .update({ subscription_plan: planId })
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
      setPlanSuccess(planId)
      setTimeout(() => setPlanSuccess(null), 3000)
    }
    setUpgradingTo(null)
  }

  const currentPlanIndex = PLANS.findIndex(p => p.id === profile?.subscription_plan)

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
          {/* ── Profile Tab ────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display text-base font-semibold text-white">Profile Information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold text-white uppercase">
                  {name?.[0] ?? profile?.email?.[0] ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{name || 'Your Name'}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                  <span className="inline-flex mt-1 badge bg-violet-900/50 text-violet-300 border border-violet-700/30 capitalize px-2 py-0.5 text-xs">
                    {profile?.subscription_plan ?? 'starter'} plan
                  </span>
                </div>
              </div>

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

              <button onClick={saveProfile} disabled={saving} className="btn-primary">
                {saving  ? <><Loader2    className="h-4 w-4 animate-spin" /> Saving…</>
                : saved  ? <><CheckCheck className="h-4 w-4" /> Saved!</>
                : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── Billing Tab ────────────────────────────── */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current plan banner */}
              <div className="card p-4 flex items-center gap-3 border-violet-500/20 bg-violet-900/10">
                <Sparkles className="h-5 w-5 text-violet-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    Current plan: <span className="text-violet-300 capitalize font-semibold">{profile?.subscription_plan ?? 'starter'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any plan below to switch instantly
                  </p>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLANS.map((plan, index) => {
                  const isCurrent  = profile?.subscription_plan === plan.id
                  const isUpgrade  = index > currentPlanIndex
                  const isDowngrade = index < currentPlanIndex
                  const isLoading  = upgradingTo === plan.id
                  const isSuccess  = planSuccess === plan.id

                  return (
                    <div key={plan.id}
                      className={cn(
                        'card p-5 flex flex-col gap-4 transition-all duration-300 border',
                        isCurrent ? [plan.activeBorder, plan.activeBg] : plan.border,
                        !isCurrent && 'hover:border-white/20 cursor-pointer'
                      )}
                      onClick={() => !isCurrent && !isLoading && selectPlan(plan.id)}>

                      {/* Plan header */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-display font-bold text-white text-lg">{plan.label}</p>
                          {plan.badge && !isCurrent && (
                            <span className="badge bg-violet-900/60 text-violet-300 border border-violet-700/40 text-[10px]">
                              {plan.badge}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="badge badge-green text-[10px]">Current</span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl font-bold text-violet-400">{plan.price}</span>
                          <span className="text-xs text-gray-500">{plan.priceDetail}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-1.5 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                            <CheckCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Action button */}
                      <button
                        onClick={e => { e.stopPropagation(); !isCurrent && selectPlan(plan.id) }}
                        disabled={isCurrent || isLoading}
                        className={cn(
                          'w-full rounded-xl py-2 text-sm font-semibold transition-all',
                          isCurrent
                            ? 'bg-white/[0.04] text-gray-500 cursor-default border border-white/[0.06]'
                            : isSuccess
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                            : isUpgrade
                            ? 'btn-primary justify-center'
                            : 'btn-secondary text-xs'
                        )}>
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Switching…
                          </span>
                        ) : isSuccess ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCheck className="h-3.5 w-3.5" /> Switched!
                          </span>
                        ) : isCurrent ? (
                          'Current Plan'
                        ) : isUpgrade ? (
                          `Upgrade to ${plan.label}`
                        ) : (
                          `Switch to ${plan.label}`
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-600 text-center">
                Plans switch instantly. Stripe billing integration coming soon for paid plans.
              </p>
            </div>
          )}

          {/* ── Security Tab ───────────────────────────── */}
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