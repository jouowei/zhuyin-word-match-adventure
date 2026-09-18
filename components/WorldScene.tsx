import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WordStat } from '../types';
import { Companion } from '../services/companions';
import { layoutWorld, PlacedThing, WorldThing, worldCounts, worldThings } from '../services/world';
import { getWordReading } from '../services/moedict';
import { playChineseAudio, playChineseWord, playZhuyinSymbol } from '../utils/chineseAudio';
import { speakEnglish, speakLetterName } from '../utils/englishSpeech';
import { CompanionBubble } from './CompanionBubble';

/** Says what a thing in the world stands for: the zhuyin symbol, the word, or the English letter or word. */
const sayThing = async (thing: WorldThing) => {
  if (thing.kind === 'zhuyin') {
    playZhuyinSymbol(thing.label);
  } else if (thing.kind === 'english') {
    if (thing.key.startsWith('el:')) speakLetterName(thing.label);
    else speakEnglish(thing.label);
  } else {
    const reading = await getWordReading(thing.label).catch(() => null);
    playChineseWord(thing.label, reading?.audioUrl);
  }
};

interface WorldSceneProps {
  stats: Record<string, WordStat> | undefined;
  companion: Companion;
  line: string;              // What the companion is saying (shown in its bubble)
  onCompanion: () => void;   // The companion or its bubble was tapped
  className?: string;
}

/**
 * The child's world: the companion on the hill, and on the ground everything the child is learning,
 * growing with spaced review (services/world.ts). Tapping a thing says it and shows it.
 */
export const WorldScene: React.FC<WorldSceneProps> = ({ stats, companion, line, onCompanion, className = '' }) => {
  const things = useMemo(() => worldThings(stats), [stats]);
  const { placed, hidden, cols, rows } = useMemo(() => layoutWorld(things), [things]);
  const counts = worldCounts(things);
  const ground = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tapped, setTapped] = useState<{ key: string; at: number } | null>(null);

  useLayoutEffect(() => {
    const el = ground.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!tapped) return;
    const timer = setTimeout(() => setTapped(null), 2200);
    return () => clearTimeout(timer);
  }, [tapped]);

  const cell = Math.min(size.width / cols, size.height / rows);

  const tap = (thing: PlacedThing) => {
    setTapped({ key: thing.key, at: Date.now() });
    sayThing(thing);
  };

  const sayCounts = () => {
    const parts = [
      counts.flowers && `${counts.flowers}朵注音花`,
      counts.trees && `${counts.trees}棵國字樹`,
      counts.animals && `${counts.animals}隻英文動物`,
    ].filter(Boolean);
    playChineseAudio([{ text: parts.length ? `你的世界有${parts.join('、')}。還有${counts.growing}個正在長大。` : `你的世界有${counts.growing}個正在長大，學會了就會開花、長成大樹。`, rate: 0.95 }]);
  };

  return (
    // clip, not just hidden: the hill is wider than the scene, and a tapped thing must not scroll the scene sideways
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 via-sky-200 to-sky-100 shadow-inner ${className}`} style={{ overflow: 'clip' }}>
      {/* Sky */}
      <span className="absolute right-[6%] top-[4%] text-[min(12vw,4.5rem)] animate-spin-slow select-none" aria-hidden>☀️</span>
      <span className="absolute left-[38%] top-[6%] text-[min(9vw,3rem)] opacity-90 animate-float-slow select-none" aria-hidden>☁️</span>

      {/* The companion on the hill, and what it says */}
      <CompanionBubble companion={companion} line={line} onTap={onCompanion} className="absolute inset-x-0 top-0 h-[40%] z-20" />

      {/* Ground */}
      <div className="absolute inset-x-0 bottom-0 h-[62%]">
        <div className="absolute -inset-x-[10%] top-0 h-[30%] rounded-[50%] bg-lime-300" aria-hidden />
        <div className="absolute inset-x-0 top-[12%] bottom-0 bg-gradient-to-b from-lime-300 to-green-400" aria-hidden />
        <div ref={ground} className="absolute inset-x-[3%] top-[8%] bottom-[4%]">
          {placed.map(thing => {
            const isTapped = tapped?.key === thing.key;
            return (
              <button
                key={thing.key}
                type="button"
                onClick={() => tap(thing)}
                aria-label={thing.label}
                className="absolute -translate-x-1/2 leading-none select-none"
                style={{ left: `${thing.x}%`, bottom: `${thing.y}%`, fontSize: `${Math.max(12, cell * thing.scale * 0.9)}px`, zIndex: isTapped ? 30 : 1 }}
              >
                <span key={isTapped ? tapped!.at : 'still'} className={`block ${isTapped ? 'animate-hop' : thing.stage === 3 ? 'animate-sway' : ''}`}>{thing.emoji}</span>
                {isTapped && (
                  <span className={`absolute left-1/2 bottom-full -translate-x-1/2 mb-1 whitespace-nowrap bg-white rounded-xl px-2 py-0.5 shadow-lg border-2 border-yellow-300 text-slate-800 animate-pop
                    ${thing.kind === 'english' ? 'font-english' : 'font-kai'}`} style={{ fontSize: 'clamp(1.25rem, 6vw, 2rem)' }}>
                    {thing.label}
                  </span>
                )}
              </button>
            );
          })}
          {placed.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-center text-green-900/60 font-bold text-sm px-6">
              學會的字會在這裡長出來 🌱
            </p>
          )}
        </div>
      </div>

      {/* What has grown, for parents and children who count */}
      {things.length > 0 && (
        <button
          type="button"
          onClick={sayCounts}
          className="absolute left-2 bottom-2 z-20 flex items-center gap-1.5 bg-white/80 rounded-full px-2.5 py-1 text-sm font-black text-slate-600 shadow"
        >
          {counts.flowers > 0 && <span>🌸{counts.flowers}</span>}
          {counts.trees > 0 && <span>🌳{counts.trees}</span>}
          {counts.animals > 0 && <span>🐰{counts.animals}</span>}
          {counts.growing > 0 && <span>🌱{counts.growing}</span>}
          {hidden > 0 && <span className="text-slate-400">（還有 {hidden} 個在後面）</span>}
        </button>
      )}
    </div>
  );
};
