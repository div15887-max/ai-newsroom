'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { CATEGORIES } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

/* ─── Category colours ─────────────────────────────────────────────────── */
const PILL_COLORS: Record<string, string> = {
  AI:         'bg-violet-600 hover:bg-violet-500 shadow-violet-500/30',
  Technology: 'bg-blue-600   hover:bg-blue-500   shadow-blue-500/30',
  Startups:   'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30',
  Gaming:     'bg-orange-600 hover:bg-orange-500 shadow-orange-500/30',
};

/* ─── Animated equaliser bars ───────────────────────────────────────────── */
function SoundWaves({ active }: { active: boolean }) {
  const heights = [0.45, 0.75, 1, 0.85, 0.55, 0.9, 0.65, 0.78, 0.42];
  return (
    <div className="flex items-end gap-[3px] h-7" aria-hidden>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-violet-600 to-violet-300"
          style={{ height: '28px', originY: 1 }}
          animate={active
            ? { scaleY: [h * 0.25, h, h * 0.45, h * 0.9, h * 0.3, h] }
            : { scaleY: 0.12 }}
          transition={active
            ? { duration: 0.9, repeat: Infinity, delay: i * 0.09, ease: 'easeInOut' }
            : { duration: 0.4 }}
        />
      ))}
    </div>
  );
}

