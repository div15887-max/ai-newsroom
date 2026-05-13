# Product Requirements Document — Divyani's AI Newsroom

**Version:** 1.0  
**Date:** 2026-05-13  
**Author:** Divyani  
**Status:** Complete — all requirements implemented and live

---

## 1. Overview

Divyani's AI Newsroom is a fully autonomous news aggregation and publishing system. It collects the latest AI/ML industry news, processes and summarises each article using a single LLM agent with multiple specialised skills, persists the results to a cloud database, and displays them on a public-facing Next.js website — all without manual intervention.

**Live frontend:** https://ai-newsroom-zeta.vercel.app  
**Status dashboard:** https://ai-newsroom-zeta.vercel.app/status  
**GitHub:** https://github.com/div15887-max/ai-newsroom

---

## 2. Problem Statement

News is fragmented across dozens of sources. Staying current on AI/ML industry developments requires constant manual trawling. An autonomous system that collects, categorises, and summarises this information — and keeps itself running without babysitting — has real everyday value.

This project also serves as a take-home assignment for Confer Inc., demonstrating the ability to:
- Stand up a real production system using LLM agents and managed infrastructure
- Ship something accessible from a browser URL that stays running for at least a week
- Instrument and debug the system end-to-end

---

## 3. Goals and Success Criteria

### Primary goals

| Goal | Success Criterion |
|------|-------------------|
| Autonomous news collection | Pipeline runs on schedule every 6 hours without manual trigger |
| AI summarisation | Every article has a 80–120 word factual summary with context and significance |
| Persistent storage | Articles deduplicated and persisted to Supabase; no duplicate titles or URLs |
| Public frontend | Live Vercel URL shows recent articles, updates within 60 seconds of new data |
| Zero-cost operation | All services on free tier; monthly cost $0.00 |
| One-week uptime | VPS, Supabase, and Vercel all remain operational continuously |

### Stretch goals (all implemented)

| Goal | Implementation |
|------|---------------|
| A+ pipeline observability | `/status` page with run history, health badge, infrastructure table |
| Manual pipeline control | Trigger button on `/status` → VPS control server → systemd |
| Live runtime logs | 30-line journalctl feed on `/status`, auto-refreshes every 5 s |
| Telegram integration | Bot commands `/run` and `/logs`; push notifications on completion/failure |
| Article detail view | Click-to-modal on every article card showing full summary and metadata |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  AWS EC2 t3.micro — Ubuntu 22.04 (ap-southeast-2)       │
│                                                          │
│  systemd timer (00/06/12/18:00 UTC)                     │
│        │                                                 │
│        ▼                                                 │
│  run-pipeline.sh  ──► git pull ──► node src/pipeline.js │
│                                         │                │
│                         USE_OPENCLAW=true               │
│                                         │                │
│                    OpenClaw CLI runtime (openclaw infer) │
│                    ┌────────────────────────────────┐    │
│                    │  Single agent, three skills:   │    │
│                    │  1. newsroom-collector         │    │
│                    │  2. newsroom-summarizer        │    │
│                    │  3. newsroom-tagger            │    │
│                    └────────────┬───────────────────┘    │
│                                 │                        │
│                          Ollama Cloud API                │
│                          (ministral-3:3b)               │
│                                 │                        │
│  VPS Control Server (port 3001) │                        │
│  Telegram Bot (polling)         │                        │
└─────────────────────────────────┼────────────────────────┘
                                  │ Supabase service key
                                  ▼
                         ┌─────────────────┐
                         │    Supabase     │
                         │  (PostgreSQL)   │
                         │  articles table │
                         │  pipeline_runs  │
                         └────────┬────────┘
                                  │ anon key (read-only)
                                  ▼
                    ┌─────────────────────────────┐
                    │  Vercel — Next.js 16         │
                    │  ISR revalidate: 60 s        │
                    │  https://ai-newsroom-zeta... │
                    └─────────────────────────────┘
