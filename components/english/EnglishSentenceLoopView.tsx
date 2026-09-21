import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ThumbsUp, Volume2 } from 'lucide-react';
import { EnglishUnit, UserProfile } from '../../types';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { AudioStep, playChineseAudio, playGuidance, stopChineseAudio } from '../../utils/chineseAudio';
import { playSound } from '../../utils/sound';
import { ListenChip, speakHelp } from '../VoiceGuide';
import { useAnswerLock } from '../../hooks/useAnswerLock';
import { GameScreen } from '../GameScreen';

interface EnglishSentenceLoopViewProps {
  currentUser: UserProfile;
  unit: EnglishUnit;
  /** listen: hear the unit's sentences with today's words marked; find: look for words back in them */
  mode: 'listen' | 'find';
  targets: string[];
  onDone: (results: { word: string; helpLevel: number }[]) => void;
  onMistake: (word: string) => void;
  onBack: () => void; // To the adventure map or the unit page
}

const en = (text: string, rate = 0.75): AudioStep => ({ text, lang: 'en', rate });
const zh = (text: string): AudioStep => ({ text, rate: 0.95 });

interface Token { text: string; core: string; sentence: number; index: number; }

const tokenize = (sentences: string[]): Token[] => sentences.flatMap((sentence, s) =>
  sentence.split(' ').filter(Boolean).map((text, index) => ({ text, core: text.toLowerCase().replace(/[^a-z-]/g, ''), sentence: s, index })));

/** cat matches cat and cats */
const isWord = (token: Token, word: string) => {
  const w = word.toLowerCase();
  return token.core === w || token.core === `${w}s` || token.core === `${w}es`;
};

