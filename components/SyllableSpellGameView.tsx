import React, { useEffect, useRef, useState } from 'react';
import { WordItem, UserProfile, Confusion } from '../types';
import { Home, Star, RefreshCw, Puzzle, Volume2, CheckCircle2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import { AudioStep, playChineseAudio, playChineseWord, stopChineseAudio } from '../utils/chineseAudio';
import { hasPicture } from '../utils/wordPicture';
import { getZhuyinSymbol } from '../zhuyin/symbols';
import {
  buildSymbolTiles, formatSyllable, getToneReferences, parseSyllable, Tone, TONE_OPTIONS, toneHelpSteps,
} from '../services/zhuyinPractice';
import { choicesToHide, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { InstructionButton, speakHelp, withInstruction } from './VoiceGuide';
import { ToneCurve } from './ToneCurve';
import { ToneCompare } from './ToneCompare';

interface SyllableSpellGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];
  gameMode: 'word' | 'zhuyin';
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
  blendFirst: (character: string) => boolean; // Not yet spelled on own: hear the sounds put together first
  toneSupport: boolean;                        // Still learning tones: the 媽麻馬罵 comparison is open
}

interface Tile { id: number; symbol: string; used: boolean; }

type Phase = 'blend' | 'symbols' | 'tone' | 'done';

const symbolSound = (symbol: string): AudioStep => ({ url: getZhuyinSymbol(symbol)?.audio, text: symbol });
const wordSound = (item: WordItem): AudioStep => ({ url: item.audioUrl, text: item.character });
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const MEDIALS = 'ㄧㄨㄩ';

/**
 * Phonological awareness grows from putting sounds together to taking them apart (Anthony & Lonigan 2004):
 * until a character has been spelled on its own, the child first hears its symbols and picks the word they make,
 * then spells it. Medial + final (ㄨㄚ in ㄍㄨㄚ) are shown and sounded as one unit, like 結合韻 in class.
 */
