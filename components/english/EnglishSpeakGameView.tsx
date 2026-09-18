import React, { useEffect, useRef, useState } from 'react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { HighlightedKeyword, useFeedback } from './shared';
import { GameScreen } from '../GameScreen';
import { Mic, AlertCircle, Volume2, ThumbsUp, Check } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { isSpeechMatch, speakEnglish, speakPraise, stopEnglishSpeech } from '../../utils/englishSpeech';
import { HELP_SHOW, nextHelp, POINTS_WITH_HELP } from '../../services/scaffolding';
import { praise } from '../Praise';
import { LETTER_LEVELS, WORD_LEVELS } from '../../english/curriculum';
import { speakHelp, useInstruction } from '../VoiceGuide';
import { describeOutcome, SpeechOutcome } from '../../services/speechMatch';
import { canListen, listenOnce } from '../../utils/listenOnce';

interface EnglishSpeakGameViewProps {
  currentUser: UserProfile;
  items: EnglishRoundItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onHome: () => void;
  onRefresh: () => void;
}

export const EnglishSpeakGameView: React.FC<EnglishSpeakGameViewProps> = ({
  currentUser, items, onMatch, onHome, onRefresh
}) => {
  const [listeningForId, setListeningForId] = useState<string | null>(null);
  // The phone takes a moment to open the microphone: the child speaks when it says so
  const [micReady, setMicReady] = useState(false);
  // For parents: what the phone heard on the last try
  const [heardNote, setHeardNote] = useState<{ id: string; text: string } | null>(null);
  // Listening to the model is part of this game; failed tries count as help
  const [help, setHelp] = useState<Record<string, number>>({});
  const instruction = (items[0]?.kind === 'letter' ? LETTER_LEVELS : WORD_LEVELS)[3].instruction;
  useInstruction(`english-speak-${items[0]?.kind}`, instruction);
  const [permissionError, setPermissionError] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [feedback, showFeedback] = useFeedback();
  const cancelListening = useRef<() => void>(() => {});
  useEffect(() => () => cancelListening.current(), []);

  /** Every try gets an answer: heard something else, or heard nothing (then louder). Each counts towards help. */
  const failedTry = (item: EnglishRoundItem, heard: string) => {
    playSound('error');
    const level = nextHelp(help[item.id] || 0);
    setHelp(prev => ({ ...prev, [item.id]: level }));
    showFeedback(heard ? `聽起來像：${heard}，再試一次！` : '沒聽清楚，再大聲說一次！', 2500);
    // Model again, slower each time
    speakHelp([{ text: level === 1 ? '再聽一次，換你說' : '慢慢聽，換你說' }, { text: item.keyword, lang: 'en', rate: level === 1 ? 0.75 : 0.45 }]);
  };

  const startListening = (item: EnglishRoundItem) => {
    setPermissionError(false);
    if (!canListen()) {
      alert('你的瀏覽器不支援語音功能喔，請用 Chrome 試試看！');
      return;
    }

    stopEnglishSpeech();
    setListeningForId(item.id);
    setMicReady(false);
    setHeardNote(null);
    cancelListening.current = listenOnce({
      lang: 'en-US',
      isMatch: heard => isSpeechMatch(heard, item.keyword),
      onReady: () => setMicReady(true),
      onOutcome: outcome => {
        setListeningForId(null);
        setHeardNote({ id: item.id, text: describeOutcome(outcome) });
        answer(item, outcome);
      },
    });
  };

  /** Every try gets an answer, and every try that isn't right counts towards help (and the effort pass). */
  const answer = (item: EnglishRoundItem, outcome: SpeechOutcome) => {
    if (outcome.kind === 'match') {
      const level = help[item.id] || 0;
      playSound('success');
      speakPraise();
      onMatch(item.id, level);
      showFeedback(praise(level, 'say', { speak: false }));
      return;
    }
    if (outcome.kind === 'denied') setPermissionError(true);
    failedTry(item, outcome.kind === 'heard' ? outcome.heard[0] : '');
  };

  const handleEffortPass = (item: EnglishRoundItem) => {
    playSound('success');
    onMatch(item.id, HELP_SHOW);
    showFeedback(`很努力喔！這題先過關 +${POINTS_WITH_HELP}分`, 2000);
  };

  const isListening = listeningForId !== null;
  // One word at a time, the next one when it's done; the dots below let the child pick another
  const current = items.find(i => i.id === pickedId && !i.matched) ?? items.find(i => !i.matched) ?? items[items.length - 1];
  const isMe = !!current && listeningForId === current.id;
  const fails = current ? help[current.id] || 0 : 0;

  return (
    <GameScreen
      currentUser={currentUser}
      title="🎙️ Say it!"
      instruction={instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedback}
      accent="text-purple-600"
    >
      {permissionError && (
        <div className="shrink-0 mb-2 bg-red-100 border-l-4 border-red-500 text-red-700 px-3 py-2 rounded-r-xl text-sm flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p><span className="font-bold">無法使用麥克風 🎤</span> 請按網址列的鎖頭圖示 🔒，允許使用麥克風。</p>
        </div>
      )}

      {current && (
        <div className="flex-1 min-h-0 flex flex-col items-center gap-[2vh]">
          <div
            key={current.id}
            className={`relative w-full max-w-md flex-1 min-h-0 max-h-[36rem] my-auto flex flex-col items-center justify-center gap-[1.5vh] p-4 rounded-3xl border-4 shadow-xl transition-all duration-300 animate-pop
              ${current.matched ? 'bg-green-100 border-green-300' : isMe ? 'bg-purple-50 border-purple-500 ring-4 ring-purple-200' : 'bg-white border-purple-200'}`}
          >
            {isMe && (
              <div className="absolute -top-4 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-bounce flex items-center gap-2">
                <Mic size={14} /> {micReady ? '請說！' : '準備中…'}
              </div>
            )}

            <div className="text-[clamp(4rem,18vh,9rem)] leading-none">{current.emoji}</div>
            {current.kind === 'letter'
              ? <HighlightedKeyword keyword={current.keyword} letter={current.text} className="text-[clamp(2.25rem,min(13vw,8vh),4rem)] font-bold text-gray-800" />
              : <span className="font-english text-[clamp(2.25rem,min(13vw,8vh),4rem)] font-bold text-gray-800">{current.keyword}</span>}
            <span className="text-gray-400 font-bold">{current.zh}</span>

            {current.matched ? (
              <div className="flex items-center gap-2 text-green-700 font-black text-2xl"><ThumbsUp /> Great!</div>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => speakEnglish(current.keyword)}
                  disabled={isListening}
                  className="flex-1 flex items-center justify-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 font-black text-xl py-[1.8vh] rounded-2xl transition active:scale-95 disabled:opacity-50"
                >
                  <Volume2 size={24} /> 聽
                </button>
                <button
                  onClick={() => startListening(current)}
                  disabled={isListening}
                  className={`flex-[2] flex items-center justify-center gap-1 text-white font-black text-xl py-[1.8vh] rounded-2xl shadow-md transition active:scale-95 disabled:opacity-60 ${isMe ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'}`}
                >
                  <Mic size={24} /> {isMe ? (micReady ? '請說！' : '等一下…') : '說說看'}
                </button>
              </div>
            )}

            {!current.matched && !isMe && heardNote?.id === current.id && (
              <p className="text-xs text-gray-400 text-center leading-tight">{heardNote.text}</p>
            )}

            {!current.matched && fails >= HELP_SHOW && (
              <button
                onClick={() => handleEffortPass(current)}
                className="text-sm text-gray-500 hover:text-purple-600 font-bold flex items-center gap-1 underline"
              >
                <ThumbsUp size={14} /> 爸媽聽過了，唸得很好！先過關
              </button>
            )}
          </div>

          {/* Every word of the round: done ones ticked, tap another to say it first */}
          <div className="shrink-0 flex justify-center gap-2">
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => !item.matched && !isListening && setPickedId(item.id)}
                aria-label={item.keyword}
                className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-xl transition
                  ${item.matched ? 'bg-green-500 border-green-500 text-white' : item.id === current.id ? 'bg-purple-100 border-purple-500 scale-110' : 'bg-white border-purple-200'}`}
              >
                {item.matched ? <Check size={22} strokeWidth={4} /> : item.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameScreen>
  );
};
