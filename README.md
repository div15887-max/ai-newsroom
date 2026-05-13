# Divyani's AI Newsroom

An autonomous newsroom that collects, summarises, and displays the latest AI/ML industry news — running 24/7 without manual intervention.

**Live:** https://ai-newsroom-zeta.vercel.app  
**Repo:** https://github.com/div15887-max/ai-newsroom

---

## What it does

1. A pipeline runs every 6 hours on an AWS EC2 VPS
2. OpenClaw agents fetch the latest articles across 4 categories from Google News RSS
3. An Ollama LLM writes a concise 2–3 sentence summary for each article
4. A tagger agent assigns each article to a category (AI · Technology · Startups · Gaming)
5. Articles are stored in Supabase (duplicates silently skipped via `url UNIQUE`)
6. A Next.js frontend on Vercel reads from Supabase and shows them with a cinematic newsroom intro

---

## Architecture

```
AWS EC2 t3.micro (Ubuntu 22.04)
  │
  ├─ systemd timer (every 6 h)
  │       │
  │       ▼
  │  run-pipeline.sh
  │       │
  │       ▼
  │  OpenClaw Gateway (port 18789, loopback)
  │       │
  │       ├─► newsroom-collector  (validates + cleans RSS articles)
  │       ├─► newsroom-summarizer (Ollama LLM → 2–3 sentence summaries)
  │       └─► newsroom-tagger     (Ollama LLM → category assignment)
  │                   │
  │       pipeline.js └─► Supabase (service key, write)
  │
  └─────────────────────────────────────┐
                                        │ (anon key, read-only)
                                        ▼
                          Vercel — Next.js 15 App Router
                          ISR revalidate: 60 s
                          https://ai-newsroom-zeta.vercel.app
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Agent runtime | OpenClaw | Multi-agent orchestration |
| News source | Google News RSS (4 feeds) | Free, no API key, reliable |
| LLM | Ollama Cloud `ministral-3:3b` | Free tier, fast, low token cost |
| Database | Supabase (PostgreSQL) | Hosted, free tier, excellent JS SDK |
| Frontend | Next.js 15 + Tailwind CSS + Framer Motion | App Router, Server Components |
| Frontend hosting | Vercel | Free tier, auto-deploys from GitHub |
| VPS | AWS EC2 t3.micro (free tier) | Persistent Linux compute |
| Scheduler | systemd timer | Built-in, journald logs, survives reboots |

**Cost: $0/month on all services.**

---

## Project Structure

```
ai-newsroom/
├── agent/
│   ├── telegram-bot.js          # Telegram bot (polling — /run, /logs commands)
│   ├── src/
│   │   ├── pipeline.js          # Main orchestrator
│   │   ├── rss.js               # Google News RSS fetcher (4 categories)
│   │   ├── summarizer.js        # Ollama Cloud LLM summarization
│   │   ├── supabase.js          # Supabase write helper (dedup + insert)
│   │   ├── openclaw-pipeline.js # OpenClaw agent calls (summarizer + tagger)
│   │   └── telegram-notify.js   # Pipeline completion notifications
│   ├── openclaw/
│   │   ├── config/openclaw.json.template
│   │   └── skills/
│   │       ├── newsroom-collector/SKILL.md
│   │       ├── newsroom-summarizer/SKILL.md
│   │       └── newsroom-tagger/SKILL.md
│   ├── .env.example
│   └── package.json
├── frontend/                    # Next.js 15 app (Vercel)
│   ├── app/
│   ├── components/
│   └── lib/supabase.ts
├── scripts/
│   ├── setup-supabase.sql       # Run once in Supabase SQL Editor
│   ├── setup-vps.sh             # One-shot VPS bootstrap (Node 22 + OpenClaw)
│   ├── configure-openclaw.sh    # Copies skills, writes ~/.openclaw/env
│   └── run-pipeline.sh          # Called by systemd on each run
├── systemd/
│   ├── openclaw-gateway.service   # Keeps OpenClaw gateway running
│   ├── newsroom-pipeline.service
│   ├── newsroom-pipeline.timer    # Fires at 00/06/12/18:00 UTC
│   └── newsroom-telegram.service  # Telegram bot (polling)
└── README.md
```

---

## Full Redeploy Guide

### Prerequisites

- AWS account (free tier) — EC2 instance
- Supabase account (free tier) — database
- Ollama Cloud account (free tier) — LLM API
- Vercel account (free tier) — frontend hosting
- Node.js 22 LTS on your local machine

---

### Step 1 — Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → New Query → paste `scripts/setup-supabase.sql` → Run
3. Settings → API → copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend, read-only)
   - **service_role key** → `SUPABASE_SERVICE_KEY` (pipeline only, never commit)

---

### Step 2 — Ollama Cloud

1. Sign up at [ollama.com](https://ollama.com)
2. Create an API key
3. Note the base URL (e.g. `https://api.ollama.com`)
4. Model: `ministral-3:3b`

