'use client'
import { TrendingUp, TrendingDown, Minus, Users, Eye, Heart,
         Share2, BarChart2, Clock, Zap } from 'lucide-react'
import { cn, formatPercent } from '@/lib/utils'

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Eye, Heart, Share2, BarChart2, Clock, Zap, TrendingUp,
}

const COLOR_MAP: Record<string, { ring: string; text: string }> = {
  violet:  { ring: 'ring-violet-500/20',  text: 'text-violet-400' },
  cyan:    { ring: 'ring-cyan-500/20',    text: 'text-cyan-400'   },
  pink:    { ring: 'ring-pink-500/20',    text: 'text-pink-400'   },
  emerald: { ring: 'ring-emerald-500/20', text: 'text-emerald-400'},
  orange:  { ring: 'ring-orange-500/20',  text: 'text-orange-400' },
  blue:    { ring: 'ring-blue-500/20',    text: 'text-blue-400'   },
  purple:  { ring: 'ring-purple-500/20',  text: 'text-purple-400' },
  yellow:  { ring: 'ring-yellow-500/20',  text: 'text-yellow-400' },
}

interface MetricCardProps {
  label: string
  value: string | number
  delta: number
  deltaLabel: string
  icon: string
  color: string
  gradient: string
  iconBg: string
  delay?: number
}

export function MetricCard({
  label, value, delta, deltaLabel, icon,
  color, gradient, iconBg, delay = 0,
}: MetricCardProps) {
  const { ring, text } = COLOR_MAP[color] ?? COLOR_MAP.violet
  const Icon       = ICON_MAP[icon] ?? Users
  const isPositive = delta > 0
  const isNeutral  = delta === 0
  const DeltaIcon  = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const deltaColor = isNeutral
    ? 'text-gray-400'
    : isPositive ? 'text-emerald-400' : 'text-red-400'

  return (
    <div
      className="card p-5 relative overflow-hidden group cursor-default hover:scale-[1.015] transition-transform duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', gradient)} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl ring-1', iconBg, ring)}>
          <Icon className={cn('h-4 w-4', text)} />
        </div>
      </div>

      <div className="relative">
        <p className="font-display text-2xl font-bold text-white tracking-tight leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>

      <div className="relative flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.05]">
        <DeltaIcon className={cn('h-3 w-3', deltaColor)} />
        <span className={cn('text-xs font-semibold', deltaColor)}>{formatPercent(delta)}</span>
        <span className="text-xs text-gray-600">{deltaLabel}</span>
      </div>
    </div>
  )
}