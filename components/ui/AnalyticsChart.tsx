// @ts-nocheck
'use client'
// components/ui/AnalyticsChart.tsx
// Pure SVG chart — no recharts/chart.js dependency needed for the free tier.
// Renders followers, reel_views, and engagement_rate as layered bars + line.

import { useState, useMemo } from 'react'
import type { ChartDataPoint } from '@/types'

interface AnalyticsChartProps {
  data: ChartDataPoint[]
}

type Metric = 'followers' | 'reel_views' | 'engagement_rate'

const METRICS: { key: Metric; label: string; color: string; fill: string }[] = [
  { key: 'followers',       label: 'Followers',   color: '#8b5cf6', fill: 'rgba(139,92,246,0.15)' },
  { key: 'reel_views',      label: 'Reel Views',  color: '#06b6d4', fill: 'rgba(6,182,212,0.12)' },
  { key: 'engagement_rate', label: 'Engagement',  color: '#ec4899', fill: 'rgba(236,72,153,0.12)' },
]

const W = 800
const H = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 52 }

function normalise(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values.map(v => (v - min) / range)
}

function toPath(xs: number[], ys: number[]): string {
  return xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(' ')
}

function toArea(xs: number[], ys: number[], bottom: number): string {
  const line = toPath(xs, ys)
  return `${line} L${xs[xs.length - 1].toFixed(1)},${bottom} L${xs[0].toFixed(1)},${bottom} Z`
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<Metric>>(
    new Set(['followers', 'reel_views'])
  )
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; point: ChartDataPoint; index: number
  } | null>(null)

  const chartW = W - PADDING.left - PADDING.right
  const chartH = H - PADDING.top - PADDING.bottom

  const sliceData = data.length > 30 ? data.slice(-30) : data

  const xs = useMemo(
    () => sliceData.map((_, i) => PADDING.left + (i / (sliceData.length - 1 || 1)) * chartW),
    [sliceData, chartW]
  )

  const metricPaths = useMemo(() =>
    METRICS.map(m => {
      const values = sliceData.map(d => d[m.key] as number)
      const norm   = normalise(values)
      const ys     = norm.map(n => PADDING.top + chartH * (1 - n))
      return { ...m, ys, line: toPath(xs, ys), area: toArea(xs, ys, PADDING.top + chartH) }
    }),
    [sliceData, xs, chartH]
  )

  // Y-axis labels (use followers scale as primary)
  const followerValues = sliceData.map(d => d.followers)
  const fMin = Math.min(...followerValues)
  const fMax = Math.max(...followerValues)
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PADDING.top + chartH * (1 - t),
    label: ((fMin + (fMax - fMin) * t) / 1000).toFixed(1) + 'K',
  }))

  // X-axis labels (show ~6 evenly-spaced dates)
  const xLabelIndices = [0, Math.floor(sliceData.length / 5), Math.floor(2 * sliceData.length / 5),
    Math.floor(3 * sliceData.length / 5), Math.floor(4 * sliceData.length / 5), sliceData.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i)

  const toggleMetric = (key: Metric) => {
    setActiveMetrics(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX  = ((e.clientX - rect.left) / rect.width) * W
    const relX  = svgX - PADDING.left
    const idx   = Math.round((relX / chartW) * (sliceData.length - 1))
    if (idx < 0 || idx >= sliceData.length) { setTooltip(null); return }
    setTooltip({ x: xs[idx], y: 80, point: sliceData[idx], index: idx })
  }

  return (
    <div className="space-y-4">
      {/* Legend toggles */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border transition-all"
            style={{
              borderColor: activeMetrics.has(m.key) ? m.color + '60' : 'rgba(255,255,255,0.08)',
              background:  activeMetrics.has(m.key) ? m.color + '18' : 'transparent',
              color:       activeMetrics.has(m.key) ? m.color : '#6b7280',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* SVG chart */}
      <div className="relative rounded-xl overflow-hidden bg-white/[0.01] border border-white/[0.05]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            {metricPaths.map(m => (
              <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={m.color} stopOpacity="0.01" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {yLabels.map(({ y }) => (
            <line key={y} x1={PADDING.left} y1={y} x2={W - PADDING.right} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}

          {/* Y-axis labels */}
          {yLabels.map(({ y, label }) => (
            <text key={label} x={PADDING.left - 8} y={y + 4}
              textAnchor="end" fontSize="10" fill="#4f4f6a">{label}</text>
          ))}

          {/* X-axis labels */}
          {xLabelIndices.map(i => (
            <text key={i} x={xs[i]} y={H - 6}
              textAnchor="middle" fontSize="10" fill="#4f4f6a">
              {sliceData[i]?.date.slice(5) ?? ''}
            </text>
          ))}

          {/* Tooltip crosshair */}
          {tooltip && (
            <line x1={tooltip.x} y1={PADDING.top} x2={tooltip.x} y2={PADDING.top + chartH}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,3" />
          )}

          {/* Area fills */}
          {metricPaths.filter(m => activeMetrics.has(m.key)).map(m => (
            <path key={`area-${m.key}`} d={m.area}
              fill={`url(#grad-${m.key})`} className="chart-bar" />
          ))}

          {/* Lines */}
          {metricPaths.filter(m => activeMetrics.has(m.key)).map(m => (
            <path key={`line-${m.key}`} d={m.line}
              fill="none" stroke={m.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="chart-bar" />
          ))}

          {/* Hover dots */}
          {tooltip && metricPaths
            .filter(m => activeMetrics.has(m.key))
            .map(m => (
              <circle key={`dot-${m.key}`}
                cx={xs[tooltip.index]} cy={m.ys[tooltip.index]}
                r="4" fill={m.color} stroke="#09090f" strokeWidth="2" />
            ))}
        </svg>

        {/* Tooltip box */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 card px-3 py-2 text-xs min-w-[140px]"
            style={{
              left: `clamp(8px, ${(tooltip.x / W) * 100}%, calc(100% - 160px))`,
              top: '12px',
            }}
          >
            <p className="font-semibold text-gray-300 mb-1">{tooltip.point.date}</p>
            {METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
              <div key={m.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1" style={{ color: m.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </span>
                <span className="text-gray-200 font-medium tabular-nums">
                  {m.key === 'engagement_rate'
                    ? `${(tooltip.point[m.key] as number).toFixed(2)}%`
                    : (tooltip.point[m.key] as number).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
