import 'dotenv/config';
import { fetchRssArticles, CATEGORY_FEEDS } from './rss.js';
import { filterNewArticles, insertArticles } from './supabase.js';
import { summarizeArticles as ollamaSummarize } from './summarizer.js';

const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';
const CATEGORIES = Object.keys(CATEGORY_FEEDS);

let ocSummarize, ocTag;
if (USE_OPENCLAW) {
  const oc = await import('./openclaw-pipeline.js');
  ocSummarize = oc.summarizeArticles;
  ocTag = oc.tagArticles;
}

async function runCategory(category) {
  console.log(`\n[pipeline] ── ${category} ──`);

  const articles = await fetchRssArticles(category, 8);
  console.log(`[pipeline] Fetched ${articles.length} articles`);

  const newArticles = await filterNewArticles(articles);
  const skipped = articles.length - newArticles.length;
  console.log(`[pipeline] ${newArticles.length} new (${skipped} skipped)`);

  if (newArticles.length === 0) return 0;

  let processed;
  if (USE_OPENCLAW) {
    const summarized = await ocSummarize(newArticles);
    processed = await ocTag(summarized);
  } else {
    processed = await ollamaSummarize(newArticles);
  }

  const saved = await insertArticles(processed);
  console.log(`[pipeline] Saved ${saved} articles`);
  return saved;
}

async function runPipeline() {
  console.log(`[pipeline] Starting — ${new Date().toISOString()} | OpenClaw: ${USE_OPENCLAW}`);
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
