import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { CompanionId, UserProfile } from '../types';
import { COMPANIONS } from '../services/companions';
import { playChineseAudio } from '../utils/chineseAudio';

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

/** Choosing the adventure companion: each one says hello when tapped, the green button makes it yours. */
export const CompanionPickView: React.FC<{ currentUser: UserProfile; onPick: (id: CompanionId) => void }> = ({ currentUser, onPick }) => {
  const [chosen, setChosen] = useState<CompanionId | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => say(`${currentUser.name}，選一個冒險夥伴吧！點點看，聽聽牠們說話。`), 500);
    return () => clearTimeout(timer);
  }, [currentUser.name]);

  const look = (id: CompanionId) => {
    const companion = COMPANIONS.find(c => c.id === id)!;
    setChosen(id);
    say(`${companion.hello}想選我的話，按綠色的按鈕。`);
  };

  const companion = COMPANIONS.find(c => c.id === chosen);

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center gap-[3vh] p-4 bg-gradient-to-b from-sky-200 to-emerald-100 overflow-hidden select-none">
      <h1 className="text-[clamp(1.6rem,7vw,2.5rem)] font-black text-slate-700 text-center">選一個冒險夥伴</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {COMPANIONS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => look(c.id)}
            className={`flex flex-col items-center gap-1 rounded-3xl py-[2.5vh] border-4 bg-white shadow-lg transition active:scale-95
              ${chosen === c.id ? 'border-yellow-400 ring-8 ring-yellow-200 scale-105' : 'border-white'}`}
          >
            <span className={`text-[clamp(3.5rem,18vw,6rem)] leading-none ${chosen === c.id ? 'animate-bob' : ''}`}>{c.emoji}</span>
            <span className="text-xl font-black text-slate-700">{c.name}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!companion}
        onClick={() => companion && onPick(companion.id)}
        className="flex items-center gap-2 bg-emerald-500 disabled:bg-slate-300 text-white text-[clamp(1.4rem,6vw,2rem)] font-black px-8 py-3 rounded-3xl shadow-[0_6px_0_#047857] disabled:shadow-none transition active:scale-95"
      >
        <Check size={32} strokeWidth={4} /> {companion ? `就是你了，${companion.name}！` : '先點一隻夥伴'}
      </button>
    </div>
  );
};
