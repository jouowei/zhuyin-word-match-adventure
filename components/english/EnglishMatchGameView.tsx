import React, { useEffect, useState } from 'react';
import { Confusion, EnglishRoundItem, EnglishUnit, UserProfile } from '../../types';
import { getLetter } from '../../english/letters';
import { getLevels, shuffleItems } from '../../english/curriculum';
import { EnglishTopBar, FeedbackToast, HighlightedKeyword, useFeedback } from './shared';
import { Ear, MousePointerClick, Volume2 } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { speakEnglish, speakLetterName } from '../../utils/englishSpeech';
import { AudioStep } from '../../utils/chineseAudio';
import { choicesToHide, correctMessage, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { InstructionButton, speakHelp, useInstruction } from '../VoiceGuide';

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

const CARD_HEIGHT = 'h-24 md:h-32';

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

  const speakPrompt = (item: EnglishRoundItem) => {
    if (isLetters && !isListening) speakLetterName(item.text);
    else speakEnglish(item.keyword);
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
    if (!selectedId || target.matched) return;
    const selected = byId(selectedId);
    if (!selected || hiddenAnswers[selected.id]?.includes(target.id)) return;

    if (selected.id === target.id) {
      playSound('success');
      const info = getLetter(target.text);
      speakEnglish(isLetters && info ? `${info.name}. ${info.keyword}.` : target.keyword);
      const helpLevel = help[target.id] || 0;
      onMatch(target.id, helpLevel);
      showFeedback(correctMessage(helpLevel, isListening ? 'listen' : 'look'));
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
          <span className="text-4xl md:text-5xl">{item.emoji}</span>
          {isLetters && info
            ? <HighlightedKeyword keyword={item.keyword} letter={item.text} className="text-2xl md:text-3xl font-bold text-gray-700" />
            : <span className="font-english text-2xl md:text-3xl font-bold text-green-700">{item.text}</span>}
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
          <div className={`p-3 rounded-full ${isSelected ? 'bg-yellow-300 text-yellow-800 animate-bounce' : 'bg-orange-200 text-orange-600'}`}>
            <Ear size={32} />
          </div>
          <span className={`text-sm font-bold ${isSelected ? 'text-yellow-800' : 'text-gray-500'}`}>
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
        <span className="font-english text-5xl md:text-6xl font-bold text-gray-800">
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
            className={`w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-dashed flex items-center justify-center transition-all duration-300 shrink-0 ${item.matched ? 'border-green-500 bg-green-50' : highlight ? 'border-yellow-400 bg-yellow-50 scale-105 animate-pulse cursor-pointer' : 'border-gray-300 bg-gray-50'}`}
          >
            {item.matched
              ? <span className="font-english text-2xl md:text-3xl font-bold text-green-700 animate-pop">{item.text}</span>
              : <span className="text-gray-300 text-4xl">?</span>}
          </button>
          <button
            onClick={() => handleAnswerClick(item)}
            disabled={item.matched}
            className="w-24 h-24 md:w-32 md:h-32 flex flex-col items-center justify-center shrink-0"
          >
            <span className="text-6xl md:text-7xl drop-shadow-md">{item.emoji}</span>
            <span className="text-xs md:text-sm text-gray-400 font-bold mt-1">{item.zh}</span>
          </button>
        </div>
      );
    }

    let content: React.ReactNode;
    if (isLetters && info) {
      content = item.matched && !isListening
        ? <span className="flex items-center gap-2"><span className="font-english text-4xl md:text-5xl font-bold text-green-700">{info.upper}{info.lower}</span><span className="text-3xl">{item.emoji}</span></span>
        : <span className={`font-english text-5xl md:text-6xl font-bold ${item.matched ? 'text-gray-400' : 'text-gray-800'}`}>{isListening ? `${info.upper}${info.lower}` : info.lower}</span>;
    } else {
      content = <span className={`font-english text-3xl md:text-4xl font-bold ${item.matched ? 'text-gray-400' : 'text-gray-800'}`}>{item.text}</span>;
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
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto p-4 md:p-6">
      <EnglishTopBar currentUser={currentUser} onHome={onHome} onRefresh={onRefresh} />

      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold flex items-center justify-center gap-2 ${isListening ? 'text-red-500' : 'text-blue-600'}`}>
          <span className={isListening ? 'animate-pulse' : ''}>{levelInfo.emoji}</span> {levelInfo.title}
        </h2>
        <p className="text-gray-500 mt-1">
          {isListening
            ? (isLetters ? '先點左邊聽單字，再找出它「開頭」的字母！' : '先點左邊聽聲音，再點右邊的單字！')
            : (isLetters ? '先點大寫字母，再點一樣的小寫字母！' : '先點單字，再點它的圖片！')}
        </p>
        <InstructionButton text={levelInfo.instruction} className="mt-2" />
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 md:gap-12 items-start">
        <div className="flex flex-col gap-4">{items.map(renderPrompt)}</div>
        <div className="flex flex-col gap-4">{answers.map(a => renderAnswer(byId(a.id) || a))}</div>
      </div>

      <FeedbackToast message={feedback} />
    </div>
  );
};
