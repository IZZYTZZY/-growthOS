// @ts-nocheck
'use client'
// app/dashboard/notifications/page.tsx
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_STYLES = {
  info:    { icon: Info,          bg: 'bg-blue-900/30',    border: 'border-blue-700/20',    text: 'text-blue-400'    },
  success: { icon: CheckCircle,   bg: 'bg-emerald-900/30', border: 'border-emerald-700/20', text: 'text-emerald-400' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-900/30',  border: 'border-yellow-700/20',  text: 'text-yellow-400'  },
  error:   { icon: XCircle,       bg: 'bg-red-900/30',     border: 'border-red-700/20',     text: 'text-red-400'     },
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifications(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-violet-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-gray-400 mt-0.5">{unreadCount} unread</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-xs">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="card flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center">
              <Bell className="h-6 w-6 text-violet-400" />
            </div>
            <p className="text-gray-300 font-medium">All caught up!</p>
            <p className="text-sm text-gray-500">
              No notifications yet — they&apos;ll appear here as you use the platform.
            </p>
          </div>
        ) : (
          notifications.map(n => {
            const style = TYPE_STYLES[n.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.info
            const Icon  = style.icon
            return (
              <div key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={cn(
                  'card p-4 flex items-start gap-3 transition-all cursor-pointer',
                  !n.is_read && 'border-white/10 bg-white/[0.04]',
                  n.is_read  && 'opacity-60'
                )}>
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border', style.bg, style.border)}>
                  <Icon className={cn('h-4 w-4', style.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-200">{n.title}</p>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-violet-500 flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}