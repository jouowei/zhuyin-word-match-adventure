
import React, { useEffect, useRef, useState } from 'react';
import { WordItem, UserProfile } from '../types';
import { Home, Star, RefreshCw, Mic, AlertCircle, Volume2, ThumbsUp } from 'lucide-react';
import { hasPicture } from '../utils/wordPicture';
import { playSound } from '../utils/sound';
import { AudioStep, playChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { HELP_NARROW, HELP_RETRY, HELP_SHOW, nextHelp } from '../services/scaffolding';
import { praise } from './Praise';
import { gameInstruction } from '../services/instructions';
import { InstructionButton, speakHelp, useInstruction } from './VoiceGuide';
import { ZhuyinText } from './ZhuyinText';

interface SpeakingGameViewProps {
  currentUser: UserProfile;
  currentWords: WordItem[];
  onMatch: (id: string, helpLevel: number) => void;
  onHome: () => void;
  onRefresh: () => void;
  gameMode?: 'word' | 'zhuyin';
}

const ZHUYIN_SOUNDS: Record<string, string[]> = {
  'ㄅ': ['波', 'b', '八', 'ㄅ'],
  'ㄆ': ['坡', 'p', 'ㄆ'],
  'ㄇ': ['摸', 'm', 'ㄇ'],
  'ㄈ': ['佛', 'f', 'ㄈ'],
  'ㄉ': ['的', 'd', 'ㄉ'],
  'ㄊ': ['特', 't', 'ㄊ'],
  'ㄋ': ['呢', 'n', 'ㄋ'],
  'ㄌ': ['了', 'l', 'ㄌ'],
  'ㄍ': ['哥', 'g', 'ㄍ'],
  'ㄎ': ['科', 'k', 'ㄎ'],
  'ㄏ': ['喝', 'h', 'ㄏ'],
  'ㄐ': ['機', 'j', 'ㄐ'],
  'ㄑ': ['七', 'q', 'ㄑ'],
  'ㄒ': ['西', 'x', 'ㄒ'],
  'ㄓ': ['知', 'zhi', 'ㄓ'],
  'ㄔ': ['吃', 'chi', 'ㄔ'],
  'ㄕ': ['師', 'shi', 'ㄕ'],
  'ㄖ': ['日', 'ri', 'ㄖ'],
  'ㄗ': ['資', 'zi', 'ㄗ'],
  'ㄘ': ['雌', 'ci', 'ㄘ'],
  'ㄙ': ['思', 'si', 'ㄙ'],
  'ㄧ': ['一', 'yi', 'ㄧ'],
  'ㄨ': ['屋', 'wu', 'ㄨ'],
  'ㄩ': ['魚', 'yu', 'ㄩ'],
  'ㄚ': ['阿', 'a', 'ㄚ'],
  'ㄛ': ['喔', 'o', 'ㄛ'],
  'ㄜ': ['鵝', 'e', 'ㄜ'],
  'ㄝ': ['耶', 'ye', 'ㄝ'],
  'ㄞ': ['哀', 'ai', 'ㄞ'],
  'ㄟ': ['欸', 'ei', 'ㄟ'],
  'ㄠ': ['熬', 'ao', 'ㄠ'],
  'ㄡ': ['歐', 'ou', 'ㄡ'],
  'ㄢ': ['安', 'an', 'ㄢ'],
  'ㄣ': ['恩', 'en', 'ㄣ'],
  'ㄤ': ['昂', 'ang', 'ㄤ'],
  'ㄥ': ['鞥', 'eng', 'ㄥ'],
  'ㄦ': ['兒', 'er', 'ㄦ']
};

export const SpeakingGameView: React.FC<SpeakingGameViewProps> = ({
  currentUser, currentWords, onMatch, onHome, onRefresh, gameMode = 'word'
}) => {
  const [listeningForId, setListeningForId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  // Listening to the model first, or failed tries, count as help
  const [help, setHelp] = useState<Record<string, number>>({});
  const recognitionRef = useRef<any>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const instruction = gameInstruction(4, gameMode);
  useInstruction(`game-${gameMode}-4`, instruction);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
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

  const handleFailedTry = (item: WordItem, heard: string) => {
    playSound('error');
    const level = nextHelp(help[item.id] || 0);
    setHelp(prev => ({ ...prev, [item.id]: level }));
    if (level === HELP_RETRY) {
      showFeedback(`聽起來像是：${heard}，再試一次！`, 2500);
      speakHelp([{ text: gameMode === 'word' ? '看著注音，再唸一次看看' : '再唸一次看看' }]);
    } else {
      // Model the word, then hand it back to the child
      showFeedback(level >= HELP_SHOW ? '先聽一次，再跟著唸！' : '聽聽看怎麼唸，換你唸！', 2500);
      speakHelp([{ text: '聽聽看怎麼唸' }, modelSound(item), { text: '換你唸' }]);
    }
  };

  const startListening = (item: WordItem) => {
    setPermissionError(false);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("你的瀏覽器不支援語音功能喔，請用 Chrome 試試看！");
      return;
    }

    stopChineseAudio(); // The microphone shouldn't hear the model voice
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'zh-TW';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListeningForId(item.id);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const target = item.character;
      const isMatch = gameMode === 'zhuyin'
        ? (ZHUYIN_SOUNDS[target] || [target]).some(eq => transcript.toLowerCase().includes(eq.toLowerCase()))
        : transcript.includes(target) || target.includes(transcript);

      if (isMatch) {
        const level = help[item.id] || 0;
        playSound('success');
        onMatch(item.id, level);
        showFeedback(praise(level, 'say'));
      } else {
        handleFailedTry(item, transcript);
      }
      setListeningForId(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionError(true);
        showFeedback("請允許麥克風權限才能玩喔！");
      } else if (event.error === 'no-speech') {
        showFeedback("沒聽到聲音，大聲一點！");
      } else if (event.error !== 'aborted') {
        showFeedback("發生錯誤，請再試一次！");
      }
      setListeningForId(null);
    };

    recognition.onend = () => setListeningForId(null);

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setListeningForId(null);
    }
  };

  // Speech recognition often mishears children: after the model has been given, a parent can pass the card
  const handleParentPass = (item: WordItem) => {
    playSound('success');
    onMatch(item.id, HELP_SHOW);
    showFeedback(praise(HELP_SHOW, 'say'));
  };

  const isListening = listeningForId !== null;

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto p-4 md:p-6 pb-20">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-purple-100">
        <button
          onClick={onHome}
          className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 border-2 border-transparent hover:border-gray-200 transform active:scale-95"
        >
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

      <div className="text-center mb-6">
         <h2 className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-2">
           <Mic className="animate-bounce" /> 小小播音員：大聲唸出來！
         </h2>
         <p className="text-gray-500 mt-1">{instruction}</p>
         <InstructionButton text={instruction} className="mt-2" />
      </div>

      {permissionError && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl shadow-sm animate-pop flex items-start gap-3">
           <AlertCircle className="shrink-0 mt-0.5" />
           <div className="text-left">
             <p className="font-bold">無法使用麥克風 🎤</p>
             <p className="text-sm">瀏覽器擋住了麥克風權限。請檢查網址列的鎖頭圖示 🔒，或是設定中的權限，允許我們使用麥克風喔！</p>
           </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {currentWords.map((item) => {
          const isMe = listeningForId === item.id;
          const level = help[item.id] || 0;
          return (
            <div
              key={item.id}
              className={`
                 relative flex flex-col items-center p-4 rounded-3xl border-4 shadow-xl transition-all duration-300
                 ${item.matched
                   ? 'bg-green-100 border-green-300 opacity-80'
                   : isMe
                     ? 'bg-purple-50 border-purple-500 scale-105 ring-4 ring-purple-200 z-10'
                     : 'bg-white border-purple-200'
                 }
              `}
            >
              {isMe && (
                 <div className="absolute -top-4 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-bounce flex items-center gap-2">
                    <Mic size={14} /> 聽你說...
                 </div>
              )}

              {item.matched && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">OK</div>
              )}

              {(gameMode === 'zhuyin' || hasPicture(item)) && (
                <div className="w-32 h-32 md:w-40 md:h-40 mb-4 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                   {gameMode === 'zhuyin' ? (
                     // Show the symbol itself: the example picture would make kids say the word (貓) instead of ㄇ
                     <span className="text-8xl font-bold text-gray-800">{item.character}</span>
                   ) : item.imageUrl ? (
                     <img src={item.imageUrl} alt={item.character} className="w-full h-full object-contain" />
                   ) : (
                     <span className="text-7xl">{item.emoji}</span>
                   )}
                </div>
              )}

              <div className="flex flex-col items-center">
                 {gameMode === 'word' && (
                   item.zhuyin
                     ? <ZhuyinText text={item.character} readings={item.zhuyin.split(' ')} className="text-5xl md:text-6xl text-gray-800" />
                     : <span className="font-kai text-5xl text-gray-800">{item.character}</span>
                 )}
              </div>

              {!item.matched && (
                <div className="flex gap-3 mt-4 w-full">
                  <button
                    onClick={() => playModel(item)}
                    disabled={isListening}
                    className={`flex-1 flex items-center justify-center gap-1 font-bold py-3 rounded-xl transition active:scale-95 disabled:opacity-50
                      ${level >= HELP_NARROW ? 'bg-yellow-200 text-yellow-800 ring-4 ring-yellow-300' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
                  >
                    <Volume2 size={20} /> 聽
                  </button>
                  <button
                    onClick={() => startListening(item)}
                    disabled={isListening}
                    className={`flex-[2] flex items-center justify-center gap-1 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95 disabled:opacity-60 ${isMe ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'}`}
                  >
                    <Mic size={20} /> {isMe ? '請說…' : '唸唸看'}
                  </button>
                </div>
              )}

              {!item.matched && level >= HELP_SHOW && (
                <button
                  onClick={() => handleParentPass(item)}
                  className="mt-3 text-sm text-gray-500 hover:text-purple-600 font-bold flex items-center gap-1 underline"
                >
                  <ThumbsUp size={14} /> 爸媽聽過了，唸得很好！先過關
                </button>
              )}
            </div>
          );
        })}
      </div>

      {feedbackMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-50 whitespace-nowrap">
           <span className="text-2xl font-bold text-yellow-600">{feedbackMessage}</span>
        </div>
      )}
    </div>
  );
};
