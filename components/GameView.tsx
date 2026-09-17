
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WordItem, UserProfile, Confusion } from '../types';
import { WordCard as WordCardComponent } from './WordCard';
import { ImageSlot } from './ImageSlot';
import { WritingOverlay } from './WritingOverlay';
import { ZhuyinTraceOverlay } from './ZhuyinTraceOverlay';
import { Home, Star, RefreshCw, ArrowRight, Ear, PenTool } from 'lucide-react';
import { playSound } from '../utils/sound';
import { AudioStep, playChineseAudio, preloadChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { canPlayPictureRound } from '../utils/wordPicture';
import { choicesToHide, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { InstructionButton, speakHelp, useInstruction } from './VoiceGuide';

interface GameViewProps {
  currentUser: UserProfile;
  currentDifficulty: number;
  currentWords: WordItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake?: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
  gameMode?: 'word' | 'zhuyin';
  writeStage?: (character: string) => number; // How much writing support this item still needs (0–3)
}

export const GameView: React.FC<GameViewProps> = ({
  currentUser, currentDifficulty, currentWords, onMatch, onMistake, onHome, onRefresh, gameMode = 'word', writeStage
}) => {
  const [slotOrder, setSlotOrder] = useState<string[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [writingCharacter, setWritingCharacter] = useState<WordItem | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  // Help level reached for each card this round, and the choices hidden for it (HELP_NARROW)
  const [help, setHelp] = useState<Record<string, number>>({});
  const [hiddenSlots, setHiddenSlots] = useState<Record<string, string[]>>({});
  const [triedSlots, setTriedSlots] = useState<Record<string, string[]>>({});
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const roundKey = currentWords.map(w => w.id).join('|');

  useEffect(() => {
    // Shuffle the slots once per round, so they don't jump around after each match
    setSlotOrder(currentWords.map(w => w.id).sort(() => Math.random() - 0.5));
    setSelectedCardId(null);
    setHelp({});
    setHiddenSlots({});
    setTriedSlots({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  // Decided once per round (AI images arriving later must not switch the round type mid-game):
  // without a picture for every card, read the zhuyin to find the character instead
  const zhuyinRound = useMemo(
    () => gameMode === 'word' && currentDifficulty !== 2 && !canPlayPictureRound(currentWords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundKey, gameMode, currentDifficulty]
  );

  const instruction = gameInstruction(currentDifficulty, gameMode, zhuyinRound);
  useInstruction(`game-${gameMode}-${currentDifficulty}${zhuyinRound ? '-zhuyin' : ''}`, instruction);

  useEffect(() => () => {
    stopChineseAudio();
    clearTimeout(feedbackTimer.current);
  }, []);

  useEffect(() => {
    preloadChineseAudio(currentWords.flatMap(w => [
      { url: w.audioUrl, text: w.character },
      { url: w.exampleAudioUrl, text: w.exampleWord || '' },
    ]));
  }, [currentWords]);

  const showFeedback = (text: string, ms: number) => {
    clearTimeout(feedbackTimer.current);
    setFeedbackMessage(text);
    feedbackTimer.current = setTimeout(() => setFeedbackMessage(null), ms);
  };

  const cardSound = (item: WordItem): AudioStep => ({ url: item.audioUrl, text: item.character });
  // What a slot shows: the picture word in zhuyin picture rounds, otherwise the character or zhuyin itself
  const slotSound = (item: WordItem): AudioStep =>
    gameMode === 'zhuyin' && currentDifficulty !== 2 && item.exampleWord
      ? { url: item.exampleAudioUrl, text: item.exampleWord }
      : { url: item.audioUrl, text: item.character };

  // 教育部 recordings, with speech synthesis as a fallback
  const playItem = (item: WordItem, withExample = false) => {
    const steps: AudioStep[] = [cardSound(item)];
    if (withExample && item.exampleWord) steps.push({ url: item.exampleAudioUrl, text: item.exampleWord });
    playChineseAudio(steps);
  };

  const handleCardClick = (id: string) => {
    const item = currentWords.find(w => w.id === id);
    if (item) playItem(item);
    if (selectedCardId === id) {
      setSelectedCardId(null);
    } else {
      setSelectedCardId(id);
      playSound('pop');
    }
  };

  const handleSlotClick = (targetItem: WordItem) => {
    if (!selectedCardId) return;
    const selectedCard = currentWords.find(w => w.id === selectedCardId);
    if (!selectedCard || hiddenSlots[selectedCard.id]?.includes(targetItem.id)) return;

    if (selectedCard.id === targetItem.id) {
      if (currentDifficulty === 3) {
         playSound('pop');
         setWritingCharacter(targetItem);
         setSelectedCardId(null);
      } else {
         playSound('success');
         if (gameMode === 'zhuyin') playItem(targetItem, true); // 「ㄇ…貓」
         triggerMatch(targetItem.id);
      }
      return;
    }

    // Wrong: one more level of help for this card. The card stays selected so the help shows right away.
    playSound('error');
    onMistake?.(selectedCard.id, { kind: gameMode === 'zhuyin' ? 'symbol' : 'word', expected: selectedCard.character, chosen: targetItem.character });
    const level = nextHelp(help[selectedCard.id] || 0);
    const tried = [...(triedSlots[selectedCard.id] || []), targetItem.id];
    setHelp(prev => ({ ...prev, [selectedCard.id]: level }));
    setTriedSlots(prev => ({ ...prev, [selectedCard.id]: tried }));

    if (level === HELP_RETRY) {
      speakHelp([{ text: '你選的是' }, slotSound(targetItem), { text: '再聽聽看' }, cardSound(selectedCard)]);
      showFeedback('再聽聽看！', 1500);
    } else if (level === HELP_NARROW) {
      if (!hiddenSlots[selectedCard.id]) {
        const wrong = currentWords.filter(w => !w.matched && w.id !== selectedCard.id).map(w => w.id);
        setHiddenSlots(prev => ({ ...prev, [selectedCard.id]: choicesToHide(wrong, tried) }));
      }
      speakHelp([{ text: '你選的是' }, slotSound(targetItem), { text: '剩下兩個，再試一次' }, cardSound(selectedCard)]);
      showFeedback('剩下兩個，再試一次！', 1800);
    } else {
      speakHelp([{ text: '答案在發亮的地方，點點看' }, cardSound(selectedCard)]);
      showFeedback('答案在發亮的地方，點點看！', 2200);
    }
  };

  const triggerMatch = (id: string, extraHelp = 0) => {
    const level = Math.max(help[id] || 0, extraHelp);
    onMatch(id, level);
    setSelectedCardId(null);
    showFeedback(praise(level, currentDifficulty === 2 ? 'listen' : currentDifficulty === 3 ? 'write' : 'look'), 1500);
  };

  const handleWritingSkip = () => {
    if (!writingCharacter) return;
    onMatch(writingCharacter.id, HELP_SHOW);
    setSelectedCardId(null);
    setWritingCharacter(null);
    showFeedback('下次再寫寫看！', 1500);
  };

  const handleWritingComplete = (helped: boolean) => {
    if (writingCharacter) {
      playSound('success');
      triggerMatch(writingCharacter.id, helped ? HELP_RETRY : 0);
      setWritingCharacter(null);
    }
  };

  const selectedHelp = selectedCardId ? help[selectedCardId] || 0 : 0;
  const slots = slotOrder.map(id => currentWords.find(w => w.id === id)).filter((w): w is WordItem => !!w);

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto p-4 md:p-6">
      {/* Writing Overlay */}
      {gameMode === 'zhuyin' ? (
        <ZhuyinTraceOverlay
          item={writingCharacter}
          stage={writingCharacter ? writeStage?.(writingCharacter.character) ?? 0 : 0}
          onComplete={handleWritingComplete}
          onCancel={handleWritingSkip}
        />
      ) : (
        <WritingOverlay
          character={writingCharacter}
          stage={writingCharacter ? writeStage?.(writingCharacter.character) ?? 0 : 0}
          onComplete={handleWritingComplete}
          onCancel={handleWritingSkip}
        />
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-blue-100">
        <button
          onClick={onHome}
          className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 border-2 border-transparent hover:border-gray-200 transform active:scale-95"
        >
          <Home size={24} /> <span className="text-lg">回首頁</span>
        </button>
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">
          <Star className="fill-yellow-400 text-yellow-500 animate-pulse" />
          <span className="font-bold text-yellow-800 text-xl">{currentUser.points}</span>
        </div>
        <button onClick={onRefresh} className="p-2 hover:bg-blue-50 rounded-full text-blue-500 transition">
          <RefreshCw size={24} />
        </button>
      </div>

      {/* Level Title */}
      <div className="text-center mb-6">
         {currentDifficulty === 2 && (
           <h2 className="text-2xl font-bold text-red-500 flex items-center justify-center gap-2">
             <Ear className="animate-pulse" /> 聽力大挑戰：聽聲音，找{gameMode === 'zhuyin' ? '注音' : '國字'}！
           </h2>
         )}
         {currentDifficulty === 3 && (
           <h2 className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-2">
             <PenTool className="animate-bounce" /> 小小書法家：動手寫{gameMode === 'zhuyin' ? '注音' : '國字'}！
           </h2>
         )}
         {currentDifficulty === 1 && (
           <h2 className="text-2xl font-bold text-blue-600">
             冒險模式：{gameMode === 'zhuyin' ? '看符號，找圖片' : zhuyinRound ? '看注音，找國字' : '看圖片找國字'}！
           </h2>
         )}
         <p className="text-gray-500 mt-1">{instruction}</p>
         <InstructionButton text={instruction} className="mt-2" />
      </div>

      {/* Game Area */}
      <div className="flex-1 grid grid-cols-2 gap-4 md:gap-12 items-start relative">
        <div className="flex flex-col gap-4">
          {currentWords.map((item) => (
            <WordCardComponent
              key={item.id}
              item={item}
              isSelected={selectedCardId === item.id}
              onClick={() => handleCardClick(item.id)}
              mode={currentDifficulty === 2 ? 'listening' : 'reading'}
              gameMode={gameMode}
              hideZhuyin={zhuyinRound}
            />
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex flex-col gap-24 pointer-events-none opacity-20">
           <ArrowRight size={48} />
           <ArrowRight size={48} />
        </div>

        <div className="flex flex-col gap-4">
          {slots.map((item) => (
             <ImageSlot
               key={`slot-${item.id}`}
               item={item}
               onSlotClick={() => handleSlotClick(item)}
               isCorrectlyMatched={item.matched}
               highlight={selectedCardId !== null && !item.matched}
               hiddenChoice={!!selectedCardId && !!hiddenSlots[selectedCardId]?.includes(item.id)}
               answerHint={selectedHelp >= HELP_SHOW && item.id === selectedCardId}
               mode={currentDifficulty === 2 ? 'listening' : 'reading'}
               gameMode={gameMode}
               showZhuyin={zhuyinRound}
             />
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-40 whitespace-nowrap">
           <span className="text-2xl font-bold text-yellow-600">{feedbackMessage}</span>
        </div>
      )}
    </div>
  );
};
