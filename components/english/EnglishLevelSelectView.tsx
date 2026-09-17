import React from 'react';
import { EnglishUnit } from '../../types';
import { getLevels } from '../../english/curriculum';
import { ArrowLeft, CheckCircle2, Volume2 } from 'lucide-react';
import { InstructionButton, useInstruction } from '../VoiceGuide';
import { POINTS_RULE } from '../../services/scaffolding';
import { MODE_SELECT_INSTRUCTION } from '../../services/instructions';
import { playChineseAudio } from '../../utils/chineseAudio';

interface EnglishLevelSelectViewProps {
  unit: EnglishUnit;
  completedLevels: number[];
  onSelect: (level: number) => void;
  onBack: () => void;
}

const COLOR_CLASSES = {
  blue: { card: 'border-blue-400 hover:bg-blue-50', badge: 'bg-blue-500', title: 'text-blue-700', speaker: 'bg-blue-100 text-blue-600' },
  red: { card: 'border-red-400 hover:bg-red-50', badge: 'bg-red-500', title: 'text-red-700', speaker: 'bg-red-100 text-red-600' },
  amber: { card: 'border-amber-400 hover:bg-amber-50', badge: 'bg-amber-500', title: 'text-amber-700', speaker: 'bg-amber-100 text-amber-700' },
  purple: { card: 'border-purple-400 hover:bg-purple-50', badge: 'bg-purple-500', title: 'text-purple-700', speaker: 'bg-purple-100 text-purple-600' },
  green: { card: 'border-green-500 hover:bg-green-50', badge: 'bg-green-600', title: 'text-green-700', speaker: 'bg-green-100 text-green-700' },
};

export const EnglishLevelSelectView: React.FC<EnglishLevelSelectViewProps> = ({ unit, completedLevels, onSelect, onBack }) => {
  useInstruction('mode-select', MODE_SELECT_INSTRUCTION);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-50 p-4 overflow-y-auto">
      <div className="max-w-4xl w-full text-center py-8 relative">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-6 py-3 bg-white rounded-2xl shadow-lg text-gray-600 font-bold z-10 hover:bg-gray-50 transition flex items-center gap-2 border-2 border-gray-100 active:scale-95"
        >
          <ArrowLeft size={24} /> <span className="text-lg">返回</span>
        </button>

        <div className="mb-4 inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-6 py-2 rounded-full font-bold shadow-sm border border-pink-200 animate-pop mt-16 md:mt-0">
          <span className="text-xl">{unit.icon}</span> 正在練習：{unit.title}
        </div>

        <h2 className="text-3xl font-bold text-indigo-800 mb-2">選擇遊戲模式</h2>
        <div className="flex flex-col items-center gap-2 mb-8">
          <InstructionButton text={MODE_SELECT_INSTRUCTION} />
          <p className="text-sm font-bold text-yellow-700">{POINTS_RULE}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 pb-8">
          {getLevels(unit).map(level => {
            const colors = COLOR_CLASSES[level.color];
            const done = completedLevels.includes(level.level);
            return (
              <div key={level.level} className="relative h-full">
                <button
                  onClick={() => onSelect(level.level)}
                  className={`group w-full bg-white border-8 ${colors.card} p-6 pb-10 rounded-3xl shadow-xl transform transition active:scale-95 flex flex-col items-center gap-4 relative overflow-hidden h-full`}
                >
                  <div className={`absolute top-0 right-0 ${colors.badge} text-white text-lg px-4 py-2 rounded-bl-2xl font-bold`}>
                    {level.level} ⭐️
                  </div>
                  {done && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle2 size={16} /> 已過關
                    </div>
                  )}
                  <div className="text-8xl group-hover:scale-110 transition-transform duration-300 mt-4">{level.emoji}</div>
                  <div className="text-center mt-auto w-full">
                    <h3 className={`text-2xl font-bold ${colors.title} mb-2`}>{level.title}</h3>
                    <p className="text-gray-500 text-sm">{level.desc}</p>
                  </div>
                </button>
                <button
                  onClick={() => playChineseAudio([{ text: `${level.title}。${level.instruction}`, rate: 0.95 }])}
                  className={`absolute bottom-4 right-4 p-2 rounded-full ${colors.speaker} hover:brightness-95 active:scale-90 transition shadow`}
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
