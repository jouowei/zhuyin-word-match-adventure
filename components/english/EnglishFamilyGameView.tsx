import React, { useEffect, useRef, useState } from 'react';
import { Volume2, X, Home as HomeIcon } from 'lucide-react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { RhymeCard, RhymeQuestion } from '../../english/families';
import { RHYME_LEVEL } from '../../english/curriculum';
import { correctMessage, HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../../services/scaffolding';
import { AudioStep, playChineseAudio, stopChineseAudio } from '../../utils/chineseAudio';
import { playSound } from '../../utils/sound';
import { InstructionButton, speakHelp, withInstruction } from '../VoiceGuide';
import { EnglishTopBar, FeedbackToast, useFeedback } from './shared';

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
    later(() => playChineseAudio(withInstruction('english-rhyme', instruction, askSteps())), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.item.id]);

  if (!current || !question) return null;
  const head = question.item.text;
  const members = question.cards.filter(c => c.member);
  const matchedCount = items.filter(i => i.matched).length;

  const choose = (card: RhymeCard) => {
    if (done || found.includes(card.word) || wrong.includes(card.word) || hidden.includes(card.word)) return;
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
      showFeedback(correctMessage(help, 'listen'), 2500);
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
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-6">
      <EnglishTopBar currentUser={currentUser} onHome={onHome} onRefresh={onRefresh} />

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-700 flex items-center justify-center gap-2">
          <HomeIcon /> 押韻家族 <span className="font-english">Word Families</span>
        </h2>
        <p className="text-gray-500 mt-1">{instruction}</p>
        <InstructionButton text={instruction} className="mt-2" />
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {items.map((item, i) => (
          <div key={item.id} className={`w-4 h-4 rounded-full border-2 ${item.matched ? 'bg-green-400 border-green-500' : i === matchedCount ? 'bg-green-300 border-green-600 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-b-8 border-green-200 p-6 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-6xl">{question.item.emoji}</span>
          <RimeWord word={head} rime={question.rime} className="text-6xl text-gray-800" />
          <button onClick={() => playChineseAudio(askSteps())} className="p-3 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-90 transition" aria-label="再聽一次">
            <Volume2 size={28} />
          </button>
        </div>
        <p className="text-xl font-bold text-gray-600 mb-5">
          找出和 <span className="font-english">{head}</span> 押韻的圖（找到 {found.length}/{members.length}）
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          {question.cards.map(card => {
            const isFound = found.includes(card.word);
            const isWrong = wrong.includes(card.word);
            const isHidden = hidden.includes(card.word);
            const glow = help >= HELP_SHOW && card.member && !isFound;
            return (
              <div key={card.word} className="relative">
                <button
                  onClick={() => choose(card)}
                  disabled={isHidden}
                  className={`w-full min-h-[9rem] rounded-2xl border-4 p-3 pb-8 flex flex-col items-center justify-center gap-1 shadow-md transition active:scale-95
                    ${isFound ? 'bg-green-50 border-green-400' : isWrong ? 'bg-gray-50 border-gray-200' : isHidden ? 'opacity-20 border-gray-200' : 'bg-white border-green-200 hover:border-green-400'}
                    ${glow ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
                >
                  <span className={`text-6xl ${isWrong ? 'grayscale opacity-60' : ''}`}>{card.emoji}</span>
                  {/* The written word appears once the child has chosen it */}
                  {(isFound || isWrong) && (
                    <span className="flex items-center gap-1">
                      {isWrong && <X size={20} className="text-gray-400" />}
                      <RimeWord word={card.word} rime={question.rime} className="text-3xl text-gray-800" />
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

      <FeedbackToast message={feedback} />
    </div>
  );
};
