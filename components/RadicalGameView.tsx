import React, { useEffect, useRef, useState } from 'react';
import { Home, Star, RefreshCw, Search, Volume2, X } from 'lucide-react';
import { UserProfile, WordItem } from '../types';
import { GuessChoice, RadicalCard, RadicalQuestion } from '../services/radicals';
import { correctMessage, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { gameInstruction } from '../services/instructions';
import { AudioStep, playChineseAudio, preloadChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';
import { InstructionButton, speakHelp, withInstruction } from './VoiceGuide';
import { RadicalGlyph } from './RadicalGlyph';

interface RadicalGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];      // One per component; matched when both steps are done
  questions: RadicalQuestion[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string) => void;
  onHome: () => void;
  onRefresh: () => void;
}

const zh = (text: string): AudioStep => ({ text, rate: 0.95 });
const charSound = (card: { char: string; audioUrl?: string }): AudioStep => ({ url: card.audioUrl, text: card.char });

/**
 * Discover, then apply: find the characters that share a component (their pictures show what they have in common),
 * hear the rule (氵 is usually about water), then find the one new character that fits the meaning.
 */
export const RadicalGameView: React.FC<RadicalGameViewProps> = ({ currentUser, currentWords, questions, onMatch, onMistake, onHome, onRefresh }) => {
  const current = currentWords.find(w => !w.matched);
  const question = questions.find(q => q.item.id === current?.id);
  const instruction = gameInstruction(8, 'word');

  const [phase, setPhase] = useState<'find' | 'rule' | 'guess' | 'done'>('find');
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [findHelp, setFindHelp] = useState(0);
  const [guessHelp, setGuessHelp] = useState(0);
  const [guessWrong, setGuessWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    preloadChineseAudio(questions.flatMap(q => [...q.cards, ...q.guessChoices].map(charSound)));
    return () => {
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!question) return;
    setPhase('find');
    setFound([]);
    setWrong([]);
    setHidden([]);
    setFindHelp(0);
    setGuessHelp(0);
    setGuessWrong([]);
    setFeedback(null);
    const name = question.group.name;
    later(() => playChineseAudio(withInstruction('game-radical', instruction, [zh(`紅色的是「${name}」。哪些字裡面有「${name}」？`)])), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.item.id]);

  if (!current || !question) return null;
  const { group } = question;
  const members = question.cards.filter(c => c.member);
  const matchedCount = currentWords.filter(w => w.matched).length;
  const askGuess = () => [zh(`這裡有三個新的字。哪一個字，和「${group.meaning}」有關係？`)];

  const choose = (card: RadicalCard) => {
    if (phase !== 'find' || found.includes(card.char) || wrong.includes(card.char) || hidden.includes(card.char)) return;
    if (card.member) {
      playSound('success');
      const nowFound = [...found, card.char];
      setFound(nowFound);
      if (nowFound.length < members.length) {
        playChineseAudio([charSound(card)]);
        return;
      }
      // The rule, once the child has seen that the pictures have something in common
      setPhase('rule');
      playChineseAudio(
        [...members.map(m => ({ ...charSound(m), pause: 300 })), zh(`都有「${group.name}」。有「${group.name}」的字，常常和「${group.meaning}」有關係`)],
        () => later(() => {
          setPhase('guess');
          playChineseAudio(askGuess());
        }, 600),
      );
      return;
    }
    playSound('error');
    onMistake(current.id);
    const nowWrong = [...wrong, card.char];
    setWrong(nowWrong);
    const level = nextHelp(findHelp);
    setFindHelp(level);
    if (level === HELP_RETRY) {
      speakHelp([charSound(card), zh(`裡面沒有「${group.name}」，再找找看`)]);
    } else if (level === HELP_NARROW) {
      setHidden(question.cards.filter(c => !c.member && !nowWrong.includes(c.char)).map(c => c.char));
      speakHelp([zh(`剩下的字，都有「${group.name}」喔`)]);
    } else {
      speakHelp([zh(`發亮的字裡面有「${group.name}」`)]);
    }
  };

  const guess = (choice: GuessChoice) => {
    if (phase !== 'guess' || guessWrong.includes(choice.char)) return;
    if (choice.correct) {
      setPhase('done');
      playSound('success');
      const help = Math.max(findHelp, guessHelp);
      setFeedback(correctMessage(help, 'look'));
      playChineseAudio([charSound(choice), zh(`${choice.gloss}。你看，它也有「${group.name}」！`)]);
      later(() => onMatch(current.id, help), 4200);
      return;
    }
    playSound('error');
    onMistake(current.id);
    setGuessWrong([...guessWrong, choice.char]);
    const level = nextHelp(guessHelp);
    setGuessHelp(level);
    // Three choices, so two steps: the component comes back on screen, then only the right character is left, its component in red
    if (level === HELP_RETRY) {
      speakHelp([charSound(choice), zh(`裡面沒有「${group.name}」。「${group.name}」長這個樣子，找找看哪個字裡面有`)]);
    } else {
      speakHelp([zh(`剩下這個字，裡面有紅色的「${group.name}」`)]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-indigo-100">
        <button onClick={onHome} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 active:scale-95">
          <Home size={24} /> <span className="text-lg">回首頁</span>
        </button>
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">
          <Star className="fill-yellow-400 text-yellow-500 animate-pulse" />
          <span className="font-bold text-yellow-800 text-xl">{currentUser.points}</span>
        </div>
        <button onClick={onRefresh} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-500 transition">
          <RefreshCw size={24} />
        </button>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center justify-center gap-2">
          <Search /> 部件偵探：{phase === 'find' || phase === 'rule' ? '找出有同一個部件的字' : '哪個新的字有關係？'}
        </h2>
        <p className="text-gray-500 mt-1">{instruction}</p>
        <InstructionButton text={instruction} className="mt-2" />
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {currentWords.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-indigo-300 border-indigo-500 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      {/* The component, and once the characters are found, what it usually means */}
      <div className="bg-white rounded-3xl shadow-lg border-b-8 border-indigo-200 p-4 mb-4 flex items-center justify-center gap-5 min-h-[8.5rem]">
        {/* Drawn inside a character that isn't a choice: a lone 艹 or 足 in a font looks nothing like it does in a character.
            While guessing it is hidden, so the child looks for the shape they remember, and comes back as help. */}
        {phase === 'guess' && guessHelp < HELP_RETRY
          ? <span className="w-24 h-24 rounded-2xl border-4 border-dashed border-indigo-200 flex items-center justify-center text-5xl text-indigo-300 font-black">?</span>
          : <RadicalGlyph char={question.showcase} size={96} highlight radicalOnly />}
        <div className="text-left">
          <div className="text-3xl font-kai text-indigo-800">{group.name}</div>
          {phase === 'find'
            ? <div className="text-gray-500 font-bold">哪些字裡面有它？（找到 {found.length}/{members.length}）</div>
            : <div className="text-lg font-bold text-emerald-700 animate-pop">常常和 {group.meaningEmoji}「{group.meaning}」有關係</div>}
        </div>
      </div>

      {(phase === 'find' || phase === 'rule') && (
        <div className="grid grid-cols-2 gap-4">
          {question.cards.map(card => {
            const isFound = found.includes(card.char);
            const isWrong = wrong.includes(card.char);
            const isHidden = hidden.includes(card.char);
            const glow = findHelp >= HELP_SHOW && card.member && !isFound;
            return (
              <div key={card.char} className="relative">
                <button
                  onClick={() => choose(card)}
                  disabled={isHidden || phase !== 'find'}
                  className={`w-full rounded-2xl border-4 p-3 pb-9 flex flex-col items-center gap-1 shadow-md transition active:scale-95
                    ${isFound ? 'bg-green-50 border-green-400' : isWrong ? 'bg-gray-50 border-gray-200 opacity-60' : isHidden ? 'opacity-20 border-gray-200' : 'bg-white border-indigo-200 hover:border-indigo-400'}
                    ${glow ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {/* The component turns red once found */}
                    <RadicalGlyph char={card.char} size={88} highlight={isFound} />
                    <span className="text-4xl">{card.emoji}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-500">{card.zhuyin}</span>
                  {isWrong && <X size={20} className="absolute top-2 left-2 text-gray-400" />}
                </button>
                <button
                  onClick={() => playChineseAudio([charSound(card)])}
                  disabled={isHidden}
                  className="absolute bottom-2 right-2 p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-90"
                  aria-label={`聽「${card.char}」`}
                >
                  <Volume2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {(phase === 'guess' || phase === 'done') && (
        <div className="bg-white rounded-3xl shadow-xl border-b-8 border-indigo-200 p-5 flex flex-col items-center gap-4 animate-pop">
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-gray-600">哪一個字和 {group.meaningEmoji}「{group.meaning}」有關係？</p>
            <button onClick={() => playChineseAudio(askGuess())} className="p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-90" aria-label="再聽一次">
              <Volume2 size={20} />
            </button>
          </div>
          {/* No zhuyin or sound before answering: the component is the clue, not the reading */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {question.guessChoices.map(choice => {
              const isWrong = guessWrong.includes(choice.char);
              const isRight = phase === 'done' && choice.correct;
              const onlyOneLeft = guessHelp >= HELP_NARROW && choice.correct;
              return (
                <button
                  key={choice.char}
                  onClick={() => guess(choice)}
                  disabled={isWrong || phase !== 'guess'}
                  className={`rounded-2xl border-4 p-2 flex flex-col items-center gap-1 shadow-md transition active:scale-95
                    ${isRight ? 'bg-green-50 border-green-400' : isWrong ? 'bg-gray-50 border-gray-200 opacity-40' : phase === 'done' ? 'opacity-40 border-gray-200' : 'bg-white border-indigo-200 hover:border-indigo-400'}
                    ${onlyOneLeft && !isRight ? 'ring-8 ring-yellow-400' : ''}`}
                >
                  <RadicalGlyph char={choice.char} size={96} highlight={isRight || onlyOneLeft} />
                  <span className={`text-base font-bold h-6 ${isWrong || isRight ? 'text-gray-500' : 'text-transparent'}`}>{choice.zhuyin}</span>
                </button>
              );
            })}
          </div>
          {phase === 'done' && (
            <p className="text-xl font-black text-emerald-700 text-center animate-pop">
              {group.meaningEmoji} {question.guessChoices.find(c => c.correct)?.gloss}
            </p>
          )}
        </div>
      )}

      {feedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-40 whitespace-nowrap">
          <span className="text-2xl font-bold text-yellow-600">{feedback}</span>
        </div>
      )}
    </div>
  );
};
