import type { Article } from '@/lib/supabase';
import { ArticleCard } from './ArticleCard';

export function ArticleGrid({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-5xl mb-4">📡</div>
        <p className="text-lg font-semibold text-white/60">No articles yet</p>
        <p className="mt-2 text-sm text-white/30">
          The pipeline will collect articles on its next scheduled run.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, i) => (
        <ArticleCard key={article.id} article={article} index={i} />
      ))}
    </div>
  );
}
