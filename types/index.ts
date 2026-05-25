// ============================================================
//  types/index.ts — Database & API TypeScript interfaces
// ============================================================

export type SubscriptionPlan = 'starter' | 'pro' | 'agency'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
export type PostStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled'
export type VerificationStatus = 'pending' | 'connected' | 'revoked' | 'failed'
export type MediaType = 'reel' | 'image' | 'carousel' | 'story'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

// ── Database row types ───────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  subscription_plan: SubscriptionPlan
  stripe_customer_id: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface InstagramAccount {
  id: string
  user_id: string
  instagram_user_id: string
  username: string
  display_name: string | null
  profile_picture_url: string | null
  biography: string | null
  website: string | null
  followers_count: number
  following_count: number
  media_count: number
  token_expires_at: string | null
  is_verified: boolean
  verification_status: VerificationStatus
  account_type: 'personal' | 'creator' | 'business'
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  account_id: string | null
  campaign_name: string
  niche: string
  description: string | null
  target_reach: number
  budget_usd: number
  status: CampaignStatus
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  account_id: string
  user_id: string
  snapshot_date: string          // ISO date string
  followers_count: number
  following_count: number
  unfollowers_delta: number
  reel_views: number
  reel_plays: number
  watch_time_secs: number
  saves: number
  shares: number
  comments: number
  likes: number
  profile_visits: number
  reach: number
  impressions: number
  engagement_rate: number        // computed column, read-only
  conversion_rate: number
  raw_payload: Record<string, unknown> | null
  created_at: string
}

export interface ScheduledPost {
  id: string
  user_id: string
  account_id: string
  campaign_id: string | null
  caption: string
  content_url: string
  media_type: MediaType
  thumbnail_url: string | null
  alt_text: string | null
  hook: string | null
  cta: string | null
  hashtags: string[] | null
  quality_score: number | null
  scheduled_time: string
  published_at: string | null
  status: PostStatus
  failure_reason: string | null
  retry_count: number
  next_retry_at: string | null
  created_at: string
  updated_at: string
}

export interface HashtagGroup {
  id: string
  user_id: string
  name: string
  niche: string
  broad: string[]
  medium: string[]
  niche_tags: string[]
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  is_read: boolean
  action_url: string | null
  created_at: string
}

// ── API request / response types ─────────────────────────────

export interface CreateCampaignRequest {
  campaign_name: string
  niche: string
  description?: string
  account_id?: string
  target_reach?: number
  budget_usd?: number
  starts_at?: string
  ends_at?: string
}

export interface CreateCampaignResponse {
  success: boolean
  data?: Campaign
  error?: string
}

export interface AIGenerateRequest {
  niche: string
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational'
  include_emojis?: boolean
  target_audience?: string
  product_or_service?: string
}

export interface AIGenerateResponse {
  hook: string
  caption: string
  cta: string
  hashtags: {
    broad: string[]      // 20% — large reach (1M+ posts)
    medium: string[]     // 50% — mid competition (100K–1M posts)
    niche: string[]      // 30% — targeted (<100K posts)
  }
  qualityScore: number   // 0–10
  suggestedPostTime?: string
  estimatedReach?: string
}

// ── Dashboard metric types ───────────────────────────────────

export interface MetricCardData {
  label: string
  value: string | number
  delta: number          // percentage change vs previous period
  deltaLabel: string     // e.g. "vs last 7 days"
  icon: string           // Lucide icon name
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink'
}

export interface DashboardOverview {
  metrics: MetricCardData[]
  recentPosts: ScheduledPost[]
  activeCampaigns: Campaign[]
  accountSummary: InstagramAccount | null
  chartData: ChartDataPoint[]
}

export interface ChartDataPoint {
  date: string
  followers: number
  reel_views: number
  engagement_rate: number
  reach: number
}

// ── Supabase Database helper type ────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'created_at' | 'updated_at'>; Update: Partial<User> }
      instagram_accounts: { Row: InstagramAccount; Insert: Omit<InstagramAccount, 'id' | 'created_at' | 'updated_at'>; Update: Partial<InstagramAccount> }
      campaigns: { Row: Campaign; Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Campaign> }
      analytics_snapshots: { Row: AnalyticsSnapshot; Insert: Omit<AnalyticsSnapshot, 'id' | 'created_at' | 'engagement_rate'>; Update: Partial<AnalyticsSnapshot> }
      scheduled_posts: { Row: ScheduledPost; Insert: Omit<ScheduledPost, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ScheduledPost> }
      hashtag_groups: { Row: HashtagGroup; Insert: Omit<HashtagGroup, 'id' | 'created_at'>; Update: Partial<HashtagGroup> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification> }
    }
  }
}
