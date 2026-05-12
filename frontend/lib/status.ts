// frontend/lib/status.ts — server-side data fetchers for the /status page
import { createClient } from '@supabase/supabase-js';

export type PipelineRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  articles_fetched: number | null;
  articles_saved: number | null;
  categories_run: string[] | null;
  status: 'running' | 'success' | 'error';
  error_message: string | null;
  duration_seconds: number | null;
  openclaw_used: boolean | null;
};

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getRecentRuns(limit = 10): Promise<PipelineRun[]> {
  const { data, error } = await makeClient()
    .from('pipeline_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[status] getRecentRuns error:', error.message);
    return [];
  }
  return (data ?? []) as PipelineRun[];
}

export async function getArticleCount(): Promise<number> {
  const { count, error } = await makeClient()
    .from('articles')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count ?? 0;
}
