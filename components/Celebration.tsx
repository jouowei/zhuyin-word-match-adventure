import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/sound';

/** The big banner for moments like learning a character or finishing 課文尋寶. */
export const useCelebration = () => {
  const [celebration, setCelebration] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const celebrate = (text: string) => {
    clearTimeout(timer.current);
    playSound('magic');
    setCelebration({ id: Date.now(), text });
    timer.current = setTimeout(() => setCelebration(null), 2800);
  };

  return { celebration, celebrate };
};

export const CelebrationBanner: React.FC<{ celebration: { id: number; text: string } | null }> = ({ celebration }) =>
  celebration && (
    <div key={celebration.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-pop">
      <div className="bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-900 px-8 py-4 rounded-3xl shadow-2xl border-4 border-white flex items-center gap-3 whitespace-nowrap">
        <span className="text-4xl animate-spin-slow">🌟</span>
        <span className="text-2xl md:text-3xl font-black">{celebration.text}</span>
      </div>
    </div>
  );
