'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES, type Category } from '@/lib/supabase';

const CATEGORY_COLORS: Record<string, string> = {
  AI:         'hover:bg-violet-600/20 data-[active=true]:bg-violet-600 data-[active=true]:shadow-violet-500/20',
  Technology: 'hover:bg-blue-600/20   data-[active=true]:bg-blue-600   data-[active=true]:shadow-blue-500/20',
  Startups:   'hover:bg-green-600/20  data-[active=true]:bg-green-600  data-[active=true]:shadow-green-500/20',
  Gaming:     'hover:bg-orange-600/20 data-[active=true]:bg-orange-600 data-[active=true]:shadow-orange-500/20',
  All:        'hover:bg-white/10      data-[active=true]:bg-white/15   data-[active=true]:shadow-white/10',
};

export function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get('category') || 'All') as Category;

  function select(cat: Category) {
    const params = new URLSearchParams(searchParams.toString());
    cat === 'All' ? params.delete('category') : params.set('category', cat);
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => select(cat)}
          data-active={active === cat}
          className={`
            px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-lg
            bg-white/5 border border-white/10 text-white/70
            data-[active=true]:text-white data-[active=true]:border-transparent
            ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.All}
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
