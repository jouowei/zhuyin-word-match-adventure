import React, { useEffect, useRef, useState } from 'react';
import { WordItem, UserProfile, Confusion } from '../types';
import { Volume2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import { AudioStep, playChineseAudio, playChineseWord, stopChineseAudio, playGuidance, sayAfterAnswer } from '../utils/chineseAudio';
import { hasPicture } from '../utils/wordPicture';
import { getToneReferences, parseSyllable, Tone, TONE_OPTIONS, toneHelpSteps } from '../services/zhuyinPractice';
import { choicesToHide, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp, needsOneMoreTry, ONE_MORE_TRY } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { ListenChip, speakHelp, withInstruction } from './VoiceGuide';
import { useAnswerLock } from '../hooks/useAnswerLock';
import { GameScreen } from './GameScreen';
import { ToneCurve } from './ToneCurve';
import { ToneCompare } from './ToneCompare';

interface ToneGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];
  gameMode: 'word' | 'zhuyin';
  onMatch: (id: string, helpLevel: number) => void;
  onAskAgain?: (id: string) => boolean; // Asks this item once more instead of finishing it (亂猜不會比較快)
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
  toneSupport: boolean; // Still learning tones: the 媽麻馬罵 comparison is open from the start
}

export const ToneGameView: React.FC<ToneGameViewProps> = ({
  currentUser, currentWords, gameMode, onMatch, onAskAgain, onMistake, onHome, onRefresh, toneSupport
}) => {
  const current = currentWords.find(w => !w.matched);
  const instruction = gameInstruction(6, gameMode);
  const [solved, setSolved] = useState(false);
  const [wrongTones, setWrongTones] = useState<Tone[]>([]);
  const [help, setHelp] = useState(0);
  const [compareOpen, setCompareOpen] = useState(toneSupport);
  const [hiddenTones, setHiddenTones] = useState<Tone[]>([]);
  const [shakeTone, setShakeTone] = useState<Tone | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [toneReferences, setToneReferences] = useState<AudioStep[]>([]);
  // 聽完才能按: the tones wait while the word or the help is being said
  const locked = useAnswerLock(currentUser);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    getToneReferences().then(setToneReferences);
    return () => {
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    setSolved(false);
    setWrongTones([]);
    setHelp(0);
    setCompareOpen(toneSupport);
    setHiddenTones([]);
    setFeedback(null);
    later(() => playGuidance(withInstruction('game-tone', instruction, [{ url: current.audioUrl, text: current.character }])), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const { symbols, tone } = parseSyllable(current.zhuyin);
  // Lesson characters are never read in the neutral tone on their own, so word mode only offers four tones
  const options = gameMode === 'zhuyin' ? TONE_OPTIONS : TONE_OPTIONS.slice(0, 4);
  const matchedCount = currentWords.filter(w => w.matched).length;
  const hint = help >= HELP_SHOW && !solved ? tone : undefined;

  const openCompare = () => {
    setCompareOpen(true);
    setHelp(h => Math.max(h, HELP_RETRY)); // Asking for the comparison again is help once it has faded
  };

  /** 亂猜不會比較快: an item that took two or more tries comes back at the end of the round before it counts. */
  const finish = (helpLevel: number) => {
    if (needsOneMoreTry(helpLevel) && onAskAgain?.(current.id)) {
      sayAfterAnswer([{ text: ONE_MORE_TRY, rate: 0.95 }]);
      setFeedback(ONE_MORE_TRY);
      return;
    }
    onMatch(current.id, helpLevel);
  };

  const handleChoice = (choice: Tone) => {
    if (locked || solved || hiddenTones.includes(choice) || wrongTones.includes(choice)) return;
    if (choice !== tone) {
      playSound('error');
      const level = nextHelp(help);
      const tried = [...wrongTones, choice];
      setWrongTones(tried);
      setHelp(level);
      setShakeTone(choice);
      later(() => setShakeTone(null), 500);
      onMistake(current.id, { kind: 'tone', expected: TONE_OPTIONS[tone - 1].name, chosen: TONE_OPTIONS[choice - 1].name });
      if (level === HELP_NARROW) {
        const wrong = options.map(o => o.tone).filter(t => t !== tone && !tried.includes(t));
        setHiddenTones(choicesToHide(wrong));
      }
      speakHelp(toneHelpSteps(level, choice, tone, toneReferences, { url: current.audioUrl, text: current.character }, options.length === 5));
      return;
    }
    setSolved(true);
    playSound('success');
    playChineseWord(current.character, current.audioUrl);
    setFeedback(`${TONE_OPTIONS[tone - 1].name}！ ${praise(help, 'listen')}`);
    later(() => finish(help), 1800);
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title="聽聽看是第幾聲"
      instruction={instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent="text-purple-600"
    >
      <div className="shrink-0 flex justify-center gap-3 mb-[1.5vh]">
        {currentWords.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-purple-300 border-purple-500 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      <div className="fit-screen-main flex-1 min-h-0 bg-white rounded-3xl shadow-xl border-b-8 border-purple-200 p-4 flex flex-col items-center justify-center gap-[1.5vh]">
        <div className="flex flex-col items-center gap-[1.5vh]">
        <button
          onClick={() => playGuidance([{ url: current.audioUrl, text: current.character }])}
          className="w-[clamp(4rem,13vh,7rem)] h-[clamp(4rem,13vh,7rem)] shrink-0 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 flex items-center justify-center shadow-inner transition active:scale-95"
          aria-label="再聽一次"
        >
          <Volume2 size={48} />
        </button>

        <div className="flex items-center gap-4">
          {hasPicture(current) && <span className="text-[clamp(2.5rem,9vh,4.5rem)] leading-none">{current.emoji}</span>}
          <span className="font-kai text-[clamp(2.75rem,10vh,4.5rem)] leading-none text-gray-800">{current.character}</span>
        </div>
        <div className={`text-[clamp(1.4rem,4.5vh,1.875rem)] font-bold ${solved ? 'text-green-600 animate-pop' : 'text-gray-500'}`}>
          {solved ? current.zhuyin : <>{symbols.join('')} <span className="text-purple-400">？</span></>}
        </div>
        </div>

        <div className="w-full max-w-md flex flex-col items-center gap-[1.5vh]">
        {!solved && (
          <ToneCompare
            references={toneReferences}
            open={compareOpen}
            onOpen={openCompare}
            withNeutral={options.length === 5}
            hiddenFor={current.character}
          />
        )}

        <div className={`relative grid gap-3 w-full transition-opacity ${locked ? 'opacity-50' : ''} ${options.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <ListenChip show={locked} />
          {options.map(option => {
            const isAnswer = solved && option.tone === tone;
            const isOut = wrongTones.includes(option.tone) || hiddenTones.includes(option.tone);
            return (
              <button
                key={option.tone}
                onClick={() => handleChoice(option.tone)}
                disabled={isOut}
                className={`rounded-2xl border-b-4 py-[1.5vh] flex flex-col items-center shadow-lg transition active:scale-95
                  ${isAnswer ? 'bg-green-100 border-green-400 text-green-700' : isOut ? 'bg-gray-100 border-gray-200 text-gray-300' : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'}
                  ${shakeTone === option.tone ? 'animate-shake-once' : ''}
                  ${hint === option.tone ? 'ring-4 ring-yellow-400 animate-bounce' : ''}`}
              >
                <ToneCurve tone={option.tone} className="w-10 h-8" />
                <span className="font-bold text-sm md:text-base">{option.name}</span>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </GameScreen>
  );
};
