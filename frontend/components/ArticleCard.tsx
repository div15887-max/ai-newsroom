'use client';
import { motion } from 'framer-motion';
import type { Article } from '@/lib/supabase';

const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  AI:         { bg: 'bg-violet-500/15', text: 'text-violet-300' },
  Technology: { bg: 'bg-blue-500/15',   text: 'text-blue-300'   },
  Startups:   { bg: 'bg-green-500/15',  text: 'text-green-300'  },
  Gaming:     { bg: 'bg-orange-500/15', text: 'text-orange-300' },
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function ArticleCard({ article, index }: { article: Article; index: number }) {
  const badge = CATEGORY_BADGE[article.category] ?? { bg: 'bg-white/10', text: 'text-white/60' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="glass-card flex flex-col h-full p-5 group cursor-pointer block hover:glass-card-hover"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
            {article.category}
          </span>
          <span className="text-[11px] text-white/30 whitespace-nowrap shrink-0">
            {formatDate(article.published_at)}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-3 group-hover:text-white transition-colors mb-3">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-4 flex-1 mb-3">
            {article.summary}
          </p>
        )}

        <div className="mt-auto pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] text-white/30 font-medium">{article.source}</span>
        </div>
      </a>
    </motion.div>
  );
}
