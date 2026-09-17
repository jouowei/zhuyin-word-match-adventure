
import React from 'react';
import { Home, BookOpen, CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { Lesson } from '../types';
import { gameInstruction, levelInfo, MODE_SELECT_INSTRUCTION } from '../services/instructions';
import { POINTS_RULE } from '../services/scaffolding';
import { InstructionButton, useInstruction } from './VoiceGuide';
import { playChineseAudio } from '../utils/chineseAudio';

interface DifficultySelectViewProps {
  onSelect: (difficulty: number) => void;
  onBack: () => void;
  activeLesson: Lesson | null;
  gameMode: 'word' | 'zhuyin';
  reviewMode?: boolean;
  completedLevels?: number[];
  onDailyPath?: () => void;
  dailyDone?: boolean; // Today's 今日冒險 is finished
}

const LEVEL_STYLES = {
  blue: { card: 'hover:bg-blue-50 border-blue-400', badge: 'bg-blue-500', title: 'text-blue-700', speaker: 'bg-blue-100 text-blue-600' },
  red: { card: 'hover:bg-red-50 border-red-400', badge: 'bg-red-500', title: 'text-red-700', speaker: 'bg-red-100 text-red-600' },
  amber: { card: 'hover:bg-amber-50 border-amber-400', badge: 'bg-amber-500', title: 'text-amber-700', speaker: 'bg-amber-100 text-amber-700' },
  purple: { card: 'hover:bg-purple-50 border-purple-400', badge: 'bg-purple-500', title: 'text-purple-700', speaker: 'bg-purple-100 text-purple-600' },
  teal: { card: 'hover:bg-teal-50 border-teal-400', badge: 'bg-teal-500', title: 'text-teal-700', speaker: 'bg-teal-100 text-teal-700' },
  pink: { card: 'hover:bg-pink-50 border-pink-400', badge: 'bg-pink-500', title: 'text-pink-700', speaker: 'bg-pink-100 text-pink-600' },
  green: { card: 'hover:bg-green-50 border-green-500', badge: 'bg-green-600', title: 'text-green-700', speaker: 'bg-green-100 text-green-700' },
  indigo: { card: 'hover:bg-indigo-50 border-indigo-400', badge: 'bg-indigo-500', title: 'text-indigo-700', speaker: 'bg-indigo-100 text-indigo-700' },
};

export const DifficultySelectView: React.FC<DifficultySelectViewProps> = ({ onSelect, onBack, activeLesson, gameMode, reviewMode = false, completedLevels = [], onDailyPath, dailyDone = false }) => {
  useInstruction('mode-select', MODE_SELECT_INSTRUCTION);

  // 字的家族 is about words made of characters, so it is only in word mode
  const colors: (keyof typeof LEVEL_STYLES)[] = ['blue', 'red', 'amber', 'purple', 'teal', 'pink', ...(gameMode === 'word' ? ['green' as const, 'indigo' as const] : [])];
  const levels = colors.map((color, i) => ({ ...levelInfo(i + 1, gameMode), color }));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-50 p-4 overflow-y-auto">
      <div className="max-w-5xl w-full text-center py-8 relative">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-6 py-3 bg-white rounded-2xl shadow-lg text-gray-600 font-bold z-10 hover:bg-gray-50 transition flex items-center gap-2 border-2 border-gray-100 transform active:scale-95"
        >
          <Home size={24} />
          <span className="text-lg">回首頁</span>
        </button>

        {reviewMode ? (
          <div className="mb-4 inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-6 py-2 rounded-full font-bold shadow-sm border border-orange-200 animate-pop mt-16 md:mt-0">
            <RotateCcw size={18} /> 複習時間：練習今天該複習的字
          </div>
        ) : activeLesson ? (
           <div className="mb-4 inline-block bg-indigo-100 text-indigo-700 px-6 py-2 rounded-full font-bold shadow-sm border border-indigo-200 animate-pop mt-16 md:mt-0">
              <div className="flex items-center gap-2">
                <BookOpen size={18} />
                正在練習：{activeLesson.title}
              </div>
           </div>
        ) : (
           <div className="h-10 mt-16 md:mt-0"></div>
        )}

        {onDailyPath && !reviewMode && (
          <div className="relative mx-4 mb-8">
            <button
              onClick={onDailyPath}
              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-3xl shadow-xl p-6 flex items-center gap-5 text-left transform transition active:scale-95"
            >
              <span className="text-7xl">🗺️</span>
              <span className="flex-1">
                <span className="block text-3xl font-black">今日冒險</span>
                <span className="block text-lg font-bold opacity-90">複習、認識新朋友、練習和挑戰，大約 10 分鐘</span>
              </span>
              {dailyDone && <span className="bg-white text-emerald-600 font-black px-3 py-1 rounded-full text-sm flex items-center gap-1"><CheckCircle2 size={16} /> 今天完成了</span>}
            </button>
            <button
              onClick={() => playChineseAudio([{ text: '今日冒險。會先複習，再認識新朋友，然後練習和挑戰，大約十分鐘。', rate: 0.95 }])}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-white/80 text-emerald-700 hover:bg-white active:scale-90 transition shadow"
              aria-label="聽「今日冒險」怎麼玩"
            >
              <Volume2 size={22} />
            </button>
          </div>
        )}

        <h2 className="text-3xl font-bold text-indigo-800 mb-2">{onDailyPath && !reviewMode ? '或自己選一個遊戲' : '選擇遊戲模式'}</h2>
        <div className="flex flex-col items-center gap-2 mb-8">
          <InstructionButton text={MODE_SELECT_INSTRUCTION} />
          <p className="text-sm font-bold text-yellow-700">{POINTS_RULE}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-8">
          {levels.map(level => {
            const style = LEVEL_STYLES[level.color];
            const done = completedLevels.includes(level.level);
            return (
              <div key={level.level} className="relative h-full">
                <button
                  onClick={() => onSelect(level.level)}
                  className={`group w-full bg-white border-8 ${style.card} p-6 pb-10 rounded-3xl shadow-xl transform transition active:scale-95 flex flex-col items-center gap-4 relative overflow-hidden h-full`}
                >
                  <div className={`absolute top-0 right-0 ${style.badge} text-white text-lg px-4 py-2 rounded-bl-2xl font-bold`}>{level.level} ⭐️</div>
                  {done && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle2 size={16} /> 已過關
                    </div>
                  )}
                  <div className="text-8xl group-hover:scale-110 transition-transform duration-300">{level.emoji}</div>
                  <div className="text-center mt-auto w-full">
                    <h3 className={`text-2xl font-bold ${style.title} mb-2`}>{level.title}</h3>
                    <p className="text-gray-500 text-sm">{level.desc}</p>
                  </div>
                </button>
                {/* Separate from the card button: hearing how a game works shouldn't start it */}
                <button
                  onClick={() => playChineseAudio([{ text: `${level.title}。${gameInstruction(level.level, gameMode)}`, rate: 0.95 }])}
                  className={`absolute bottom-4 right-4 p-2 rounded-full ${style.speaker} hover:brightness-95 active:scale-90 transition shadow`}
                  aria-label={`聽「${level.title}」怎麼玩`}
                >
                  <Volume2 size={22} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
