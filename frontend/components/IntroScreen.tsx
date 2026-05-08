'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const NewsroomIntro = dynamic(
  () => import('./NewsroomIntro').then(m => ({ default: m.NewsroomIntro })),
  { ssr: false }
);

export function IntroScreen() {
  const router = useRouter();

  const handleComplete = useCallback((category?: string) => {
    const dest = category
      ? `/?category=${encodeURIComponent(category)}`
      : '/?category=All';
    router.push(dest);
  }, [router]);

  return <NewsroomIntro onComplete={handleComplete} />;
}
