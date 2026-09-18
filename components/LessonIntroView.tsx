
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Lesson } from '../types';
import { Play, Pause, Home, StopCircle, Gamepad2, ChevronLeft, ChevronRight, Volume2, Search } from 'lucide-react';
import { splitLessonPages } from '../services/lessonText';
import { CharacterDetailModal } from './CharacterDetailModal';
import { readingsForSentence, ZhuyinText } from './ZhuyinText';
import { getWordReading } from '../services/moedict';

interface LessonIntroViewProps {
  lesson: Lesson;
  onStartGame: () => void;
  onBack: () => void;
  onFindWords?: () => void; // 課文尋寶: find lesson words back in the text
}

export const LessonIntroView: React.FC<LessonIntroViewProps> = ({ lesson, onStartGame, onBack, onFindWords }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  // Readings of this lesson's vocabulary, so polyphones in the text follow the lesson (快樂 ㄌㄜˋ)
  const [vocabReadings, setVocabReadings] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const words = Array.from(new Set<string>(lesson.vocabulary));
    Promise.all(words.map(word => getWordReading(word, { context: words, override: lesson.zhuyinOverrides?.[word] })))
      .then(readings => {
        if (cancelled) return;
        setVocabReadings({ ...Object.fromEntries(readings.filter(r => r.zhuyin).map(r => [r.word, r.zhuyin])), ...lesson.textReadings });
      });
    return () => { cancelled = true; };
  }, [lesson.id, lesson.vocabulary, lesson.zhuyinOverrides, lesson.textReadings]);

  // Split content into pages
  // Pages: split by '===' when set, otherwise by 。
  const pages = useMemo(() => splitLessonPages(lesson.content), [lesson.content]);

  // The whole page fits without scrolling: a long page gets smaller letters, down to a size still easy to read
  const pageBox = useRef<HTMLDivElement>(null);
  const pageText = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const box = pageBox.current;
      const text = pageText.current;
      if (!box || !text) return;
      let size = window.innerWidth >= 768 ? 36 : 30;
      text.style.fontSize = `${size}px`;
      while (size > 18 && (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1)) {
        size -= 2;
        text.style.fontSize = `${size}px`;
      }
    };
    fit();
    // Again once the zhuyin font and the polyphone table have loaded, and when the phone turns
    const later = setTimeout(fit, 400);
    document.fonts?.ready.then(fit).catch(() => {});
    window.addEventListener('resize', fit);
    return () => {
      clearTimeout(later);
      window.removeEventListener('resize', fit);
    };
  }, [currentPage, pages, vocabReadings]);

  // Reset page when lesson changes
  useEffect(() => {
    setCurrentPage(0);
    cancelSpeech();
  }, [lesson.id]);

  // Clean up speech on unmount
  useEffect(() => {
    // Pre-load voices for Safari/iOS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      // Force voices to load on some browsers
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    
    return () => {
      cancelSpeech();
    };
  }, []);

  const cancelSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const playContent = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Ensure we start fresh
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find the best possible Chinese voice
    let bestVoice = null;
    
    // 1. Look for Enhanced or Premium Taiwan voices (Apple iOS/macOS)
    bestVoice = voices.find(v => v.lang === 'zh-TW' && (v.name.includes('Enhanced') || v.name.includes('Premium')));
    
    // 2. Look for Google's Taiwan voice (Android/Chrome)
    if (!bestVoice) bestVoice = voices.find(v => v.name === 'Google 國語（臺灣）');
    
    // 3. Look for any specific Taiwan voice (like Mei-Jia)
    if (!bestVoice) bestVoice = voices.find(v => v.lang === 'zh-TW');
    
    // 4. Look for Enhanced/Premium Chinese voices (fallback)
    if (!bestVoice) bestVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Enhanced') || v.name.includes('Premium')));
    
    // 5. Look for any Chinese voice
    if (!bestVoice) bestVoice = voices.find(v => v.lang.includes('zh'));
    
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    utterance.lang = 'zh-TW';
    utterance.rate = 0.85; // Slightly slower for kids, but not too slow to distort
    utterance.pitch = 1.0; // Normal pitch (1.1 sounds very unnatural on Apple devices)

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePlayCurrentPage = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    playContent(pages[currentPage]);
  };

  const handlePause = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const changePage = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 0 && newPage < pages.length) {
      setCurrentPage(newPage);
      // Auto play the new page content
      playContent(pages[newPage]);
    }
  };

  // Helper to split text by commas or question marks for visual display
  const renderPageLines = (text: string) => {
    // Split by comma, period, exclamation, or question mark (capturing it)
    const parts = text.split(/([，,。.\!！？?])/);
    const lines: string[] = [];
    
    let currentLine = "";
    parts.forEach((part) => {
      if (['，', ',', '。', '.', '！', '!', '？', '?'].includes(part)) {
        currentLine += part;
        lines.push(currentLine);
        currentLine = "";
      } else {
        if (currentLine !== "") {
          // If we have lingering text without a delimiter, push it as its own line
          lines.push(currentLine);
        }
        currentLine = part;
      }
    });
    if (currentLine.trim() !== "") {
      lines.push(currentLine);
    }
    
    return lines.map((line, idx) => (
      <div
        key={idx}
        className="lesson-text-line text-gray-800 text-center leading-relaxed animate-pop mb-0 md:mb-4 last:mb-0 flex justify-center"
      >
        <ZhuyinText text={line} readings={readingsForSentence(line, vocabReadings)} />
      </div>
    ));
  };

  // The lesson on one screen: the page of text, what to do with it, and the lesson's words
  return (
    <div className="h-[100dvh] flex flex-col bg-orange-50 overflow-hidden select-none">
      {selectedWord && (
        <CharacterDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}

      <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto flex flex-col gap-2 px-3 pt-2 pb-3">
        <header className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => { cancelSpeech(); onBack(); }}
            aria-label="回去"
            className="shrink-0 w-11 h-11 rounded-full bg-white shadow-sm text-slate-500 flex items-center justify-center active:scale-90 transition"
          >
            <Home size={22} />
          </button>
          <div className="flex-1 min-w-0 h-11 flex items-center justify-center bg-white rounded-full shadow-sm px-3">
            <span className="font-black truncate text-[clamp(1rem,4.5vw,1.35rem)] text-orange-700">📖 {lesson.title}</span>
          </div>
        </header>

        {/* The page, with the buttons to turn it at its sides */}
        <div className="relative flex-1 min-h-0 bg-white rounded-3xl shadow-lg border-b-8 border-orange-200 flex items-center">
          <button
            onClick={() => changePage(-1)}
            disabled={currentPage === 0}
            aria-label="上一頁"
            className={`shrink-0 z-10 ml-1 p-2 rounded-full transition ${currentPage === 0 ? 'text-gray-200' : 'text-orange-500 hover:bg-orange-50 active:scale-90'}`}
          >
            <ChevronLeft size={32} />
          </button>
          <div ref={pageBox} className="flex-1 min-w-0 h-full overflow-auto flex">
            <div ref={pageText} className="m-auto py-4 flex flex-row-reverse flex-wrap md:flex-nowrap md:flex-col items-center justify-center gap-[0.75em] md:gap-0">
              {renderPageLines(pages[currentPage])}
            </div>
          </div>
          <button
            onClick={() => changePage(1)}
            disabled={currentPage === pages.length - 1}
            aria-label="下一頁"
            className={`shrink-0 z-10 mr-1 p-2 rounded-full transition ${currentPage === pages.length - 1 ? 'text-gray-200' : 'text-orange-500 hover:bg-orange-50 active:scale-90'}`}
          >
            <ChevronRight size={32} />
          </button>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-400 font-bold bg-white px-3 py-0.5 rounded-full text-sm border border-gray-100">
            {currentPage + 1} / {pages.length}
          </span>
        </div>

        {/* Hear it, find its words, play its word games */}
        <div className="shrink-0 grid grid-cols-3 gap-2">
          {!isPlaying && !isPaused ? (
            <button
              onClick={handlePlayCurrentPage}
              className="flex flex-col items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white py-[1.4vh] rounded-2xl shadow-[0_4px_0_#c2410c] active:scale-95 transition"
            >
              <Volume2 size={28} />
              <span className="text-[clamp(0.95rem,4vw,1.15rem)] font-black">聽這一句</span>
            </button>
          ) : (
            <div className="flex gap-1">
              {isPlaying ? (
                <button onClick={handlePause} aria-label="暫停" className="flex-1 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-white rounded-2xl shadow-md">
                  <Pause size={28} />
                </button>
              ) : (
                <button onClick={handlePlayCurrentPage} aria-label="繼續" className="flex-1 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-md">
                  <Play size={28} />
                </button>
              )}
              <button onClick={cancelSpeech} aria-label="停止" className="flex-1 flex items-center justify-center bg-red-400 hover:bg-red-500 text-white rounded-2xl shadow-md">
                <StopCircle size={28} />
              </button>
            </div>
          )}

          {onFindWords ? (
            <button
              onClick={() => { cancelSpeech(); onFindWords(); }}
              className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-orange-50 text-orange-600 py-[1.4vh] rounded-2xl shadow-[0_4px_0_#fed7aa] active:scale-95 transition"
            >
              <Search size={28} />
              <span className="text-[clamp(0.95rem,4vw,1.15rem)] font-black">課文尋寶</span>
            </button>
          ) : <div />}

          <button
            onClick={() => { cancelSpeech(); onStartGame(); }}
            className={`flex flex-col items-center justify-center gap-1 py-[1.4vh] rounded-2xl active:scale-95 transition
              ${currentPage === pages.length - 1
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_4px_0_#4338ca] animate-breathe'
                : 'bg-white hover:bg-gray-50 text-indigo-600 shadow-[0_4px_0_#e5e7eb]'}`}
          >
            <Gamepad2 size={28} />
            <span className="text-[clamp(0.95rem,4vw,1.15rem)] font-black">生字遊戲</span>
          </button>
        </div>

        {/* The lesson's words: tap one to see how it is built */}
        <div className="shrink-0 flex gap-2 overflow-x-auto pb-1">
          {lesson.vocabulary.map((w, i) => (
            <button
              key={i}
              onClick={() => setSelectedWord(w)}
              className="shrink-0 font-kai text-[clamp(1.25rem,3.5vh,1.5rem)] bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1 rounded-xl border border-orange-200 active:scale-95 transition"
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
