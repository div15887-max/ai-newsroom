'use client';
import { motion } from 'framer-motion';
import type { Article } from '@/lib/supabase';

const STYLE: Record<string, {
  accent: string;
  badge: string;
  hoverBorder: string;
  dot: string;
}> = {
  AI:         { accent: 'from-violet-500 to-indigo-400',  badge: 'bg-violet-500/15 text-violet-300',   hoverBorder: 'hover:border-violet-500/30',   dot: 'bg-violet-400'  },
  Technology: { accent: 'from-blue-500 to-sky-400',       badge: 'bg-blue-500/15 text-blue-300',       hoverBorder: 'hover:border-blue-500/30',     dot: 'bg-blue-400'    },
  Startups:   { accent: 'from-emerald-500 to-green-400',  badge: 'bg-emerald-500/15 text-emerald-300', hoverBorder: 'hover:border-emerald-500/30',  dot: 'bg-emerald-400' },
  Gaming:     { accent: 'from-orange-500 to-amber-400',   badge: 'bg-orange-500/15 text-orange-300',   hoverBorder: 'hover:border-orange-500/30',   dot: 'bg-orange-400'  },
};

const DEFAULT_STYLE = {
  accent: 'from-white/20 to-white/5',
  badge: 'bg-white/10 text-white/50',
  hoverBorder: 'hover:border-white/20',
  dot: 'bg-white/40',
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function readTime(text: string | null) {
  if (!text) return null;
  const mins = Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
  return `${mins} min`;
}

export function ArticleCard({
  article,
  index,
  featured = false,
}: {
  article: Article;
  index: number;
  featured?: boolean;
}) {
  const s = STYLE[article.category] ?? DEFAULT_STYLE;

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.045, ease: [0.25, 0.1, 0.25, 1] }}
      className={[
        'glass-card flex flex-col h-full group cursor-pointer',
        'hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/40',
        s.hoverBorder,
        featured ? 'sm:col-span-2 lg:col-span-3' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Category accent bar */}
      <div className={`h-[3px] w-full flex-shrink-0 bg-gradient-to-r ${s.accent}`} />

      {/* Content */}
      <div className={`flex flex-col flex-1 ${featured ? 'p-6 sm:p-7' : 'p-5'}`}>

        {/* Badge + date */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase ${s.badge}`}>
            {article.category}
          </span>
          <time className="text-[11px] text-white/25 tabular-nums shrink-0">
            {formatDate(article.published_at)}
          </time>
        </div>

        {/* Title */}
        <h3 className={[
          'font-semibold leading-snug text-white/85 group-hover:text-white transition-colors mb-3',
          featured ? 'text-base sm:text-xl line-clamp-2' : 'text-sm line-clamp-3',
        ].join(' ')}>
          {article.title}
        </h3>

        {/* Summary */}
        {article.summary && (
          <p className={[
            'text-white/45 leading-relaxed flex-1 mb-4',
            featured ? 'text-sm line-clamp-4' : 'text-xs line-clamp-3',
          ].join(' ')}>
            {article.summary}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
            <span className="text-[11px] text-white/35 font-medium truncate">{article.source}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {readTime(article.summary) && (
              <span className="text-[10px] text-white/20 tabular-nums">
                {readTime(article.summary)}
              </span>
            )}
            <span className="text-[11px] text-white/20 group-hover:text-white/55 transition-colors">
              ↗
            </span>
          </div>
        </div>
      </div>
    </motion.a>
  );
}
