import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search, ThumbsUp, Volume2 } from 'lucide-react';
import { EnglishUnit, UserProfile } from '../../types';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { AudioStep, playChineseAudio, stopChineseAudio } from '../../utils/chineseAudio';
import { playSound } from '../../utils/sound';
import { speakHelp } from '../VoiceGuide';

interface EnglishSentenceLoopViewProps {
  currentUser: UserProfile;
  unit: EnglishUnit;
  /** listen: hear the unit's sentences with today's words marked; find: look for words back in them */
  mode: 'listen' | 'find';
  targets: string[];
  onDone: (results: { word: string; helpLevel: number }[]) => void;
  onMistake: (word: string) => void;
  onBack: () => void;
  backLabel: string;
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
        playChineseAudio([zh(targetIndex === 0 ? '回到句子，找找看，' : '再找找看，'), en(target, 0.85), zh('在哪裡？')]);
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
    if (!target || found) return;
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
    <div className="min-h-screen bg-sky-50 p-4 flex flex-col items-center">
      <div className="max-w-3xl w-full flex flex-col gap-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
          <button onClick={onBack} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold flex items-center gap-2 active:scale-95">
            <ArrowLeft size={20} /> {backLabel}
          </button>
          <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-sm font-bold">{unit.icon} {unit.title}</span>
          <span className="text-yellow-800 font-bold bg-yellow-100 px-3 py-1 rounded-full border-2 border-yellow-300">⭐ {currentUser.points}</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-sky-700 flex items-center justify-center gap-2">
            {mode === 'listen' ? <><BookOpen /> 聽句子 <span className="font-english">Let's listen</span></> : <><Search /> 句子尋寶</>}
          </h2>
          {mode === 'listen' ? (
            <p className="text-gray-500 mt-1">黃色的是今天的新朋友，點句子可以再聽一次</p>
          ) : target && (
            <p className="text-xl font-bold text-gray-700 mt-2 flex items-center justify-center gap-2">
              找找看 <span className="font-english text-3xl text-sky-600">{target}</span> 在哪裡？
              <button onClick={() => playChineseAudio([en(target, 0.85)])} className="p-2 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-90" aria-label="再聽一次">
                <Volume2 size={20} />
              </button>
              <span className="text-sm text-gray-400">（{targetIndex + 1}/{targets.length}）</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border-b-8 border-sky-200 p-5 md:p-8 flex flex-col gap-3">
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
                        className={`font-english text-3xl md:text-4xl font-bold text-gray-800 px-1 rounded-lg transition
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
          <button onClick={() => { stopChineseAudio(); onDone([]); }} className="self-center flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95">
            聽完了，出發！ <ArrowRight size={22} />
          </button>
        )}

        {mode === 'find' && found && (
          <div className="bg-white rounded-3xl shadow-lg p-5 flex flex-col items-center gap-3 animate-pop">
            <p className="text-xl font-bold text-green-700">找到了！換你把這一句唸一次</p>
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
    </div>
  );
};
