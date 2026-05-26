'use client'
// app/dashboard/planner/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Plus, Clock, FileVideo, Image, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduledPost } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  pending:    'badge-yellow',
  publishing: 'badge-blue',
  published:  'badge-green',
  failed:     'badge-red',
  cancelled:  'badge-gray',
}

export default function ContentPlannerPage() {
  const supabase = createClient()
  const [posts,   setPosts]   = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_time', { ascending: true })
      setPosts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Content Planner</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {posts.length} post{posts.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" /> Schedule Post
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {['all', 'pending', 'published', 'failed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all border',
              filter === s
                ? 'bg-violet-600/30 text-violet-200 border-violet-500/30'
                : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.07]'
            )}>
            {s}
          </button>
        ))}
      </div>

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
              <p className="text-sm text-gray-500 mt-1">Schedule your first post to get started</p>
            </div>
            <button className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Schedule Post
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Content', 'Type', 'Scheduled', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(post => (
                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-200 truncate max-w-[260px]">
                      {post.caption.slice(0, 60)}…
                    </p>
                    {post.hook && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[260px]">{post.hook}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      {post.media_type === 'reel'
                        ? <FileVideo className="h-3.5 w-3.5" />
                        : <Image className="h-3.5 w-3.5" />}
                      {post.media_type}
                    </span>
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
                    <span className={STATUS_STYLES[post.status] ?? 'badge-gray'}>
                      {post.status}
                    </span>
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