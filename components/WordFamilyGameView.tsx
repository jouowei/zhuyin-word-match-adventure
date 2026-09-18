import React, { useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { UserProfile, WordItem } from '../types';
import { FamilyQuestion, FamilyWord } from '../services/wordFamilies';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { AudioStep, playChineseAudio, preloadChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';
import { speakHelp, withInstruction } from './VoiceGuide';
import { GameScreen } from './GameScreen';
import { ZhuyinText } from './ZhuyinText';

interface WordFamilyGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];      // One per question; matched when the family is complete
  questions: FamilyQuestion[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string) => void;
  onHome: () => void;
  onRefresh: () => void;
}

const wordSound = (w: FamilyWord): AudioStep => ({ url: w.audioUrl, text: w.word });

/** The word with its zhuyin, the family character in red. */
const FamilyWordText: React.FC<{ word: FamilyWord; head: string }> = ({ word, head }) => {
  const readings = word.zhuyin.split(' ');
  return (
    <span className="inline-flex">
      {[...word.word].map((ch, i) => (
        <ZhuyinText key={i} text={ch} readings={[readings[i]]} className={`text-[clamp(1.25rem,3.8vh,1.875rem)] ${ch === head ? 'text-red-500' : 'text-gray-800'}`} />
      ))}
    </span>
  );
};

export const WordFamilyGameView: React.FC<WordFamilyGameViewProps> = ({
  currentUser, currentWords, questions, onMatch, onMistake, onHome, onRefresh
}) => {
  const current = currentWords.find(w => !w.matched);
  const question = questions.find(q => q.item.id === current?.id);
  const instruction = gameInstruction(7, 'word');

  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [help, setHelp] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    preloadChineseAudio(questions.flatMap(q => [{ url: q.item.audioUrl, text: q.item.character }, ...q.words.map(wordSound)]));
    return () => {
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headSound = (): AudioStep => ({ url: question?.item.audioUrl, text: question?.item.character || '' });
  const askSteps = (): AudioStep[] => [{ text: '哪些詞裡面有' }, headSound(), { text: '？' }];

  useEffect(() => {
    if (!question) return;
    setFound([]);
    setWrong([]);
    setHidden([]);
    setHelp(0);
    setDone(false);
    setFeedback(null);
    later(() => playChineseAudio(withInstruction('game-family', instruction, askSteps())), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.item.id]);

  if (!current || !question) return null;

  const head = question.item.character;
  const members = question.words.filter(w => w.member);
  const matchedCount = currentWords.filter(w => w.matched).length;

  const choose = (w: FamilyWord) => {
    if (done || found.includes(w.word) || wrong.includes(w.word) || hidden.includes(w.word)) return;
    if (w.member) {
      playSound('success');
      const nowFound = [...found, w.word];
      setFound(nowFound);
      if (nowFound.length < members.length) {
        playChineseAudio([wordSound(w)]);
        return;
      }
      // The whole family: say the words together so the shared part stands out
      setDone(true);
      setFeedback(praise(help, 'listen'));
      playChineseAudio([...members.map(m => ({ ...wordSound(m), pause: 350 })), { text: '裡面都有' }, headSound()]);
      later(() => onMatch(current.id, help), 3200);
      return;
    }
    playSound('error');
    onMistake(current.id);
    const nowWrong = [...wrong, w.word];
    setWrong(nowWrong);
    const level = nextHelp(help);
    setHelp(level);
    if (level === HELP_RETRY) {
      speakHelp([wordSound(w), { text: '裡面沒有' }, headSound(), { text: '，再聽聽看別的' }]);
    } else if (level === HELP_NARROW) {
      // At most one other picture is left in four cards, so take it away: what remains is the family
      setHidden(question.words.filter(x => !x.member && !nowWrong.includes(x.word)).map(x => x.word));
      speakHelp([wordSound(w), { text: '裡面沒有' }, headSound(), { text: '。剩下的都是喔' }]);
    } else {
      speakHelp([{ text: '發亮的詞裡面有' }, headSound()]);
    }
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title="找出一家人"
      instruction={instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent="text-green-700"
    >
      <div className="shrink-0 flex justify-center gap-3 mb-[1.5vh]">
        {currentWords.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-green-300 border-green-600 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border-b-8 border-green-200 p-3 flex flex-col items-center gap-[1.2vh]">
        <div className="shrink-0 flex items-center gap-4">
          <span className="text-[clamp(2.5rem,8vh,3.75rem)] leading-none">{question.item.emoji}</span>
          {question.item.zhuyin
            ? <ZhuyinText text={head} readings={[question.item.zhuyin]} className="text-[clamp(2.75rem,9vh,4.5rem)] text-red-500" />
            : <span className="font-kai text-[clamp(2.75rem,9vh,4.5rem)] text-red-500">{head}</span>}
          <button onClick={() => playChineseAudio(askSteps())} className="p-3 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-90 transition" aria-label="再聽一次">
            <Volume2 size={28} />
          </button>
        </div>
        <p className="shrink-0 text-[clamp(1rem,2.8vh,1.25rem)] font-bold text-gray-600 text-center">
          哪些詞裡面有「<span className="text-red-500">{head}</span>」？找出 {members.length} 個（找到 {found.length} 個）
        </p>

        <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3 w-full">
          {question.words.map(w => {
            const isFound = found.includes(w.word);
            const isWrong = wrong.includes(w.word);
            const isHidden = hidden.includes(w.word);
            const glow = help >= HELP_SHOW && w.member && !isFound;
            return (
              <div key={w.word} className="relative min-h-0">
                <button
                  onClick={() => choose(w)}
                  disabled={isHidden}
                  className={`w-full h-full rounded-2xl border-4 p-1 pb-6 flex flex-col items-center justify-center gap-1 shadow-md transition active:scale-95 overflow-hidden
                    ${isFound ? 'bg-green-50 border-green-400' : isWrong ? 'bg-gray-50 border-gray-200' : isHidden ? 'opacity-20 border-gray-200' : 'bg-white border-green-200 hover:border-green-400'}
                    ${glow ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
                >
                  <span className={`text-[clamp(1.6rem,8vh,3.75rem)] leading-none ${isWrong ? 'grayscale opacity-60' : ''}`}>{w.emoji}</span>
                  {/* The written word appears once the child has chosen it */}
                  {(isFound || isWrong) && (
                    <span className="flex items-center gap-1">
                      {isWrong && <X size={20} className="text-gray-400" />}
                      <FamilyWordText word={w} head={head} />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => playChineseAudio([wordSound(w)])}
                  disabled={isHidden}
                  className="absolute bottom-2 right-2 p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-90"
                  aria-label="聽這個詞"
                >
                  <Volume2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </GameScreen>
  );
};
