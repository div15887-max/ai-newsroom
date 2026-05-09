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