```

---

## 5. Agent Design — Single Agent, Multiple Skills

The system uses **one OpenClaw agent** with **three SKILL.md-defined skills**. Each skill is a structured system prompt that instructs the agent to perform a distinct transformation on the article data.

### Why single agent, multiple skills?

A single agent with composable skills is simpler to deploy, debug, and maintain than a fully distributed multi-agent system. The agent executes each skill sequentially in the pipeline, with the output of one skill becoming the input of the next. This achieves full A+ multi-skill behaviour without the coordination overhead of separate agent processes.

### Skill 1 — `newsroom-collector`

**File:** `agent/openclaw/skills/newsroom-collector/SKILL.md`

**Input:** Raw RSS article array `[{ title, url, source, published_at, category }]`

**Transformation:**
- Strips `" — Source Name"` suffixes from titles
- Removes articles with missing or empty URLs
- Normalises `published_at` to ISO 8601 or `null`
- Returns clean, validated JSON array

**Output:** Same shape as input, sanitised

---

### Skill 2 — `newsroom-summarizer`

**File:** `agent/openclaw/skills/newsroom-summarizer/SKILL.md`

**Input:** Collected article array

**Transformation:**
- Adds a `summary` field to each article
- Target: 80–120 words, 3–5 sentences
- Sentence structure: what happened → context/background → significance/impact
- Neutral, plain-language; no jargon or hype
- Returns full article objects with `summary` added

**Output:** Same shape as input, `summary` field populated

---

### Skill 3 — `newsroom-tagger`

**File:** `agent/openclaw/skills/newsroom-tagger/SKILL.md`

**Input:** Summarised article array

**Transformation:**
- Assigns one of four categories: `AI`, `Technology`, `Startups`, `Gaming`
- Based on title + summary content
- Defaults to `AI` if ambiguous
- Returns articles with `category` field verified/corrected

**Output:** Same shape as input, `category` confirmed

---

### Skill execution in `pipeline.js`

```
articles = fetchRssArticles(category, 4)
  → filterNewArticles(articles)       ← URL + title dedup (before agent)
  → openclawSummarize(articles)       ← Skill 2
  → openclawTag(summarized)           ← Skill 3
  → merge(summarized, tagged)         ← preserve summary field
  → insertArticles(merged)            ← Supabase write
