# Repository Map — AI Newsroom

Every directory and file in this repo, with a short description of what it does and why it exists.

---

## Root

| File | Purpose |
|------|---------|
| `README.md` | Project overview, architecture diagram, setup instructions, and tech stack summary. Public-facing doc for evaluators and collaborators. |

---

## `agent/` — Pipeline Backend

The Node.js pipeline that runs on the AWS EC2 VPS. Fetches RSS articles, processes them through LLM agents, and saves results to Supabase.

### `agent/package.json`

Declares the package as an ES module (`"type": "module"`), requires Node ≥ 22, and defines two scripts:
- `npm run pipeline` — runs the pipeline once
- `npm test` — runs both test files with Node's built-in test runner

Dependencies: `@supabase/supabase-js`, `dotenv`, `fast-xml-parser`.

### `agent/.env`

Live secrets file on the VPS. **Never committed to git.** Contains:
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — write access to the database
- `OLLAMA_API_KEY` + `OLLAMA_BASE_URL` + `OLLAMA_MODEL` — Ollama Cloud credentials
- `OPENCLAW_GATEWAY_URL` + `OPENCLAW_GATEWAY_TOKEN` — OpenClaw gateway config
- `USE_OPENCLAW=true/false` — toggles between direct Ollama and OpenClaw path

### `agent/.env.example`

Committed template showing all required env variable names with placeholder values. Copy this to `.env` on a new machine and fill in real values.

---

### `agent/src/` — Source Code

#### `agent/src/pipeline.js`

The main entry point. Orchestrates the full pipeline run:
1. Creates a `pipeline_runs` record in Supabase (status: `running`)
2. Iterates over all 4 categories (AI, Technology, Startups, Gaming)
3. For each category: fetch RSS → filter new → summarize → tag → insert
4. Updates the run record to `success` or `error` with metrics (articles fetched/saved, duration)

Per-category errors are caught and logged without aborting the whole run. Selects the OpenClaw or direct-Ollama path based on `USE_OPENCLAW` env var.

#### `agent/src/rss.js`

Fetches and parses RSS feeds from Google News. Exports:
- `CATEGORY_FEEDS` — map of category name → Google News RSS query URL for AI, Technology, Startups, Gaming
- `fetchRssArticles(category, limit)` — builds the RSS URL, fetches it, parses XML with `fast-xml-parser`, returns an array of `{ title, url, source, published_at, category }` objects

#### `agent/src/supabase.js`

All Supabase interactions. Exports:
- `filterNewArticles(articles)` — queries existing URLs and removes duplicates (uses `url UNIQUE` constraint)
- `insertArticles(articles)` — upserts processed articles into the `articles` table
- `createPipelineRun()` — inserts a `running` row into `pipeline_runs`, returns the new row's `id`
- `completePipelineRun(id, metrics)` — updates the run row to `success` with fetched/saved counts and duration
- `failPipelineRun(id, errorMessage, startedAt)` — updates the run row to `error` with the error message and duration

Uses `SUPABASE_SERVICE_KEY` (write access) — never exposed to the browser.

#### `agent/src/summarizer.js`

Direct Ollama Cloud path (used when `USE_OPENCLAW=false`). Calls `OLLAMA_BASE_URL/api/chat` with a single system prompt that asks the model to add a `summary` field to each article. Parses the response JSON and returns the enriched array. Also exports `stripFences()` (strips markdown code fences from LLM output) — used by tests.

#### `agent/src/openclaw-pipeline.js`

OpenClaw-backed pipeline path (used when `USE_OPENCLAW=true`). Executes inference through the **OpenClaw CLI runtime** (`openclaw infer`) rather than calling Ollama directly. Reads SKILL.md files as system prompts. Exports:
- `summarizeArticles(articles)` — runs the `newsroom-summarizer` agent through OpenClaw CLI
- `tagArticles(articles)` — runs the `newsroom-tagger` agent through OpenClaw CLI

Output is cleaned before JSON parsing to strip OpenClaw CLI metadata (provider info, model info, outputs count) that precedes the JSON payload. Merges summarizer and tagger outputs to prevent tagger from overwriting summary fields.

---

### `agent/src/__tests__/` — Unit Tests

Run with `npm test`. Uses Node.js built-in `node:test` and `node:assert` — no external test framework needed.

#### `agent/src/__tests__/rss.test.js`

Tests for `rss.js`:
- Asserts `CATEGORY_FEEDS` has exactly the 4 expected categories
- Asserts all feed values are non-empty strings
- Asserts `fetchRssArticles` throws on an unknown category

