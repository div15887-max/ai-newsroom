# Newsroom Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the AI Newsroom into a category-driven interactive experience — multi-category RSS pipeline with Ollama summarization, and a cinematic animated intro where the AI anchor asks the user what to hear about.

**Architecture:** The agent pipeline loops through 4 categories (AI / Technology / Startups / Gaming) on every run, fetching RSS and summarizing with Ollama, storing to Supabase. The Next.js frontend shows an animated intro overlay (anchor + typewriter speech + category pills); picking a category fires `router.push('/?category=X')`, the intro fades, and filtered articles reveal. `IntroWrapper` lives in `layout.tsx` so its state survives client-side navigations.

**Tech Stack:** Node.js 22 LTS · `node:test` (built-in) · Supabase · Next.js 15 App Router · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · react-type-animation · Vercel

---

## File Map

### Agent (pipeline)

| File | Action | Responsibility |
|------|--------|---------------|
| `agent/src/rss.js` | Modify | Add `CATEGORY_FEEDS` map; accept `category` param; attach `category` to returned articles |
| `agent/src/summarizer.js` | **Create** | Ollama API call; add `summary` to articles; fallback to `null` on error |
| `agent/src/pipeline.js` | Modify | Loop 4 categories; per-category error isolation; call summarizer |
| `agent/package.json` | Modify | Add `"test"` script |
| `agent/src/__tests__/rss.test.js` | **Create** | Unit tests for CATEGORY_FEEDS and unknown-category guard |
| `agent/src/__tests__/summarizer.test.js` | **Create** | Unit tests for `stripFences` |

### Frontend

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/` | **Create** | Scaffolded by `create-next-app` |
| `frontend/lib/supabase.ts` | **Create** | Supabase client, `Article` type, `CATEGORIES` constant |
| `frontend/.env.local.example` | **Create** | Template for Supabase anon key |
| `frontend/app/globals.css` | Modify | Dark theme + glassmorphism base |
| `frontend/tailwind.config.ts` | Modify | Dark mode, `pulse-slow` animation |
| `frontend/app/layout.tsx` | Modify | Wrap body with `IntroWrapper` |
| `frontend/app/page.tsx` | Modify | Server Component — reads `searchParams.category`, fetches filtered articles |
| `frontend/components/ArticleCard.tsx` | **Create** | Glassmorphism card; category colour styles for 4 categories |
| `frontend/components/ArticleGrid.tsx` | **Create** | Responsive 3-col grid; empty state |
| `frontend/components/Header.tsx` | **Create** | Site header with LIVE indicator and active category label |
| `frontend/components/CategoryFilter.tsx` | **Create** | In-page 4-button category switcher |
| `frontend/components/NewsroomIntro.tsx` | **Create** | Animated overlay: anchor avatar → typewriter → category pills |
| `frontend/components/IntroWrapper.tsx` | **Create** | Client wrapper in layout; sessionStorage skip after first view; `router.push` on pick |

---

## Task 1 — Make rss.js category-aware

**Files:**
- Modify: `agent/src/rss.js`
- Modify: `agent/package.json`
- Create: `agent/src/__tests__/rss.test.js`

- [ ] **Step 1.1: Add test script to package.json**

Replace the `"scripts"` block in `agent/package.json`:

```json
"scripts": {
  "pipeline": "node src/pipeline.js",
  "test": "node --test src/__tests__/rss.test.js src/__tests__/summarizer.test.js"
},
```

- [ ] **Step 1.2: Create the test directory**

```powershell
mkdir "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\agent\src\__tests__"
```

- [ ] **Step 1.3: Write the failing tests**

Create `agent/src/__tests__/rss.test.js`:

```javascript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CATEGORY_FEEDS, fetchRssArticles } from '../rss.js';

test('CATEGORY_FEEDS has exactly the 4 expected categories', () => {
  assert.deepStrictEqual(Object.keys(CATEGORY_FEEDS), ['AI', 'Technology', 'Startups', 'Gaming']);
});

test('CATEGORY_FEEDS values are non-empty strings', () => {
  for (const val of Object.values(CATEGORY_FEEDS)) {
    assert.ok(typeof val === 'string' && val.length > 0);
  }
});

