import React, { useEffect, useRef, useState } from 'react';
import { getLetter } from '../../english/letters';
import { FourLineLetter } from './FourLineLetter';
import { HighlightedKeyword } from './shared';
import { X, Volume2, PlayCircle, Mic, Square, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { playSound } from '../../utils/sound';
import {
  speakEnglish, speakLetterName, speakLetterSound, stopEnglishSpeech,
  getLetterRecording, saveLetterRecording, deleteLetterRecording,
} from '../../utils/englishSpeech';

interface LetterDetailModalProps {
  letter: string;
  onClose: () => void;
}

const MAX_RECORD_MS = 4000;

export const LetterDetailModal: React.FC<LetterDetailModalProps> = ({ letter, onClose }) => {
  const info = getLetter(letter);
  const [animKey, setAnimKey] = useState(0);
  const [showParent, setShowParent] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    speakLetterName(letter);
    getLetterRecording(letter).then(rec => setHasRecording(!!rec)).catch(() => {});
    return () => {
      stopEnglishSpeech();
      clearTimeout(stopTimer.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, [letter]);

  if (!info) return null;

  const startRecording = async () => {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          await saveLetterRecording(letter, reader.result as string);
          setHasRecording(true);
          playSound('success');
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      stopEnglishSpeech();
      recorder.start();
      setIsRecording(true);
      stopTimer.current = setTimeout(() => recorder.state === 'recording' && recorder.stop(), MAX_RECORD_MS);
    } catch (e) {
      console.error('Recording failed', e);
      setRecordError('無法使用麥克風，請確認瀏覽器權限。');
    }
  };

  const stopRecording = () => {
    clearTimeout(stopTimer.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const removeRecording = async () => {
    await deleteLetterRecording(letter);
    setHasRecording(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-pop border-8 border-pink-100 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 z-10">
          <X size={24} />
        </button>

        {/* Letter + name + sound */}
        <div className="flex flex-col items-center">
          <span className="font-english text-8xl font-bold text-gray-800 leading-none">{info.upper}{info.lower}</span>
          <div className="grid grid-cols-2 gap-3 w-full mt-4">
            <button
              onClick={() => speakLetterName(letter)}
              className="bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold py-3 rounded-2xl flex flex-col items-center transition active:scale-95"
            >
              <span className="flex items-center gap-1"><Volume2 size={20} /> 字母名字</span>
              <span className="font-english text-lg">"{info.name}"</span>
            </button>
            <button
              onClick={() => speakLetterSound(letter)}
              className="bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold py-3 rounded-2xl flex flex-col items-center transition active:scale-95"
            >
              <span className="flex items-center gap-1"><Volume2 size={20} /> 字母聲音</span>
              <span className="font-english text-lg">{info.sound}{hasRecording ? ' 🎙️' : ''}</span>
            </button>
          </div>
        </div>

        {/* Keyword */}
        <div className="mt-5 bg-yellow-50 rounded-2xl p-4 border-2 border-yellow-100">
          <button onClick={() => speakEnglish(info.keyword)} className="w-full flex items-center justify-center gap-4 active:scale-95 transition">
            <span className="text-6xl">{info.emoji}</span>
            <span className="flex flex-col items-start">
              <HighlightedKeyword keyword={info.keyword} letter={letter} className="text-4xl font-bold text-gray-800" />
              <span className="text-gray-500 font-bold">{info.zh}</span>
            </span>
          </button>
          <div className="flex justify-center flex-wrap gap-2 mt-3">
            {info.examples.map(example => (
              <button
                key={example}
                onClick={() => speakEnglish(example)}
                className="bg-white border-2 border-yellow-200 hover:bg-yellow-100 px-3 py-1 rounded-full text-lg text-gray-700 transition active:scale-95"
              >
                <HighlightedKeyword keyword={example} letter={letter} />
              </button>
            ))}
          </div>
          {info.endSound && (
            <p className="text-center text-sm text-gray-500 mt-2">💡 {info.upper} 的聲音常常在單字的最後面！</p>
          )}
        </div>

        {/* Writing demo */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-700">✏️ 怎麼寫？</span>
            <button onClick={() => setAnimKey(k => k + 1)} className="text-sm font-bold text-amber-600 flex items-center gap-1 hover:text-amber-700">
              <PlayCircle size={18} /> 再看一次
            </button>
          </div>
          <div className="flex justify-center gap-3">
            {[info.upper, info.lower].map(ch => (
              <div key={ch} className="rounded-2xl border-2 border-gray-100 overflow-hidden">
                <FourLineLetter char={ch} size={150} animKey={animKey} showGuide showStartDots inkColor="#2563eb" />
              </div>
            ))}
          </div>
        </div>

        {/* Parent recording */}
        <div className="mt-5 border-t-2 border-dashed border-gray-100 pt-3">
          <button onClick={() => setShowParent(v => !v)} className="w-full flex items-center justify-between text-sm font-bold text-gray-400 hover:text-gray-600">
            <span>🎙️ 家長專區：錄下正確的字母聲音</span>
            {showParent ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showParent && (
            <div className="mt-3 bg-gray-50 rounded-2xl p-4 text-sm text-gray-600">
              <p className="mb-3">
                電腦語音很難唸出單獨的字母聲音（例如 {info.sound}）。建議家長錄一段「{info.sound} {info.sound} {info.keyword}」，
                之後按「字母聲音」就會播放您的錄音。
              </p>
              <div className="flex gap-2">
                {isRecording ? (
                  <button onClick={stopRecording} className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1 animate-pulse">
                    <Square size={16} /> 停止錄音
                  </button>
                ) : (
                  <button onClick={startRecording} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1">
                    <Mic size={16} /> {hasRecording ? '重新錄音' : '開始錄音'}
                  </button>
                )}
                {hasRecording && !isRecording && (
                  <>
                    <button onClick={() => speakLetterSound(letter)} className="bg-white border-2 border-gray-200 font-bold px-3 rounded-xl flex items-center gap-1">
                      <Volume2 size={16} /> 播放
                    </button>
                    <button onClick={removeRecording} className="bg-white border-2 border-gray-200 text-red-500 font-bold px-3 rounded-xl flex items-center gap-1">
                      <Trash2 size={16} /> 刪除
                    </button>
                  </>
                )}
              </div>
              {recordError && <p className="text-red-500 mt-2">{recordError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
