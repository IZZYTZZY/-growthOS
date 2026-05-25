'use client'
// components/dashboard/TopBar.tsx

import { Bell, Search, Menu } from 'lucide-react'
import type { User } from '@/types'
import type { User as AuthUser } from '@supabase/supabase-js'

interface TopBarProps {
  user: User | null
  authUser: AuthUser
}

export function TopBar({ user, authUser }: TopBarProps) {
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
          <input
            type="text"
            placeholder="Search campaigns, posts…"
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg
                       text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1
                       focus:ring-violet-500/30 focus:border-violet-500/30 transition-all"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-4">
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/[0.06] transition-all">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="h-7 w-px bg-white/10 mx-1" />

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[11px] font-bold text-white uppercase">
            {user?.full_name?.[0] ?? authUser.email?.[0] ?? '?'}
          </div>
          <span className="hidden sm:block text-sm text-gray-300">
            {user?.full_name ?? authUser.email?.split('@')[0] ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  )
}
