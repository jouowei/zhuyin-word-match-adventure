import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Confusion, EnglishRoundItem, UserProfile } from '../../types';
import { shuffleItems } from '../../english/curriculum';
import { useFeedback } from './shared';
import { GameScreen } from '../GameScreen';
import { Volume2, Snail, CheckCircle2 } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { speakEnglish, speakLetterName, speakPraise } from '../../utils/englishSpeech';
import { getLetter } from '../../english/letters';
import { AudioStep, playChineseAudio } from '../../utils/chineseAudio';
import { choicesToHide, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { praise } from '../Praise';
import { WORD_LEVELS } from '../../english/curriculum';
import { speakHelp, withInstruction } from '../VoiceGuide';

interface EnglishSpellGameViewProps {
  currentUser: UserProfile;
  items: EnglishRoundItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
  blendFirst?: (word: string) => boolean; // Not yet spelled on own: hear it stretched and find the picture first
}

interface Tile { id: number; letter: string; used: boolean; }

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const isLetter = (ch: string) => /[a-z]/i.test(ch);

const buildTiles = (word: string): Tile[] => {
  const letters = word.toLowerCase().split('').filter(isLetter);
  const distractors = shuffleItems(ALPHABET.split('').filter(l => !letters.includes(l))).slice(0, 2);
  return shuffleItems([...letters, ...distractors]).map((letter, id) => ({ id, letter, used: false }));
};

export const EnglishSpellGameView: React.FC<EnglishSpellGameViewProps> = ({
  currentUser, items, onMatch, onMistake, onHome, onRefresh, blendFirst
}) => {
  const instruction = WORD_LEVELS[2].instruction;
  const current = items.find(i => !i.matched);
  const chars = useMemo(() => (current ? current.text.split('') : []), [current?.id]);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [position, setPosition] = useState(0);
  // Help for the next letter, and the most help used on the whole word
  const [stepHelp, setStepHelp] = useState(0);
  const [itemHelp, setItemHelp] = useState(0);
  const [hiddenTiles, setHiddenTiles] = useState<number[]>([]);
  const [shakeTileId, setShakeTileId] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);
  // Stretch-and-blend step: hear the word slowly, sounds joined rather than chopped up, and find its picture
  const [phase, setPhase] = useState<'blend' | 'spell'>('spell');
  const [blendChoices, setBlendChoices] = useState<EnglishRoundItem[]>([]);
  const [blendHelp, setBlendHelp] = useState(0);
  const [blendHidden, setBlendHidden] = useState<string[]>([]);
  const [litUpTo, setLitUpTo] = useState<number | null>(null);
  const lightTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [feedback, showFeedback] = useFeedback();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    clearInterval(lightTimer.current);
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const skipNonLetters = (pos: number) => {
    let p = pos;
    while (p < chars.length && !isLetter(chars[p])) p++;
    return p;
  };

  useEffect(() => {
    if (!current) return;
    setTiles(buildTiles(current.text));
    setPosition(skipNonLetters(0));
    setStepHelp(0);
    setItemHelp(0);
    setHiddenTiles([]);
    setIsDone(false);
    const others = shuffleItems(items.filter(i => i.id !== current.id && i.emoji !== current.emoji));
    const blend = !!blendFirst?.(current.text) && others.length > 0;
    setPhase(blend ? 'blend' : 'spell');
    setBlendChoices(blend ? shuffleItems([current, ...others.slice(0, 2)]) : []);
    setBlendHelp(0);
    setBlendHidden([]);
    const timer = setTimeout(() => (blend
      ? playSlow(withInstruction('english-spell', instruction, [{ text: '慢慢聽，是哪一個？', rate: 0.95 }]))
      : playChineseAudio(withInstruction('english-spell', instruction, [{ text: current.text, lang: 'en' }]))), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  /** The word stretched out after the steps before it, its letter boxes lighting up left to right. */
  function playSlow(before: AudioStep[]) {
    if (!current) return;
    const word = current.text;
    clearInterval(lightTimer.current);
    setLitUpTo(null);
    playChineseAudio([...before, { text: word, lang: 'en', rate: 0.35 }], () => {
      clearInterval(lightTimer.current);
      setLitUpTo(null);
    }, index => {
      if (index !== before.length) return;
      let lit = 0;
      setLitUpTo(0);
      lightTimer.current = setInterval(() => {
        lit++;
        if (lit >= word.length) clearInterval(lightTimer.current);
        setLitUpTo(lit);
      }, 380);
    });
  }

  const handleBlendChoice = (choice: EnglishRoundItem) => {
    if (phase !== 'blend' || blendHidden.includes(choice.id)) return;
    if (choice.id !== current.id) {
      playSound('error');
      const level = nextHelp(blendHelp);
      setBlendHelp(level);
      if (level === HELP_NARROW) {
        const wrong = blendChoices.filter(c => c.id !== current.id).map(c => c.id);
        setBlendHidden(choicesToHide(wrong, [choice.id]));
      }
      if (level >= HELP_SHOW) speakHelp([{ text: '是發亮的這一個' }, { text: current.text, lang: 'en' }]);
      else playSlow([{ text: '你選的是', rate: 0.95 }, { text: choice.text, lang: 'en' }, { text: '再慢慢聽一次', rate: 0.95 }]);
      return;
    }
    playSound('success');
    clearInterval(lightTimer.current);
    setLitUpTo(null);
    playChineseAudio([{ text: current.text, lang: 'en' }, { text: '對了！現在把它拼出來', rate: 0.95 }]);
    later(() => setPhase('spell'), 1600);
  };

  const expected = chars[position]?.toLowerCase();
  const hintTile = stepHelp >= HELP_SHOW ? tiles.find(t => !t.used && t.letter === expected) : undefined;
  const letterName = (letter: string) => getLetter(letter)?.name || letter;

  const handleTileClick = (tile: Tile) => {
    if (phase !== 'spell' || tile.used || isDone || hiddenTiles.includes(tile.id)) return;

    if (tile.letter !== expected) {
      playSound('error');
      setShakeTileId(tile.id);
      later(() => setShakeTileId(null), 500);
      onMistake(current.id, { kind: 'letter', expected, chosen: tile.letter });
      const level = nextHelp(stepHelp);
      setStepHelp(level);
      setItemHelp(h => Math.max(h, level));
      if (level === HELP_RETRY) {
        speakHelp([{ text: '你點的是' }, { text: letterName(tile.letter), lang: 'en' }, { text: '再聽一次' }, { text: current.text, lang: 'en' }]);
      } else if (level === HELP_NARROW) {
        // Take away letters that aren't in this word at all
        const word = current.text.toLowerCase();
        const distractors = tiles.filter(t => !t.used && !word.includes(t.letter)).map(t => t.id);
        setHiddenTiles(choicesToHide(distractors, [tile.id]));
        speakHelp([{ text: '慢慢聽' }, { text: current.text, lang: 'en', rate: 0.4 }]);
      } else {
        speakHelp([{ text: '下一個字母是' }, { text: letterName(expected), lang: 'en' }, { text: '點點發亮的那一個' }]);
      }
      return;
    }

    playSound('pop');
    speakLetterName(tile.letter);
    setTiles(prev => prev.map(t => (t.id === tile.id ? { ...t, used: true } : t)));
    setStepHelp(0);
    setHiddenTiles([]);

    const next = skipNonLetters(position + 1);
    setPosition(next);

    if (next >= chars.length) {
      setIsDone(true);
      later(() => {
        playSound('success');
        speakEnglish(current.text, { onEnd: speakPraise });
        showFeedback(praise(itemHelp, 'spell', { speak: false }));
      }, 500);
      later(() => onMatch(current.id, itemHelp), 2200);
    }
  };

  const matchedCount = items.filter(i => i.matched).length;

  return (
    <GameScreen
      currentUser={currentUser}
      title="🧩 拼字高手"
      instruction={phase === 'blend' ? '慢慢聽，找出是哪一張圖，再把它拼出來！' : instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent="text-amber-600"
    >
      {/* Round progress */}
      <div className="shrink-0 flex justify-center gap-3 mb-[1.5vh]">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-amber-300 border-amber-500 scale-125' : 'bg-gray-100 border-gray-300'}`}
          />
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border-b-8 border-amber-200 p-4 flex flex-col items-center justify-center gap-[2vh]">
        {phase === 'spell' && (
          <div className="flex flex-col items-center">
            <div className={`text-[clamp(3.5rem,14vh,8rem)] leading-none ${isDone ? 'animate-bounce' : 'animate-float'}`}>{current.emoji}</div>
            <div className="text-gray-400 font-bold">{current.zh}</div>
          </div>
        )}

        {phase === 'blend' && (
          <button
            onClick={() => playSlow([])}
            className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-800 font-bold px-5 py-3 rounded-2xl transition active:scale-95"
          >
            <Snail size={24} /> 再慢慢聽一次
          </button>
        )}

        <div className={`flex gap-3 ${phase === 'blend' ? 'hidden' : ''}`}>
          <button
            onClick={() => speakEnglish(current.text)}
            className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-4 py-[1.2vh] rounded-2xl transition active:scale-95"
          >
            <Volume2 size={24} /> 聽單字
          </button>
          <button
            onClick={() => speakEnglish(current.text, { rate: 0.4 })}
            className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-800 font-bold px-4 py-[1.2vh] rounded-2xl transition active:scale-95"
          >
            <Snail size={24} /> 慢慢聽
          </button>
        </div>

        {/* Letter blanks */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          {chars.map((ch, i) => {
            if (!isLetter(ch)) {
              return <div key={i} className="w-6 md:w-8 flex items-end justify-center font-english text-4xl font-bold text-gray-400">{ch === ' ' ? '' : ch}</div>;
            }
            const filled = i < position;
            const isNext = i === position && !isDone && phase === 'spell';
            const lit = phase === 'blend' && litUpTo !== null && i <= litUpTo;
            return (
              <div
                key={i}
                className={`w-[clamp(2.75rem,min(13vw,9vh),4rem)] h-[clamp(3.25rem,min(16vw,11vh),5rem)] rounded-xl border-b-8 flex items-center justify-center font-english text-[clamp(1.9rem,min(10vw,6.5vh),3rem)] font-bold transition-all
                  ${lit ? 'bg-yellow-200 border-yellow-500 scale-110' : filled ? (isDone ? 'bg-green-100 border-green-400 text-green-700 animate-pop' : 'bg-amber-50 border-amber-400 text-gray-800 animate-pop') : isNext ? 'bg-yellow-50 border-yellow-400 animate-pulse' : 'bg-gray-50 border-gray-300'}`}
              >
                {filled ? ch : ''}
              </div>
            );
          })}
        </div>

        {phase === 'blend' ? (
          <div className={`grid gap-3 w-full max-w-md ${blendChoices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {blendChoices.map(choice => (
              <div key={choice.id} className="relative">
                <button
                  onClick={() => handleBlendChoice(choice)}
                  disabled={blendHidden.includes(choice.id)}
                  className={`w-full rounded-2xl border-4 bg-white p-2 pb-8 flex flex-col items-center shadow-lg transition
                    ${blendHidden.includes(choice.id) ? 'opacity-20 border-gray-200' : 'border-amber-200 hover:border-amber-400 active:scale-95'}
                    ${blendHelp >= HELP_SHOW && choice.id === current.id ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
                >
                  <span className="text-[clamp(2.5rem,9vh,3.75rem)] leading-none">{choice.emoji}</span>
                </button>
                {/* Comparing each picture word at normal speed with the stretched one is the task */}
                <button
                  onClick={() => speakEnglish(choice.text)}
                  disabled={blendHidden.includes(choice.id)}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-90"
                  aria-label="聽這張圖的英文"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : isDone ? (
          <div className="flex items-center gap-2 text-green-600 text-2xl font-black animate-pop py-4">
            <CheckCircle2 size={32} /> <span className="font-english">{current.text}</span>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {tiles.map(tile => (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={tile.used || hiddenTiles.includes(tile.id)}
                className={`w-[clamp(3.25rem,min(16vw,10vh),5rem)] h-[clamp(3.25rem,min(16vw,10vh),5rem)] rounded-2xl font-english text-[clamp(1.9rem,min(10vw,6.5vh),3rem)] font-bold shadow-lg border-b-4 transition-all transform
                  ${tile.used ? 'opacity-0 pointer-events-none' : hiddenTiles.includes(tile.id) ? 'opacity-20 bg-gray-100 border-gray-200 text-gray-300' : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:-translate-y-1 active:scale-95'}
                  ${shakeTileId === tile.id ? 'animate-shake-once bg-red-100 border-red-400 text-red-600' : ''}
                  ${hintTile?.id === tile.id ? 'ring-4 ring-yellow-400 animate-bounce' : ''}`}
              >
                {tile.letter}
              </button>
            ))}
          </div>
        )}
      </div>

    </GameScreen>
  );
};
