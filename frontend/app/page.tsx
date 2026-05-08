import { Suspense } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import type { Article } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ArticleGrid } from '@/components/ArticleGrid';
import { IntroScreen } from '@/components/IntroScreen';

export const revalidate = 60;

async function getArticles(category?: string): Promise<Article[]> {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(60);

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[page] Supabase error:', error.message);
    return [];
  }
  return (data ?? []) as Article[];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  // No category param → intro state. No DB query, no articles rendered.
  if (!category) {
    return <IntroScreen />;
  }

  // Category selected → fetch and display articles.
  const articles = await getArticles(category);

  return (
    <div className="min-h-screen">
      <Header articleCount={articles.length} activeCategory={category} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Suspense>
            <CategoryFilter />
          </Suspense>
        </div>
        <ArticleGrid articles={articles} />
      </main>
      <footer className="mt-16 border-t border-white/[0.06] py-8 text-center text-xs text-white/20">
        Powered by OpenClaw · Supabase · Vercel · Updated every 6 hours
      </footer>
    </div>
  );
}