```

The collector skill is applied implicitly through RSS cleaning in `rss.js` on the pre-agent path.

---

## 6. Pipeline Specification

### Schedule

```
00:00 UTC  |  06:00 UTC  |  12:00 UTC  |  18:00 UTC
```

Implemented via `systemd/newsroom-pipeline.timer` with `Persistent=true` (missed runs fire once on next boot) and `RandomizedDelaySec=300` (jitter up to 5 minutes).

### Categories

| Category | RSS Query |
|----------|-----------|
| AI | `artificial+intelligence+machine+learning` |
| Technology | `technology+news` |
| Startups | `startups+venture+capital` |
| Gaming | `gaming+video+games` |

### Per-run flow

1. `createPipelineRun()` — inserts `pipeline_runs` row with `status: running`
2. For each of 4 categories (isolated try/catch):
   a. Fetch 4 articles from Google News RSS
   b. `filterNewArticles()` — 3-pass dedup (batch title, URL, DB title)
   c. Summarize via OpenClaw CLI → Skill 2
   d. Tag via OpenClaw CLI → Skill 3
   e. Merge outputs (prevents tagger from overwriting summarizer)
   f. Upsert to Supabase
3. `completePipelineRun()` — updates row with counts, duration, status
4. `notifyTelegram()` — sends Telegram notification

### Deduplication (3 passes in `filterNewArticles`)

1. **Within-batch** — normalised title (`title.trim().toLowerCase()`) across all 4 categories in the same run
2. **URL-based** — existing `articles.url` values in Supabase
3. **Title-based** — last 500 article titles from Supabase, normalised

### Error handling

- Per-category: errors are caught, logged, and accumulated — one category failing does not abort the rest
- Fatal errors: `failPipelineRun()` records to Supabase; Telegram sends ❌ notification; `process.exit(1)`
- Telegram notify: never throws — errors are logged and execution continues

---

## 7. Data Model

### `articles` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Auto-generated primary key |
| `title` | text | Cleaned article headline |
| `summary` | text \| null | AI-generated, 80–120 words |
| `source` | text | Publication name |
| `url` | text | UNIQUE constraint — primary dedup |
| `published_at` | timestamp \| null | ISO 8601 from RSS |
| `category` | text | One of: AI, Technology, Startups, Gaming |
| `created_at` | timestamp | Auto-set to NOW() |

Indexes: `published_at DESC`, `category`, `created_at DESC`

RLS: public SELECT (anon key), no public INSERT/UPDATE/DELETE

### `pipeline_runs` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Auto-generated |
| `started_at` | timestamp | Set on row creation |
| `completed_at` | timestamp \| null | Set on success or failure |
| `status` | text | `running` \| `success` \| `error` |
| `articles_fetched` | int \| null | Total across all categories |
| `articles_saved` | int \| null | New inserts |
| `categories_run` | text[] \| null | Array of category names |
| `duration_seconds` | float \| null | Wall-clock seconds |
| `openclaw_used` | boolean \| null | `USE_OPENCLAW` flag value |
| `error_message` | text \| null | Capped at 500 chars |

RLS: public SELECT (anon key), service key writes

---

## 8. Frontend Specification

**Framework:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4  
**Hosting:** Vercel (auto-deploys on push to main)  
**Data:** Supabase anon key (read-only), ISR `revalidate = 60`

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Server | Intro screen (no DB query) OR article grid |
| `/?category=X` | Server | Article grid filtered by category |
| `/status` | Server + Client | Pipeline observability dashboard |

### Newsroom intro (`/`)

- Cinematic entry: SVG anchor figure, pulsing rings, ON AIR badge
- Animated sound-wave equaliser bars
- TypeAnimation typewriter cycling broadcast phrases
- Category pill buttons stagger in at 3.2 s; clicking navigates to `/?category=X`
- Auto-dismisses to `/?category=All` after 10.5 s
- `ssr: false` (animation-heavy, not pre-rendered)

### Article grid (`/?category=X`)

- Responsive 1 → 2 → 3 column grid
- Featured (first) card: full-width, larger title
- Per-category colour system: violet (AI), blue (Technology), emerald (Startups), orange (Gaming)
- 3px gradient accent bar at top of each card
- Framer Motion enter animations (staggered by index)
- Click → opens `ArticleModal` (see below)

### Article modal

Triggered by clicking any card. Shows:
- Full article title
- Full AI-generated summary
- Category badge (coloured)
- Published date
- Source name
- "Read Full Article ↗" link (opens original URL in new tab)
- Close via button, backdrop click, or Escape key
- No page navigation; no new routes

### Status page (`/status`)

**Server-rendered section (revalidate: 60s):**
- Health badge: Operational (green) or Degraded (red)
- 4 stat cards: Total Articles, Schedule, Last Run time, OpenClaw status
- Pipeline run history table (last 10 runs): time, status, fetched, saved, duration, OpenClaw flag
- Last error message panel (if any)
- Infrastructure table: VPS, scheduler, agent runtime, LLM, database, cost

**Client-rendered sections (interactive):**
- `PipelineTrigger` card: "Run Pipeline" button → POST `/api/run-pipeline` → VPS control server; state shows Idle / Running... / Success / Error
- `PipelineLogs` panel: last 30 journalctl lines, auto-refreshes every 5 s via GET `/api/pipeline-logs`; terminal-style UI (monospace, dark background, green text)

### API routes (Next.js)

| Route | Method | Action |
|-------|--------|--------|
| `/api/run-pipeline` | POST | Proxies to `http://3.27.155.78:3001/run-pipeline` with Bearer auth |
| `/api/pipeline-logs` | GET | Proxies to `http://3.27.155.78:3001/logs` with Bearer auth |