#### `agent/src/__tests__/summarizer.test.js`

Tests for the `stripFences()` utility exported from `summarizer.js`:
- Strips `` ```json `` fences
- Strips plain `` ``` `` fences
- Leaves clean JSON unchanged
- Handles leading/trailing whitespace

---

### `agent/openclaw/` — OpenClaw Configuration

Configuration and skill definitions for the OpenClaw multi-agent runtime.

#### `agent/openclaw/config/openclaw.json.template`

Template for `~/.openclaw/openclaw.json` on the VPS. Defines:
- **Model provider**: `ollama-cloud` — Ollama Cloud at `https://api.ollama.com`, model `ministral-3:3b`, 32K context window
- **Gateway**: loopback-only, port 18789

The `configure-openclaw.sh` script copies this file to `~/.openclaw/` and substitutes `${OLLAMA_API_KEY}` etc. with real values from `.env`.

#### `agent/openclaw/skills/newsroom-collector/SKILL.md`

System prompt for the collector agent. Takes raw RSS article objects and returns a clean, validated JSON array. Rules: strip "- Source Name" suffixes from titles, remove articles with missing URLs, ensure `published_at` is ISO 8601 or null.

#### `agent/openclaw/skills/newsroom-summarizer/SKILL.md`

System prompt for the summarizer agent. Takes a JSON array of articles and adds a `summary` field to each: 2-3 neutral sentences, under 75 words. Returns ONLY valid JSON — no markdown fences.

#### `agent/openclaw/skills/newsroom-tagger/SKILL.md`

System prompt for the tagger agent. Assigns one of four exact category strings (`AI`, `Technology`, `Startups`, `Gaming`) to each article based on title/summary. Defaults to `AI` if unsure. Returns ONLY valid JSON.

---

## `frontend/` — Next.js Web App

The public-facing newsroom UI. Deployed on Vercel. Reads from Supabase using the anon (read-only) key.

### `frontend/package.json`

Next.js 16, React 19. Key dependencies:
- `next`, `react`, `react-dom` — framework
- `@supabase/supabase-js` — database client
- `framer-motion` — card hover animations
- `react-type-animation` — typewriter effect in the intro
- `@base-ui/react` — headless UI primitives (Badge, Button)
- `class-variance-authority`, `clsx`, `tailwind-merge` — CSS utility helpers
- `lucide-react` — icon set
- `tailwindcss v4`, `tw-animate-css`, `shadcn` — styling

### `frontend/.nvmrc`

Pins Node.js version to 22 for Vercel and local dev. Ensures consistent runtime across environments.

### `frontend/.env.local`

