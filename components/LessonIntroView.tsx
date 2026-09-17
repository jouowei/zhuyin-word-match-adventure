
import React, { useState, useEffect, useMemo } from 'react';
import { Lesson } from '../types';
import { Play, Pause, ArrowRight, Home, StopCircle, Gamepad2, ChevronLeft, ChevronRight, Volume2, Search } from 'lucide-react';
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
        setVocabReadings(Object.fromEntries(readings.filter(r => r.zhuyin).map(r => [r.word, r.zhuyin])));
      });
    return () => { cancelled = true; };
  }, [lesson.id, lesson.vocabulary, lesson.zhuyinOverrides]);

  // Split content into pages
  // Pages: split by '===' when set, otherwise by 。
  const pages = useMemo(() => splitLessonPages(lesson.content), [lesson.content]);

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
        className="lesson-text-line text-3xl md:text-4xl text-gray-800 text-center leading-relaxed animate-pop mb-0 md:mb-4 last:mb-0 flex justify-center"
      >
        <ZhuyinText text={line} readings={readingsForSentence(line, vocabReadings)} />
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4 flex flex-col items-center">
      {selectedWord && (
        <CharacterDetailModal 
          word={selectedWord} 
          onClose={() => setSelectedWord(null)} 
        />
      )}

      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 border-b-8 border-orange-200 mt-4 relative flex flex-col min-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button 
             onClick={() => { cancelSpeech(); onBack(); }} 
             className="px-5 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-700 font-bold transition shadow-sm border-2 border-gray-200 flex items-center gap-2 transform active:scale-95"
          >
             <Home size={24} /> 回首頁
          </button>
          
          <div className="bg-orange-100 text-orange-800 px-4 py-1 rounded-full text-sm font-bold">
            {lesson.title}
          </div>

          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Book Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative mb-8">
           
           {/* Previous Button - Bottom on Mobile, Left on Desktop */}
           <button 
             onClick={() => changePage(-1)}
             disabled={currentPage === 0}
             className={`
               absolute left-2 bottom-0 md:top-1/2 md:-translate-y-1/2 md:-left-16 md:bottom-auto z-10 p-3 rounded-full shadow-lg border-2 border-orange-100
               transition-all transform
               ${currentPage === 0 
                 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                 : 'bg-white text-orange-500 hover:bg-orange-50 hover:scale-110'
               }
             `}
           >
             <ChevronLeft size={32} />
           </button>

           {/* Text Display - Added mb-20 for mobile button space */}
           <div className="w-full px-4 md:px-20 py-12 mb-20 md:mb-0 flex flex-row-reverse flex-wrap md:flex-nowrap md:flex-col items-center justify-center min-h-[300px] bg-orange-50/30 rounded-3xl border-2 border-dashed border-orange-100 overflow-hidden gap-8 md:gap-0">
              {renderPageLines(pages[currentPage])}
           </div>

           {/* Next Button - Bottom on Mobile, Right on Desktop */}
           <button 
             onClick={() => changePage(1)}
             disabled={currentPage === pages.length - 1}
             className={`
               absolute right-2 bottom-0 md:top-1/2 md:-translate-y-1/2 md:-right-16 md:bottom-auto z-10 p-3 rounded-full shadow-lg border-2 border-orange-100
               transition-all transform
               ${currentPage === pages.length - 1
                 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                 : 'bg-white text-orange-500 hover:bg-orange-50 hover:scale-110'
               }
             `}
           >
             <ChevronRight size={32} />
           </button>

           {/* Page Indicator - Centered at bottom */}
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-2 text-gray-400 font-bold bg-white px-3 py-1 rounded-full shadow-sm text-sm border border-gray-100">
              {currentPage + 1} / {pages.length}
           </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 pb-4">
           
           {/* Audio Control */}
           <div className="flex items-center gap-4">
              {!isPlaying && !isPaused ? (
                <button 
                  onClick={handlePlayCurrentPage}
                  className="flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl shadow-lg transform transition active:scale-95 border-b-4 border-orange-700"
                >
                   <Volume2 size={32} />
                   <span className="text-xl font-bold">聽這一句</span>
                </button>
              ) : (
                <div className="flex gap-2">
                   {isPlaying ? (
                     <button onClick={handlePause} className="bg-yellow-400 hover:bg-yellow-500 text-white p-4 rounded-xl shadow-md">
                        <Pause size={28} />
                     </button>
                   ) : (
                     <button onClick={handlePlayCurrentPage} className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl shadow-md">
                        <Play size={28} />
                     </button>
                   )}
                   <button onClick={cancelSpeech} className="bg-red-400 hover:bg-red-500 text-white p-4 rounded-xl shadow-md">
                      <StopCircle size={28} />
                   </button>
                </div>
              )}
           </div>

           {onFindWords && (
             <button
               onClick={() => { cancelSpeech(); onFindWords(); }}
               className="flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-600 px-6 py-4 rounded-2xl shadow-lg transform transition active:scale-95 border-b-4 border-orange-200"
             >
               <Search size={28} />
               <span className="text-xl font-bold">課文尋寶</span>
             </button>
           )}

           <div className="h-8 w-[2px] bg-gray-200 hidden md:block"></div>

           {/* Start Game Button (Highlighted when at the end) */}
           <button 
             onClick={() => { cancelSpeech(); onStartGame(); }}
             className={`
               flex items-center gap-3 px-8 py-4 rounded-2xl shadow-lg transform transition active:scale-95 border-b-4
               ${currentPage === pages.length - 1 
                 ? 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-700 animate-pulse' 
                 : 'bg-white hover:bg-gray-50 text-indigo-600 border-gray-200'
               }
             `}
           >
              <Gamepad2 size={32} />
              <span className="text-xl font-bold">
                 {currentPage === pages.length - 1 ? "讀完了，開始玩遊戲！" : "去玩生字遊戲"}
              </span>
              <ArrowRight size={24} />
           </button>
        </div>

        {/* Vocabulary Preview */}
        <div className="mt-8 pt-6 border-t-2 border-dashed border-orange-100 w-full">
           <p className="text-center text-gray-400 text-sm font-bold mb-3 flex items-center justify-center gap-1">
             <Search size={14} /> 點點下面的字，看看部首在哪裡！
           </p>
           <div className="flex flex-wrap justify-center gap-2">
              {lesson.vocabulary.map((w, i) => (
                 <button 
                   key={i} 
                   onClick={() => setSelectedWord(w)}
                   className="text-2xl bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-900 px-4 py-2 rounded-xl font-bold border border-orange-200 shadow-sm transition-transform active:scale-95 flex items-center justify-center"
                 >
                   {w}
                 </button>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};