test('fetchRssArticles throws on unknown category', async () => {
  await assert.rejects(
    () => fetchRssArticles('Unknown'),
    { message: 'Unknown category: Unknown' }
  );
});
```

- [ ] **Step 1.4: Run tests — verify they fail**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\agent"
node --test src/__tests__/rss.test.js
```

Expected: 3 failures (CATEGORY_FEEDS not exported yet, fetchRssArticles has wrong signature).

- [ ] **Step 1.5: Rewrite agent/src/rss.js**

```javascript
import { XMLParser } from 'fast-xml-parser';

export const CATEGORY_FEEDS = {
  'AI':         'artificial+intelligence+machine+learning',
  'Technology': 'technology+news',
  'Startups':   'startups+venture+capital',
  'Gaming':     'gaming+video+games',
};

const parser = new XMLParser({ ignoreAttributes: false });

export async function fetchRssArticles(category, limit = 15) {
  const query = CATEGORY_FEEDS[category];
  if (!query) throw new Error(`Unknown category: ${category}`);

  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Newsroom/1.0)' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const result = parser.parse(xml);
  const items = result?.rss?.channel?.item ?? [];

  return items.slice(0, limit).map(item => ({
    title:        cleanTitle(String(item.title ?? '')),
    url:          String(item.link ?? ''),
    source:       extractSource(item),
    published_at: parsePubDate(String(item.pubDate ?? '')),
    category,
  })).filter(a => a.url && a.title);
}

function cleanTitle(title) {
  return title.replace(/\s-\s[^-]+$/, '').trim();
}

function extractSource(item) {
  if (item.source) {
    return String(item.source?.['#text'] ?? item.source ?? 'Unknown');
  }
  const match = String(item.title ?? '').match(/\s-\s([^-]+)$/);
  return match ? match[1].trim() : 'Unknown';
}

function parsePubDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
```

- [ ] **Step 1.6: Run tests — verify they pass**

```powershell
node --test src/__tests__/rss.test.js
```

Expected output:
```
✔ CATEGORY_FEEDS has exactly the 4 expected categories (Xms)
✔ CATEGORY_FEEDS values are non-empty strings (Xms)
✔ fetchRssArticles throws on unknown category (Xms)
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

- [ ] **Step 1.7: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add agent/src/rss.js agent/src/__tests__/rss.test.js agent/package.json
git commit -m "feat: make rss.js category-aware with CATEGORY_FEEDS map"
```

---

## Task 2 — Create summarizer.js

**Files:**
- Create: `agent/src/summarizer.js`
- Create: `agent/src/__tests__/summarizer.test.js`

- [ ] **Step 2.1: Write the failing tests**

Create `agent/src/__tests__/summarizer.test.js`:

```javascript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { stripFences } from '../summarizer.js';

test('stripFences removes ```json fences', () => {
  const input = '```json\n[{"summary":"test"}]\n```';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

