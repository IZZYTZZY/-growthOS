// @ts-nocheck
// components/dashboard/ActiveCampaignsList.tsx
// Server component — receives campaigns from parent page.

import Link from 'next/link'
import { Megaphone, ArrowRight, Circle } from 'lucide-react'
import type { Campaign } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  draft:     'badge-gray',
  active:    'badge-green',
  paused:    'badge-yellow',
  completed: 'badge-blue',
  archived:  'badge-gray',
}

interface ActiveCampaignsListProps {
  campaigns: Campaign[]
}

export function ActiveCampaignsList({ campaigns }: ActiveCampaignsListProps) {
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-white">Active Campaigns</h2>
        <Link href="/dashboard/campaigns" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="h-10 w-10 rounded-2xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center mb-3">
            <Megaphone className="h-5 w-5 text-violet-400" />
          </div>
          <p className="text-sm text-gray-400">No active campaigns yet</p>
          <Link href="/dashboard/campaigns" className="btn-primary mt-4 text-xs">
            Create Campaign
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {campaigns.map(c => (
            <li key={c.id}>
              <Link
                href={`/dashboard/campaigns/${c.id}`}
                className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{c.campaign_name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.niche}</p>
                </div>
                <span className={STATUS_STYLES[c.status] ?? 'badge-gray'}>
                  {c.status}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

