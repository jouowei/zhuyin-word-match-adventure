import React, { useEffect, useState } from 'react';
import { Confusion, EnglishRoundItem, EnglishUnit, UserProfile } from '../../types';
import { getLetter } from '../../english/letters';
import { getLevels, shuffleItems } from '../../english/curriculum';
import { HighlightedKeyword, useFeedback } from './shared';
import { GameScreen } from '../GameScreen';
import { Ear, MousePointerClick, Volume2 } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { speakEnglish } from '../../utils/englishSpeech';
import { AudioStep, playGuidance } from '../../utils/chineseAudio';
import { choicesToHide, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { praise } from '../Praise';
import { ListenChip, speakHelp, useInstruction } from '../VoiceGuide';
import { useAnswerLock } from '../../hooks/useAnswerLock';

interface EnglishMatchGameViewProps {
  currentUser: UserProfile;
  unit: EnglishUnit;
  level: 1 | 2;
  items: EnglishRoundItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
}

// Cards fill the row they are given: the rows share the height of the screen
const CARD_HEIGHT = 'h-full';

export const EnglishMatchGameView: React.FC<EnglishMatchGameViewProps> = ({
  currentUser, unit, level, items, onMatch, onMistake, onHome, onRefresh
}) => {
  const [answers, setAnswers] = useState<EnglishRoundItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Help level reached for each prompt this round, and the answers hidden for it (HELP_NARROW)
  const [help, setHelp] = useState<Record<string, number>>({});
  const [hiddenAnswers, setHiddenAnswers] = useState<Record<string, string[]>>({});
  const [triedAnswers, setTriedAnswers] = useState<Record<string, string[]>>({});
  const [feedback, showFeedback] = useFeedback();
  // 聽完才能按: the answers wait while the word or the help is being said
  const locked = useAnswerLock(currentUser);

  const isLetters = unit.kind === 'letters';
  const isListening = level === 2;
  const levelInfo = getLevels(unit)[level - 1];
  useInstruction(`english-${unit.kind}-${level}`, levelInfo.instruction);

  // Shuffle the answer column only when a new round starts
  const roundKey = items.map(i => i.id).join('|');
  useEffect(() => {
    setAnswers(shuffleItems(items));
    setSelectedId(null);
    setHelp({});
    setHiddenAnswers({});
    setTriedAnswers({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  const byId = (id: string) => items.find(i => i.id === id);

  const letterName = (item: EnglishRoundItem) => getLetter(item.text)?.name || item.text;
  const promptSound = (item: EnglishRoundItem): AudioStep =>
    ({ text: isLetters && !isListening ? letterName(item) : item.keyword, lang: 'en' });
  // What an answer shows: a letter, a word or its picture
  const answerSound = (item: EnglishRoundItem): AudioStep => ({ text: isLetters ? letterName(item) : item.keyword, lang: 'en' });

  // The question: the answers wait until it has been said
  const speakPrompt = (item: EnglishRoundItem) => {
    playGuidance([{ ...promptSound(item), rate: isLetters && !isListening ? 0.75 : 0.8 }]);
  };

  const handlePromptClick = (item: EnglishRoundItem) => {
    if (item.matched) return;
    speakPrompt(item);
    if (selectedId === item.id) {
      setSelectedId(null);
    } else {
      setSelectedId(item.id);
      playSound('pop');
    }
  };

  const handleAnswerClick = (target: EnglishRoundItem) => {
    if (locked || !selectedId || target.matched) return;
    const selected = byId(selectedId);
    if (!selected || hiddenAnswers[selected.id]?.includes(target.id)) return;

    if (selected.id === target.id) {
      playSound('success');
      const info = getLetter(target.text);
      speakEnglish(isLetters && info ? `${info.name}. ${info.keyword}.` : target.keyword);
      const helpLevel = help[target.id] || 0;
      onMatch(target.id, helpLevel);
      showFeedback(praise(helpLevel, isListening ? 'listen' : 'look', { lang: 'en' }));
      setSelectedId(null);
      return;
    }

    // Wrong: one more level of help for this prompt, which stays selected so the help shows right away
    playSound('error');
    onMistake(selected.id, { kind: isLetters ? 'letter' : 'enword', expected: selected.text, chosen: target.text });
    const helpLevel = nextHelp(help[selected.id] || 0);
    const tried = [...(triedAnswers[selected.id] || []), target.id];
    setHelp(prev => ({ ...prev, [selected.id]: helpLevel }));
    setTriedAnswers(prev => ({ ...prev, [selected.id]: tried }));
    if (helpLevel === HELP_RETRY) {
      speakHelp([{ text: '你選的是' }, answerSound(target), { text: '再聽聽看' }, promptSound(selected)]);
      showFeedback('再聽聽看！', 1500);
    } else if (helpLevel === HELP_NARROW) {
      if (!hiddenAnswers[selected.id]) {
        const wrong = items.filter(i => !i.matched && i.id !== selected.id).map(i => i.id);
        setHiddenAnswers(prev => ({ ...prev, [selected.id]: choicesToHide(wrong, tried) }));
      }
      speakHelp([{ text: '你選的是' }, answerSound(target), { text: '剩下兩個，再試一次' }, promptSound(selected)]);
      showFeedback('剩下兩個，再試一次！', 1800);
    } else {
      speakHelp([{ text: '答案在發亮的地方，點點看' }, promptSound(selected)]);
      showFeedback('答案在發亮的地方，點點看！', 2200);
    }
  };

  const answerHelpClass = (item: EnglishRoundItem) => {
    if (!selectedId) return '';
    if (hiddenAnswers[selectedId]?.includes(item.id)) return 'opacity-20 grayscale pointer-events-none';
    if ((help[selectedId] || 0) >= HELP_SHOW && item.id === selectedId) return 'ring-8 ring-yellow-400 rounded-xl animate-bounce';
    return '';
  };

  // --- LEFT COLUMN: prompts ---
  const renderPrompt = (item: EnglishRoundItem) => {
    const info = getLetter(item.text);
    const isSelected = selectedId === item.id;

    if (item.matched) {
      return (
        <div key={item.id} className={`w-full ${CARD_HEIGHT} rounded-xl border-4 border-green-400 bg-green-50 flex items-center justify-center gap-3 animate-pop`}>
          <span className="text-[clamp(1.75rem,6vh,3rem)] leading-none">{item.emoji}</span>
          {isLetters && info
            ? <HighlightedKeyword keyword={item.keyword} letter={item.text} className="text-[clamp(1.25rem,4vh,1.875rem)] font-bold text-gray-700" />
            : <span className="font-english text-[clamp(1.25rem,4vh,1.875rem)] font-bold text-green-700">{item.text}</span>}
        </div>
      );
    }

    const baseClass = `w-full ${CARD_HEIGHT} rounded-xl border-4 flex items-center justify-center relative gap-2 transition-all duration-300 transform shadow-lg`;
    const selectedClass = 'border-yellow-500 bg-yellow-100 ring-4 ring-yellow-300 ring-offset-2 scale-105 z-10';

    if (isListening) {
      return (
        <button
          key={item.id}
          onClick={() => handlePromptClick(item)}
          className={`${baseClass} flex-col ${isSelected ? selectedClass : 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:scale-105 active:scale-95'}`}
        >
          <div className={`p-[1vh] rounded-full ${isSelected ? 'bg-yellow-300 text-yellow-800 animate-bounce' : 'bg-orange-200 text-orange-600'}`}>
            <Ear size={32} />
          </div>
          <span className={`text-[clamp(0.7rem,1.8vh,0.875rem)] font-bold ${isSelected ? 'text-yellow-800' : 'text-gray-500'}`}>
            {isSelected ? '再點一次可以重聽' : '點我聽聲音'}
          </span>
        </button>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handlePromptClick(item)}
        className={`${baseClass} ${isSelected ? selectedClass : 'border-blue-400 bg-white hover:border-blue-500 hover:scale-105 active:scale-95'}`}
      >
        {isSelected && (
          <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-yellow-500 text-white p-1 rounded-full shadow-md animate-bounce">
            <MousePointerClick size={20} className="fill-current" />
          </div>
        )}
        <span className={`font-english font-bold text-gray-800 leading-none ${isLetters ? 'text-[clamp(2.25rem,min(14vw,8vh),4rem)]' : 'text-[clamp(1.5rem,min(9vw,6vh),3rem)]'}`}>
          {isLetters && info ? info.upper : item.text}
        </span>
        <Volume2 size={18} className={`absolute bottom-2 right-2 ${isSelected ? 'text-yellow-700 animate-pulse' : 'text-gray-300'}`} />
      </button>
    );
  };

  // --- RIGHT COLUMN: answers ---
  const renderAnswer = (item: EnglishRoundItem) => {
    const info = getLetter(item.text);
    const highlight = selectedId !== null && !item.matched;
    const slotState = item.matched
      ? 'border-green-500 bg-green-50'
      : highlight
        ? 'border-yellow-400 bg-yellow-50 scale-105 animate-pulse cursor-pointer'
        : 'border-indigo-200 bg-white';

    // Word reading level: dashed slot + picture, like the Chinese game
    if (!isLetters && !isListening) {
      return (
        <div key={`slot-${item.id}`} className={`flex flex-row items-center justify-end gap-4 w-full ${CARD_HEIGHT} ${answerHelpClass(item)}`}>
          <button
            onClick={() => handleAnswerClick(item)}
            disabled={item.matched}
            className={`h-full max-h-32 aspect-square max-w-[48%] min-w-0 rounded-xl border-4 border-dashed flex items-center justify-center transition-all duration-300 ${item.matched ? 'border-green-500 bg-green-50' : highlight ? 'border-yellow-400 bg-yellow-50 scale-105 animate-pulse cursor-pointer' : 'border-gray-300 bg-gray-50'}`}
          >
            {item.matched
              ? <span className="font-english text-[clamp(1.1rem,min(6vw,4vh),1.875rem)] font-bold text-green-700 animate-pop">{item.text}</span>
              : <span className="text-gray-300 text-[clamp(1.5rem,5vh,2.25rem)]">?</span>}
          </button>
          <button
            onClick={() => handleAnswerClick(item)}
            disabled={item.matched}
            className="h-full max-h-32 aspect-square max-w-[48%] min-w-0 flex flex-col items-center justify-center"
          >
            <span className="text-[clamp(2.25rem,8vh,4.5rem)] leading-none drop-shadow-md">{item.emoji}</span>
            <span className="text-[clamp(0.65rem,1.6vh,0.875rem)] text-gray-400 font-bold mt-1">{item.zh}</span>
          </button>
        </div>
      );
    }

    let content: React.ReactNode;
    if (isLetters && info) {
      content = item.matched && !isListening
        ? <span className="flex items-center gap-2"><span className="font-english text-[clamp(1.75rem,min(10vw,6vh),3rem)] font-bold text-green-700">{info.upper}{info.lower}</span><span className="text-[clamp(1.25rem,4vh,1.875rem)]">{item.emoji}</span></span>
        : <span className={`font-english text-[clamp(2.25rem,min(14vw,8vh),4rem)] leading-none font-bold ${item.matched ? 'text-gray-400' : 'text-gray-800'}`}>{isListening ? `${info.upper}${info.lower}` : info.lower}</span>;
    } else {
      content = <span className={`font-english text-[clamp(1.4rem,min(8vw,5vh),2.25rem)] font-bold ${item.matched ? 'text-gray-400' : 'text-gray-800'}`}>{item.text}</span>;
    }

    return (
      <button
        key={`slot-${item.id}`}
        onClick={() => handleAnswerClick(item)}
        disabled={item.matched}
        className={`w-full ${CARD_HEIGHT} rounded-xl border-4 flex items-center justify-center transition-all duration-300 transform shadow-md ${slotState} ${item.matched && isListening ? 'opacity-60 scale-95' : ''} ${answerHelpClass(item)}`}
      >
        {content}
      </button>
    );
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title={`${levelInfo.emoji} ${levelInfo.title}`}
      instruction={levelInfo.instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent={isListening ? 'text-red-500' : 'text-blue-600'}
      wide
    >
      <div className="flex-1 min-h-0 w-full max-h-[46rem] my-auto grid grid-cols-2 gap-3 md:gap-10">
        <div className="min-h-0 flex flex-col gap-[1.5vh]">
          {items.map(item => <div key={item.id} className="flex-1 min-h-0">{renderPrompt(item)}</div>)}
        </div>
        <div className={`relative min-h-0 flex flex-col gap-[1.5vh] transition-opacity ${locked ? 'opacity-50' : ''}`}>
          <ListenChip show={locked} />
          {answers.map(a => <div key={`slot-${a.id}`} className="flex-1 min-h-0">{renderAnswer(byId(a.id) || a)}</div>)}
        </div>
      </div>
    </GameScreen>
  );
};
