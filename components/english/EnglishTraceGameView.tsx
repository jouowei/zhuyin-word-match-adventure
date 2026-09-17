import React, { useState } from 'react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { getLetter } from '../../english/letters';
import { EnglishTopBar, FeedbackToast, useFeedback } from './shared';
import { FourLineLetter } from './FourLineLetter';
import { LetterTraceOverlay } from './LetterTraceOverlay';
import { PenTool, CheckCircle2 } from 'lucide-react';
import { praise } from '../Praise';
import { HELP_SHOW } from '../../services/scaffolding';
import { LETTER_LEVELS } from '../../english/curriculum';
import { InstructionButton, useInstruction } from '../VoiceGuide';

interface EnglishTraceGameViewProps {
  currentUser: UserProfile;
  items: EnglishRoundItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onHome: () => void;
  onRefresh: () => void;
  writeStage?: (item: EnglishRoundItem) => number; // How much writing support this letter still needs (0–3)
}

export const EnglishTraceGameView: React.FC<EnglishTraceGameViewProps> = ({
  currentUser, items, onMatch, onHome, onRefresh, writeStage
}) => {
  const instruction = LETTER_LEVELS[2].instruction;
  useInstruction('english-trace', instruction);
  const [tracingItem, setTracingItem] = useState<EnglishRoundItem | null>(null);
  const [feedback, showFeedback] = useFeedback();

  const handleComplete = (helped: boolean) => {
    if (!tracingItem) return;
    const helpLevel = helped ? 1 : 0;
    onMatch(tracingItem.id, helpLevel);
    showFeedback(praise(helpLevel, 'write', { speak: false }));
    setTracingItem(null);
  };

  // Skipping still finishes the letter (done with help), so the round can go on
  const handleSkip = () => {
    if (!tracingItem) return;
    onMatch(tracingItem.id, HELP_SHOW);
    showFeedback('下次再寫寫看！');
    setTracingItem(null);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto p-4 md:p-6">
      <LetterTraceOverlay
        item={tracingItem}
        stage={tracingItem ? writeStage?.(tracingItem) ?? 0 : 0}
        onComplete={handleComplete}
        onCancel={handleSkip}
      />

      <EnglishTopBar currentUser={currentUser} onHome={onHome} onRefresh={onRefresh} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-2">
          <PenTool className="animate-bounce" /> 字母描寫
        </h2>
        <p className="text-gray-500 mt-1">點一個字母，照著綠色數字的順序在四線格上描寫！</p>
        <InstructionButton text={instruction} className="mt-2" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {items.map(item => {
          const info = getLetter(item.text);
          if (!info) return null;
          const char = item.traceCase === 'upper' ? info.upper : info.lower;
          return (
            <button
              key={item.id}
              onClick={() => !item.matched && setTracingItem(item)}
              disabled={item.matched}
              className={`relative rounded-3xl border-4 p-3 flex flex-col items-center shadow-lg transition-all
                ${item.matched ? 'bg-green-50 border-green-300' : 'bg-white border-amber-200 hover:border-amber-400 hover:scale-105 active:scale-95'}`}
            >
              {item.matched && (
                <CheckCircle2 size={36} className="absolute top-2 right-2 text-green-500 fill-white animate-pop" />
              )}
              <div className="rounded-2xl overflow-hidden border-2 border-gray-100">
                <FourLineLetter char={char} size={130} animate={false} inkColor={item.matched ? '#22c55e' : '#374151'} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl">{item.emoji}</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${item.traceCase === 'upper' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {item.traceCase === 'upper' ? '大寫' : '小寫'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <FeedbackToast message={feedback} />
    </div>
  );
};
