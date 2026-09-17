import React, { useEffect, useState } from 'react';
import { correctMessage, PraiseKind } from '../services/scaffolding';
import { AudioStep, sayAfterAnswer } from '../utils/chineseAudio';

/**
 * What happens on every correct answer: a spoken praise (young children can't read the feedback text)
 * and a burst of stars. Praise names what the child did (Mueller & Dweck 1998), a little different each time.
 */

const ON_OWN_WORDS: Record<PraiseKind, string[]> = {
  look: ['好棒！', '找到了！', '好厲害！', '答對了！'],
  listen: ['好棒！', '你聽得好仔細！', '答對了！', '好厲害！'],
  spell: ['好棒！', '拼對了！', '好厲害！'],
  say: ['好棒！', '唸得好清楚！', '好厲害！'],
  write: ['寫得真好！', '好棒！', '一筆一筆寫好了！'],
};
const HELPED_WORDS = ['完成了！', '有做到喔！'];
const ENGLISH_ON_OWN = ['Great job!', 'Awesome!', 'Well done!', 'Super!'];
const ENGLISH_HELPED = ['You did it!'];

const pick = (words: string[]) => words[Math.floor(Math.random() * words.length)];

const PRAISE_EVENT = 'answer-praise';

/**
 * Call when an answer is right; returns the feedback text to show.
 * `speak: false` for games that already say their own praise.
 */
export const praise = (helpLevel: number, kind: PraiseKind, options: { lang?: 'en'; speak?: boolean } = {}) => {
  const onOwn = helpLevel === 0;
  if (options.speak !== false) {
    const step: AudioStep = options.lang === 'en'
      ? { text: pick(onOwn ? ENGLISH_ON_OWN : ENGLISH_HELPED), lang: 'en' }
      : { text: pick(onOwn ? ON_OWN_WORDS[kind] : HELPED_WORDS), rate: 1 };
    sayAfterAnswer([step]);
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PRAISE_EVENT, { detail: { onOwn } }));
  return correctMessage(helpLevel, kind);
};

interface Burst {
  id: number;
  stars: { angle: number; distance: number; size: number; delay: number }[];
}

/** Stars flying out from the middle of the screen; more of them when the child answered alone. */
export const PraiseBurst: React.FC = () => {
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onPraise = (e: Event) => {
      const onOwn = (e as CustomEvent<{ onOwn: boolean }>).detail?.onOwn;
      const count = onOwn ? 10 : 4;
      setBurst({
        id: Date.now(),
        stars: Array.from({ length: count }, (_, i) => ({
          angle: (360 / count) * i + Math.random() * 20,
          distance: 110 + Math.random() * 80,
          size: onOwn ? 34 + Math.random() * 18 : 28,
          delay: Math.random() * 120,
        })),
      });
      clearTimeout(timer);
      timer = setTimeout(() => setBurst(null), 1100);
    };
    window.addEventListener(PRAISE_EVENT, onPraise);
    return () => {
      window.removeEventListener(PRAISE_EVENT, onPraise);
      clearTimeout(timer);
    };
  }, []);

  if (!burst) return null;
  return (
    <div key={burst.id} className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center" aria-hidden="true">
      <style>{`
        @keyframes praise-star {
          0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1) rotate(160deg); opacity: 0; }
        }
      `}</style>
      {burst.stars.map((star, i) => {
        const rad = (star.angle * Math.PI) / 180;
        return (
          <span
            key={i}
            className="absolute"
            style={{
              fontSize: star.size,
              animation: `praise-star 1s ease-out ${star.delay}ms both`,
              ['--dx' as string]: `${Math.cos(rad) * star.distance}px`,
              ['--dy' as string]: `${Math.sin(rad) * star.distance}px`,
            }}
          >
            ⭐
          </span>
        );
      })}
    </div>
  );
};
