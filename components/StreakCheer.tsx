import React, { useEffect, useState } from 'react';
import { OWN_RUN_GOAL } from '../services/streak';
import { sayAfterAnswer } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';

const CHEER_EVENT = 'own-run-cheer';
const LINES = ['連續三題都自己答對，好厲害！', '三題都自己想出來，太棒了！', '又是三題自己答對！'];

/** Call when the child has just got another three answers in a row without help. */
export const cheerOwnRun = (emoji: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHEER_EVENT, { detail: { emoji } }));
};

/**
 * 一次就答對看得見: the companion comes out and dances whenever three answers in a row were given without help.
 * Children play for what they can see, so this — not the points — is what rewards not guessing.
 */
export const StreakCheer: React.FC = () => {
  const [show, setShow] = useState<{ id: number; emoji: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onCheer = (e: Event) => {
      const emoji = (e as CustomEvent<{ emoji: string }>).detail?.emoji || '🎉';
      setShow({ id: Date.now(), emoji });
      playSound('cheer');
      sayAfterAnswer([{ text: LINES[Math.floor(Math.random() * LINES.length)], rate: 0.95 }]);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(null), 2200);
    };
    window.addEventListener(CHEER_EVENT, onCheer);
    return () => {
      window.removeEventListener(CHEER_EVENT, onCheer);
      clearTimeout(timer);
    };
  }, []);

  if (!show) return null;

  return (
    <div key={show.id} className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-2 animate-pop">
        <span className="text-[clamp(4rem,22vh,9rem)] leading-none animate-bob drop-shadow-lg">{show.emoji}</span>
        <span className="bg-white/90 text-amber-700 font-black text-[clamp(1.1rem,5vw,1.6rem)] rounded-full px-5 py-2 shadow-lg">
          {'⭐'.repeat(OWN_RUN_GOAL)} 自己答對三題！
        </span>
      </div>
    </div>
  );
};
