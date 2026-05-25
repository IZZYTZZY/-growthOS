-- ============================================================
--  Instagram Growth Platform — Supabase Schema
--  Run this entire script in Supabase SQL Editor (once).
--  Requires: PostgreSQL 15+, pgcrypto extension.
-- ============================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for ILIKE full-text on niches

-- ============================================================
-- 1. USERS
--    Extends auth.users (Supabase GoTrue); one row per signup.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email             TEXT NOT NULL UNIQUE,
  full_name         TEXT,
  avatar_url        TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'starter'
                        CHECK (subscription_plan IN ('starter', 'pro', 'agency')),
  stripe_customer_id TEXT,                -- populated by billing webhook
  trial_ends_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at fresh automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mirror new auth signups into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. INSTAGRAM ACCOUNTS
--    One user can have multiple IG accounts (plan-limited).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  instagram_user_id   TEXT NOT NULL,           -- IG numeric user id (string for safety)
  username            TEXT NOT NULL,
  display_name        TEXT,
  profile_picture_url TEXT,
  biography           TEXT,
  website             TEXT,
  followers_count     INTEGER NOT NULL DEFAULT 0,
  following_count     INTEGER NOT NULL DEFAULT 0,
  media_count         INTEGER NOT NULL DEFAULT 0,
  access_token_enc    BYTEA,                   -- AES-256-CBC encrypted via pgcrypto
  token_expires_at    TIMESTAMPTZ,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'connected', 'revoked', 'failed')),
  account_type        TEXT NOT NULL DEFAULT 'personal'
                        CHECK (account_type IN ('personal', 'creator', 'business')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, instagram_user_id)
);

CREATE TRIGGER trg_ig_accounts_updated_at
  BEFORE UPDATE ON public.instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: encrypt an access token (call with your app secret as key)
