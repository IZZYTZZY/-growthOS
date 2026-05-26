// @ts-nocheck
// lib/utils.ts — Shared utility functions

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Tailwind class merge helper ──────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Standard API response builders ──────────────────────────
export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status })
}

// ── Number formatting ────────────────────────────────────────
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

// ── Date helpers ─────────────────────────────────────────────
export function isoToDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function daysFromNow(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Hashtag utilities ────────────────────────────────────────
export function flattenHashtags(groups: {
  broad: string[]; medium: string[]; niche: string[]
}): string {
  return [...groups.broad, ...groups.medium, ...groups.niche]
    .map(h => (h.startsWith('#') ? h : `#${h}`))
    .join(' ')
}

// ── Validation helpers ───────────────────────────────────────
export function isValidNiche(niche: string): boolean {
  return niche.trim().length >= 2 && niche.trim().length <= 80
}

export function isValidCampaignName(name: string): boolean {
  return name.trim().length >= 3 && name.trim().length <= 120
}

// ── Plan limits ──────────────────────────────────────────────
export const PLAN_LIMITS = {
  starter: { accounts: 1,  campaigns: 3,  scheduledPosts: 10 },
  pro:     { accounts: 5,  campaigns: 20, scheduledPosts: 100 },
  agency:  { accounts: 50, campaigns: -1, scheduledPosts: -1  },  // -1 = unlimited
} as const

export function planAllows(
  plan: 'starter' | 'pro' | 'agency',
  resource: 'accounts' | 'campaigns' | 'scheduledPosts',
  currentCount: number
): boolean {
  const limit = PLAN_LIMITS[plan][resource]
  return limit === -1 || currentCount < limit
}

// ── Generate mock chart data for dashboard ───────────────────
export function generateMockChartData(days = 30) {
  const data = []
  let followers = 12_400
  let reelViews = 82_000
  for (let i = days; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    followers  += Math.floor(Math.random() * 120 - 20)
    reelViews  += Math.floor(Math.random() * 5000 - 1000)
    data.push({
      date: d.toISOString().slice(0, 10),
      followers: Math.max(followers, 0),
      reel_views: Math.max(reelViews, 0),
      engagement_rate: parseFloat((Math.random() * 2 + 3).toFixed(2)),
      reach: Math.floor(reelViews * (Math.random() * 0.3 + 0.6)),
    })
  }
  return data
}

