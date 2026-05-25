'use client'
// components/dashboard/SidebarNav.tsx
// Client component so we can read the current pathname for active states.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Settings,
  BarChart3,
  Users2,
  Sparkles,
  Bell,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    section: 'Main',
    items: [
      { href: '/dashboard',           label: 'Overview',         icon: LayoutDashboard },
      { href: '/dashboard/campaigns', label: 'Campaigns',        icon: Megaphone },
      { href: '/dashboard/planner',   label: 'Content Planner',  icon: CalendarDays },
      { href: '/dashboard/analytics', label: 'Analytics',        icon: BarChart3 },
    ],
  },
  {
    section: 'Tools',
    items: [
      { href: '/dashboard/ai',          label: 'AI Generator',   icon: Sparkles },
      { href: '/dashboard/accounts',    label: 'IG Accounts',    icon: Users2 },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {NAV_ITEMS.map((section) => (
        <div key={section.section}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            {section.section}
          </p>
          <ul className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive(href)
                      ? 'text-white bg-gradient-to-r from-violet-600/25 to-fuchsia-600/10 border border-violet-500/20 shadow-sm shadow-violet-900/20'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.05]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive(href) ? 'text-violet-400' : 'text-gray-500'
                    )}
                  />
                  {label}
                  {label === 'Notifications' && (
                    <span className="ml-auto h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                      3
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Sign out */}
      <div className="pt-2 border-t border-white/[0.05]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                     text-gray-500 hover:text-red-400 hover:bg-red-900/10 transition-all duration-200"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </nav>
  )
}
