import React, { useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { RhymeCard, RhymeQuestion } from '../../english/families';
import { RHYME_LEVEL } from '../../english/curriculum';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { praise } from '../Praise';
import { AudioStep, playChineseAudio, playGuidance, stopChineseAudio } from '../../utils/chineseAudio';
import { playSound } from '../../utils/sound';
import { ListenChip, speakHelp, withInstruction } from '../VoiceGuide';
import { useAnswerLock } from '../../hooks/useAnswerLock';
import { useFeedback } from './shared';
import { GameScreen } from '../GameScreen';

interface EnglishFamilyGameViewProps {
  currentUser: UserProfile;
  items: EnglishRoundItem[];      // One per question; matched when the family is complete
  questions: RhymeQuestion[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string) => void;
  onHome: () => void;
  onRefresh: () => void;
}

const en = (text: string, rate = 0.8): AudioStep => ({ text, lang: 'en', rate });
const zh = (text: string): AudioStep => ({ text, rate: 0.95 });

/** The word with its rime in green: h|at */
const RimeWord: React.FC<{ word: string; rime: string; className?: string }> = ({ word, rime, className = '' }) => (
  <span className={`font-english font-bold ${className}`}>
    {word.endsWith(rime) ? <>{word.slice(0, -rime.length)}<span className="text-green-600 underline decoration-4 underline-offset-4">{rime}</span></> : word}
  </span>
);

/** 押韻家族: which pictures end with the same sound as the question word (cat → hat, bat)? */
export const EnglishFamilyGameView: React.FC<EnglishFamilyGameViewProps> = ({ currentUser, items, questions, onMatch, onMistake, onHome, onRefresh }) => {
  const current = items.find(i => !i.matched);
  const question = questions.find(q => q.item.id === current?.id);
  const instruction = RHYME_LEVEL.instruction;
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [help, setHelp] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, showFeedback] = useFeedback();
  // 聽完才能按: the pictures wait while the question or the help is being said
  const locked = useAnswerLock(currentUser);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    stopChineseAudio();
  }, []);

  const askSteps = (): AudioStep[] => question ? [zh('哪些字的結尾聲音和'), en(question.item.text), zh('一樣？')] : [];

  useEffect(() => {
    if (!question) return;
    setFound([]);
    setWrong([]);
    setHidden([]);
    setHelp(0);
    setDone(false);
    later(() => playGuidance(withInstruction('english-rhyme', instruction, askSteps())), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.item.id]);

  if (!current || !question) return null;
  const head = question.item.text;
  const members = question.cards.filter(c => c.member);
  const matchedCount = items.filter(i => i.matched).length;

  const choose = (card: RhymeCard) => {
    if (locked || done || found.includes(card.word) || wrong.includes(card.word) || hidden.includes(card.word)) return;
    if (card.member) {
      playSound('success');
      const nowFound = [...found, card.word];
      setFound(nowFound);
      if (nowFound.length < members.length) {
        playChineseAudio([en(head), en(card.word)]);
        return;
      }
      // The whole family, said together so the shared ending stands out
      setDone(true);
      showFeedback(praise(help, 'listen', { lang: 'en' }), 2500);
      playChineseAudio([{ ...en(head), pause: 350 }, ...members.map(m => ({ ...en(m.word), pause: 350 })), zh('結尾的聲音都一樣！')]);
      later(() => onMatch(current.id, help), 3400);
      return;
    }
    playSound('error');
    onMistake(current.id);
    const nowWrong = [...wrong, card.word];
    setWrong(nowWrong);
    const level = nextHelp(help);
    setHelp(level);
    if (level === HELP_RETRY) {
      speakHelp([en(head), en(card.word), zh('結尾聽起來不一樣，再聽聽看別的')]);
    } else if (level === HELP_NARROW) {
      // At most one other picture is left, so take it away: what remains rhymes
      setHidden(question.cards.filter(c => !c.member && !nowWrong.includes(c.word)).map(c => c.word));
      speakHelp([en(head), en(card.word), zh('不一樣。剩下的都和'), en(head), zh('一樣喔')]);
    } else {
      speakHelp([zh('發亮的字和'), en(head), zh('押韻')]);
    }
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title="🏠 押韻家族"
      instruction={instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent="text-green-700"
    >
      <div className="shrink-0 flex justify-center gap-3 mb-[1.5vh]">
        {items.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-green-300 border-green-600 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border-b-8 border-green-200 p-3 flex flex-col items-center gap-[1.2vh]">
        <div className="shrink-0 flex items-center gap-4">
          <span className="text-[clamp(2.5rem,8vh,3.75rem)] leading-none">{question.item.emoji}</span>
          <RimeWord word={head} rime={question.rime} className="text-[clamp(2.5rem,8vh,3.75rem)] text-gray-800" />
          <button onClick={() => playGuidance(askSteps())} className="p-3 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-90 transition" aria-label="再聽一次">
            <Volume2 size={28} />
          </button>
        </div>
        <p className="shrink-0 text-[clamp(1rem,2.8vh,1.25rem)] font-bold text-gray-600 text-center">
          找出和 <span className="font-english">{head}</span> 押韻的圖（找到 {found.length}/{members.length}）
        </p>

        <div className={`relative flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3 w-full transition-opacity ${locked ? 'opacity-50' : ''}`}>
          <ListenChip show={locked} />
          {question.cards.map(card => {
            const isFound = found.includes(card.word);
            const isWrong = wrong.includes(card.word);
            const isHidden = hidden.includes(card.word);
            const glow = help >= HELP_SHOW && card.member && !isFound;
            return (
              <div key={card.word} className="relative min-h-0">
                <button
                  onClick={() => choose(card)}
                  disabled={isHidden}
                  className={`w-full h-full rounded-2xl border-4 p-1 pb-6 flex flex-col items-center justify-center gap-1 shadow-md transition active:scale-95 overflow-hidden
                    ${isFound ? 'bg-green-50 border-green-400' : isWrong ? 'bg-gray-50 border-gray-200' : isHidden ? 'opacity-20 border-gray-200' : 'bg-white border-green-200 hover:border-green-400'}
                    ${glow ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
                >
                  <span className={`text-[clamp(1.6rem,8vh,3.75rem)] leading-none ${isWrong ? 'grayscale opacity-60' : ''}`}>{card.emoji}</span>
                  {/* The written word appears once the child has chosen it */}
                  {(isFound || isWrong) && (
                    <span className="flex items-center gap-1">
                      {isWrong && <X size={20} className="text-gray-400" />}
                      <RimeWord word={card.word} rime={question.rime} className="text-[clamp(1.25rem,3.8vh,1.875rem)] text-gray-800" />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => playChineseAudio([en(card.word)])}
                  disabled={isHidden}
                  className="absolute bottom-2 right-2 p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-90"
                  aria-label="聽這個字"
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
