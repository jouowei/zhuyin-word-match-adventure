import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ThumbsUp, Volume2 } from 'lucide-react';
import { Confusion, Lesson, UserProfile } from '../types';
import { getWordReading } from '../services/moedict';
import { occurrences, sentenceRange, splitLessonPages } from '../services/lessonText';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { AudioStep, playChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';
import { readingsForSentence, ZhuyinText } from './ZhuyinText';
import { speakHelp } from './VoiceGuide';
import { GameScreen } from './GameScreen';

interface LessonLoopViewProps {
  currentUser: UserProfile;
  lesson: Lesson;
  /** listen: hear the whole lesson with today's words marked; find: look for words back in the text */
  mode: 'listen' | 'find';
  targets: string[];
  onDone: (results: { word: string; helpLevel: number }[]) => void;
  onMistake: (word: string, confusion?: Confusion) => void;
  onBack: () => void; // To the adventure map or the lesson page
}

const isHan = (ch: string) => /\p{Script=Han}/u.test(ch);

/**
 * Whole → part → whole, like the 綜合教學法 used for first-grade Chinese in Taiwan:
 * hear the lesson with today's words marked before practising them, and afterwards find them
 * back in the lesson and read the sentence (Hirsh-Pasek et al. 2015: learning is meaningful in context).
 */
export const LessonLoopView: React.FC<LessonLoopViewProps> = ({ currentUser, lesson, mode, targets, onDone, onMistake, onBack, backLabel }) => {
  const pages = useMemo(() => splitLessonPages(lesson.content), [lesson.content]);
  const [vocabReadings, setVocabReadings] = useState<Record<string, string>>({});
  const [wordAudio, setWordAudio] = useState<Record<string, string | undefined>>({});
  const [page, setPage] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [help, setHelp] = useState(0);
  const [foundAt, setFoundAt] = useState<number | null>(null); // Occurrence the child tapped
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const results = useRef<{ word: string; helpLevel: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    let cancelled = false;
    const words = Array.from(new Set<string>([...lesson.vocabulary, ...targets]));
    Promise.all(words.map(word => getWordReading(word, { context: lesson.vocabulary, override: lesson.zhuyinOverrides?.[word] })))
      .then(readings => {
        if (cancelled) return;
        setVocabReadings({ ...Object.fromEntries(readings.filter(r => r.zhuyin).map(r => [r.word, r.zhuyin])), ...lesson.textReadings });
        setWordAudio(Object.fromEntries(readings.map(r => [r.word, r.audioUrl])));
      });
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const target = mode === 'find' ? targets[targetIndex] : undefined;
  const wordSound = (word: string): AudioStep => ({ url: wordAudio[word], text: word });

  // In find mode, show the page where the word first appears
  useEffect(() => {
    if (mode !== 'find' || !target) return;
    const index = pages.findIndex(p => p.includes(target));
    setPage(Math.max(0, index));
    setHelp(0);
    setFoundAt(null);
    const timer = setTimeout(() => playChineseAudio([
      { text: targetIndex === 0 ? '回到課文，找找看，' : '再找找看，', rate: 0.95 },
      wordSound(target),
      { text: '在哪裡？' },
    ]), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIndex, target, Object.keys(wordAudio).length]);

  const readPage = (index: number, intro?: string) => playChineseAudio([
    ...(intro ? [{ text: intro, rate: 0.95 }] : []),
    { text: pages[index], rate: 0.85 },
  ]);

  useEffect(() => {
    if (mode !== 'listen') return;
    const timer = setTimeout(() => readPage(page, page === 0 ? '先聽聽今天的課文。黃色的是今天的新朋友。' : undefined), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, mode]);

  const text = pages[page] || '';
  const chars = [...text];
  const hanIndex: number[] = [];
  chars.forEach((ch, i) => { if (isHan(ch)) hanIndex[i] = hanIndex.length; });
  const readings = readingsForSentence(text, vocabReadings);

  // Characters covered by a word, for highlighting
  const cover = (word: string | undefined, onlyAt?: number | null) => {
    const set = new Set<number>();
    if (!word) return set;
    const length = [...word].length;
    occurrences(text, word).filter(start => onlyAt === undefined || onlyAt === null || start === onlyAt)
      .forEach(start => { for (let k = 0; k < length; k++) set.add(start + k); });
    return set;
  };
  const marked = mode === 'listen' ? new Set(targets.flatMap(w => [...cover(w)])) : new Set<number>();
  const targetChars = cover(target);
  const found = foundAt !== null ? cover(target, foundAt) : new Set<number>();
  const firstStart = target ? occurrences(text, target)[0] : undefined;
  const [sentenceStart, sentenceEnd] = firstStart !== undefined ? sentenceRange(text, firstStart) : [-1, -1];

  const handleTap = (index: number) => {
    const ch = chars[index];
    if (mode === 'listen') {
      // Tapping a marked word plays it
      const word = targets.find(w => cover(w).has(index));
      if (word) playChineseAudio([wordSound(word)]);
      return;
    }
    if (!target || foundAt !== null) return;
    if (targetChars.has(index)) {
      const start = occurrences(text, target).find(s => index >= s && index < s + [...target].length)!;
      setFoundAt(start);
      playSound('success');
      const [from, to] = sentenceRange(text, start);
      playChineseAudio([wordSound(target), { text: '找到了！聽聽這一句', rate: 0.95 }, { text: chars.slice(from, to).join(''), rate: 0.85 }, { text: '換你唸一次', rate: 0.95 }]);
      return;
    }
    playSound('error');
    setShakeIndex(index);
    later(() => setShakeIndex(null), 500);
    onMistake(target);
    const level = nextHelp(help);
    setHelp(level);
    if (level === HELP_RETRY) speakHelp([{ text: '你點的是' }, { text: ch }, { text: '再找找' }, wordSound(target)]);
    else if (level === HELP_NARROW) speakHelp([{ text: '在藍色的這一句裡面，找找' }, wordSound(target)]);
    else speakHelp([{ text: '發亮的就是' }, wordSound(target), { text: '點點看' }]);
  };

  const nextTarget = () => {
    if (!target) return;
    results.current.push({ word: target, helpLevel: help });
    if (targetIndex + 1 < targets.length) setTargetIndex(targetIndex + 1);
    else onDone(results.current);
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title={mode === 'listen' ? `📖 ${lesson.title}` : '🔍 課文尋寶'}
      instruction={mode === 'listen' ? '聽課文。黃色的是今天的新朋友，點一下可以聽。' : `找找看「${target ?? ''}」在課文的哪裡，找到了就點它。`}
      onHome={onBack}
      accent="text-orange-700"
    >
      <div className="flex-1 min-h-0 flex flex-col gap-[1.5vh]">
        {mode === 'find' && target && (
          <div className="shrink-0 text-center">
            <p className="text-[clamp(1.05rem,3vh,1.25rem)] font-bold text-gray-700 flex flex-wrap items-center justify-center gap-2">
              找找看「
              {vocabReadings[target] ? <ZhuyinText text={target} readings={vocabReadings[target].split(' ')} className="text-[clamp(1.6rem,5vh,1.875rem)] text-orange-600" /> : <span className="font-kai text-[clamp(1.6rem,5vh,1.875rem)] text-orange-600">{target}</span>}
              」在哪裡？
              <button onClick={() => playChineseAudio([wordSound(target)])} className="p-2 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 active:scale-90" aria-label="再聽一次">
                <Volume2 size={20} />
              </button>
              <span className="text-sm text-gray-400">（{targetIndex + 1}/{targets.length}）</span>
            </p>
          </div>
        )}

        {/* The lesson text; a long page scrolls inside its box so the buttons stay in view */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-3xl shadow-xl border-b-8 border-orange-200 p-4 md:p-8 flex">
          <div className="m-auto flex flex-wrap justify-center gap-y-3">
            {chars.map((ch, i) => {
              const punctuation = (c: string) => <span className="font-bpmf text-[clamp(1.9rem,min(9vw,6vh),3rem)] text-gray-500 self-end">{c}</span>;
              if (!isHan(ch)) {
                // Punctuation goes with the character before it: a line never starts with ，or 。
                if (i > 0 && isHan(chars[i - 1]) && ch.trim()) return null;
                return <React.Fragment key={i}>{punctuation(ch)}</React.Fragment>;
              }
              const trailing = i + 1 < chars.length && !isHan(chars[i + 1]) && chars[i + 1].trim() ? chars[i + 1] : '';
              const inSentence = mode === 'find' && help >= HELP_NARROW && i >= sentenceStart && i < sentenceEnd;
              const glow = mode === 'find' && help >= HELP_SHOW && targetChars.has(i) && foundAt === null;
              return (
                <span key={i} className="inline-flex">
                  <button
                    onClick={() => handleTap(i)}
                    className={`px-0.5 rounded-lg transition
                      ${marked.has(i) ? 'bg-yellow-200' : ''}
                      ${found.has(i) ? 'bg-green-200' : inSentence ? 'bg-sky-100' : ''}
                      ${glow ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                      ${shakeIndex === i ? 'animate-shake-once bg-red-100' : ''}`}
                  >
                    <ZhuyinText text={ch} readings={[readings[hanIndex[i]]]} className="text-[clamp(1.9rem,min(9vw,6vh),3rem)] text-gray-800" />
                  </button>
                  {trailing && punctuation(trailing)}
                </span>
              );
            })}
          </div>
        </div>

        {mode === 'listen' && (
          <div className="shrink-0 flex flex-wrap justify-center items-center gap-3">
            <button onClick={() => readPage(page)} className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold px-5 py-3 rounded-2xl active:scale-95">
              <Volume2 size={22} /> 再聽一次
            </button>
            {page + 1 < pages.length ? (
              <button onClick={() => setPage(page + 1)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95">
                下一頁（{page + 1}/{pages.length}） <ArrowRight size={22} />
              </button>
            ) : (
              <button onClick={() => { stopChineseAudio(); onDone([]); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95">
                聽完了，出發！ <ArrowRight size={22} />
              </button>
            )}
          </div>
        )}

        {mode === 'find' && foundAt !== null && (
          <div className="shrink-0 bg-white rounded-3xl shadow-lg p-3 flex flex-col items-center gap-2 animate-pop">
            <p className="text-lg font-bold text-green-700">找到了！換你把這一句唸一次</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const [from, to] = sentenceRange(text, foundAt);
                  playChineseAudio([{ text: chars.slice(from, to).join(''), rate: 0.85 }]);
                }}
                className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold px-5 py-3 rounded-2xl active:scale-95"
              >
                <Volume2 size={22} /> 再聽這一句
              </button>
              <button onClick={() => { stopChineseAudio(); nextTarget(); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95">
                <ThumbsUp size={22} /> 唸好了
              </button>
            </div>
          </div>
        )}
      </div>
    </GameScreen>
  );
};