Live env file for local dev and Vercel. Contains:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (safe for browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — read-only anon key (safe for browser)

Never contains `SUPABASE_SERVICE_KEY`.

### `frontend/.env.local.example`

Committed template for `.env.local`. Shows the two required `NEXT_PUBLIC_*` variables with placeholder values.

### `frontend/next.config.ts`

Next.js configuration. Currently empty (default config) — reserved for future settings like image domains or rewrites.

### `frontend/components.json`

shadcn/ui configuration. Defines:
- Style: `base-nova`
- CSS file: `app/globals.css`
- Path aliases: `@/components`, `@/lib/utils`, `@/components/ui`
- Icon library: lucide
- RSC and TypeScript enabled

Used by the `shadcn` CLI to add/update UI components.

### `frontend/tsconfig.json`

TypeScript configuration. Strict mode on; `@/*` alias maps to the `frontend/` root. Targets ES2017. Includes Next.js plugin for type awareness.

### `frontend/eslint.config.mjs`

ESLint flat config. Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`.

### `frontend/postcss.config.mjs`

PostCSS configuration. Enables `@tailwindcss/postcss` for Tailwind v4 compilation.

### `frontend/next-env.d.ts`

Auto-generated by Next.js. Adds TypeScript type declarations for `next/image` and `next/link`. Do not edit manually.

---

### `frontend/app/` — Next.js App Router Pages

#### `frontend/app/layout.tsx`

Root layout. Applies the Geist font (`--font-sans`), sets `lang="en"` and `class="dark"`, and wraps all pages in a `<body>` with `antialiased`. Sets the global `<title>` and `<meta description>`.

#### `frontend/app/globals.css`

Global stylesheet. Imports Tailwind v4, `tw-animate-css`, and shadcn's base CSS. Defines CSS custom properties for the design system (colors, radii) in both light and dark modes using OKLCH color space. Adds the `animate-pulse-slow` animation (used by the LIVE indicator).

#### `frontend/app/favicon.ico`

Browser tab icon. Static asset served by Next.js.

#### `frontend/app/page.tsx`

The home page (`/`). Server Component with `revalidate = 60`.
- No `?category` param → renders `<IntroScreen />` (cinematic intro, no DB query)
- With `?category` param → fetches up to 60 articles from Supabase (filtered by category if not "All"), renders `<Header>` + `<CategoryFilter>` + `<ArticleGrid>`

#### `frontend/app/status/page.tsx`

The `/status` page. Server Component with `revalidate = 60`. Shows:
- Health badge (green "Operational" / red "Degraded" based on last run status)
- 4 stat cards: Total Articles, Schedule, Last Run time, OpenClaw status
- `<PipelineTrigger />` — manual pipeline trigger card (client component)
- Run history table: last 10 pipeline runs with time, status badge, fetched/saved counts, duration, OpenClaw flag
- Last error message (if any)
- Infrastructure details: VPS, scheduler, agent runtime, LLM, database, monthly cost
- `<PipelineLogs />` — live runtime logs panel (client component)

#### `frontend/app/status/PipelineTrigger.tsx`

Client component (`'use client'`). Renders a card with a "Run Pipeline" button and inline state label (Idle / Running... / Success / Error). On click, POSTs to `/api/run-pipeline`. Button is disabled while running. Styled to match the existing dark card pattern.

#### `frontend/app/status/PipelineLogs.tsx`

Client component (`'use client'`). Fetches `GET /api/pipeline-logs` on mount and every 5 seconds via `setInterval`. Displays last 30 journalctl lines in a terminal-style scrollable block (monospace, dark background, green text). Stale data is preserved on transient fetch errors; interval is cleared on unmount.

---

### `frontend/app/api/` — Next.js API Routes

#### `frontend/app/api/run-pipeline/route.ts`

POST handler. Shells out to `systemctl --user start newsroom-pipeline.service` via `child_process.exec` (10 s timeout). Returns `{ ok: true }` on success or `{ error: string }` with HTTP 500 on failure. Called by `PipelineTrigger` for manual pipeline runs.

#### `frontend/app/api/pipeline-logs/route.ts`

GET handler. Shells out to `journalctl --user -u newsroom-pipeline.service -n 30 --no-pager` via `child_process.exec` (10 s timeout). Returns `{ lines: string[] }` (stdout split on newline, empty strings filtered) or `{ error: string }` with HTTP 500. Polled every 5 s by `PipelineLogs`.

---

### `frontend/components/` — React Components

#### `frontend/components/Header.tsx`

Sticky top navigation bar shown on the article listing view. Displays the site name, a pulsing "LIVE" badge, a "← Back to intro" link, the active category, a "System Status" link, and the article count. Props: `articleCount`, `activeCategory`.

#### `frontend/components/CategoryFilter.tsx`

Client component. Reads `?category` from the URL and renders 5 pill buttons (All, AI, Technology, Startups, Gaming). Each button navigates to `/?category=X` using `useRouter`. Active button is highlighted per-category (violet, blue, emerald, orange).

#### `frontend/components/ArticleGrid.tsx`

Renders the responsive article grid (1 → 2 → 3 columns). Passes `featured={true}` to the first article so it spans the full width. Shows a "No articles yet" empty state if the array is empty.

#### `frontend/components/ArticleCard.tsx`

Individual article card using Framer Motion for hover animation. Features:
- 3px gradient accent bar at the top (color per category)
- Category badge, relative date, article title, 2-line summary clamp
- Read-time estimate (based on word count), source name, hover arrow
- `featured` prop: first card spans full width with larger text
- Opens the source article in a new tab on click

#### `frontend/components/IntroScreen.tsx`

Thin server-safe wrapper that dynamically imports `NewsroomIntro` with `ssr: false` (disables server-side rendering for the animation-heavy component). Handles the `onComplete` callback by navigating to `/?category=All`.

#### `frontend/components/NewsroomIntro.tsx`

The full cinematic intro sequence (client component). Contains:
- SVG anchor figure (face, hair, blazer, microphone) with subtle float animation
- Pulsing rings and "ON AIR" badge
- Animated sound wave equaliser bars
- TypeAnimation typewriter cycling through broadcast phrases
- Category pill buttons that stagger in at 3.2s — clicking one navigates to `/?category=X`
- Broadcast info bar at the bottom
- Auto-dismisses to `/?category=All` after 10.5 seconds

#### `frontend/components/IntroWrapper.tsx`

Alternative intro wrapper (not used by `page.tsx`). Uses `sessionStorage` to show the intro only once per browser session. Currently unused — `page.tsx` uses `IntroScreen` directly (URL-as-state approach instead).

---

### `frontend/components/ui/` — shadcn/ui Primitives

#### `frontend/components/ui/badge.tsx`

Polymorphic Badge component built on `@base-ui/react`. Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`. Used in `ArticleCard` for category labels.

#### `frontend/components/ui/button.tsx`

Button component built on `@base-ui/react/button`. Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Sizes: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`. Used in `CategoryFilter`.

---

### `frontend/lib/` — Server-Side Utilities

#### `frontend/lib/supabase.ts`

Supabase client factory and shared types for the frontend. Exports:
- `Article` type — shape of a row from the `articles` table
- `CATEGORIES` — `['All', 'AI', 'Technology', 'Startups', 'Gaming']`
- `createSupabaseClient()` — creates a client using `NEXT_PUBLIC_*` env vars (anon key, read-only)

#### `frontend/lib/status.ts`

Data fetchers for the `/status` page. Exports:
- `PipelineRun` type — shape of a row from the `pipeline_runs` table
- `getRecentRuns(limit)` — fetches the most recent pipeline runs ordered by start time
- `getArticleCount()` — returns the total article count using `count: 'exact'`

#### `frontend/lib/utils.ts`

Single utility function: `cn(...inputs)` — merges Tailwind class names using `clsx` + `tailwind-merge`. Resolves conflicts (e.g., `text-red-500 text-blue-500` → `text-blue-500`). Used throughout all components.

---

## `scripts/` — VPS Setup Scripts

One-time or infrequent setup scripts. Run on the VPS manually.

#### `scripts/setup-vps.sh`

Run once as root on a fresh Ubuntu 22.04 instance. Installs system packages, Node.js 22 LTS, OpenClaw globally, enables systemd user linger for the `ubuntu` user, and creates required directories. Prints next-steps instructions at the end.

#### `scripts/configure-openclaw.sh`

Run as the `ubuntu` user after `setup-vps.sh`. Reads `agent/.env`, copies `openclaw.json.template` to `~/.openclaw/openclaw.json` with secrets substituted, copies all three SKILL.md files to `~/.openclaw/workspace/skills/`, and writes `~/.openclaw/env` (chmod 600) for the systemd EnvironmentFile.

#### `scripts/run-pipeline.sh`

Called by the systemd service on every scheduled run. Changes into `agent/`, runs `git pull --ff-only` (skips silently if not fast-forwardable), then runs `node src/pipeline.js`. Also safe to call manually for a one-off run.

#### `scripts/setup-supabase.sql`

Run once in the Supabase SQL editor to initialize the database schema. Creates:
- `articles` table with `url UNIQUE` constraint for deduplication
- Three indexes: `published_at DESC`, `category`, `created_at DESC`
- Row Level Security: public SELECT, no public INSERT/UPDATE/DELETE

> Note: The `pipeline_runs` table was created separately in the Supabase UI and is not in this file yet.

---

## `systemd/` — Systemd Unit Files

Copied to `~/.config/systemd/user/` on the VPS to run the pipeline on a schedule.

#### `systemd/newsroom-pipeline.service`

One-shot systemd service. Runs `scripts/run-pipeline.sh` as the `ubuntu` user. Loads secrets from `agent/.env` via `EnvironmentFile`. Triggered by the timer, not run directly.

#### `systemd/newsroom-pipeline.timer`

Systemd timer that fires the pipeline service at 00:00, 06:00, 12:00, and 18:00 UTC daily. `Persistent=true` means a missed run (e.g., VPS was down) fires once on next boot. `RandomizedDelaySec=300` adds up to 5 minutes of jitter to avoid thundering-herd issues.

#### `systemd/openclaw-gateway.service`

Persistent systemd service that keeps the OpenClaw gateway running at port 18789. Restarts automatically on crash (`Restart=always`, 5s backoff). Loads API keys from `~/.openclaw/env`. Starts after `network-online.target` so the gateway is available when the pipeline fires.

---

## `mydocs/` — Developer Notes

Internal documentation for this project. Not part of the deployed application.

| File | Purpose |
|------|---------|
| `MY_NOTES.md` | Running engineering log: what was built, what's planned, issues encountered, and current status of all phases. |
| `A_PLUS_GUIDE.md` | Step-by-step implementation guide for hardening the project to A+ quality: gateway routing fix, tool-calling agentic loop, alerting, cost doc, README updates, and more. |
| `REPO_MAP.md` | This file. |
