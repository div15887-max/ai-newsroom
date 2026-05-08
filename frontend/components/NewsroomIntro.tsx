'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { CATEGORIES } from '@/lib/supabase';

const SKIP_CATEGORIES = CATEGORIES.filter(c => c !== 'All') as string[];

const CATEGORY_COLORS: Record<string, string> = {
  AI:         'bg-violet-600 shadow-violet-500/30',
  Technology: 'bg-blue-600 shadow-blue-500/30',
  Startups:   'bg-green-600 shadow-green-500/30',
  Gaming:     'bg-orange-600 shadow-orange-500/30',
};

function AnchorAvatar() {
  return (
    <motion.div
      className="relative mx-auto mb-8 h-32 w-32"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-xl animate-pulse-slow" />
      <div className="absolute inset-0 rounded-full border border-violet-500/30" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 flex flex-col items-center justify-end overflow-hidden">
        <svg viewBox="0 0 80 90" className="w-20 text-violet-200/80 absolute bottom-0" fill="currentColor">
          <ellipse cx="40" cy="28" rx="22" ry="6" opacity="0.9" />
          <ellipse cx="40" cy="35" rx="17" ry="20" />
          <path d="M10 90 Q22 62 40 58 Q58 62 70 90Z" />
          <rect x="34" y="52" width="12" height="10" rx="3" />
        </svg>
      </div>
      <motion.div
        className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 border-2 border-[#0a0a0f] shadow-lg shadow-violet-500/30"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

interface Props {
  onComplete: (category?: string) => void;
}

export function NewsroomIntro({ onComplete }: Props) {
  const [visible, setVisible] = useState(true);
  const [showPills, setShowPills] = useState(false);

  const dismiss = useCallback((category?: string) => {
    setVisible(false);
    try { sessionStorage.setItem('intro-seen', '1'); } catch {}
    setTimeout(() => onComplete(category), 600);
  }, [onComplete]);

  useEffect(() => {
    const pillTimer = setTimeout(() => setShowPills(true), 3000);
    const autoTimer = setTimeout(() => dismiss(), 9000);
    return () => { clearTimeout(pillTimer); clearTimeout(autoTimer); };
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05050a]"
          aria-live="polite"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/10 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/3 h-72 w-72 rounded-full bg-indigo-700/10 blur-3xl" />
          </div>

          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.5, ease: 'linear' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
            <AnchorAvatar />

            <motion.p
              className="mb-2 text-xs font-semibold tracking-[0.3em] text-violet-400/70 uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Breaking Now
            </motion.p>

            <motion.h1
              className="mb-6 text-2xl font-bold tracking-wide text-white sm:text-3xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              DIVYANI&apos;S AI NEWSROOM
            </motion.h1>

            <motion.div
              className="min-h-[3rem] text-base text-white/70 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <TypeAnimation
                sequence={[
                  1200,
                  "Hi — I'm your AI correspondent.",
                  500,
                  "Hi — I'm your AI correspondent. What would you like to hear about today?",
                ]}
                speed={65}
                cursor
                className="text-white/80"
              />
            </motion.div>

            <AnimatePresence>
              {showPills && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-8 flex flex-wrap justify-center gap-3"
                >
                  {SKIP_CATEGORIES.map((cat, i) => (
                    <motion.button
                      key={cat}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      onClick={() => dismiss(cat)}
                      className={`px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${CATEGORY_COLORS[cat] ?? 'bg-white/10'}`}
                    >
                      {cat}
                    </motion.button>
                  ))}

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => dismiss()}
                    className="mt-2 w-full text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Show everything →
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
