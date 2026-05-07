// agent/src/pipeline.js — main orchestrator
import 'dotenv/config';
import { fetchRssArticles } from './rss.js';
import { filterNewArticles, insertArticles } from './supabase.js';

// Phase 2: uncomment when summarizer.js is ready
// import { summarizeArticles } from './summarizer.js';

async function runPipeline() {
  console.log(`[pipeline] Starting — ${new Date().toISOString()}`);

  // STEP 1: Collect articles from RSS
  console.log('[pipeline] Fetching RSS feed...');
  const articles = await fetchRssArticles(15);
  console.log(`[pipeline] Fetched ${articles.length} articles`);

  if (articles.length === 0) {
    console.log('[pipeline] No articles returned from RSS. Exiting.');
    return;
  }

  // STEP 2: Filter out duplicates already in Supabase
  const newArticles = await filterNewArticles(articles);
  const skipped = articles.length - newArticles.length;
  console.log(`[pipeline] ${newArticles.length} new articles (${skipped} duplicates skipped)`);

  if (newArticles.length === 0) {
    console.log('[pipeline] All articles already in DB. Done.');
    return;
  }

  // STEP 3: Summarize (Phase 2 — uncomment when ready)
  // console.log('[pipeline] Summarizing with Ollama...');
  // const summarized = await summarizeArticles(newArticles);

  // STEP 4: Save to Supabase
  console.log('[pipeline] Saving to Supabase...');
  const saved = await insertArticles(newArticles); // swap newArticles → summarized in Phase 2
  console.log(`[pipeline] Saved ${saved} articles. Done — ${new Date().toISOString()}`);
}

runPipeline().catch(err => {
  console.error('[pipeline] FATAL ERROR:', err.message);
  process.exit(1);
});
