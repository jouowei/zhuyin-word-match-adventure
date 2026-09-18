
import React, { useEffect, useRef, useState } from 'react';
import { WordItem, UserProfile } from '../types';
import { Mic, AlertCircle, Volume2, ThumbsUp, Check } from 'lucide-react';
import { hasPicture } from '../utils/wordPicture';
import { playSound } from '../utils/sound';
import { AudioStep, playChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { speakHelp, useInstruction } from './VoiceGuide';
import { GameScreen } from './GameScreen';
import { ZhuyinText } from './ZhuyinText';
import { describeOutcome, loadPinyin, saidWord, saidZhuyin, SpeechOutcome } from '../services/speechMatch';
import { canListen, listenOnce } from '../utils/listenOnce';

interface SpeakingGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onHome: () => void;
  onRefresh: () => void;
  gameMode?: 'word' | 'zhuyin';
}

export const SpeakingGameView: React.FC<SpeakingGameViewProps> = ({
  currentUser, currentWords, onMatch, onHome, onRefresh, gameMode = 'word'
}) => {
  const [listeningForId, setListeningForId] = useState<string | null>(null);
  // The phone takes a moment to open the microphone: the child speaks when it says so
  const [micReady, setMicReady] = useState(false);
  // For parents: what the phone heard on the last try
  const [heardNote, setHeardNote] = useState<{ id: string; text: string } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Listening to the model first, or failed tries, count as help
  const [help, setHelp] = useState<Record<string, number>>({});
  const cancelListening = useRef<() => void>(() => {});
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const instruction = gameInstruction(4, gameMode);
  useInstruction(`game-${gameMode}-4`, instruction);

  // The sound comparison is loaded now, so it is ready when the child speaks
  useEffect(() => { loadPinyin().catch(() => {}); }, []);

  useEffect(() => () => {
    cancelListening.current();
    clearTimeout(feedbackTimer.current);
    stopChineseAudio();
  }, []);

  const showFeedback = (text: string, ms = 2000) => {
    clearTimeout(feedbackTimer.current);
    setFeedbackMessage(text);
    feedbackTimer.current = setTimeout(() => setFeedbackMessage(null), ms);
  };

  const modelSound = (item: WordItem): AudioStep => ({ url: item.audioUrl, text: item.character });

  const playModel = (item: WordItem) => {
    setHelp(prev => ({ ...prev, [item.id]: Math.max(prev[item.id] || 0, HELP_RETRY) }));
    playChineseAudio([modelSound(item)]);
  };

  /** Every try gets an answer: heard something else, or heard nothing (then louder). Each counts towards help. */
  const handleFailedTry = (item: WordItem, heard: string) => {
    playSound('error');
    const level = nextHelp(help[item.id] || 0);
    setHelp(prev => ({ ...prev, [item.id]: level }));
    if (level === HELP_RETRY) {
      showFeedback(heard ? `聽起來像是：${heard}，再試一次！` : '沒聽清楚，再大聲唸一次！', 2500);
      speakHelp([{ text: gameMode === 'word' ? '看著注音，再唸一次看看' : '再唸一次看看' }]);
    } else {
      // Model the word, then hand it back to the child
      showFeedback(level >= HELP_SHOW ? '先聽一次，再跟著唸！' : '聽聽看怎麼唸，換你唸！', 2500);
      speakHelp([{ text: '聽聽看怎麼唸' }, modelSound(item), { text: '換你唸' }]);
    }
  };

  const startListening = (item: WordItem) => {
    setPermissionError(false);
    if (!canListen()) {
      alert("你的瀏覽器不支援語音功能喔，請用 Chrome 試試看！");
      return;
    }

    stopChineseAudio(); // The microphone shouldn't hear the model voice
    setListeningForId(item.id);
    setMicReady(false);
    setHeardNote(null);
    cancelListening.current = listenOnce({
      lang: 'zh-TW',
      isMatch: async heard => {
        const toPinyin = await loadPinyin().catch(() => null);
        if (!toPinyin) return heard.some(t => t.includes(item.character));
        return gameMode === 'zhuyin' ? saidZhuyin(item.character, heard, toPinyin) : saidWord(item.character, heard, toPinyin);
      },
      onReady: () => setMicReady(true),
      onOutcome: outcome => {
        setListeningForId(null);
        setHeardNote({ id: item.id, text: describeOutcome(outcome) });
        answer(item, outcome);
      },
    });
  };

  /** Every try gets an answer, and every try that isn't right counts towards help (and the parent's pass). */
  const answer = (item: WordItem, outcome: SpeechOutcome) => {
    if (outcome.kind === 'match') {
      const level = help[item.id] || 0;
      playSound('success');
      onMatch(item.id, level);
      showFeedback(praise(level, 'say'));
      return;
    }
    if (outcome.kind === 'denied') setPermissionError(true);
    handleFailedTry(item, outcome.kind === 'heard' ? outcome.heard[0] : '');
  };

  // Speech recognition often mishears children: after the model has been given, a parent can pass the card
  const handleParentPass = (item: WordItem) => {
    playSound('success');
    onMatch(item.id, HELP_SHOW);
    showFeedback(praise(HELP_SHOW, 'say'));
  };

  const isListening = listeningForId !== null;
  // One word at a time, the next one when it's done; the dots below let the child pick another
  const current = currentWords.find(w => w.id === pickedId && !w.matched) ?? currentWords.find(w => !w.matched) ?? currentWords[currentWords.length - 1];
  const isMe = !!current && listeningForId === current.id;
  const level = current ? help[current.id] || 0 : 0;

  return (
    <GameScreen
      currentUser={currentUser}
      title="大聲唸出來"
      instruction={instruction}
      onHome={onHome}
      onRefresh={onRefresh}
      feedback={feedbackMessage}
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
            className={`relative w-full max-w-md flex-1 min-h-0 max-h-[36rem] my-auto flex flex-col items-center justify-center gap-[2vh] p-4 rounded-3xl border-4 shadow-xl transition-all duration-300 animate-pop
              ${current.matched ? 'bg-green-100 border-green-300' : isMe ? 'bg-purple-50 border-purple-500 ring-4 ring-purple-200' : 'bg-white border-purple-200'}`}
          >
            {isMe && (
              <div className="absolute -top-4 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-bounce flex items-center gap-2">
                <Mic size={14} /> {micReady ? '請說！' : '準備中…'}
              </div>
            )}

            {(gameMode === 'zhuyin' || hasPicture(current)) && (
              <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
                {gameMode === 'zhuyin' ? (
                  // Show the symbol itself: the example picture would make kids say the word (貓) instead of ㄇ
                  <span className="text-[clamp(4rem,22vh,10rem)] leading-none font-bold text-gray-800">{current.character}</span>
                ) : current.imageUrl ? (
                  <img src={current.imageUrl} alt={current.character} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[clamp(3.5rem,16vh,8rem)] leading-none">{current.emoji}</span>
                )}
              </div>
            )}

            {gameMode === 'word' && (
              current.zhuyin
                ? <ZhuyinText text={current.character} readings={current.zhuyin.split(' ')} className="text-[clamp(2.5rem,min(16vw,10vh),5.5rem)] text-gray-800" />
                : <span className="font-kai text-[clamp(2.5rem,min(16vw,10vh),5.5rem)] text-gray-800">{current.character}</span>
            )}

            {current.matched ? (
              <div className="flex items-center gap-2 text-green-700 font-black text-2xl"><ThumbsUp /> 唸對了！</div>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => playModel(current)}
                  disabled={isListening}
                  className={`flex-1 flex items-center justify-center gap-1 font-black text-xl py-[1.8vh] rounded-2xl transition active:scale-95 disabled:opacity-50
                    ${level >= HELP_NARROW ? 'bg-yellow-200 text-yellow-800 ring-4 ring-yellow-300' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
                >
                  <Volume2 size={24} /> 聽
                </button>
                <button
                  onClick={() => startListening(current)}
                  disabled={isListening}
                  className={`flex-[2] flex items-center justify-center gap-1 text-white font-black text-xl py-[1.8vh] rounded-2xl shadow-md transition active:scale-95 disabled:opacity-60 ${isMe ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'}`}
                >
                  <Mic size={24} /> {isMe ? (micReady ? '請說！' : '等一下…') : '唸唸看'}
                </button>
              </div>
            )}

            {!current.matched && !isMe && heardNote?.id === current.id && (
              <p className="text-xs text-gray-400 text-center leading-tight">{heardNote.text}</p>
            )}

            {!current.matched && level >= HELP_SHOW && (
              <button
                onClick={() => handleParentPass(current)}
                className="text-sm text-gray-500 hover:text-purple-600 font-bold flex items-center gap-1 underline"
              >
                <ThumbsUp size={14} /> 爸媽聽過了，唸得很好！先過關
              </button>
            )}
          </div>

          {/* Every word of the round: done ones ticked, tap another to say it first */}
          <div className="shrink-0 flex justify-center gap-2">
            {currentWords.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => !item.matched && !isListening && setPickedId(item.id)}
                aria-label={item.character}
                className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg transition
                  ${item.matched ? 'bg-green-500 border-green-500 text-white' : item.id === current.id ? 'bg-purple-100 border-purple-500 text-purple-700 scale-110' : 'bg-white border-purple-200 text-gray-500'}`}
              >
                {item.matched ? <Check size={22} strokeWidth={4} /> : gameMode === 'zhuyin' ? item.character : hasPicture(item) ? item.emoji : [...item.character][0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameScreen>
  );
};