/** Whole → part → whole for English: hear the sentences, practise the words, then find them back and read the sentence. */
export const EnglishSentenceLoopView: React.FC<EnglishSentenceLoopViewProps> = ({ currentUser, unit, mode, targets, onDone, onMistake, onBack, backLabel }) => {
  const sentences = unit.sentences || [];
  const tokens = tokenize(sentences);
  const [targetIndex, setTargetIndex] = useState(0);
  const [help, setHelp] = useState(0);
  const [found, setFound] = useState<Token | null>(null);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  // 聽完才能按: the sentences wait while the word to find or the help is being said
  const locked = useAnswerLock(currentUser);
  const results = useRef<{ word: string; helpLevel: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const target = mode === 'find' ? targets[targetIndex] : undefined;
  const targetSentence = target ? tokens.find(t => isWord(t, target))?.sentence ?? -1 : -1;

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    stopChineseAudio();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'listen') {
        playChineseAudio([zh('先聽聽這些句子。黃色的是今天的新朋友。'), ...sentences.map(s => ({ ...en(s), pause: 700 }))], () => setSpeaking(null), i => setSpeaking(i >= 1 ? i - 1 : null));
      } else if (target) {
        setHelp(0);
        setFound(null);
        playGuidance([zh(targetIndex === 0 ? '回到句子，找找看，' : '再找找看，'), en(target, 0.85), zh('在哪裡？')]);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetIndex]);

  const readSentence = (s: number) => {
    setSpeaking(s);
    playChineseAudio([en(sentences[s])], () => setSpeaking(null));
  };

  const tap = (token: Token) => {
    if (mode === 'listen') {
      const word = targets.find(w => isWord(token, w));
      if (word) playChineseAudio([en(word, 0.85)]);
      else readSentence(token.sentence);
      return;
    }
    if (locked || !target || found) return;
    if (isWord(token, target)) {
      setFound(token);
      playSound('success');
      setSpeaking(token.sentence);
      playChineseAudio([en(target, 0.85), zh('找到了！聽聽這一句'), en(sentences[token.sentence]), zh('換你唸一次')], () => setSpeaking(null));
      return;
    }
    playSound('error');
    setShakeKey(`${token.sentence}-${token.index}`);
    later(() => setShakeKey(null), 500);
    onMistake(target);
    const level = nextHelp(help);
    setHelp(level);
    if (level === HELP_RETRY) speakHelp([zh('你點的是'), en(token.core, 0.85), zh('再找找'), en(target, 0.85)]);
    else if (level === HELP_NARROW) speakHelp([zh('在藍色的這一句裡面，找找'), en(target, 0.85)]);
    else speakHelp([zh('發亮的就是'), en(target, 0.85), zh('點點看')]);
  };

  const next = () => {
    if (!target) return;
    stopChineseAudio();
    results.current.push({ word: target, helpLevel: help });
    setFound(null);
    setHelp(0);
    if (targetIndex + 1 < targets.length) setTargetIndex(targetIndex + 1);
    else onDone(results.current);
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title={mode === 'listen' ? `📖 ${unit.icon} 聽句子` : '🔍 句子尋寶'}
      instruction={mode === 'listen' ? '聽句子。黃色的是今天的新朋友，點喇叭可以再聽一次。' : '找找看這個英文字在句子的哪裡，找到了就點它。'}
      onHome={onBack}
      accent="text-sky-700"
    >
      <div className="flex-1 min-h-0 flex flex-col gap-[1.5vh]">
        {mode === 'find' && target && (
          <div className="shrink-0 text-center">
            <p className="text-[clamp(1.05rem,3vh,1.25rem)] font-bold text-gray-700 flex flex-wrap items-center justify-center gap-2">
              找找看 <span className="font-english text-[clamp(1.6rem,5vh,1.875rem)] text-sky-600">{target}</span> 在哪裡？
              <button onClick={() => playGuidance([en(target, 0.85)])} className="p-2 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-90" aria-label="再聽一次">
                <Volume2 size={20} />
              </button>
              <span className="text-sm text-gray-400">（{targetIndex + 1}/{targets.length}）</span>
            </p>
          </div>
        )}

        {/* The sentences; many scroll inside their box so the buttons stay in view */}
        <div className={`relative flex-1 min-h-0 overflow-y-auto bg-white rounded-3xl shadow-xl border-b-8 border-sky-200 p-3 md:p-8 flex flex-col justify-center gap-2 transition-opacity ${locked ? 'opacity-50' : ''}`}>
          <ListenChip show={locked} />
          {sentences.map((sentence, s) => {
            const inHelpSentence = mode === 'find' && help >= HELP_NARROW && s === targetSentence && !found;
            return (
              <div key={s} className={`flex items-center gap-3 rounded-2xl p-3 transition ${speaking === s ? 'bg-yellow-50' : inHelpSentence ? 'bg-sky-100' : ''}`}>
                <button onClick={() => readSentence(s)} className="shrink-0 p-2 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 active:scale-90" aria-label="聽這一句">
                  <Volume2 size={22} />
                </button>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {tokens.filter(t => t.sentence === s).map(token => {
                    const key = `${token.sentence}-${token.index}`;
                    const isTarget = mode === 'listen' && targets.some(w => isWord(token, w));
                    const isFound = found && found.sentence === token.sentence && found.index === token.index;
                    const glow = mode === 'find' && help >= HELP_SHOW && !found && target && isWord(token, target);
                    return (
                      <button
                        key={key}
                        onClick={() => tap(token)}
                        className={`font-english text-[clamp(1.6rem,min(8vw,5vh),2.25rem)] font-bold text-gray-800 px-1 rounded-lg transition
                          ${isTarget ? 'bg-yellow-200' : ''} ${isFound ? 'bg-green-200' : ''}
                          ${glow ? 'ring-4 ring-yellow-400 animate-pulse' : ''} ${shakeKey === key ? 'animate-shake-once bg-red-100' : ''}`}
                      >
                        {token.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {mode === 'listen' && (
          <button onClick={() => { stopChineseAudio(); onDone([]); }} className="shrink-0 self-center flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95">
            聽完了，出發！ <ArrowRight size={22} />
          </button>
        )}

        {mode === 'find' && found && (
          <div className="shrink-0 bg-white rounded-3xl shadow-lg p-3 flex flex-col items-center gap-2 animate-pop">
            <p className="text-lg font-bold text-green-700">找到了！換你把這一句唸一次</p>
            <div className="flex gap-3">
              <button onClick={() => readSentence(found.sentence)} className="flex items-center gap-2 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold px-5 py-3 rounded-2xl active:scale-95">
                <Volume2 size={22} /> 再聽這一句
              </button>
              <button onClick={next} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95">
                <ThumbsUp size={22} /> 唸好了
              </button>
            </div>
          </div>
        )}
      </div>
    </GameScreen>
  );
};