These routes act as a Vercel → VPS bridge so the browser never speaks directly to the VPS IP.

---

## 9. Infrastructure

| Component | Service | Tier | Cost |
|-----------|---------|------|------|
| VPS | AWS EC2 t3.micro | Free (12 months) | $0 |
| Database | Supabase | Free tier | $0 |
| Frontend hosting | Vercel | Hobby (free) | $0 |
| LLM API | Ollama Cloud `ministral-3:3b` | Free tier | $0 |
| DNS / CDN | Vercel-managed | Included | $0 |
| **Total** | | | **$0/month** |

### VPS — AWS EC2 t3.micro

- Region: ap-southeast-2 (Sydney)
- OS: Ubuntu 22.04 LTS
- Public IP: 3.27.155.78
- SSH: key-pair auth
- Systemd user services (no root required for pipeline operations)

### Systemd services

| Unit | Type | Purpose |
|------|------|---------|
| `newsroom-pipeline.service` | oneshot | Runs the Node.js pipeline script |
| `newsroom-pipeline.timer` | timer | Fires at 00/06/12/18:00 UTC |
| `openclaw-gateway.service` | simple | Keeps OpenClaw gateway running on port 18789 |
| `newsroom-telegram.service` | simple | Keeps Telegram bot running (polling) |

All services use `EnvironmentFile=%h/ai-newsroom/agent/.env`.

---

## 10. Telegram Integration

### Bot commands

| Command | Behaviour |
|---------|-----------|
| `/start` | Confirms bot is active; lists available commands |
| `/run` | POSTs to `localhost:3001/run-pipeline`; replies with started/failed |
| `/logs` | GETs `localhost:3001/logs`; replies with last 20 log lines |

### Pipeline notifications

Sent automatically by `agent/src/telegram-notify.js` at the end of each pipeline run:

| Event | Message format |
|-------|----------------|
| ✅ Success | `Pipeline complete · Saved: N · Duration: Xs · Timestamp` |
| ⚠️ Partial failure | `Pipeline complete with errors · Saved: N · 1 category failed: X` |
| ❌ Fatal failure | `Pipeline failed · Error: msg · Duration: Xs` |

Notification uses the Telegram Bot API directly via Node 22's global `fetch` — no extra library required in the pipeline process. The bot and notify helper are separate concerns: the bot is a long-running polling process; the notify helper is a one-shot function call.

---

## 11. Observability

| Signal | Where |
|--------|-------|
| Per-run metrics (fetched, saved, duration, status) | Supabase `pipeline_runs` table |
| Pipeline logs (journalctl) | `/status` page — live logs panel, refreshes every 5 s |
| Health badge | `/status` page header — green/red based on last run status |
| Telegram alerts | Push message to Telegram on every run completion |
| Error messages | Stored in `pipeline_runs.error_message` (capped at 500 chars); shown on `/status` |
| Manual trigger | `/status` page "Run Pipeline" button → VPS control server → systemd |

---

## 12. Non-Functional Requirements

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Uptime | > 99% over 7-day evaluation window | `Restart=always` on systemd services; `Persistent=true` on timer |
| Latency (frontend) | < 2 s first paint | ISR with 60 s revalidate; Vercel edge CDN |
| Cost | $0/month | All services on free tier |
| Data freshness | ≤ 6 hours lag | Timer fires 4× per day |
| Deduplication | No duplicate titles or URLs | 3-pass filter before every insert |
| Secret hygiene | No credentials in git | `.env` gitignored; anon key only in frontend |
| Recoverability | Auto-resume after reboot | systemd linger enabled; all services `WantedBy=default.target` |

---

## 13. Environment Variables

