// app/dashboard/layout.tsx
// Protected layout — redirected to /login by middleware if unauthenticated.
// Server Component: fetches user from Supabase on every render.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { TopBar } from '@/components/dashboard/TopBar'
import type { User } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  // Fetch the public.users profile row
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const user = profile as User | null

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090f]">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0 border-r border-white/[0.06] bg-[#0d0d15]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <span className="font-display text-lg font-700 text-white tracking-tight">GrowthOS</span>
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* Plan badge & user info */}
        <div className="mt-auto border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user?.full_name?.[0] ?? authUser.email?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">
                {user?.full_name ?? 'User'}
              </p>
              <span className="inline-flex items-center mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-violet-900/50 text-violet-300 border border-violet-700/30">
                {user?.subscription_plan ?? 'starter'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} authUser={authUser} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
