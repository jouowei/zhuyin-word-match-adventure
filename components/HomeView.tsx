import React, { useEffect, useState } from 'react';
import { Check, Lock, Play } from 'lucide-react';
import { UserProfile } from '../types';
import { companionOf, companionTip, homeLine } from '../services/companions';
import { worldThings } from '../services/world';
import { playChineseAudio } from '../utils/chineseAudio';
import { WorldScene } from './WorldScene';

// The companion says hello once per visit to the app, then only what's next
let greeted = false;

interface HomeViewProps {
  currentUser: UserProfile;
  focusName: string;       // What the Chinese adventure practises, as said: 注音符號 / 第一課：小船
  focusBadge: string;      // …and as shown on the 出發 button
  chineseDone: boolean;
  englishDone: boolean;
  stationsLeft: number;    // Today's Chinese adventure is under way (0: not started or finished)
  rewardBadge: string;     // Free spin or card waiting in the shop ('' when none)
  onGo: () => void;
  onEnglish: () => void;
  onRewards: () => void;
  onPlayground: () => void;
  onParent: () => void;
  onSwitchPlayer: () => void;
}

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

const DockButton: React.FC<{
  emoji: string; label: string; onClick: () => void; done?: boolean; locked?: boolean; badge?: string; color: string;
}> = ({ emoji, label, onClick, done, locked, badge, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center gap-0.5 rounded-3xl py-2 font-black transition active:scale-95 shadow-[0_5px_0_rgba(0,0,0,0.15)]
      ${locked ? 'bg-slate-200 text-slate-400' : color}`}
  >
    <span className={`text-[clamp(2rem,9vw,3rem)] leading-none ${locked ? 'grayscale opacity-60' : ''}`}>{emoji}</span>
    <span className="text-[clamp(0.85rem,3.6vw,1.1rem)]">{label}</span>
    {locked && <Lock size={18} className="absolute top-2 right-2" />}
    {done && <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow"><Check size={16} strokeWidth={4} /></span>}
    {badge && <span className="absolute -top-2 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow animate-bounce">{badge}</span>}
  </button>
);

/** Home: the child's world with the companion, who says what to do; one big button to set off. */
export const HomeView: React.FC<HomeViewProps> = ({
  currentUser, focusName, focusBadge, chineseDone, englishDone, stationsLeft, rewardBadge,
  onGo, onEnglish, onRewards, onPlayground, onParent, onSwitchPlayer,
}) => {
  const companion = companionOf(currentUser);
  const things = worldThings(currentUser.wordStats).length;
  const playgroundOpen = chineseDone || englishDone;
  const [line] = useState(() => homeLine(companion, {
    name: currentUser.name, focus: focusName, chineseDone, englishDone, stationsLeft, things, greet: !greeted,
  }));

  // Said a moment after the screen opens (on a timer: React runs effects twice in development)
  useEffect(() => {
    const timer = setTimeout(() => {
      greeted = true;
      say(line);
    }, 500);
    return () => clearTimeout(timer);
  }, [line]);

  const openPlayground = () => {
    if (playgroundOpen) onPlayground();
    else say('完成今天的冒險，遊樂場就會開門喔！先按出發吧！');
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-sky-100 to-emerald-50 overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={onSwitchPlayer}
          aria-label="換人玩"
          className="flex items-center gap-1.5 bg-white/80 rounded-full pl-1.5 pr-3 py-1 shadow-sm active:scale-95 transition"
        >
          <span className="text-3xl leading-none">{currentUser.avatar}</span>
          <span className="font-black text-slate-700 max-w-[7rem] truncate">{currentUser.name}</span>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => say(`你有${currentUser.points}顆星星。`)}
          className="bg-yellow-100 border-2 border-yellow-300 rounded-full px-3 py-1 font-black text-yellow-800 text-lg"
        >
          ⭐ {currentUser.points}
        </button>
        <button
          type="button"
          onClick={onParent}
          aria-label="家長專區"
          className="w-10 h-10 rounded-full bg-white/70 text-slate-400 flex items-center justify-center active:scale-90 transition"
        >
          <Lock size={18} />
        </button>
      </header>

      <main className="fit-screen-main flex-1 min-h-0 flex flex-col gap-3 px-3 pb-3">
        <WorldScene
          className="flex-1 min-h-[14rem]"
          stats={currentUser.wordStats}
          companion={companion}
          line={line}
          onCompanion={() => say(companionTip(line, things))}
        />

        <nav className="fit-screen-side shrink-0 flex flex-col gap-3">
          <button
            type="button"
            onClick={onGo}
            className={`relative flex items-center gap-3 rounded-3xl px-5 py-[clamp(0.75rem,2.5vh,1.25rem)] text-white font-black transition active:scale-95 shadow-[0_6px_0_#047857]
              bg-emerald-500 ${chineseDone ? '' : 'animate-breathe'}`}
          >
            <Play size={36} className="fill-current shrink-0" />
            <span className="text-[clamp(1.8rem,8vw,2.5rem)] leading-none">出發</span>
            <span className="ml-auto text-[clamp(0.9rem,4vw,1.2rem)] bg-white/25 rounded-full px-3 py-1 truncate max-w-[50%]">{focusBadge}</span>
            {chineseDone && <span className="absolute -top-2 -right-1 bg-white text-emerald-600 rounded-full p-1 shadow"><Check size={18} strokeWidth={4} /></span>}
          </button>
          <div className="grid grid-cols-3 gap-3">
            <DockButton emoji="🔤" label="英文冒險" onClick={onEnglish} done={englishDone} color="bg-pink-400 text-white" />
            <DockButton emoji="🎁" label="獎勵" onClick={onRewards} badge={rewardBadge} color="bg-yellow-300 text-yellow-900" />
            <DockButton emoji="🎠" label="遊樂場" onClick={openPlayground} locked={!playgroundOpen} color="bg-violet-400 text-white" />
          </div>
        </nav>
      </main>
    </div>
  );
};