CREATE OR REPLACE FUNCTION public.encrypt_token(plain_text TEXT, secret TEXT)
RETURNS BYTEA LANGUAGE sql SECURITY DEFINER AS $$
  SELECT pgp_sym_encrypt(plain_text, secret);
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(cipher BYTEA, secret TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT pgp_sym_decrypt(cipher, secret);
$$;


-- ============================================================
-- 3. CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  account_id    UUID REFERENCES public.instagram_accounts (id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  niche         TEXT NOT NULL,
  description   TEXT,
  target_reach  INTEGER DEFAULT 0,
  budget_usd    NUMERIC(10, 2) DEFAULT 0.00,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT campaign_date_order CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 4. ANALYTICS SNAPSHOTS  (time-series per account, per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID    NOT NULL REFERENCES public.instagram_accounts (id) ON DELETE CASCADE,
  user_id           UUID    NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  snapshot_date     DATE    NOT NULL DEFAULT CURRENT_DATE,

  -- Audience
  followers_count   INTEGER NOT NULL DEFAULT 0,
  following_count   INTEGER NOT NULL DEFAULT 0,
  unfollowers_delta INTEGER NOT NULL DEFAULT 0,

  -- Content performance
  reel_views        BIGINT  NOT NULL DEFAULT 0,
  reel_plays        BIGINT  NOT NULL DEFAULT 0,
  watch_time_secs   BIGINT  NOT NULL DEFAULT 0,   -- total seconds watched
  saves             INTEGER NOT NULL DEFAULT 0,
  shares            INTEGER NOT NULL DEFAULT 0,
  comments          INTEGER NOT NULL DEFAULT 0,
  likes             INTEGER NOT NULL DEFAULT 0,

  -- Discovery
  profile_visits    INTEGER NOT NULL DEFAULT 0,
  reach             INTEGER NOT NULL DEFAULT 0,
  impressions       INTEGER NOT NULL DEFAULT 0,

  -- Computed / derived
  engagement_rate   NUMERIC(6, 4) GENERATED ALWAYS AS (
    CASE WHEN followers_count > 0
      THEN ROUND(((likes + comments + saves + shares)::NUMERIC / followers_count) * 100, 4)
      ELSE 0
    END
  ) STORED,

  conversion_rate   NUMERIC(6, 4) NOT NULL DEFAULT 0,  -- profile_visits → CTA clicks (populated by app)

  raw_payload       JSONB,   -- store the full IG Graph API response for future fields
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (account_id, snapshot_date)
);

-- Partial index for fast "last 30 days" queries per account
CREATE INDEX IF NOT EXISTS idx_analytics_account_date
  ON public.analytics_snapshots (account_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_user_date
  ON public.analytics_snapshots (user_id, snapshot_date DESC);


-- ============================================================
-- 5. SCHEDULED POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES public.instagram_accounts (id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES public.campaigns (id) ON DELETE SET NULL,

  -- Content
  caption         TEXT NOT NULL,
  content_url     TEXT NOT NULL,   -- CDN URL (Supabase Storage or external)
  media_type      TEXT NOT NULL DEFAULT 'reel'
                    CHECK (media_type IN ('reel', 'image', 'carousel', 'story')),
  thumbnail_url   TEXT,
  alt_text        TEXT,

  -- AI enrichment (populated by /api/ai/generate)
  hook            TEXT,
  cta             TEXT,
  hashtags        TEXT[],
  quality_score   NUMERIC(4, 2),   -- 0.00 – 10.00

  -- Scheduling
  scheduled_time  TIMESTAMPTZ NOT NULL,
  published_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),

  -- Error tracking
  failure_reason  TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for the scheduler worker: pull next batch of due posts
CREATE INDEX IF NOT EXISTS idx_posts_due
  ON public.scheduled_posts (scheduled_time ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_posts_user_status
  ON public.scheduled_posts (user_id, status, scheduled_time DESC);


-- ============================================================
-- 6. HASHTAG GROUPS  (reusable sets per niche)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hashtag_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  niche       TEXT NOT NULL,
  broad       TEXT[] NOT NULL DEFAULT '{}',   -- 20% broad
  medium      TEXT[] NOT NULL DEFAULT '{}',   -- 50% medium
  niche_tags  TEXT[] NOT NULL DEFAULT '{}',   -- 30% niche
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hashtag_groups_user
  ON public.hashtag_groups (user_id);


-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifs_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on every user-facing table
ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────
CREATE POLICY "Users: read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users: update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── instagram_accounts ───────────────────────────────────────
CREATE POLICY "IG accounts: read own"
  ON public.instagram_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "IG accounts: insert own"
  ON public.instagram_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "IG accounts: update own"
  ON public.instagram_accounts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "IG accounts: delete own"
  ON public.instagram_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ── campaigns ────────────────────────────────────────────────
CREATE POLICY "Campaigns: read own"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Campaigns: insert own"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Campaigns: update own"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Campaigns: delete own"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- ── analytics_snapshots ──────────────────────────────────────
CREATE POLICY "Analytics: read own"
  ON public.analytics_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Analytics: insert own"
  ON public.analytics_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only backend service role can update/delete analytics (no user update policy)

-- ── scheduled_posts ──────────────────────────────────────────
CREATE POLICY "Posts: read own"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Posts: insert own"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Posts: update own"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Posts: delete own"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ── hashtag_groups ───────────────────────────────────────────
CREATE POLICY "Hashtags: read own"
  ON public.hashtag_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Hashtags: insert own"
  ON public.hashtag_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hashtags: update own"
  ON public.hashtag_groups FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hashtags: delete own"
  ON public.hashtag_groups FOR DELETE
  USING (auth.uid() = user_id);

-- ── notifications ────────────────────────────────────────────
CREATE POLICY "Notifications: read own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Notifications: update own (mark read)"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 9. PERFORMANCE INDEXES  (beyond the ones above)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status
  ON public.campaigns (user_id, status);

CREATE INDEX IF NOT EXISTS idx_ig_accounts_user
  ON public.instagram_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_ig_accounts_username
  ON public.instagram_accounts USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_campaigns_niche
  ON public.campaigns USING gin (niche gin_trgm_ops);


-- ============================================================
-- 10. REALTIME  (enable for live dashboard updates)
-- ============================================================
-- Run these via Supabase dashboard → Database → Replication, OR:
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_posts;
