// @ts-nocheck
'use client'
// app/dashboard/ai/page.tsx
// Interactive AI caption generator with copy-to-clipboard and quality score.

import { useState } from 'react'
import {
  Sparkles, Copy, CheckCheck, Loader2, Hash,
  Zap, MessageSquare, Target, Star,
} from 'lucide-react'
import { cn, flattenHashtags } from '@/lib/utils'
import type { AIGenerateResponse, AIGenerateRequest } from '@/types'

const NICHES = [
  'Fitness & Wellness', 'Food & Cooking', 'Travel', 'Fashion & Style',
  'Business & Entrepreneurship', 'Beauty & Skincare', 'Technology',
  'Personal Finance', 'Mindset & Motivation', 'Photography',
]

const TONES: AIGenerateRequest['tone'][] = ['casual', 'professional', 'humorous', 'inspirational']

export default function AIGeneratorPage() {
  const [niche,    setNiche]    = useState('')
  const [customNiche, setCustomNiche] = useState('')
  const [tone,     setTone]     = useState<AIGenerateRequest['tone']>('casual')
  const [audience, setAudience] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<AIGenerateResponse | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [copied,   setCopied]   = useState<string | null>(null)

  const effectiveNiche = niche === '__custom__' ? customNiche : niche

  const generate = async () => {
    if (!effectiveNiche.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await fetch('/api/ai/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche:           effectiveNiche,
        tone,
        target_audience: audience || undefined,
      } satisfies AIGenerateRequest),
    })

    const json = await res.json()
    if (!json.success) setError(json.error ?? 'Generation failed')
    else setResult(json.data)
    setLoading(false)
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const fullCaption = result
    ? `${result.hook}\n\n${result.caption}\n\n${result.cta}\n\n${flattenHashtags(result.hashtags)}`
    : ''

  const scoreColor = (score: number) =>
    score >= 8 ? 'text-emerald-400' : score >= 6.5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-400" />
          AI Caption Generator
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Generate viral hooks, captions, CTAs &amp; hashtag sets — powered by GPT-4o mini
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Input panel ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-gray-300">Configure</h2>

            {/* Niche selector */}
            <div>
              <label className="label">Niche *</label>
              <select
                value={niche}
                onChange={e => setNiche(e.target.value)}
                className="input"
              >
                <option value="">Select a niche…</option>
                {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                <option value="__custom__">Custom…</option>
              </select>
            </div>

            {niche === '__custom__' && (
              <div>
                <label className="label">Custom Niche</label>
                <input
                  type="text" value={customNiche}
                  onChange={e => setCustomNiche(e.target.value)}
                  placeholder="e.g. Sustainable Living"
                  className="input"
                />
              </div>
            )}

            {/* Tone */}
            <div>
              <label className="label">Tone</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className={cn(
                      'rounded-lg py-1.5 text-xs font-medium capitalize transition-all border',
                      tone === t
                        ? 'bg-violet-600/30 text-violet-200 border-violet-500/30'
                        : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.05]'
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Target audience */}
            <div>
              <label className="label">Target Audience (optional)</label>
              <input type="text" value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Busy professionals 25–40"
                className="input"
              />
            </div>

            <button
              onClick={generate}
              disabled={loading || !effectiveNiche.trim()}
              className="btn-primary w-full justify-center"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Sparkles className="h-4 w-4" /> Generate Caption</>}
            </button>
          </div>

          {/* Quality score card */}
          {result && (
            <div className="card p-4 flex items-center gap-4 animate-slide-up">
              <div className="h-12 w-12 rounded-2xl bg-yellow-900/30 border border-yellow-700/20 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Quality Score</p>
                <p className={cn('font-display text-2xl font-bold', scoreColor(result.qualityScore))}>
                  {result.qualityScore.toFixed(1)}<span className="text-base text-gray-500">/10</span>
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Est. Reach</p>
                <p className="text-sm font-medium text-gray-300">{result.estimatedReach}</p>
                <p className="text-xs text-gray-500 mt-1">Best time</p>
                <p className="text-xs font-medium text-violet-400">{result.suggestedPostTime}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Output panel ─────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {error && (
            <div className="card p-4 border-red-700/30 bg-red-900/10 text-sm text-red-400">
              {error}
            </div>
          )}

          {!result && !loading && (
            <div className="card p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="h-14 w-14 rounded-2xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-violet-400" />
              </div>
              <p className="text-gray-400 text-sm">Select a niche and click Generate</p>
              <p className="text-gray-600 text-xs mt-1">Your caption package will appear here</p>
            </div>
          )}

          {loading && (
            <div className="card p-10 flex flex-col items-center justify-center min-h-[400px]">
              <div className="h-14 w-14 rounded-2xl bg-violet-900/30 border border-violet-700/20 flex items-center justify-center mb-4 animate-pulse-glow">
                <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
              <p className="text-gray-400 text-sm">Crafting your viral caption…</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3 animate-slide-up">
              {/* Copy all */}
              <div className="flex justify-end">
                <button
                  onClick={() => copyToClipboard(fullCaption, 'all')}
                  className={cn('btn-secondary text-xs', copied === 'all' && 'text-emerald-400 border-emerald-500/20')}
                >
                  {copied === 'all' ? <><CheckCheck className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy All</>}
                </button>
              </div>

              {/* Hook */}
              <OutputBlock
                icon={<Zap className="h-4 w-4 text-yellow-400" />}
                title="Hook" text={result.hook}
                onCopy={() => copyToClipboard(result.hook, 'hook')}
                copied={copied === 'hook'}
                accent="yellow"
              />

              {/* Caption body */}
              <OutputBlock
                icon={<MessageSquare className="h-4 w-4 text-violet-400" />}
                title="Caption" text={result.caption}
                onCopy={() => copyToClipboard(result.caption, 'caption')}
                copied={copied === 'caption'}
                accent="violet"
                multiline
              />

              {/* CTA */}
              <OutputBlock
                icon={<Target className="h-4 w-4 text-cyan-400" />}
                title="Call to Action" text={result.cta}
                onCopy={() => copyToClipboard(result.cta, 'cta')}
                copied={copied === 'cta'}
                accent="cyan"
              />

              {/* Hashtags */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-pink-400" />
                    <span className="text-sm font-medium text-gray-300">Hashtags</span>
                    <span className="badge badge-gray">
                      {(result.hashtags.broad.length + result.hashtags.medium.length + result.hashtags.niche.length)} total
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(flattenHashtags(result.hashtags), 'hashtags')}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all"
                  >
                    {copied === 'hashtags' ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {([
                    { label: 'Broad (20%)', tags: result.hashtags.broad, color: 'bg-blue-900/40 text-blue-300 border-blue-700/30' },
                    { label: 'Medium (50%)', tags: result.hashtags.medium, color: 'bg-violet-900/40 text-violet-300 border-violet-700/30' },
                    { label: 'Niche (30%)', tags: result.hashtags.niche, color: 'bg-pink-900/40 text-pink-300 border-pink-700/30' },
                  ] as const).map(({ label, tags, color }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => (
                          <span key={tag} className={cn('badge text-[11px]', color)}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OutputBlock({
  icon, title, text, onCopy, copied, accent, multiline = false,
}: {
  icon: React.ReactNode
  title: string
  text: string
  onCopy: () => void
  copied: boolean
  accent: 'yellow' | 'violet' | 'cyan'
  multiline?: boolean
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <button onClick={onCopy} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-all">
          {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <p className={cn('text-sm text-gray-300 leading-relaxed', multiline && 'whitespace-pre-line')}>
        {text}
      </p>
    </div>
  )
}

