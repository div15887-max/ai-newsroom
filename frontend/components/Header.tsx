type Props = { articleCount: number; activeCategory?: string };

export function Header({ articleCount, activeCategory }: Props) {
  return (
    <header className="border-b border-white/[0.08] bg-black/20 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                DIVYANI&apos;S AI NEWSROOM
              </h1>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                LIVE
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/40">
              {activeCategory && activeCategory !== 'All'
                ? `${activeCategory} · AI-powered autonomous newsfeed`
                : 'AI-powered autonomous newsfeed'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{articleCount}</span>
            <p className="text-xs text-white/40">articles</p>
          </div>
        </div>
      </div>
    </header>
  );
}