---

### Step 3 — Local Pipeline Test

```bash
cd agent
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, OLLAMA_API_KEY, OLLAMA_BASE_URL
npm install
node src/pipeline.js
# Verify rows appear in Supabase Table Editor
```

---

### Step 4 — Frontend (Vercel)

```bash
cd frontend
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev        # verify at localhost:3000
npm run build      # confirm no TypeScript errors
```

**Deploy to Vercel:**
1. Push repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. Set **Root Directory** to `frontend/`
4. Add env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

---

### Step 5 — AWS EC2 VPS

**Launch instance:**
- AMI: Ubuntu Server 22.04 LTS (free tier eligible)
- Instance type: t3.micro
- Key pair: RSA, download `.pem`
- Security group: allow SSH (port 22)

**Connect (Windows):**
```powershell
icacls newsroom-key.pem /inheritance:r
icacls newsroom-key.pem /grant:r "$($env:USERNAME):R"
ssh -i newsroom-key.pem ubuntu@<PUBLIC-IP>
```

**On the VPS:**
```bash
# Bootstrap (installs Node 22 + OpenClaw)
git clone https://github.com/div15887-max/ai-newsroom.git
cd ai-newsroom
sudo bash scripts/setup-vps.sh

# Configure
cd agent
cp .env.example .env
nano .env          # fill in all values; set USE_OPENCLAW=true
# generate gateway token: openssl rand -hex 32

cd ..
bash scripts/configure-openclaw.sh

# Manual test run
cd agent && node src/pipeline.js
# Confirm new articles appear in Supabase
```

**Install systemd automation:**
```bash
cp systemd/*.service ~/.config/systemd/user/
cp systemd/*.timer   ~/.config/systemd/user/
systemctl --user daemon-reload

# Start OpenClaw gateway
systemctl --user enable --now openclaw-gateway.service
systemctl --user status openclaw-gateway.service   # should show: active (running)

# Enable pipeline timer
systemctl --user enable --now newsroom-pipeline.timer
systemctl --user list-timers   # confirm next trigger shown
```

---

## Telegram Control (optional)

Control the pipeline and receive notifications from Telegram.

### Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) → copy the token
2. Get your chat ID: message [@userinfobot](https://t.me/userinfobot)
3. Add to `agent/.env` on the VPS:
   ```
   TELEGRAM_BOT_TOKEN=your-token-here
   TELEGRAM_CHAT_ID=your-chat-id-here
   ```
4. Install the bot service:
   ```bash
   cd ~/ai-newsroom/agent && npm install
   cp systemd/newsroom-telegram.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now newsroom-telegram.service
   systemctl --user status newsroom-telegram.service
   ```

### Commands

| Command | Action |
|---------|--------|
| `/start` | Confirm bot is active |
| `/run` | Trigger the pipeline immediately |
| `/logs` | Fetch the last 20 pipeline log lines |

### Notifications

The pipeline automatically sends a Telegram message when it finishes:

- ✅ **Success**: articles saved, duration, timestamp
- ⚠️ **Partial**: saved count + first category error
- ❌ **Fatal failure**: error message + duration

---

## Monitoring

```bash
# Follow live pipeline logs
journalctl --user -u newsroom-pipeline.service -f

# Follow Telegram bot logs
journalctl --user -u newsroom-telegram.service -f

# Check scheduled runs
systemctl --user list-timers

# Manual one-off run
systemctl --user start newsroom-pipeline.service
```

---

## Environment Variables

**`agent/.env`** (VPS only, never commit)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OLLAMA_API_KEY=
OLLAMA_BASE_URL=
OLLAMA_MODEL=ministral-3:3b
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
USE_OPENCLAW=true
TELEGRAM_BOT_TOKEN=          # optional — enables bot + notifications
TELEGRAM_CHAT_ID=            # optional
VPS_CONTROL_TOKEN=run-newsroom-2026
```

**`frontend/.env.local`** (safe for browser, read-only)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
