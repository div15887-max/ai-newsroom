import { createClient } from '@supabase/supabase-js';

export type Article = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  published_at: string | null;
  category: string;
  created_at: string;
};

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const CATEGORIES = ['All', 'AI', 'Technology', 'Startups', 'Gaming'] as const;
export type Category = (typeof CATEGORIES)[number];
