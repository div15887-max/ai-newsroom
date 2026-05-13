// agent/src/supabase.js — Supabase write helper (uses service key)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function filterNewArticles(articles) {
  // 1. Deduplicate within the incoming batch by normalized title
  const seenTitles = new Set();
  const batchDeduped = articles.filter(a => {
    const norm = a.title.trim().toLowerCase();
    if (seenTitles.has(norm)) return false;
    seenTitles.add(norm);
    return true;
  });

  if (batchDeduped.length === 0) return [];

  // 2. Filter by URL against existing DB rows
  const urls = batchDeduped.map(a => a.url);
  const { data: urlData, error: urlError } = await supabase
    .from('articles')
    .select('url')
    .in('url', urls);
  if (urlError) throw new Error(`Supabase dedup check failed: ${urlError.message}`);
  const existingUrls = new Set(urlData.map(r => r.url));
  const afterUrlDedup = batchDeduped.filter(a => !existingUrls.has(a.url));

  if (afterUrlDedup.length === 0) return [];

  // 3. Filter by normalized title against existing DB titles
  const { data: titleData, error: titleError } = await supabase
    .from('articles')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(500);
  if (titleError) throw new Error(`Supabase title dedup check failed: ${titleError.message}`);
  const existingNormTitles = new Set((titleData ?? []).map(r => r.title.trim().toLowerCase()));
  return afterUrlDedup.filter(a => !existingNormTitles.has(a.title.trim().toLowerCase()));
}

export async function insertArticles(articles) {
  if (articles.length === 0) return 0;

  const rows = articles.map(a => ({
    title:        a.title        || 'Untitled',
    summary:      a.summary      || null,
    source:       a.source       || 'Unknown',
    url:          a.url,
    published_at: a.published_at || null,
    category:     a.category     || 'General',
  }));

  const { error } = await supabase
    .from('articles')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true });

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  return rows.length;
}

// ── Pipeline run tracking ─────────────────────────────────────────────────────

export async function createPipelineRun() {
  const { data, error } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  if (error) {
    console.error('[supabase] Could not create pipeline_run:', error.message);
    return null;
  }
  return data.id;
}

export async function completePipelineRun(id, { articlesFetched, articlesSaved, categoriesRun, openclawUsed, startedAt }) {
  if (!id) return;
  const { error } = await supabase
    .from('pipeline_runs')
    .update({
      status:           'success',
      completed_at:     new Date().toISOString(),
      articles_fetched: articlesFetched,
      articles_saved:   articlesSaved,
      categories_run:   categoriesRun,
      openclaw_used:    openclawUsed,
      duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(2)),
    })
    .eq('id', id);

  if (error) console.error('[supabase] Could not complete pipeline_run:', error.message);
}

export async function failPipelineRun(id, errorMessage, startedAt) {
  if (!id) return;
  const { error } = await supabase
    .from('pipeline_runs')
    .update({
      status:           'error',
      completed_at:     new Date().toISOString(),
      error_message:    String(errorMessage).slice(0, 500),
      duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(2)),
    })
    .eq('id', id);

  if (error) console.error('[supabase] Could not fail pipeline_run:', error.message);
}
