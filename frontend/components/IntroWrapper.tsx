'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NewsroomIntro = dynamic(
  () => import('./NewsroomIntro').then(m => ({ default: m.NewsroomIntro })),
  { ssr: false }
);

export function IntroWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem('intro-seen')) {
        setShowIntro(true);
        return;
      }
    } catch {}
    setIntroComplete(true);
  }, []);

  const handleComplete = useCallback((category?: string) => {
    setShowIntro(false);
    setIntroComplete(true);
    if (category) {
      router.push(`/?category=${encodeURIComponent(category)}`, { scroll: false });
    }
  }, [router]);

  return (
    <>
      {showIntro && !introComplete && (
        <NewsroomIntro onComplete={handleComplete} />
      )}
      <div className={showIntro && !introComplete ? 'invisible' : ''}>
        {children}
      </div>
    </>
  );
}
