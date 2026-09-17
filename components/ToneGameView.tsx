import React, { useEffect, useRef, useState } from 'react';
import { WordItem, UserProfile, Confusion } from '../types';
import { Home, Star, RefreshCw, Music, Volume2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import { AudioStep, playChineseAudio, playChineseWord, stopChineseAudio } from '../utils/chineseAudio';
import { hasPicture } from '../utils/wordPicture';
import { getToneReferences, parseSyllable, Tone, TONE_OPTIONS, toneHelpSteps } from '../services/zhuyinPractice';
import { choicesToHide, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { InstructionButton, speakHelp, withInstruction } from './VoiceGuide';
import { ToneCurve } from './ToneCurve';
import { ToneCompare } from './ToneCompare';

interface ToneGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];
  gameMode: 'word' | 'zhuyin';
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
  toneSupport: boolean; // Still learning tones: the 媽麻馬罵 comparison is open from the start
}

export const ToneGameView: React.FC<ToneGameViewProps> = ({
  currentUser, currentWords, gameMode, onMatch, onMistake, onHome, onRefresh, toneSupport
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
    later(() => playChineseAudio(withInstruction('game-tone', instruction, [{ url: current.audioUrl, text: current.character }])), 500);
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

  const handleChoice = (choice: Tone) => {
    if (solved || hiddenTones.includes(choice) || wrongTones.includes(choice)) return;
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
    later(() => onMatch(current.id, help), 1800);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-purple-100">
        <button onClick={onHome} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 transform active:scale-95">
          <Home size={24} /> <span className="text-lg">回首頁</span>
        </button>
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">
          <Star className="fill-yellow-400 text-yellow-500 animate-pulse" />
          <span className="font-bold text-yellow-800 text-xl">{currentUser.points}</span>
        </div>
        <button onClick={onRefresh} className="p-2 hover:bg-purple-50 rounded-full text-purple-500 transition">
          <RefreshCw size={24} />
        </button>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-2">
          <Music className="animate-bounce" /> 聲調偵探：聽聽看是第幾聲？
        </h2>
        <p className="text-gray-500 mt-1">仔細聽聲音是平平的、往上、先下再上、還是往下</p>
        <InstructionButton text={instruction} className="mt-2" />
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {currentWords.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-purple-300 border-purple-500 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-b-8 border-purple-200 p-6 md:p-8 flex flex-col items-center">
        <button
          onClick={() => playChineseWord(current.character, current.audioUrl)}
          className="w-28 h-28 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 flex items-center justify-center shadow-inner mb-4 transition active:scale-95"
        >
          <Volume2 size={56} />
        </button>

        <div className="flex items-center gap-4 mb-2">
          {hasPicture(current) && <span className="text-6xl">{current.emoji}</span>}
          <span className="font-kai text-6xl md:text-7xl text-gray-800">{current.character}</span>
        </div>
        <div className={`text-3xl font-bold mb-4 ${solved ? 'text-green-600 animate-pop' : 'text-gray-500'}`}>
          {solved ? current.zhuyin : <>{symbols.join('')} <span className="text-purple-400">？</span></>}
        </div>

        {!solved && (
          <ToneCompare
            references={toneReferences}
            open={compareOpen}
            onOpen={openCompare}
            withNeutral={options.length === 5}
            hiddenFor={current.character}
          />
        )}

        <div className={`grid gap-3 w-full ${options.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {options.map(option => {
            const isAnswer = solved && option.tone === tone;
            const isOut = wrongTones.includes(option.tone) || hiddenTones.includes(option.tone);
            return (
              <button
                key={option.tone}
                onClick={() => handleChoice(option.tone)}
                disabled={isOut}
                className={`rounded-2xl border-b-4 py-3 flex flex-col items-center shadow-lg transition active:scale-95
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

      {feedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-40 whitespace-nowrap">
          <span className="text-2xl font-bold text-yellow-600">{feedback}</span>
        </div>
      )}
    </div>
  );
};