export const SyllableSpellGameView: React.FC<SyllableSpellGameViewProps> = ({
  currentUser, currentWords, gameMode, onMatch, onMistake, onHome, onRefresh, blendFirst, toneSupport
}) => {
  const current = currentWords.find(w => !w.matched);
  const target = current ? parseSyllable(current.zhuyin) : { symbols: [] as string[], tone: 1 as Tone };
  const medialGroup = target.symbols.length === 3 && MEDIALS.includes(target.symbols[1]);
  const instruction = gameInstruction(5, gameMode);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<Phase>('symbols');
  const [blendChoices, setBlendChoices] = useState<WordItem[]>([]);
  const [soundingBox, setSoundingBox] = useState<number | null>(null);
  // Help for the current step (blend, next symbol, or the tone) and the most help used spelling the item
  const [stepHelp, setStepHelp] = useState(0);
  const [itemHelp, setItemHelp] = useState(0);
  const [tried, setTried] = useState<(number | string)[]>([]);
  const [hidden, setHidden] = useState<(number | string)[]>([]);
  const [compareOpen, setCompareOpen] = useState(toneSupport);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [toneReferences, setToneReferences] = useState<AudioStep[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    getToneReferences().then(setToneReferences);
    return () => {
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
  }, []);

  // The symbols one by one; a medial runs straight into its final
  const symbolSteps = (): AudioStep[] =>
    target.symbols.map((symbol, i) => ({ ...symbolSound(symbol), pause: medialGroup && i === 1 ? 30 : 450 }));

  /** Plays steps where step `offset + i` is the sound of box i, lighting the box while it sounds. */
  const playLit = (steps: AudioStep[], offset: number) =>
    playChineseAudio(steps, () => setSoundingBox(null), index => {
      const box = index - offset;
      setSoundingBox(box >= 0 && box < target.symbols.length ? box : null);
    });

  useEffect(() => {
    if (!current) return;
    const others = shuffle(currentWords.filter(w => w.id !== current.id && parseSyllable(w.zhuyin).symbols.join('') !== target.symbols.join('')));
    const blend = blendFirst(current.character) && others.length > 0;
    setTiles(buildSymbolTiles(target.symbols).map((symbol, id) => ({ id, symbol, used: false })));
    setPosition(0);
    setPhase(blend ? 'blend' : 'symbols');
    setBlendChoices(blend ? shuffle([current, ...others.slice(0, 2)]) : []);
    setSoundingBox(null);
    setStepHelp(0);
    setItemHelp(0);
    setTried([]);
    setHidden([]);
    setCompareOpen(toneSupport);
    setFeedback(null);
    later(() => {
      if (blend) {
        const steps = withInstruction('game-spell', instruction, [{ text: '先聽聽看，把聲音合起來' }, ...symbolSteps(), { text: '合起來，是哪一個字？' }]);
        playLit(steps, steps.length - target.symbols.length - 1);
      } else {
        playChineseAudio(withInstruction('game-spell', instruction, [wordSound(current)]));
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const resetStep = () => {
    setStepHelp(0);
    setTried([]);
    setHidden([]);
  };

  const shake = (key: string) => {
    playSound('error');
    setShakeKey(key);
    later(() => setShakeKey(null), 500);
  };

  /** A wrong symbol or tone: one more level of help for this step; returns the new level. */
  const mistake = (key: string, choice: number | string, confusion: Confusion) => {
    shake(key);
    onMistake(current.id, confusion);
    const level = nextHelp(stepHelp);
    setStepHelp(level);
    setItemHelp(h => Math.max(h, level));
    setTried(prev => [...prev, choice]);
    return level;
  };

  // Blending is the supported first step, so its mistakes don't count against spelling the item
  const handleBlendChoice = (choice: WordItem) => {
    if (phase !== 'blend' || hidden.includes(choice.id)) return;
    if (choice.id !== current.id) {
      shake(`blend-${choice.id}`);
      const level = nextHelp(stepHelp);
      setStepHelp(level);
      setTried(prev => [...prev, choice.id]);
      if (level === HELP_RETRY) {
        const steps = [{ text: '你選的是' }, wordSound(choice), { text: '再聽一次' }, ...symbolSteps()];
        playLit(steps, 3);
      } else if (level === HELP_NARROW) {
        const wrong = blendChoices.filter(c => c.id !== current.id).map(c => c.id);
        setHidden(choicesToHide(wrong, [...tried, choice.id]));
        playLit([{ text: '再聽一次' }, ...symbolSteps()], 1);
      } else {
        speakHelp([{ text: '是發亮的這一個，點點看' }]);
      }
      return;
    }
    playSound('success');
    playChineseAudio([wordSound(current), { text: '對了！現在把它拼出來' }]);
    later(() => {
      resetStep();
      setPhase('symbols');
    }, 1600);
  };

  const handleTile = (tile: Tile) => {
    if (phase !== 'symbols' || tile.used || hidden.includes(tile.id)) return;
    const expected = target.symbols[position];
    if (tile.symbol !== expected) {
      const level = mistake(`tile-${tile.id}`, tile.id, { kind: 'symbol', expected, chosen: tile.symbol });
      if (level === HELP_RETRY) {
        speakHelp([{ text: '你點的是' }, symbolSound(tile.symbol), { text: '再聽一次' }, wordSound(current)]);
      } else if (level === HELP_NARROW) {
        // Take away look-alike tiles that aren't in this syllable at all
        const distractors = tiles.filter(t => !t.used && !target.symbols.includes(t.symbol)).map(t => t.id);
        setHidden(choicesToHide(distractors, [...tried, tile.id]));
        speakHelp([{ text: `第${'一二三四'[position] || position + 1}個音是` }, symbolSound(expected), { text: '找找看' }]);
      } else {
        speakHelp([{ text: '是發亮的這一個，點點看' }, symbolSound(expected)]);
      }
      return;
    }
    playSound('pop');
    playChineseAudio([symbolSound(tile.symbol)]);
    setTiles(prev => prev.map(t => (t.id === tile.id ? { ...t, used: true } : t)));
    resetStep();
    const next = position + 1;
    setPosition(next);
    if (next >= target.symbols.length) later(() => setPhase('tone'), 500);
  };

  const openCompare = () => {
    setCompareOpen(true);
    setStepHelp(h => Math.max(h, HELP_RETRY));
    setItemHelp(h => Math.max(h, HELP_RETRY));
  };

  const handleTone = (tone: Tone) => {
    if (phase !== 'tone' || hidden.includes(String(tone))) return;
    if (tone !== target.tone) {
      const level = mistake(`tone-${tone}`, String(tone), { kind: 'tone', expected: TONE_OPTIONS[target.tone - 1].name, chosen: TONE_OPTIONS[tone - 1].name });
      if (level === HELP_NARROW) {
        const wrong = TONE_OPTIONS.slice(0, 4).map(o => String(o.tone)).filter(t => t !== String(target.tone));
        setHidden(choicesToHide(wrong, [...tried, String(tone)]));
      }
      speakHelp(toneHelpSteps(level, tone, target.tone, toneReferences, wordSound(current)));
      return;
    }
    setPhase('done');
    playSound('success');
    playChineseWord(current.character, current.audioUrl);
    setFeedback(praise(itemHelp, 'spell'));
    later(() => onMatch(current.id, itemHelp), 1800);
  };

  const hintTile = phase === 'symbols' && stepHelp >= HELP_SHOW ? tiles.find(t => !t.used && t.symbol === target.symbols[position]) : undefined;
  const hintTone = phase === 'tone' && stepHelp >= HELP_SHOW ? target.tone : undefined;
  const chosenTone = phase === 'done' ? target.tone : undefined;
  const matchedCount = currentWords.filter(w => w.matched).length;

  const renderBox = (symbol: string, i: number) => (
    <div
      key={i}
      className={`w-16 h-20 md:w-20 md:h-24 rounded-xl border-b-8 flex items-center justify-center text-4xl md:text-5xl font-bold transition-all
        ${soundingBox === i ? 'bg-yellow-200 border-yellow-500 scale-110' : i < position ? (phase === 'done' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-gray-800 animate-pop') : i === position && phase === 'symbols' ? 'bg-yellow-50 border-yellow-400 animate-pulse' : 'bg-gray-50 border-gray-300'}`}
    >
      {i < position && phase !== 'blend' ? symbol : ''}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-amber-100">
        <button onClick={onHome} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 transform active:scale-95">
          <Home size={24} /> <span className="text-lg">回首頁</span>
        </button>
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">
          <Star className="fill-yellow-400 text-yellow-500 animate-pulse" />
          <span className="font-bold text-yellow-800 text-xl">{currentUser.points}</span>
        </div>
        <button onClick={onRefresh} className="p-2 hover:bg-amber-50 rounded-full text-amber-500 transition">
          <RefreshCw size={24} />
        </button>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-2">
          <Puzzle className="animate-bounce" /> 拼音高手：{phase === 'blend' ? '把聲音合起來！' : '把注音拼出來！'}
        </h2>
        <p className="text-gray-500 mt-1">{phase === 'blend' ? '聽注音符號的聲音，找出合起來是哪一個字' : instruction}</p>
        <InstructionButton text={instruction} className="mt-2" />
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {currentWords.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-amber-300 border-amber-500 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-b-8 border-amber-200 p-6 md:p-8 flex flex-col items-center">
        {phase !== 'blend' && (
          <>
            <div className="flex items-center gap-4 mb-2">
              {hasPicture(current) && <span className="text-7xl md:text-8xl">{current.emoji}</span>}
              <span className="font-kai text-7xl md:text-8xl text-gray-800">{current.character}</span>
            </div>
            <button
              onClick={() => playChineseWord(current.character, current.audioUrl)}
              className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-5 py-2 rounded-2xl transition active:scale-95 mb-6"
            >
              <Volume2 size={22} /> 再聽一次
            </button>
          </>
        )}

        {phase === 'blend' && (
          <button
            onClick={() => playLit([...symbolSteps()], 0)}
            className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-5 py-2 rounded-2xl transition active:scale-95 mb-6"
          >
            <Volume2 size={22} /> 再聽一次聲音
          </button>
        )}

        {/* Answer boxes; a medial and its final are grouped like 結合韻 */}
        <div className="flex items-end gap-2 mb-8">
          {medialGroup ? (
            <>
              {renderBox(target.symbols[0], 0)}
              <div className="flex flex-col items-center">
                <div className="flex gap-2 p-1 rounded-2xl border-2 border-dashed border-amber-300">
                  {renderBox(target.symbols[1], 1)}
                  {renderBox(target.symbols[2], 2)}
                </div>
                <span className="text-xs font-bold text-amber-500 mt-1">結合韻</span>
              </div>
            </>
          ) : (
            target.symbols.map((symbol, i) => renderBox(symbol, i))
          )}
          <div className={`w-14 h-20 md:w-16 md:h-24 rounded-xl border-4 border-dashed flex flex-col items-center justify-center font-bold
            ${phase === 'done' ? 'border-green-400 bg-green-50 text-green-700' : phase === 'tone' ? 'border-purple-300 bg-purple-50 text-purple-400 animate-pulse' : 'border-gray-200 text-gray-300'}`}
          >
            {chosenTone ? <><ToneCurve tone={chosenTone} className="w-9 h-7 text-green-600" /><span className="text-xs">{TONE_OPTIONS[chosenTone - 1].name}</span></> : <span className="text-xs">聲調</span>}
          </div>
        </div>

        {phase === 'blend' && (
          <div className={`grid gap-3 w-full max-w-md ${blendChoices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {blendChoices.map(choice => (
              <div key={choice.id} className="relative">
                <button
                  onClick={() => handleBlendChoice(choice)}
                  disabled={hidden.includes(choice.id)}
                  className={`w-full rounded-2xl border-4 bg-white p-3 pb-8 flex flex-col items-center shadow-lg transition
                    ${hidden.includes(choice.id) ? 'opacity-20 border-gray-200' : 'border-amber-200 hover:border-amber-400 active:scale-95'}
                    ${shakeKey === `blend-${choice.id}` ? 'animate-shake-once border-red-300' : ''}
                    ${stepHelp >= HELP_SHOW && choice.id === current.id ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
                >
                  {hasPicture(choice) && <span className="text-5xl">{choice.emoji}</span>}
                  <span className="font-kai text-5xl text-gray-800">{choice.character}</span>
                </button>
                {/* Listening to a choice is fine: comparing words with the blended sounds is the task */}
                <button
                  onClick={() => playChineseAudio([wordSound(choice)])}
                  disabled={hidden.includes(choice.id)}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-90"
                  aria-label={`聽「${choice.character}」`}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {phase === 'symbols' && (
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {tiles.map(tile => (
              <button
                key={tile.id}
                onClick={() => handleTile(tile)}
                disabled={tile.used || hidden.includes(tile.id)}
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl text-4xl md:text-5xl font-bold shadow-lg border-b-4 transition-all
                  ${tile.used ? 'opacity-0 pointer-events-none' : hidden.includes(tile.id) ? 'opacity-20 bg-gray-100 border-gray-200 text-gray-300' : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:-translate-y-1 active:scale-95'}
                  ${shakeKey === `tile-${tile.id}` ? 'animate-shake-once bg-red-100 border-red-400 text-red-600' : ''}
                  ${hintTile?.id === tile.id ? 'ring-4 ring-yellow-400 animate-bounce' : ''}`}
              >
                {tile.symbol}
              </button>
            ))}
          </div>
        )}

        {phase === 'tone' && (
          <>
            <ToneCompare references={toneReferences} open={compareOpen} onOpen={openCompare} hiddenFor={current.character} />
            <div className="grid grid-cols-4 gap-3 w-full max-w-md">
              {TONE_OPTIONS.slice(0, 4).map(option => (
                <button
                  key={option.tone}
                  onClick={() => handleTone(option.tone)}
                  disabled={hidden.includes(String(option.tone))}
                  className={`rounded-2xl border-b-4 py-3 flex flex-col items-center shadow-lg transition
                    ${hidden.includes(String(option.tone)) ? 'opacity-20 bg-gray-100 border-gray-200 text-gray-300' : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50 active:scale-95'}
                    ${shakeKey === `tone-${option.tone}` ? 'animate-shake-once bg-red-100 border-red-400 text-red-600' : ''}
                    ${hintTone === option.tone ? 'ring-4 ring-yellow-400 animate-bounce' : ''}`}
                >
                  <ToneCurve tone={option.tone} className="w-10 h-8" />
                  <span className="font-bold">{option.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="flex items-center gap-2 text-green-600 text-3xl font-black animate-pop">
            <CheckCircle2 size={32} /> {current.character} {formatSyllable(target.symbols, target.tone)}
          </div>
        )}
      </div>

      {feedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-40 whitespace-nowrap">
          <span className="text-2xl font-bold text-yellow-600">{feedback}</span>
        </div>
      )}
    </div>
  );
};