test('stripFences removes plain ``` fences', () => {
  const input = '```\n[{"summary":"test"}]\n```';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

test('stripFences leaves clean JSON unchanged', () => {
  const input = '[{"summary":"test"}]';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

test('stripFences handles leading/trailing whitespace', () => {
  const input = '  ```json\n[{"summary":"test"}]\n```  ';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});
```

- [ ] **Step 2.2: Run tests — verify they fail**

```powershell
node --test src/__tests__/summarizer.test.js
```

Expected: 4 failures (module not created yet).

- [ ] **Step 2.3: Create agent/src/summarizer.js**

```javascript
const BASE_URL = process.env.OLLAMA_BASE_URL;
const API_KEY  = process.env.OLLAMA_API_KEY;
const MODEL    = process.env.OLLAMA_MODEL || 'llama3.2:3b';

const SYSTEM_PROMPT = `You are a professional journalist. You receive a JSON array of news articles.
For each article, write a neutral, factual 2-3 sentence summary based on its title.
Keep each summary under 75 words.
Return ONLY a valid JSON array — no explanation, no code fences.
Add a "summary" field to each article object. Keep all other fields unchanged.`;

export function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '').trim();
}

export async function summarizeArticles(articles) {
  if (articles.length === 0) return [];

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Summarize these articles:\n${JSON.stringify(articles, null, 2)}` },
      ],
      stream: false,
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = data?.message?.content ?? data?.choices?.[0]?.message?.content ?? '';

  try {
    const parsed = JSON.parse(stripFences(raw));
    return Array.isArray(parsed) ? parsed : nullSummaries(articles);
  } catch {
    console.error('[summarizer] JSON parse failed. Raw response:', raw.slice(0, 400));
    return nullSummaries(articles);
  }
}

function nullSummaries(articles) {
  return articles.map(a => ({ ...a, summary: null }));
}
```

- [ ] **Step 2.4: Run tests — verify they pass**

```powershell
node --test src/__tests__/summarizer.test.js
```

Expected:
```
✔ stripFences removes ```json fences (Xms)
✔ stripFences removes plain ``` fences (Xms)
✔ stripFences leaves clean JSON unchanged (Xms)
✔ stripFences handles leading/trailing whitespace (Xms)
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

- [ ] **Step 2.5: Run full test suite**

```powershell
npm test
```

Expected: 7 tests, 7 pass, 0 fail.

- [ ] **Step 2.6: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add agent/src/summarizer.js agent/src/__tests__/summarizer.test.js
git commit -m "feat: add Ollama summarizer with stripFences fallback"
```

---

## Task 3 — Update pipeline.js for multi-category loop

**Files:**
- Modify: `agent/src/pipeline.js`

- [ ] **Step 3.1: Rewrite agent/src/pipeline.js**

```javascript
import 'dotenv/config';
import { fetchRssArticles, CATEGORY_FEEDS } from './rss.js';
import { filterNewArticles, insertArticles } from './supabase.js';
import { summarizeArticles } from './summarizer.js';

const CATEGORIES = Object.keys(CATEGORY_FEEDS);

async function runCategory(category) {
  console.log(`\n[pipeline] ── ${category} ──`);

  const articles = await fetchRssArticles(category, 8);
  console.log(`[pipeline] Fetched ${articles.length} articles`);

  const newArticles = await filterNewArticles(articles);
  const skipped = articles.length - newArticles.length;
  console.log(`[pipeline] ${newArticles.length} new (${skipped} skipped)`);

  if (newArticles.length === 0) return 0;

  const summarized = await summarizeArticles(newArticles);
  const saved = await insertArticles(summarized);
  console.log(`[pipeline] Saved ${saved} articles`);
  return saved;
}

async function runPipeline() {
  console.log(`[pipeline] Starting — ${new Date().toISOString()}`);
  let totalSaved = 0;

  for (const category of CATEGORIES) {
    try {
      totalSaved += await runCategory(category);
    } catch (err) {
      console.error(`[pipeline] ERROR for ${category}: ${err.message}`);
    }
  }

  console.log(`\n[pipeline] Done — ${totalSaved} total articles saved — ${new Date().toISOString()}`);
}

runPipeline().catch(err => {
  console.error('[pipeline] FATAL:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3.2: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add agent/src/pipeline.js
git commit -m "feat: pipeline loops all 4 categories with per-category error isolation"
```

---

## Task 4 — Configure Ollama credentials and verify pipeline locally

**Files:** `agent/.env` (manual edit — never committed)

- [ ] **Step 4.1: Add Ollama credentials to agent/.env**

Open `agent/.env` in your editor. Fill in the three Ollama fields:

```
OLLAMA_API_KEY=<your key from ollama.com dashboard>
OLLAMA_BASE_URL=<base URL from ollama.com dashboard>
OLLAMA_MODEL=llama3.2:3b
```

Leave `USE_OPENCLAW=false` and `OPENCLAW_*` blank for now.

- [ ] **Step 4.2: Run the pipeline**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\agent"
node src/pipeline.js
```

Expected output:
```
[pipeline] Starting — 2026-05-08T...

[pipeline] ── AI ──
[pipeline] Fetched 8 articles
[pipeline] 8 new (0 skipped)
[pipeline] Saved 8 articles

[pipeline] ── Technology ──
[pipeline] Fetched 8 articles
[pipeline] 8 new (0 skipped)
[pipeline] Saved 8 articles

[pipeline] ── Startups ──
...

[pipeline] ── Gaming ──
...

[pipeline] Done — 32 total articles saved — 2026-05-08T...
```

- [ ] **Step 4.3: Verify in Supabase Table Editor**

Open Supabase → Table Editor → `articles`. Confirm:
- ~60 rows with `title`, `source`, `url`, `published_at` populated
- `summary` column has text (not NULL) on articles from this run
- `category` column shows `AI`, `Technology`, `Startups`, `Gaming` across rows

- [ ] **Step 4.4: Run pipeline a second time (dedup test)**

```powershell
node src/pipeline.js
```

Expected: each category logs `0 new (15 duplicates skipped)`. Total saved: 0.

- [ ] **Step 4.5: Update MY_NOTES.md**

Open `c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\MY_NOTES.md` and append:

```markdown
---

## Step 3 — Phase 2: Ollama LLM Summarization + Multi-Category Pipeline

**Files created/modified:**
- `agent/src/rss.js` — now category-aware; `CATEGORY_FEEDS` maps 4 categories to Google News RSS queries
- `agent/src/summarizer.js` — calls Ollama Cloud API; adds `summary` field to articles; falls back to `null` on error
- `agent/src/pipeline.js` — loops all 4 categories; per-category try/catch so one failure doesn't stop others
- `agent/src/__tests__/rss.test.js` — tests CATEGORY_FEEDS map and unknown-category guard
- `agent/src/__tests__/summarizer.test.js` — tests stripFences helper

**The 4 categories and their RSS queries:**

| Category | Google News Query |
|----------|------------------|
| AI | artificial+intelligence+machine+learning |
| Technology | technology+news |
| Startups | startups+venture+capital |
| Gaming | gaming+video+games |

**Why per-category error isolation?**
If the Ollama API fails for one category (rate limit, timeout), the other 3 categories still run.
A single `try/catch` around each `runCategory()` call handles this cleanly.

**LLM call budget:** 4 categories × 1 call/run × 4 runs/day = 16 calls/day (well within free tier).

**Dedup still works:** `url UNIQUE` constraint in Supabase rejects duplicates silently.
Articles from Phase 1 remain in DB with `category = 'General'` — they are invisible to the 4-category filter but cause no errors.
```

- [ ] **Step 4.6: Commit notes**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add MY_NOTES.md
git commit -m "docs: update MY_NOTES with Phase 2 pipeline changes"
```

---

## Task 5 — Scaffold Next.js frontend

**Files:** Create `frontend/` directory (CLI scaffold)

- [ ] **Step 5.1: Scaffold the app**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --no-git
```

When prompted interactively, accept all defaults.

- [ ] **Step 5.2: Install additional dependencies**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\frontend"
npm install @supabase/supabase-js framer-motion react-type-animation
```

- [ ] **Step 5.3: Initialise shadcn/ui**

```powershell
npx shadcn@latest init --defaults
npx shadcn@latest add card badge button
```

When `shadcn init` asks questions, choose: Default style · Slate color · CSS variables: Yes.

- [ ] **Step 5.4: Create .env.local.example**

Create `frontend/.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 5.5: Create frontend/.env.local**

```powershell
Copy-Item "frontend\.env.local.example" "frontend\.env.local"
```

Open `frontend/.env.local` and fill in your real Supabase URL and anon key (from Supabase → Settings → API → `anon / public` key).

- [ ] **Step 5.6: Add .env.local to .gitignore**

Open the root `.gitignore` (or create one at the repo root). Ensure these lines are present:

```
agent/.env
frontend/.env.local
```

- [ ] **Step 5.7: Commit scaffold**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/ .gitignore
git commit -m "feat: scaffold Next.js 15 frontend with shadcn/ui, Framer Motion"
```

---

## Task 6 — Supabase client and Article type

**Files:**
- Create: `frontend/lib/supabase.ts`

- [ ] **Step 6.1: Create frontend/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js';

export type Article = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  published_at: string | null;
  category: string;
  created_at: string;
};

export const CATEGORIES = ['AI', 'Technology', 'Startups', 'Gaming'] as const;
export type Category = typeof CATEGORIES[number];

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 6.2: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/lib/supabase.ts
git commit -m "feat: add Supabase client, Article type, and CATEGORIES constant"
```

---

## Task 7 — Dark theme: globals.css and tailwind.config.ts

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 7.1: Replace frontend/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --card: 224 71% 6%;
    --card-foreground: 213 31% 91%;
    --primary: 263 70% 50%;
    --primary-foreground: 210 40% 98%;
    --muted: 223 47% 11%;
    --muted-foreground: 215 20% 65%;
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    --accent: 216 34% 17%;
    --accent-foreground: 210 40% 98%;
    --radius: 0.75rem;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-[#0a0a0f] text-foreground;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 80, 255, 0.15), transparent),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(79, 70, 229, 0.08), transparent);
  }
}

@layer components {
  .glass-card {
    @apply bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-xl;
  }
  .glass-card:hover {
    @apply bg-white/[0.07] border-white/[0.15] transition-all duration-300;
  }
}
```

- [ ] **Step 7.2: Replace frontend/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

- [ ] **Step 7.3: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/app/globals.css frontend/tailwind.config.ts
git commit -m "feat: dark glassmorphism theme and Tailwind config"
```

---

## Task 8 — ArticleCard and ArticleGrid components

**Files:**
- Create: `frontend/components/ArticleCard.tsx`
- Create: `frontend/components/ArticleGrid.tsx`

- [ ] **Step 8.1: Create frontend/components/ArticleCard.tsx**

```typescript
'use client';
import { motion } from 'framer-motion';
import type { Article } from '@/lib/supabase';

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  AI:          { bg: 'bg-blue-500/15',   text: 'text-blue-300'   },
  Technology:  { bg: 'bg-cyan-500/15',   text: 'text-cyan-300'   },
  Startups:    { bg: 'bg-green-500/15',  text: 'text-green-300'  },
  Gaming:      { bg: 'bg-purple-500/15', text: 'text-purple-300' },
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ArticleCard({ article, index }: { article: Article; index: number }) {
  const style = CATEGORY_STYLES[article.category] ?? { bg: 'bg-white/10', text: 'text-white/60' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="glass-card flex flex-col h-full p-5 group cursor-pointer block"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}>
            {article.category}
          </span>
          <span className="text-[11px] text-white/30 whitespace-nowrap shrink-0">
            {formatDate(article.published_at)}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-3 group-hover:text-white transition-colors mb-3">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-4 flex-1 mb-3">
            {article.summary}
          </p>
        )}

        <div className="mt-auto pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] text-white/30 font-medium">{article.source}</span>
        </div>
      </a>
    </motion.div>
  );
}
```

- [ ] **Step 8.2: Create frontend/components/ArticleGrid.tsx**

```typescript
import type { Article } from '@/lib/supabase';
import { ArticleCard } from './ArticleCard';

