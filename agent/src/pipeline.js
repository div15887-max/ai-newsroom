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
