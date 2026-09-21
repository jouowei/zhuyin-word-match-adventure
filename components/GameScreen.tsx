import React from 'react';
import { Home, RefreshCw, Star, Volume2 } from 'lucide-react';
import { UserProfile } from '../types';
import { playChineseAudio } from '../utils/chineseAudio';
import { instructionStep } from './VoiceGuide';
import { useOwnRun } from '../hooks/useOwnRun';
import { OWN_RUN_GOAL, ownRunStars } from '../services/streak';

interface GameScreenProps {
  currentUser: UserProfile;
  title: string;            // The game's short name
  instruction?: string;     // How to play: said when the name is tapped (views also say it once when the game opens)
  onHome: () => void;
  onRefresh?: () => void;   // Another set
  feedback?: string | null; // A short message after an answer
  accent?: string;          // Colour of the name (Tailwind text class)
  wide?: boolean;           // Games with two columns use more of a tablet's width
  children: React.ReactNode;
}

/**
 * A game on one screen: a slim bar (leave, the game's name that says how to play, stars, another set)
 * and the game in the space left. Views size their content to that space (flex-1 rows, text sized by the
 * screen's height), so no game needs scrolling on a phone or a tablet.
 */
export const GameScreen: React.FC<GameScreenProps> = ({
  currentUser, title, instruction, onHome, onRefresh, feedback, accent = 'text-slate-700', wide = false, children,
}) => {
  const stars = ownRunStars(useOwnRun()); // 一次就答對: filled stars towards the companion's cheer
  return (
  <div className="h-[100dvh] flex flex-col overflow-hidden select-none">
    <div className={`flex-1 min-h-0 w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} mx-auto flex flex-col gap-2 px-3 pt-2 pb-3`}>
      <header className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onHome}
          aria-label="離開遊戲"
          className="shrink-0 w-11 h-11 rounded-full bg-white shadow-sm text-slate-500 flex items-center justify-center active:scale-90 transition"
        >
          <Home size={22} />
        </button>
        <button
          type="button"
          onClick={() => instruction && playChineseAudio([instructionStep(instruction)])}
          aria-label={instruction ? `聽說明：${title}` : title}
          className="flex-1 min-w-0 h-11 flex items-center justify-center gap-2 bg-white rounded-full shadow-sm px-3 active:scale-95 transition"
        >
          <span className={`font-black truncate text-[clamp(1rem,4.5vw,1.35rem)] ${accent}`}>{title}</span>
          {instruction && <Volume2 size={20} className="shrink-0 text-sky-500" />}
        </button>
        <div className="shrink-0 h-11 flex items-center gap-1 bg-yellow-100 border-2 border-yellow-300 rounded-full px-3 font-black text-yellow-800">
          <Star size={18} className="fill-yellow-400 text-yellow-500" /> {currentUser.points}
        </div>
        {/* Answers in a row without help: three in a row and the companion cheers */}
        <div className="shrink-0 h-11 flex items-center gap-0.5 px-2" aria-label={`自己答對 ${stars} 題`}>
          {Array.from({ length: OWN_RUN_GOAL }, (_, i) => (
            <Star
              key={i}
              size={16}
              className={i < stars ? 'fill-amber-400 text-amber-500 animate-pop' : 'text-gray-300'}
            />
          ))}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="換一組"
            className="shrink-0 w-11 h-11 rounded-full bg-white shadow-sm text-sky-500 flex items-center justify-center active:scale-90 transition"
          >
            <RefreshCw size={20} />
          </button>
        )}
      </header>
      {/* For parents and children who read; the name above says it too */}
      {instruction && <p className="only-tall-screen shrink-0 text-center text-slate-500 font-bold px-2">{instruction}</p>}
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
    </div>
    {feedback && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-40 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
        <span className="text-[clamp(1.1rem,5vw,1.5rem)] font-bold text-yellow-600">{feedback}</span>
      </div>
    )}
  </div>
);
};