export function ArticleGrid({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-5xl mb-4">📡</div>
        <p className="text-lg font-semibold text-white/60">No articles yet</p>
        <p className="mt-2 text-sm text-white/30">
          The pipeline will collect articles on its next scheduled run.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, i) => (
        <ArticleCard key={article.id} article={article} index={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 8.3: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/components/ArticleCard.tsx frontend/components/ArticleGrid.tsx
git commit -m "feat: glassmorphism ArticleCard and ArticleGrid components"
```

---

## Task 9 — Header and CategoryFilter components

**Files:**
- Create: `frontend/components/Header.tsx`
- Create: `frontend/components/CategoryFilter.tsx`

- [ ] **Step 9.1: Create frontend/components/Header.tsx**

```typescript
import type { Category } from '@/lib/supabase';

export function Header({ articleCount, activeCategory }: { articleCount: number; activeCategory: Category }) {
  return (
    <header className="border-b border-white/[0.08] bg-black/20 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                DIVYANI'S NEWSROOM
              </h1>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                LIVE
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/40">
              {activeCategory} · collected autonomously
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{articleCount}</span>
            <p className="text-xs text-white/40">articles</p>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 9.2: Create frontend/components/CategoryFilter.tsx**

```typescript
'use client';
import { useRouter } from 'next/navigation';
import { CATEGORIES, type Category } from '@/lib/supabase';

export function CategoryFilter({ activeCategory }: { activeCategory: Category }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => router.push(`/?category=${cat}`, { scroll: false })}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
            ${activeCategory === cat
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/90'}
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 9.3: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/components/Header.tsx frontend/components/CategoryFilter.tsx
git commit -m "feat: Header with LIVE indicator and CategoryFilter switcher"
```

---

## Task 10 — NewsroomIntro animated component

**Files:**
- Create: `frontend/components/NewsroomIntro.tsx`

- [ ] **Step 10.1: Create frontend/components/NewsroomIntro.tsx**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { CATEGORIES, type Category } from '@/lib/supabase';

interface NewsroomIntroProps {
  onPick: (category: Category) => void;
  onComplete: () => void;
}

type Phase = 'avatar' | 'speech' | 'pills';

function AnchorAvatar() {
  return (
    <motion.div
      className="relative mx-auto mb-8 h-32 w-32"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-xl animate-pulse-slow" />
      <div className="absolute inset-0 rounded-full border border-violet-500/30" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 80 90" className="w-20 text-violet-200/80" fill="currentColor">
          <ellipse cx="40" cy="26" rx="22" ry="6" opacity="0.9" />
          <ellipse cx="40" cy="34" rx="17" ry="20" />
          <rect x="34" y="51" width="12" height="10" rx="3" />
          <path d="M10 90 Q22 62 40 58 Q58 62 70 90Z" />
        </svg>
      </div>
      <motion.div
        className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 border-2 border-[#0a0a0f] shadow-lg shadow-violet-500/30"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

export function NewsroomIntro({ onPick, onComplete }: NewsroomIntroProps) {
  const [phase, setPhase] = useState<Phase>('avatar');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPhase('speech'), 400);
    return () => clearTimeout(t);
  }, []);

  function handleCategoryClick(cat: Category) {
    onPick(cat);
    setVisible(false);
    setTimeout(onComplete, 600);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05050a]"
          aria-label="Welcome to Divyani's Newsroom"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-700/10 blur-3xl" />
          </div>

          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent pointer-events-none"
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.5, ease: 'linear' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
            <AnchorAvatar />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'avatar' ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="mb-2 text-xs font-semibold tracking-[0.3em] text-violet-400/70 uppercase"
            >
              BREAKING NOW
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: phase !== 'avatar' ? 1 : 0, y: phase !== 'avatar' ? 0 : 8 }}
              transition={{ duration: 0.5 }}
              className="mb-6 text-2xl font-bold tracking-wide text-white sm:text-3xl"
            >
              DIVYANI'S NEWSROOM
            </motion.h1>

            <div className="min-h-[3.5rem] mb-8" aria-live="polite">
              {(phase === 'speech' || phase === 'pills') && (
                <TypeAnimation
                  sequence={[
                    "Hi, welcome to Divyani's Newsroom. What would you like to hear about today?",
                    200,
                    () => setPhase('pills'),
                  ]}
                  speed={75}
                  cursor={phase === 'speech'}
                  className="text-base text-white/80 leading-relaxed"
                />
              )}
            </div>

            <AnimatePresence>
              {phase === 'pills' && (
                <motion.div
                  key="pills"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap justify-center gap-3 w-full"
                >
                  {CATEGORIES.map((cat, i) => (
                    <motion.button
                      key={cat}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      onClick={() => handleCategoryClick(cat)}
                      className="px-6 py-2.5 rounded-full border border-white/15 text-sm font-medium text-white/70 bg-white/5 hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      {cat}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 10.2: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/components/NewsroomIntro.tsx
git commit -m "feat: animated NewsroomIntro with anchor avatar, typewriter, and category pills"
```

---

## Task 11 — IntroWrapper, layout.tsx, and page.tsx

**Files:**
- Create: `frontend/components/IntroWrapper.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 11.1: Create frontend/components/IntroWrapper.tsx**

`IntroWrapper` lives in `layout.tsx` so its state (`introComplete`) survives client-side navigations — if it were in `page.tsx`, it would re-mount on every `router.push`. `sessionStorage` means the intro shows once per browser session — refreshing skips it, opening a new tab shows it again.

```typescript
'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/supabase';

const NewsroomIntro = dynamic(
  () => import('./NewsroomIntro').then(m => ({ default: m.NewsroomIntro })),
  { ssr: false }
);

export function IntroWrapper({ children }: { children: React.ReactNode }) {
  const [introComplete, setIntroComplete] = useState(true); // true = skip until we check storage
  const router = useRouter();

  useEffect(() => {
    // Only show intro if not already seen this session
    if (!sessionStorage.getItem('intro_seen')) {
      setIntroComplete(false);
    }
  }, []);

  function handlePick(cat: Category) {
    router.push(`/?category=${cat}`);
  }

  function handleComplete() {
    sessionStorage.setItem('intro_seen', 'true');
    setIntroComplete(true);
  }

  return (
    <>
      {!introComplete && (
        <NewsroomIntro
          onPick={handlePick}
          onComplete={handleComplete}
        />
      )}
      <div className={introComplete ? '' : 'invisible'}>
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 11.2: Update frontend/app/layout.tsx**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { IntroWrapper } from '@/components/IntroWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Divyani's Newsroom",
  description: 'Latest AI, Tech, Startups and Gaming news — collected and summarised autonomously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen antialiased`}>
        <IntroWrapper>
          {children}
        </IntroWrapper>
      </body>
    </html>
  );
}
```

- [ ] **Step 11.3: Update frontend/app/page.tsx**

```typescript
import { Suspense } from 'react';
import { createSupabaseClient, CATEGORIES } from '@/lib/supabase';
import type { Article, Category } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ArticleGrid } from '@/components/ArticleGrid';

export const revalidate = 60;

async function getArticles(category: string): Promise<Article[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('category', category)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(60);

  if (error) {
    console.error('[page] Supabase error:', error.message);
    return [];
  }
  return data as Article[];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = ((CATEGORIES as readonly string[]).includes(category ?? '')
    ? category
    : 'AI') as Category;

  const articles = await getArticles(activeCategory);

  return (
    <div className="min-h-screen">
      <Header articleCount={articles.length} activeCategory={activeCategory} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Suspense>
            <CategoryFilter activeCategory={activeCategory} />
          </Suspense>
        </div>
        <ArticleGrid articles={articles} />
      </main>
      <footer className="mt-16 border-t border-white/[0.06] py-8 text-center text-xs text-white/20">
        Powered by OpenClaw · Supabase · Vercel · Updated every 6 hours
      </footer>
    </div>
  );
}
```

- [ ] **Step 11.4: Run dev server and verify locally**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\frontend"
npm run dev
```

Open http://localhost:3000. Verify in order:

1. Dark screen fades in — anchor avatar scales in with violet glow
2. "BREAKING NOW" and "DIVYANI'S NEWSROOM" fade in after ~0.8s
3. Typewriter types the anchor speech
4. Four category pills appear with staggered entrance
5. Click a pill (e.g. Gaming) → pills/overlay fade out → Gaming articles grid appears
6. Header shows "Gaming · collected autonomously"
7. CategoryFilter shows 4 buttons, Gaming highlighted
8. Click "Technology" in the filter → Technology articles load (no intro re-shown)
9. Refresh the page → intro shows again from the beginning

- [ ] **Step 11.5: Run TypeScript build check**

```powershell
npm run build
```

Expected: no TypeScript errors, build completes successfully.

- [ ] **Step 11.6: Commit**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add frontend/components/IntroWrapper.tsx frontend/app/layout.tsx frontend/app/page.tsx
git commit -m "feat: wire IntroWrapper into layout, update page.tsx for category-filtered SSR"
```

---

## Task 12 — Vercel deployment and final notes

**Files:** `MY_NOTES.md` (manual update)

- [ ] **Step 12.1: Push to GitHub**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git push
```

If you haven't set the remote yet:
```powershell
git remote add origin git@github-personal:div15887-max/ai-newsroom.git
git push -u origin main
```

- [ ] **Step 12.2: Import project on Vercel**

Go to https://vercel.com/new → Import Git Repository → select `ai-newsroom`.

```
Framework Preset:  Next.js
Root Directory:    frontend          ← IMPORTANT: set this to frontend/
Build Command:     npm run build
Install Command:   npm install
```

- [ ] **Step 12.3: Set environment variables on Vercel**

Vercel → Project → Settings → Environment Variables. Add both variables to Production + Preview + Development:

```
NEXT_PUBLIC_SUPABASE_URL       = https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon/public key>
```

- [ ] **Step 12.4: Deploy and verify**

Click Deploy. Wait ~2 minutes. Open the Vercel URL and verify:

1. Intro plays correctly on first load
2. Category pills appear and are clickable
3. Articles load after category selection
4. Mobile view renders cleanly (test at ~375px width)
5. Refresh → intro shows again (no sessionStorage skip)

- [ ] **Step 12.5: Update MY_NOTES.md**

Append to `c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom\MY_NOTES.md`:

```markdown
---

## Step 4 — Phase 3: Next.js Frontend + Vercel Deployment

**Files created:**
- `frontend/lib/supabase.ts` — Supabase read-only client (anon key), Article type, CATEGORIES constant
- `frontend/components/NewsroomIntro.tsx` — animated intro overlay: AnchorAvatar + typewriter + 4 category pills
- `frontend/components/IntroWrapper.tsx` — client wrapper in layout.tsx; always shows intro; routes category pick via router.push
- `frontend/components/ArticleCard.tsx` — glassmorphism card; colour-coded by category
- `frontend/components/ArticleGrid.tsx` — responsive 3-column grid with empty state
- `frontend/components/Header.tsx` — sticky header with LIVE indicator and active category name
- `frontend/components/CategoryFilter.tsx` — in-page 4-button switcher
- `frontend/app/layout.tsx` — wraps body with IntroWrapper (persists state across navigations)
- `frontend/app/page.tsx` — Server Component; reads searchParams.category; defaults to AI

**Key architecture decisions:**

**Why IntroWrapper is in layout.tsx, not page.tsx:**
Client component state resets on every navigation. If IntroWrapper were in page.tsx, every `router.push` (category switch) would re-mount it and re-show the intro. Putting it in layout.tsx means it mounts once per browser session and its `introComplete` state persists.

**Why `invisible` not `hidden`:**
The page content renders on the server (SSR) while the intro plays. Making it `invisible` keeps it in the layout (height, reflow) but hides it visually. `hidden` would collapse it, causing a layout jump on reveal.

**Why category selection is inside the intro (not after):**
The anchor's question is a literal prompt. Having the user answer it within the intro makes the interaction feel purposeful. After selection, the newsroom loads already filtered — immediate gratification.

**What's coming next:**

| Phase | What | Status |
|-------|------|--------|
| Phase 4 | OpenClaw multi-agent integration | ⏳ Pending |
| Phase 5 | AWS EC2 VPS + systemd timer | ⏳ Pending |
```

- [ ] **Step 12.6: Commit notes**

```powershell
cd "c:\Users\K2 Group\Desktop\ai-newsroom\ai-newsroom"
git add MY_NOTES.md
git push
git commit -m "docs: update MY_NOTES with Phase 3 frontend and deployment notes"
git push
```

---

## Deployment Checklist

- [ ] `node src/pipeline.js` runs locally — 60 articles across 4 categories in Supabase with summaries
- [ ] All 7 unit tests pass (`npm test` in `agent/`)
- [ ] `npm run dev` in `frontend/` — intro plays, category selection works, articles render
- [ ] `npm run build` in `frontend/` — no TypeScript errors
- [ ] GitHub repo is public
- [ ] Vercel deployment live — intro plays on the production URL
- [ ] Category switching works on production URL
- [ ] Mobile view renders cleanly
