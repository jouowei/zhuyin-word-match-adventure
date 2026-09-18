import React, { useEffect } from 'react';
import { Home } from 'lucide-react';
import { UserProfile } from '../types';
import { companionOf } from '../services/companions';
import { playChineseAudio } from '../utils/chineseAudio';
import { SpeakButton } from './VoiceGuide';

export interface PlaygroundTile {
  id: string;
  emoji: string;
  label: string;
  say: string;   // What the speaker button says about it
  color: string;
  onOpen: () => void;
}

/** 遊樂場: every game to choose from, open once today's adventure is done. */
export const PlaygroundView: React.FC<{ currentUser: UserProfile; tiles: PlaygroundTile[]; onHome: () => void }> = ({ currentUser, tiles, onHome }) => {
  const companion = companionOf(currentUser);

  useEffect(() => {
    const timer = setTimeout(() => playChineseAudio([{ text: '歡迎來到遊樂場！想玩什麼都可以，點喇叭可以聽聽看是什麼。', rate: 0.95 }]), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-violet-100 to-pink-50 overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm font-black text-slate-600 active:scale-95 transition"
        >
          <Home size={22} /> 回家
        </button>
        <h1 className="flex-1 text-center text-[clamp(1.4rem,6vw,2rem)] font-black text-violet-700">🎠 遊樂場</h1>
        <span className="text-4xl leading-none animate-bob" aria-hidden>{companion.emoji}</span>
      </header>
      <main className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 auto-rows-fr gap-3 p-3 max-w-3xl w-full mx-auto">
        {tiles.map(tile => (
          <div key={tile.id} className="relative min-h-0">
            <button
              type="button"
              onClick={tile.onOpen}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 rounded-3xl font-black shadow-[0_5px_0_rgba(0,0,0,0.15)] transition active:scale-95 ${tile.color}`}
            >
              <span className="text-[clamp(2.5rem,min(12vw,9vh),4.5rem)] leading-none">{tile.emoji}</span>
              <span className="text-[clamp(1rem,4.5vw,1.4rem)] text-center px-2 leading-tight">{tile.label}</span>
            </button>
            <SpeakButton text={tile.say} className="absolute top-1.5 left-1.5 w-9 h-9" size={18} />
          </div>
        ))}
      </main>
    </div>
  );
};
