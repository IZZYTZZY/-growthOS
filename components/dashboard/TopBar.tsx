// @ts-nocheck
'use client'
// components/dashboard/TopBar.tsx
import { Bell, Search, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'
import type { User as AuthUser } from '@supabase/supabase-js'

interface TopBarProps {
  user: User | null
  authUser: AuthUser
}

export function TopBar({ user, authUser }: TopBarProps) {
  const router   = useRouter()
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('is_read', false)
      setUnreadCount(count ?? 0)
    }
    loadUnread()

    const channel = supabase
      .channel('notifications-topbar')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => loadUnread())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authUser.id])

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-white/[0.06] bg-[#09090f]/80 backdrop-blur-sm flex-shrink-0">
      {/* Mobile menu button */}
      <button className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/[0.06]">
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar */}
      <div className="hidden sm:flex flex-1 max-w-sm ml-4 md:ml-0">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input type="text" placeholder="Search campaigns, posts…"
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg
                       text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1
                       focus:ring-violet-500/30 focus:border-violet-500/30 transition-all" />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Bell — clicking goes to notifications page */}
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/[0.06] transition-all">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-7 w-px bg-white/10 mx-1" />

        {/* User avatar — clicking goes to settings */}
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[11px] font-bold text-white uppercase">
            {user?.full_name?.[0] ?? authUser.email?.[0] ?? '?'}
          </div>
          <span className="hidden sm:block text-sm text-gray-300">
            {user?.full_name ?? authUser.email?.split('@')[0] ?? 'User'}
          </span>
        </button>
      </div>
    </header>
  )
}