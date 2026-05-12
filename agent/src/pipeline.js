import 'dotenv/config';
import { fetchRssArticles, CATEGORY_FEEDS } from './rss.js';
import {
  filterNewArticles,
  insertArticles,
  createPipelineRun,
  completePipelineRun,
  failPipelineRun,
} from './supabase.js';
import { summarizeArticles as ollamaSummarize } from './summarizer.js';

const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';
const CATEGORIES   = Object.keys(CATEGORY_FEEDS);

let ocSummarize, ocTag;
if (USE_OPENCLAW) {
  const oc = await import('./openclaw-pipeline.js');
  ocSummarize = oc.summarizeArticles;
  ocTag       = oc.tagArticles;
}

// Per-category fetch count: small batches keep LLM JSON output reliable
const ARTICLES_PER_CATEGORY = 4;

async function runCategory(category) {
  console.log(`\n[pipeline] ── ${category} ──`);

  const articles = await fetchRssArticles(category, ARTICLES_PER_CATEGORY);
  console.log(`[pipeline] Fetched ${articles.length} articles`);

  const newArticles = await filterNewArticles(articles);
  const skipped = articles.length - newArticles.length;
  console.log(`[pipeline] ${newArticles.length} new (${skipped} skipped)`);

  if (newArticles.length === 0) return { fetched: articles.length, saved: 0 };

  let processed;
  if (USE_OPENCLAW) {
    const summarized = await ocSummarize(newArticles);
    const tagged = await ocTag(summarized);

    processed = summarized.map((article, index) => ({
      ...article,
      ...(tagged[index] || {}),
    }));
  } else {
    processed = await ollamaSummarize(newArticles);
  }

  const saved = await insertArticles(processed);
  console.log(`[pipeline] Saved ${saved} articles`);
  return { fetched: articles.length, saved };
}

async function runPipeline() {
  const startedAt = Date.now();
  console.log(`[pipeline] ===== Starting — ${new Date().toISOString()} | OpenClaw: ${USE_OPENCLAW} =====`);

  const runId = await createPipelineRun();

  let totalFetched = 0;
  let totalSaved   = 0;
  const errors     = [];

  try {
    for (const category of CATEGORIES) {
      try {
        const { fetched, saved } = await runCategory(category);
        totalFetched += fetched;
        totalSaved   += saved;
      } catch (err) {
        console.error(`[pipeline] ERROR for ${category}: ${err.message}`);
        errors.push(`${category}: ${err.message}`);
      }
    }

    await completePipelineRun(runId, {
      articlesFetched: totalFetched,
      articlesSaved:   totalSaved,
      categoriesRun:   CATEGORIES,
      openclawUsed:    USE_OPENCLAW,
      startedAt,
    });

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\n[pipeline] ===== Done in ${duration}s — ${totalSaved} saved — ${new Date().toISOString()} =====`);

    if (errors.length > 0) {
      console.warn(`[pipeline] ${errors.length} category error(s):`, errors.join(' | '));
    }

  } catch (err) {
    console.error('[pipeline] FATAL:', err.message);
    await failPipelineRun(runId, err.message, startedAt);
    process.exit(1);
  }
}

runPipeline();