### `agent/.env` (VPS, never committed)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key — write access |
| `OLLAMA_API_KEY` | ✅ | Ollama Cloud API key |
| `OLLAMA_BASE_URL` | ✅ | e.g. `https://api.ollama.com` |
| `OLLAMA_MODEL` | ✅ | `ministral-3:3b` |
| `USE_OPENCLAW` | ✅ | `true` in production |
| `OPENCLAW_GATEWAY_URL` | ✅ | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | ✅ | Gateway auth token |
| `TELEGRAM_BOT_TOKEN` | optional | Enables bot + notifications |
| `TELEGRAM_CHAT_ID` | optional | Telegram user/chat ID |
| `VPS_CONTROL_TOKEN` | optional | Bearer token for control server (default: `run-newsroom-2026`) |

### `frontend/.env.local` (Vercel env vars, read-only)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (public) key — read-only |

---

## 14. Project File Map

```
ai-newsroom/
├── agent/
│   ├── telegram-bot.js              # Telegram polling bot
│   ├── src/
│   │   ├── pipeline.js              # Main orchestrator
│   │   ├── rss.js                   # Google News RSS fetcher (4 categories)
│   │   ├── summarizer.js            # Direct Ollama path (USE_OPENCLAW=false)
│   │   ├── supabase.js              # Dedup + insert + pipeline run tracking
│   │   ├── openclaw-pipeline.js     # OpenClaw skill execution
│   │   └── telegram-notify.js       # Pipeline completion notifications
│   ├── openclaw/
│   │   ├── config/openclaw.json.template
│   │   └── skills/
│   │       ├── newsroom-collector/SKILL.md
│   │       ├── newsroom-summarizer/SKILL.md
│   │       └── newsroom-tagger/SKILL.md
│   ├── .env.example
│   └── package.json
├── frontend/                        # Next.js 16 (Vercel)
│   ├── app/
│   │   ├── api/
│   │   │   ├── run-pipeline/route.ts  # Vercel → VPS bridge (POST)
│   │   │   └── pipeline-logs/route.ts # Vercel → VPS bridge (GET)
│   │   ├── status/
│   │   │   ├── page.tsx               # Status dashboard (server)
│   │   │   ├── PipelineTrigger.tsx    # Manual trigger button (client)
│   │   │   └── PipelineLogs.tsx       # Live logs panel (client)
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Home (intro + article grid)
│   ├── components/
│   │   ├── ArticleCard.tsx            # Card + modal
│   │   ├── ArticleGrid.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── Header.tsx
│   │   └── NewsroomIntro.tsx
│   └── lib/
│       ├── supabase.ts
│       ├── status.ts
│       └── utils.ts
├── scripts/
│   ├── setup-supabase.sql
│   ├── setup-vps.sh
│   ├── configure-openclaw.sh
│   └── run-pipeline.sh
├── systemd/
│   ├── openclaw-gateway.service
│   ├── newsroom-pipeline.service
│   ├── newsroom-pipeline.timer
│   └── newsroom-telegram.service
└── README.md
```

---

## 15. Known Constraints and Decisions

| Decision | Rationale |
|----------|-----------|
| Single OpenClaw agent with 3 skills, not 3 separate agents | Simpler to deploy and debug; same skill pipeline achieved; no coordination overhead |
| `ministral-3:3b` not `llama3.2:3b` | `llama3.2` is a local-only Ollama model identifier not available on Ollama Cloud |
| Batch size: 4 articles per category | Larger batches (8+) caused LLM JSON reliability issues with ministral-3b |
| URL + title dedup (not UUID) | Same article can appear across RSS queries with different UUID assignments |
| No webhooks for Telegram | Polling is simpler on a dynamically-addressed VPS; no public HTTPS endpoint required for the bot |
| Vercel → VPS proxy for status page controls | Vercel serverless cannot exec `systemctl`; proxying keeps the frontend stateless |
| ISR 60 s not real-time streaming | Sufficient for a 6-hour pipeline; avoids WebSocket complexity |
| No auth on status page controls | Demo context; bearer token on VPS control server is the only layer of protection |
