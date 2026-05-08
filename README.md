# AI Newsroom

An autonomous newsroom that collects, summarises, and displays the latest AI/ML industry news — running 24/7 without manual intervention.

**Live:** _coming soon_

---

## What it does

1. A pipeline script runs every 6 hours on a VPS
2. It fetches the latest AI/ML articles from Google News RSS
3. An LLM (Ollama) writes a short summary for each article
4. Articles are stored in Supabase (duplicates are automatically skipped)
5. A Next.js frontend on Vercel reads from Supabase and displays them

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Agent runtime | OpenClaw | Multi-agent orchestration on the VPS |
| News source | Google News RSS | Free, no API key, reliable |
| LLM | Ollama Cloud `ministral-3:3b` | Free tier, fast, low token cost |
| Database | Supabase (PostgreSQL) | Hosted, free tier, excellent JS SDK |
| Frontend | Next.js 15 + Tailwind | App Router, Server Components, fast |
| Hosting | Vercel | Free tier, auto-deploys from GitHub |
| VPS | Oracle Cloud Free Tier | Always-free ARM VM, 4 cores 24 GB |
| Scheduler | systemd timer | Built-in Linux scheduler with logging |

---

## Project Structure

```
ai-newsroom/
├── agent/
│   ├── src/
│   │   ├── pipeline.js      # Main orchestrator — runs the full pipeline
│   │   ├── rss.js           # Fetches and parses Google News RSS
│   │   └── supabase.js      # Writes articles to Supabase
│   └── .env.example         # Environment variable template
├── frontend/                # Next.js app (Vercel)
├── scripts/
│   └── setup-supabase.sql   # Run once to create the DB schema
└── README.md
```

---

## Local Setup

### 1. Supabase
```
- Create a project at supabase.com
- Run scripts/setup-supabase.sql in the SQL Editor
- Copy your Project URL, anon key, and service_role key
```

### 2. Run the pipeline locally
```bash
cd agent
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
npm install
node src/pipeline.js
```

### 3. Run the frontend locally
```bash
cd frontend
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

**agent/.env**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OLLAMA_API_KEY=
OLLAMA_BASE_URL=
OLLAMA_MODEL=ministral-3:3b
```

**frontend/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
