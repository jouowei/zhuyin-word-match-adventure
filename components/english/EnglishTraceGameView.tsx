import React, { useState } from 'react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { getLetter } from '../../english/letters';
import { useFeedback } from './shared';
import { GameScreen } from '../GameScreen';
import { heightShare, useViewportHeight } from '../../hooks/useViewportHeight';
import { FourLineLetter } from './FourLineLetter';
import { LetterTraceOverlay } from './LetterTraceOverlay';
import { CheckCircle2 } from 'lucide-react';
import { praise } from '../Praise';
import { HELP_SHOW } from '../../services/scaffolding';
import { LETTER_LEVELS } from '../../english/curriculum';
import { useInstruction } from '../VoiceGuide';

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
  const screenHeight = useViewportHeight();
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

  // Four letters on a 2 × 2 grid, drawn as big as the screen's height allows
  const letterSize = heightShare(screenHeight, 0.2, 76, 150);

  return (
    <GameScreen
      currentUser={currentUser}
      title="✏️ 字母描寫"
      instruction={instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent="text-amber-600"
    >
      <LetterTraceOverlay
        item={tracingItem}
        stage={tracingItem ? writeStage?.(tracingItem) ?? 0 : 0}
        onComplete={handleComplete}
        onCancel={handleSkip}
      />

      <div className="flex-1 min-h-0 w-full max-w-2xl mx-auto grid grid-cols-2 grid-rows-2 gap-3 md:gap-5">
        {items.map(item => {
          const info = getLetter(item.text);
          if (!info) return null;
          const char = item.traceCase === 'upper' ? info.upper : info.lower;
          return (
            <button
              key={item.id}
              onClick={() => !item.matched && setTracingItem(item)}
              disabled={item.matched}
              className={`relative min-h-0 rounded-3xl border-4 p-2 flex flex-col items-center justify-center shadow-lg transition-all overflow-hidden
                ${item.matched ? 'bg-green-50 border-green-300' : 'bg-white border-amber-200 hover:border-amber-400 hover:scale-105 active:scale-95'}`}
            >
              {item.matched && (
                <CheckCircle2 size={36} className="absolute top-2 right-2 text-green-500 fill-white animate-pop" />
              )}
              <div className="rounded-2xl overflow-hidden border-2 border-gray-100">
                <FourLineLetter char={char} size={letterSize} animate={false} inkColor={item.matched ? '#22c55e' : '#374151'} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[clamp(1.5rem,4vh,1.875rem)] leading-none">{item.emoji}</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${item.traceCase === 'upper' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {item.traceCase === 'upper' ? '大寫' : '小寫'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

    </GameScreen>
  );
};
