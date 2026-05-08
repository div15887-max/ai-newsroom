# Newsroom Evolution Design
**Date:** 2026-05-08  
**Status:** Approved

---

## Overview

Evolve the AI Newsroom from a single-topic AI/ML RSS dashboard into an interactive, category-driven newsroom experience. The user is greeted by an animated female AI anchor who asks what they want to hear about, then presents 4 category choices. After selection, the newsroom loads pre-filtered articles for that category.

This design covers:
- Phase 2: Ollama LLM summarization
- Multi-category RSS pipeline
- Animated intro with category selection

---

## Categories

Four categories, fixed:

| Label | Google News RSS Query |
|-------|----------------------|
| AI | `artificial+intelligence+machine+learning` |
| Technology | `technology+news` |
| Startups | `startups+venture+capital` |
| Gaming | `gaming+video+games` |

---

## 1. Pipeline Design

### Category-aware RSS fetching

`rss.js` gains a `CATEGORY_FEEDS` map and an updated signature:

```js
fetchRssArticles(category, limit = 15)
```

The function builds the RSS URL dynamically from the map. All other logic (XML parse, title clean, source extract, date parse) stays unchanged.

### Multi-category pipeline loop

`pipeline.js` loops through all 4 categories in sequence on every scheduled run:

```
for each category in ['AI', 'Technology', 'Startups', 'Gaming']:
  1. fetchRssArticles(category, 15)
  2. filterNewArticles(articles)         ← dedup by URL (existing)
  3. summarizeArticles(newArticles)      ← NEW: Ollama call
  4. insertArticles(summarized)          ← category stored per article
```

Each category is an independent loop iteration. A failure in one category is caught and logged — the loop continues with the next category rather than killing the whole run.

### Ollama summarization — summarizer.js (new file)

Single Ollama API call per category batch. Receives the array of new articles, returns them with a `summary` field added (2–3 sentences, under 75 words, neutral/factual tone).

Fallback: if JSON parse fails or API errors, articles are inserted with `summary: null` — never drops articles.

LLM call budget: 4 categories × 1 call/run × 4 runs/day = **16 calls/day** (well within Ollama free tier). Articles capped at **8 per category** (32 total/run) for cleaner frontend and lower summarization load.

### Supabase schema — no changes

The `category TEXT NOT NULL DEFAULT 'General'` column and its index already exist. No migration needed.

**Optional cleanup:** Phase 1 articles sit as `category = 'General'`. Since they were all AI/ML, they can be relabelled:
```sql
UPDATE articles SET category = 'AI' WHERE category = 'General';
```
Not required for the system to work.

---

## 2. Intro UX Design

### Behaviour

- **Shows once per browser session** via `sessionStorage`. Intro shows on first visit to a new tab; refresh skips it. `sessionStorage` is cleared when the tab closes, so reopening the site shows the intro again.
- User **must pick a category** — there is no skip button. The category selection is the point of the intro.
- After selection: `router.push('/?category=X')` fires + 600ms Framer Motion fade-out begins. Next.js re-renders with filtered articles server-side. By fade completion, content is ready.

### Animation sequence

| Step | What happens | Timing |
|------|-------------|--------|
| 1 | Full-screen dark overlay appears | instant |
| 2 | Female anchor avatar fades + scales in (silhouette + mic glow) | 0–0.8s |
| 3 | Station ID `DIVYANI'S NEWSROOM` types in | ~0.8–1.5s |
| 4 | Anchor speech types: *"Hi, welcome to Divyani's Newsroom. What would you like to hear about today?"* | ~1.5–4s |
| 5 | 4 category pills stagger in with Framer Motion | 4–4.6s |
| 6 | User clicks a category → pill glows violet → fade-out begins | on click |
| 7 | Main content reveals (already rendered behind overlay) | 600ms after click |

### Main content visibility

The main page content renders behind the overlay but is CSS `invisible` (not unmounted). This means Next.js fetches articles in the background while the intro plays. On intro exit, content snaps in immediately.

---

## 3. Frontend Component Changes

| File | Change |
|------|--------|
| `frontend/lib/supabase.ts` | Update `CATEGORIES` to `['AI', 'Technology', 'Startups', 'Gaming']` |
| `frontend/components/NewsroomIntro.tsx` | **Full rewrite** — anchor avatar, typewriter speech, staggered category pills, `router.push` on pick |
| `frontend/components/IntroWrapper.tsx` | Remove sessionStorage skip logic — always mount intro on session start |
| `frontend/components/ArticleCard.tsx` | Update `CATEGORY_STYLES` for the 4 new categories |
| `frontend/components/CategoryFilter.tsx` | Update to 4 categories (remains as in-page switcher after intro) |
| `frontend/app/page.tsx` | No structural change — already reads `searchParams.category` |

**Unchanged:** `globals.css`, `tailwind.config.ts`, `layout.tsx`, `supabase.js` (agent), Supabase schema.

---

## 4. Data Flow (end to end)

```
Scheduled run (every 6h via systemd — Phase 5; run manually for now):
  pipeline.js
    → for each of 4 categories:
        rss.js          → Google News RSS → [articles]
        supabase.js     → filter out known URLs
        summarizer.js   → Ollama API → articles + summaries
        supabase.js     → INSERT with category field

User visits site:
  Browser → Vercel (Next.js)
    → NewsroomIntro overlay appears
    → user picks "Gaming"
    → router.push('/?category=Gaming')
    → page.tsx Server Component: SELECT * FROM articles WHERE category='Gaming'
    → Supabase (anon key, read-only)
    → ArticleGrid renders filtered cards
```

---

## 5. Error Handling

| Failure | Behaviour |
|---------|-----------|
| RSS fetch fails for one category | Log error, continue loop with next category |
| Ollama API error / timeout | Insert articles with `summary: null`, continue |
| Ollama returns non-JSON | Strip fences, attempt parse; on failure → `summary: null` |
| Supabase insert conflict (duplicate URL) | `ignoreDuplicates: true` — silent skip |
| Frontend Supabase read error | Log to console, return empty array, render empty state |

---

## 6. AWS Free Tier Constraints

All infrastructure decisions must fit within AWS free tier on a **single t2.micro or t3.micro instance** (1 vCPU, 1 GB RAM, Ubuntu).

| Constraint | How this design complies |
|------------|--------------------------|
| No GPU compute | Ollama LLM runs on Ollama Cloud (external API), not on the VPS |
| Single instance | Pipeline is a lightweight Node.js script — well under 1 GB RAM |
| No Docker/K8s/ECS | systemd only |
| Minimal CPU | RSS fetches + HTTP API calls — network-bound, not CPU-bound |
| Low LLM call volume | 1 Ollama call per category per run × 4 runs/day = 16 calls/day |
| Reuse existing infra | Frontend on Vercel, DB on Supabase — AWS runs the pipeline only |
| No high-frequency polling | 6h schedule (configurable to 8h or 12h if needed) |

AWS is responsible for: scheduled pipeline execution, OpenClaw runtime (Phase 4).  
AWS is NOT responsible for: hosting the frontend, the database, or the LLM.

---

## 7. What is NOT changing

- VPS deployment — Phase 5, later
- OpenClaw integration — Phase 4, later
- systemd timer schedule — Phase 5, later
- Supabase schema
- RLS policies
- Overall Next.js App Router structure
- Vercel deployment config
