import React, { useEffect } from 'react';
import { Lock, Users } from 'lucide-react';
import { UserProfile } from '../types';
import { journeyPosition } from '../services/journey';
import { COMPANIONS } from '../services/companions';
import { playChineseAudio } from '../utils/chineseAudio';

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

/** One of the two ways in: a watercolor on top, the name and what it is for below. */
const ModeCard: React.FC<{
  picture: string;
  picturePosition?: string;
  whole?: boolean; // Show all of the picture (the tall map), on its own paper color
  title: string;
  line: string;
  titleColor: string;
  edge: string; // The card's colored bottom edge, like a pressable button
  badge?: string;
  onClick: () => void;
}> = ({ picture, picturePosition, whole, title, line, titleColor, edge, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 basis-0 max-h-[22rem] min-h-0 landscape:sm:self-center landscape:sm:h-full landscape:sm:max-h-[26rem] flex flex-col overflow-hidden rounded-[2rem] bg-[#fffdf7] border-4 border-white ${edge} active:scale-95 transition`}
  >
    <div className={`relative flex-1 min-h-0 w-full ${whole ? 'bg-[#f8f7f0]' : 'bg-sky-50'}`}>
      <img src={picture} alt="" className={`absolute inset-0 w-full h-full ${whole ? 'object-contain' : 'object-cover'}`} style={{ objectPosition: picturePosition }} />
      {badge && (
        <span className="absolute bottom-2 left-2 w-[clamp(3rem,9vh,4rem)] aspect-square rounded-full bg-white/90 shadow-md flex items-center justify-center text-[clamp(1.9rem,6vh,2.6rem)] leading-none animate-bob">
          {badge}
        </span>
      )}
    </div>
    <div className="shrink-0 w-full px-4 py-[1.2vh] text-center">
      <span className={`block text-[clamp(1.6rem,7vw,2.3rem)] font-black leading-tight ${titleColor}`}>{title}</span>
      <span className="block text-[clamp(0.9rem,3.8vw,1.1rem)] font-bold text-[#6b5a3e]">{line}</span>
    </div>
  </button>
);

/**
 * After choosing a player: the 環島 adventure (learning game), shown by the watercolor map of the trip, or practising
 * a lesson.
 */
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
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#e4efe9] via-[#f6f2e7] to-[#f1e9d8] overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3">
        <div className="flex items-center gap-1.5 bg-white/85 rounded-full pl-1.5 pr-3 py-1 shadow-sm">
          <span className="text-3xl leading-none">{currentUser.avatar}</span>
          <span className="font-black text-[#46392b] max-w-[7rem] truncate">{currentUser.name}</span>
        </div>
        <div className="flex-1" />
        <div className="bg-amber-50 border-2 border-amber-200 rounded-full px-3 py-1 font-black text-amber-800 text-lg">⭐ {currentUser.points}</div>
        <button type="button" onClick={onParent} aria-label="家長專區" className="w-10 h-10 rounded-full bg-white/80 text-stone-400 flex items-center justify-center active:scale-90 transition">
          <Lock size={18} />
        </button>
      </header>

      <main className="flex-1 min-h-0 flex flex-col gap-[2vh] p-4 max-w-xl landscape:max-w-3xl w-full mx-auto">
        <p className="shrink-0 text-center text-[clamp(1.5rem,6.5vw,2.25rem)] font-black text-[#46392b] hide-on-short-screen">今天想做什麼？</p>
        {/* The two ways, one above the other, or side by side on a wide screen */}
        <div className="fit-screen-main flex-1 min-h-0 flex flex-col items-stretch justify-center gap-[3vh]">
          <ModeCard
            picture="/journey/map.jpg"
            whole
            title="環島冒險"
            line={currentUser.journeySeen === undefined ? '玩遊戲學認字，一起環遊臺灣' : `玩遊戲學認字・現在在${place.name}`}
            titleColor="text-emerald-700"
            edge="shadow-[0_6px_0_#6fa58f]"
            badge={companion?.emoji}
            onClick={onAdventure}
          />
          <ModeCard
            picture="/lesson-art/2up-6.jpg"
            picturePosition="center 78%"
            title="練習課文"
            line="選一課，聽課文、找生字、玩生字遊戲"
            titleColor="text-amber-700"
            edge="shadow-[0_6px_0_#c9954a]"
            onClick={onPractice}
          />
        </div>
      </main>

      <footer className="shrink-0 flex justify-center pb-3">
        <button type="button" onClick={onSwitchPlayer} className="flex items-center gap-1.5 text-[#6b5a3e] font-bold bg-white/80 rounded-full px-4 py-2 active:scale-95 transition">
          <Users size={18} /> 換人玩
        </button>
      </footer>
    </div>
  );
};
