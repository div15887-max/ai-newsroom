// agent/src/supabase.js — Supabase write helper (uses service key)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function filterNewArticles(articles) {
  const urls = articles.map(a => a.url);
  const { data, error } = await supabase
    .from('articles')
    .select('url')
    .in('url', urls);

  if (error) throw new Error(`Supabase dedup check failed: ${error.message}`);
  const existing = new Set(data.map(r => r.url));
  return articles.filter(a => !existing.has(a.url));
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
