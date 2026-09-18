import React, { useEffect } from 'react';
import { Lock, Users } from 'lucide-react';
import { UserProfile } from '../types';
import { journeyPosition } from '../services/journey';
import { COMPANIONS } from '../services/companions';
import { playChineseAudio } from '../utils/chineseAudio';

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

/** After choosing a player: the 環島 adventure (learning game) or practising a lesson. */
export const ModePickView: React.FC<{
  currentUser: UserProfile;
  onAdventure: () => void;
  onPractice: () => void;
  onSwitchPlayer: () => void;
  onParent: () => void;
}> = ({ currentUser, onAdventure, onPractice, onSwitchPlayer, onParent }) => {
  const companion = COMPANIONS.find(c => c.id === currentUser.companion);
  const { place } = journeyPosition(currentUser.journeyLegs);

  useEffect(() => {
    const timer = setTimeout(() => say(`${currentUser.name}，今天想做什麼？要去環島冒險，還是練習課文？`), 500);
    return () => clearTimeout(timer);
  }, [currentUser.name]);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-sky-200 via-amber-50 to-orange-100 overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3">
        <div className="flex items-center gap-1.5 bg-white/80 rounded-full pl-1.5 pr-3 py-1 shadow-sm">
          <span className="text-3xl leading-none">{currentUser.avatar}</span>
          <span className="font-black text-slate-700 max-w-[7rem] truncate">{currentUser.name}</span>
        </div>
        <div className="flex-1" />
        <div className="bg-yellow-100 border-2 border-yellow-300 rounded-full px-3 py-1 font-black text-yellow-800 text-lg">⭐ {currentUser.points}</div>
        <button type="button" onClick={onParent} aria-label="家長專區" className="w-10 h-10 rounded-full bg-white/70 text-slate-400 flex items-center justify-center active:scale-90 transition">
          <Lock size={18} />
        </button>
      </header>

      <main className="flex-1 min-h-0 flex flex-col gap-[2vh] p-4 max-w-3xl w-full mx-auto">
        <p className="shrink-0 text-center text-[clamp(1.5rem,6.5vw,2.25rem)] font-black text-slate-700 hide-on-short-screen">今天想做什麼？</p>
        {/* The two ways, one above the other, or side by side on a wide screen */}
        <div className="fit-screen-main flex-1 min-h-0 flex flex-col items-stretch justify-center gap-[3vh]">

        <button
          type="button"
          onClick={onAdventure}
          className="flex-1 basis-0 max-h-[22rem] min-h-0 flex flex-col items-center justify-center gap-[1.2vh] rounded-[2rem] bg-gradient-to-br from-sky-400 to-emerald-400 text-white shadow-[0_8px_0_#0f766e] active:scale-95 transition p-4"
        >
          <span className="flex items-end gap-2 text-[clamp(3rem,12vh,5.5rem)] leading-none">
            🗺️ {companion && <span className="text-[0.7em] animate-bob">{companion.emoji}</span>}
          </span>
          <span className="text-[clamp(1.8rem,8vw,2.6rem)] font-black leading-tight">環島冒險</span>
          <span className="text-[clamp(0.95rem,4vw,1.2rem)] font-bold opacity-95">
            {currentUser.journeySeen === undefined ? '玩遊戲學認字，一起環遊台灣' : `玩遊戲學認字・現在在${place.name}`}
          </span>
        </button>

        <button
          type="button"
          onClick={onPractice}
          className="flex-1 basis-0 max-h-[22rem] min-h-0 flex flex-col items-center justify-center gap-[1.2vh] rounded-[2rem] bg-gradient-to-br from-orange-300 to-amber-400 text-amber-950 shadow-[0_8px_0_#b45309] active:scale-95 transition p-4"
        >
          <span className="text-[clamp(3rem,12vh,5.5rem)] leading-none">📖</span>
          <span className="text-[clamp(1.8rem,8vw,2.6rem)] font-black leading-tight">練習課文</span>
          <span className="text-[clamp(0.95rem,4vw,1.2rem)] font-bold opacity-90">選一課，聽課文、找生字、玩生字遊戲</span>
        </button>
        </div>
      </main>

      <footer className="shrink-0 flex justify-center pb-3">
        <button type="button" onClick={onSwitchPlayer} className="flex items-center gap-1.5 text-slate-500 font-bold bg-white/70 rounded-full px-4 py-2 active:scale-95 transition">
          <Users size={18} /> 換人玩
        </button>
      </footer>
    </div>
  );
};
