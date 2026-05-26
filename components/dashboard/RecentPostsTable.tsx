// @ts-nocheck
// components/dashboard/RecentPostsTable.tsx
import Link from 'next/link'
import { CalendarDays, ArrowRight, FileVideo, Image as ImageIcon } from 'lucide-react'
import type { ScheduledPost } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  pending:    'badge-yellow',
  publishing: 'badge-blue',
  published:  'badge-green',
  failed:     'badge-red',
  cancelled:  'badge-gray',
}

const MEDIA_ICONS = {
  reel:      FileVideo,
  image:     ImageIcon,
  carousel:  ImageIcon,
  story:     ImageIcon,
}

export function RecentPostsTable({ posts }: { posts: ScheduledPost[] }) {
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-white">Scheduled Posts</h2>
        <Link href="/dashboard/planner" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="h-10 w-10 rounded-2xl bg-cyan-900/30 border border-cyan-700/20 flex items-center justify-center mb-3">
            <CalendarDays className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-sm text-gray-400">No posts scheduled</p>
          <Link href="/dashboard/planner" className="btn-secondary mt-4 text-xs">
            Schedule a Post
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map(post => {
            const MediaIcon = MEDIA_ICONS[post.media_type] ?? ImageIcon
            const scheduledDate = new Date(post.scheduled_time)
            return (
              <li key={post.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[0.04] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center flex-shrink-0">
                  <MediaIcon className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">
                    {post.caption.slice(0, 50)}{post.caption.length > 50 ? '…' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={STATUS_STYLES[post.status] ?? 'badge-gray'}>
                  {post.status}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

