# GrowthOS — Instagram Growth & Analytics Platform

Enterprise-grade Instagram growth platform built on the 100% free tier:
**Next.js 14** (Vercel) + **Supabase** (PostgreSQL + Auth) + **OpenAI GPT-4o mini**.

---

## Stack Overview

| Layer | Technology | Free Tier |
|-------|-----------|-----------|
| Frontend & API | Next.js 14 App Router (Vercel) | 100GB bandwidth/mo |
| Database | Supabase PostgreSQL | 500MB storage |
| Auth | Supabase GoTrue | Unlimited users |
| Realtime | Supabase Realtime | 200 concurrent connections |
| AI | OpenAI GPT-4o mini | ~$0.001/caption |
| Hosting | Vercel Hobby | Unlimited deployments |

---

## Quick Start

### Step 1 — Supabase Project

1. Create a free project at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**
3. Enable **Realtime** for the three tables via _Database → Replication_
4. Copy your Project URL and Anon Key from _Settings → API_

### Step 2 — Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/growthOS
cd growthOS
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and optionally OPENAI_API_KEY
```

### Step 3 — Install & Run

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Step 4 — Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
# Add all .env.local variables in Vercel Dashboard → Settings → Environment Variables
```

---

## Project Structure

```
instagram-growth-platform/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group — no layout
│   │   ├── login/page.tsx        # Sign-in page
│   │   └── register/page.tsx     # Sign-up page
│   │
│   ├── auth/callback/route.ts    # OAuth redirect handler
│   │
│   ├── dashboard/                # Protected area (middleware.ts guards)
│   │   ├── layout.tsx            # Sidebar + TopBar shell
│   │   ├── page.tsx              # Overview — metrics, charts, activity
│   │   ├── campaigns/page.tsx    # Campaign CRUD list + modal
│   │   ├── ai/page.tsx           # AI caption generator UI
│   │   ├── analytics/page.tsx    # Deep analytics (extend as needed)
│   │   ├── planner/page.tsx      # Content calendar (extend as needed)
│   │   ├── accounts/page.tsx     # IG account management
│   │   └── settings/page.tsx     # User & billing settings
│   │
│   ├── api/                      # Serverless / Edge Route Handlers
│   │   ├── campaigns/route.ts    # GET · POST · DELETE
│   │   ├── ai/generate/route.ts  # POST — AI caption generation
│   │   └── analytics/
│   │       ├── snapshot/route.ts # GET · POST (upsert daily metrics)
│   │       └── cron/route.ts     # GET — Vercel CRON trigger
│   │
│   ├── globals.css               # Tailwind base + design tokens
│   └── layout.tsx                # Root HTML shell with fonts
│
├── components/
│   ├── ui/
│   │   ├── MetricCard.tsx        # KPI card with delta & icon
│   │   └── AnalyticsChart.tsx    # Pure SVG line/area chart
│   └── dashboard/
│       ├── SidebarNav.tsx        # Nav links with active states
│       ├── TopBar.tsx            # Search + notifications + avatar
│       ├── ActiveCampaignsList.tsx
│       └── RecentPostsTable.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (Client Components)
│   │   └── server.ts             # Server client + Admin client
│   └── utils.ts                  # Formatters, validators, plan limits
│
├── types/index.ts                # All DB & API TypeScript interfaces
├── middleware.ts                 # Session refresh + route protection
├── supabase/schema.sql           # Full DB schema — run once in Supabase
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
├── vercel.json                   # CRON job config
└── .env.example                  # Environment variable template
```

---

## API Reference

### POST `/api/campaigns`

Create a campaign.

```json
// Request
{
  "campaign_name": "Summer Fitness Push",
  "niche": "fitness",
  "description": "Optional description",
  "target_reach": 50000,
  "budget_usd": 0,
  "starts_at": "2025-08-01T00:00:00Z",
  "ends_at":   "2025-08-31T00:00:00Z"
}

// Response 201
{
  "success": true,
  "data": { "id": "uuid", "campaign_name": "...", ... }
}
```

### GET `/api/campaigns`

List campaigns with optional filters.

| Query Param | Type | Description |
|-------------|------|-------------|
| `status` | string | Filter by status (draft/active/…) |
| `niche` | string | ILIKE search |
| `limit` | number | Max results (default 20, max 100) |
| `offset` | number | Pagination offset |

### POST `/api/ai/generate`

Generate AI caption package.

```json
// Request
{
  "niche": "fitness",
  "tone": "casual",
  "target_audience": "Gym beginners 18-30",
  "include_emojis": true
}

// Response 200
{
  "success": true,
  "data": {
    "hook": "This one habit changed EVERYTHING 🔥",
    "caption": "Full caption body...",
    "cta": "Follow for daily fitness tips ✅",
    "hashtags": {
      "broad":  ["instagram", "reels", ...],      // 6 tags (20%)
      "medium": ["fitnesstips", "workout", ...],  // 15 tags (50%)
      "niche":  ["homegymlife", "fitfam", ...]    // 9 tags (30%)
    },
    "qualityScore": 8.2,
    "suggestedPostTime": "Tuesday 7–9 PM EST",
    "estimatedReach": "15K–40K accounts"
  }
}
```

---

## Row Level Security

All tables enforce `auth.uid() = user_id`. The service-role key bypasses RLS only for:
- Analytics snapshot ingestion (CRON job)
- Admin operations

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

---

## Subscription Plans

| Feature | Starter | Pro | Agency |
|---------|---------|-----|--------|
| IG Accounts | 1 | 5 | 50 |
| Campaigns | 3 | 20 | Unlimited |
| Scheduled Posts | 10 | 100 | Unlimited |
| AI Generations/day | 5 | Unlimited | Unlimited |
| Advanced Analytics | ❌ | ✅ | ✅ |
| Team Members | ❌ | ❌ | ✅ |

---

## Extending the Platform

### Add Instagram Graph API integration
1. Create a Meta App at developers.facebook.com
2. Store access tokens encrypted via `encrypt_token()` SQL function
3. Call `GET /me/insights` and POST to `/api/analytics/snapshot`

### Add Stripe billing
1. `npm install stripe @stripe/stripe-js`
2. Create a `/api/billing/webhook` route for subscription events
3. Update `users.subscription_plan` on `customer.subscription.updated`

### Add Realtime notifications
```typescript
const supabase = createClient()
supabase
  .channel('notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
    // Show toast notification
  })
  .subscribe()
```
