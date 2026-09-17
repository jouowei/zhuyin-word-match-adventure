import React, { useEffect, useRef, useState } from 'react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { EnglishTopBar, FeedbackToast, HighlightedKeyword, useFeedback } from './shared';
import { Mic, AlertCircle, Volume2, ThumbsUp } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { isSpeechMatch, speakEnglish, speakPraise, stopEnglishSpeech } from '../../utils/englishSpeech';
import { correctMessage, HELP_SHOW, nextHelp, POINTS_WITH_HELP } from '../../services/scaffolding';
import { LETTER_LEVELS, WORD_LEVELS } from '../../english/curriculum';
import { InstructionButton, speakHelp, useInstruction } from '../VoiceGuide';

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
  // Listening to the model is part of this game; failed tries count as help
  const [help, setHelp] = useState<Record<string, number>>({});
  const instruction = (items[0]?.kind === 'letter' ? LETTER_LEVELS : WORD_LEVELS)[3].instruction;
  useInstruction(`english-speak-${items[0]?.kind}`, instruction);
  const [permissionError, setPermissionError] = useState(false);
  const [feedback, showFeedback] = useFeedback();
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  const startListening = (item: EnglishRoundItem) => {
    setPermissionError(false);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('你的瀏覽器不支援語音功能喔，請用 Chrome 試試看！');
      return;
    }

    stopEnglishSpeech();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    setListeningForId(item.id);

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      const transcripts: string[] = [];
      for (let i = 0; i < result.length; i++) transcripts.push(result[i].transcript);

      if (isSpeechMatch(transcripts, item.keyword)) {
        const level = help[item.id] || 0;
        playSound('success');
        speakPraise();
        onMatch(item.id, level);
        showFeedback(correctMessage(level, 'say'));
      } else {
        playSound('error');
        const level = nextHelp(help[item.id] || 0);
        setHelp(prev => ({ ...prev, [item.id]: level }));
        showFeedback(`聽起來像：${transcripts[0] || '...'}，再試一次！`, 2500);
        // Model again, slower each time
        speakHelp([{ text: level === 1 ? '再聽一次，換你說' : '慢慢聽，換你說' }, { text: item.keyword, lang: 'en', rate: level === 1 ? 0.75 : 0.45 }]);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionError(true);
        showFeedback('請允許麥克風權限才能玩喔！', 2500);
      } else if (event.error === 'no-speech') {
        showFeedback('沒聽到聲音，大聲一點！', 2000);
      } else if (event.error !== 'aborted') {
        showFeedback('發生錯誤，請再試一次！', 2000);
      }
      setListeningForId(null);
    };

    recognition.onend = () => setListeningForId(null);

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
      setListeningForId(null);
    }
  };

  const handleEffortPass = (item: EnglishRoundItem) => {
    playSound('success');
    onMatch(item.id, HELP_SHOW);
    showFeedback(`很努力喔！這題先過關 +${POINTS_WITH_HELP}分`, 2000);
  };

  const isListening = listeningForId !== null;

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto p-4 md:p-6 pb-20">
      <EnglishTopBar currentUser={currentUser} onHome={onHome} onRefresh={onRefresh} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-2">
          <Mic className="animate-bounce" /> 小小播音員：Say it!
        </h2>
        <p className="text-gray-500 mt-1">先按 🔊 聽老師唸，再按 🎤 大聲說出來！</p>
        <InstructionButton text={instruction} className="mt-2" />
      </div>

      {permissionError && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl shadow-sm animate-pop flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-bold">無法使用麥克風 🎤</p>
            <p className="text-sm">瀏覽器擋住了麥克風權限。請檢查網址列的鎖頭圖示 🔒，允許我們使用麥克風喔！</p>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {items.map(item => {
          const isMe = listeningForId === item.id;
          const fails = help[item.id] || 0;
          return (
            <div
              key={item.id}
              className={`relative flex flex-col items-center p-4 rounded-3xl border-4 shadow-xl transition-all duration-300
                ${item.matched ? 'bg-green-100 border-green-300 opacity-80' : isMe ? 'bg-purple-50 border-purple-500 scale-105 ring-4 ring-purple-200 z-10' : 'bg-white border-purple-200'}`}
            >
              {isMe && (
                <div className="absolute -top-4 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-bounce flex items-center gap-2">
                  <Mic size={14} /> 聽你說...
                </div>
              )}
              {item.matched && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">OK</div>
              )}

              <div className="text-7xl md:text-8xl mb-2">{item.emoji}</div>
              {item.kind === 'letter'
                ? <HighlightedKeyword keyword={item.keyword} letter={item.text} className="text-4xl md:text-5xl font-bold text-gray-800" />
                : <span className="font-english text-4xl md:text-5xl font-bold text-gray-800">{item.keyword}</span>}
              <span className="text-gray-400 font-bold text-sm mt-1">{item.zh}</span>

              {!item.matched && (
                <div className="flex gap-3 mt-4 w-full">
                  <button
                    onClick={() => speakEnglish(item.keyword)}
                    disabled={isListening}
                    className="flex-1 flex items-center justify-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold py-3 rounded-xl transition active:scale-95 disabled:opacity-50"
                  >
                    <Volume2 size={20} /> 聽
                  </button>
                  <button
                    onClick={() => startListening(item)}
                    disabled={isListening}
                    className={`flex-[2] flex items-center justify-center gap-1 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95 disabled:opacity-60 ${isMe ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'}`}
                  >
                    <Mic size={20} /> {isMe ? '請說…' : '說說看'}
                  </button>
                </div>
              )}

              {!item.matched && fails >= HELP_SHOW && (
                <button
                  onClick={() => handleEffortPass(item)}
                  className="mt-3 text-sm text-gray-500 hover:text-purple-600 font-bold flex items-center gap-1 underline"
                >
                  <ThumbsUp size={14} /> 爸媽聽過了，唸得很好！先過關
                </button>
              )}
            </div>
          );
        })}
      </div>

      <FeedbackToast message={feedback} />
    </div>
  );
};