/* ─── Illustrated anchor figure ─────────────────────────────────────────── */
function AnchorFigure() {
  return (
    <svg viewBox="0 0 160 210" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-lg">

      {/* ── Hair (back layer) ── */}
      <path d="M80 24 C44 24 30 52 30 74 L32 95 Q30 108 42 118 L46 100
               Q42 88 43 74 C43 52 60 40 80 40 C100 40 117 52 117 74
               Q118 88 114 100 L118 118 Q130 108 128 95 L130 74
               C130 52 116 24 80 24Z" fill="#6d28d9" />

      {/* ── Body / blazer ── */}
      <path d="M8 210 C14 152 44 132 80 124 C116 132 146 152 152 210Z"
        fill="#4c1d95" />

      {/* ── Blazer lapels ── */}
      <path d="M80 124 L62 156 L74 146 L79 130 L80 136
               L81 130 L86 146 L98 156 Z" fill="#5b21b6" />

      {/* ── Shirt/collar ── */}
      <path d="M74 124 L80 136 L86 124Z" fill="#ede9fe" opacity="0.5" />

      {/* ── Neck ── */}
      <rect x="71" y="108" width="18" height="18" rx="7"
        fill="#ede9fe" opacity="0.85" />

      {/* ── Face ── */}
      <ellipse cx="80" cy="72" rx="27" ry="31" fill="#ede9fe" />

      {/* ── Hair (front sides) ── */}
      <path d="M53 52 C49 44 47 58 47 74 C47 92 51 108 54 115
               C49 100 45 80 47 64 C49 48 57 34 80 30
               C58 34 55 46 53 52Z" fill="#7c3aed" />
      <path d="M107 52 C111 44 113 58 113 74 C113 92 109 108 106 115
               C111 100 115 80 113 64 C111 48 103 34 80 30
               C102 34 105 46 107 52Z" fill="#7c3aed" />

      {/* ── Hair top / bangs ── */}
      <path d="M57 42 C59 26 67 20 80 20 C93 20 101 26 103 42
               C98 32 90 27 80 27 C70 27 62 32 57 42Z" fill="#7c3aed" />

      {/* ── Blush ── */}
      <circle cx="60" cy="82" r="7" fill="#f9a8d4" opacity="0.18" />
      <circle cx="100" cy="82" r="7" fill="#f9a8d4" opacity="0.18" />

      {/* ── Eyes ── */}
      <ellipse cx="68" cy="69" rx="5" ry="5.5" fill="#1e1b4b" />
      <ellipse cx="92" cy="69" rx="5" ry="5.5" fill="#1e1b4b" />
      {/* shine */}
      <circle cx="70" cy="67" r="1.8" fill="white" opacity="0.85" />
      <circle cx="94" cy="67" r="1.8" fill="white" opacity="0.85" />

      {/* ── Lashes ── */}
      <path d="M63 64 L64 61 M67 62 L67 59 M72 63 L73 60"
        stroke="#1e1b4b" strokeWidth="1.2" opacity="0.7" />
      <path d="M87 63 L88 60 M92 62 L92 59 M96 64 L97 61"
        stroke="#1e1b4b" strokeWidth="1.2" opacity="0.7" />

      {/* ── Eyebrows ── */}
      <path d="M61 61 Q68 57 75 59" stroke="#4c1d95" strokeWidth="2.5"
        fill="none" strokeLinecap="round" />
      <path d="M85 59 Q92 57 99 61" stroke="#4c1d95" strokeWidth="2.5"
        fill="none" strokeLinecap="round" />

      {/* ── Nose ── */}
      <path d="M77 78 Q80 84 83 78" stroke="#a78bfa" strokeWidth="1.5"
        fill="none" strokeLinecap="round" />

      {/* ── Lips ── */}
      <path d="M72 90 Q80 97 88 90" fill="#e879f9" opacity="0.75" />
      <path d="M72 90 Q80 86 88 90" fill="#f0abfc" opacity="0.85" />

      {/* ── Earrings ── */}
      <circle cx="52" cy="88" r="3.5" fill="#a78bfa" opacity="0.9" />
      <line x1="52" y1="91.5" x2="52" y2="99" stroke="#a78bfa"
        strokeWidth="1.5" opacity="0.7" />
      <circle cx="52" cy="102" r="3" fill="#7c3aed" />
      <circle cx="108" cy="88" r="3.5" fill="#a78bfa" opacity="0.9" />
      <line x1="108" y1="91.5" x2="108" y2="99" stroke="#a78bfa"
        strokeWidth="1.5" opacity="0.7" />
      <circle cx="108" cy="102" r="3" fill="#7c3aed" />

      {/* ── Left arm — open gesture ── */}
      <path d="M44 132 Q22 144 18 168 Q16 177 22 180"
        stroke="#ddd6fe" strokeWidth="12" fill="none" strokeLinecap="round"
        opacity="0.88" />
      <path d="M22 180 Q30 186 40 176 Q46 168 42 158"
        stroke="#ddd6fe" strokeWidth="10" fill="none" strokeLinecap="round"
        opacity="0.88" />

      {/* ── Right arm — holding mic ── */}
      <path d="M116 132 Q136 142 140 166"
        stroke="#ddd6fe" strokeWidth="12" fill="none" strokeLinecap="round"
        opacity="0.88" />

      {/* ── Microphone handle ── */}
      <rect x="133" y="163" width="13" height="34" rx="6.5" fill="#94a3b8" />

      {/* ── Mic head ── */}
      <rect x="131" y="144" width="17" height="22" rx="8" fill="#cbd5e1" />
      <ellipse cx="139.5" cy="143" rx="10.5" ry="14" fill="#e2e8f0" />

      {/* ── Mic grille ── */}
      <path d="M130 139 Q139.5 136 149 139" stroke="#94a3b8" strokeWidth="0.9" fill="none" />
      <path d="M129 144 Q139.5 141 150 144" stroke="#94a3b8" strokeWidth="0.9" fill="none" />
      <path d="M130 149 Q139.5 146 149 149" stroke="#94a3b8" strokeWidth="0.9" fill="none" />

      {/* ── Mic accent band ── */}
      <rect x="131" y="166" width="17" height="5" rx="2.5" fill="#7c3aed" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
interface Props {
  onComplete: (category?: string) => void;
}

export function NewsroomIntro({ onComplete }: Props) {
  const [visible,   setVisible]   = useState(true);
  const [showPills, setShowPills] = useState(false);
  const [speaking,  setSpeaking]  = useState(false);

  const skipCategories = CATEGORIES.filter(c => c !== 'All') as string[];

  const dismiss = useCallback((category?: string) => {
    setVisible(false);
    setTimeout(() => onComplete(category), 700);
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setSpeaking(true),  1500);
    const t2 = setTimeout(() => setShowPills(true), 3200);
    const t3 = setTimeout(() => dismiss(),          10500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7 } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050a] overflow-hidden"
          aria-live="polite"
          aria-label="Newsroom intro"
        >
          {/* ── Ambient blobs ── */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]
                            bg-violet-700/12 blur-[130px] rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px]
                            bg-indigo-700/8 blur-[110px] rounded-full" />
            <div className="absolute top-1/3 right-0 w-[420px] h-[420px]
                            bg-purple-600/6 blur-[100px] rounded-full" />
          </div>

          {/* ── Scan line ── */}
          <motion.div
            aria-hidden
            className="absolute left-0 right-0 h-[2px] pointer-events-none
                       bg-gradient-to-r from-transparent via-violet-400/25 to-transparent"
            initial={{ top: '-2px' }}
            animate={{ top: '102%' }}
            transition={{ duration: 3.2, ease: 'linear', delay: 0.3 }}
          />

          {/* ── Main panel ── */}
          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-8
                          flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

            {/* ════ LEFT — anchor figure ════ */}
            <motion.div
              className="relative flex-shrink-0 flex flex-col items-center"
              initial={{ opacity: 0, x: -48 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.85, ease: 'easeOut' }}
            >
              {/* outer glow */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full bg-violet-600/15 blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.75, 0.4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* pulsing rings */}
              {[1.18, 1.36, 1.56].map((s, i) => (
                <motion.div
                  key={i}
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-violet-400/18"
                  animate={{ scale: [1, s], opacity: [0.5, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.75, ease: 'easeOut' }}
                />
              ))}

              {/* avatar circle */}
              <div className="relative w-44 h-44 sm:w-56 sm:h-56 lg:w-72 lg:h-72
                              rounded-full border-2 border-violet-500/30 overflow-hidden
                              bg-gradient-to-br from-violet-950/80 to-indigo-950/80
                              flex items-end justify-center">
                {/* inner glow overlay */}
                <div aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-violet-900/50 via-transparent to-transparent pointer-events-none" />
                {/* figure */}
                <div className="absolute bottom-0 w-[82%]">
                  <AnchorFigure />
                </div>
              </div>

              {/* ON AIR badge */}
              <motion.div
                className="absolute -top-1 -right-1 flex items-center gap-1.5
                           bg-red-600 text-white text-[10px] font-bold
                           tracking-widest uppercase px-2.5 py-1.5 rounded-full
                           shadow-lg shadow-red-500/30"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9, type: 'spring', stiffness: 280 }}
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-white"
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                On Air
              </motion.div>

              {/* sound waves */}
              <motion.div
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                <SoundWaves active={speaking} />
              </motion.div>
            </motion.div>

            {/* ════ RIGHT — text content ════ */}
            <motion.div
              className="flex flex-col items-center lg:items-start
                         text-center lg:text-left max-w-lg"
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.85, ease: 'easeOut' }}
            >
              {/* breaking now badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="mb-4"
              >
                <Badge
                  variant="outline"
                  className="border-violet-500/40 text-violet-400/80 bg-violet-500/8
                             text-[10px] tracking-[0.28em] uppercase font-semibold px-3 py-1"
                >
                  <motion.span
                    className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-violet-400"
                    animate={{ opacity: [1, 0.25, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  Breaking Now
                </Badge>
              </motion.div>

              {/* title */}
              <motion.h1
                className="mb-5 font-bold tracking-tight leading-tight
                           text-3xl sm:text-4xl lg:text-5xl"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.65 }}
              >
                <span className="text-white">DIVYANI&apos;S</span>
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300
                                 bg-clip-text text-transparent">
                  AI NEWSROOM
                </span>
              </motion.h1>

              {/* typewriter */}
              <motion.div
                className="mb-7 min-h-[3.5rem] text-base sm:text-lg text-white/65 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
              >
                <TypeAnimation
                  sequence={[
                    1300,
                    "Hi — I'm your AI correspondent.",
                    550,
                    "Hi — I'm your AI correspondent. What would you like to hear about today?",
                  ]}
                  speed={65}
                  cursor
                  className="text-white/78"
                />
              </motion.div>

              {/* category pills */}
              <AnimatePresence>
                {showPills && (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center lg:items-start gap-3 w-full"
                  >
                    <p className="text-[11px] text-white/28 tracking-[0.2em] uppercase font-medium">
                      Choose your feed
                    </p>

                    <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
                      {skipCategories.map((cat, i) => (
                        <motion.button
                          key={cat}
                          initial={{ opacity: 0, scale: 0.78, y: 10 }}
                          animate={{ opacity: 1, scale: 1,    y: 0  }}
                          transition={{ delay: i * 0.07, duration: 0.3, type: 'spring', stiffness: 280 }}
                          onClick={() => dismiss(cat)}
                          className={`
                            px-5 py-2 rounded-full text-sm font-semibold text-white
                            shadow-lg transition-all duration-200 hover:scale-105 active:scale-95
                            ${PILL_COLORS[cat] ?? 'bg-white/12 hover:bg-white/20'}
                          `}
                        >
                          {cat}
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 }}
                      onClick={() => dismiss()}
                      className="mt-1 text-xs text-white/22 hover:text-white/55 transition-colors"
                    >
                      Show everything →
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Bottom broadcast bar ── */}
          <motion.div
            aria-hidden
            className="absolute bottom-0 left-0 right-0 border-t border-white/[0.05]
                       bg-white/[0.015] backdrop-blur-sm px-6 py-3
                       flex items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <span className="text-[10px] text-white/18 tracking-widest uppercase font-medium">
              AI · Technology · Startups · Gaming
            </span>
            <span className="flex-1 h-px bg-gradient-to-r from-violet-500/15 via-white/4 to-transparent" />
            <span className="text-[10px] text-violet-400/35 tracking-wider uppercase font-medium">
              Powered by OpenClaw
            </span>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
