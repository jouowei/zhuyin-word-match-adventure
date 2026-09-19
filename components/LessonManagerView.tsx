
import React, { useState, useEffect, useRef } from 'react';
import { GRADES, chineseNumeral, lessonNumber, lessonShelves } from '../services/lessonShelf';
import { Lesson, Term } from '../types';
import { Home, Plus, X, Edit3, Save, Trash2, BookOpen, Image as ImageIcon, Link, RefreshCw, Wand2, Loader2, Upload, AlertTriangle, Scissors, Volume2 } from 'lucide-react';
import { generateImageForWord } from '../services/geminiService';
import { getCachedImage } from '../services/db';
import { getWordReading, WordReading } from '../services/moedict';
import { playChineseWord } from '../utils/chineseAudio';
import { LevelStars } from './LevelStars';

interface LessonManagerViewProps {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson) => void;
  onUpdateLessons: (lessons: Lesson[]) => void;
  onBack: () => void;
  progress?: Record<string, number[]>; // Lesson id -> completed game levels
  backLabel?: string;
  title?: string;
}

export const LessonManagerView: React.FC<LessonManagerViewProps> = ({ lessons, onSelectLesson, onUpdateLessons, onBack, progress, backLabel = '回首頁', title: heading = '選擇要學習的課文' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete Modal State
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  // Which textbook term and lesson number it is (optional: without them it goes to 其他課文)
  const [grade, setGrade] = useState<number | ''>('');
  const [term, setTerm] = useState<Term>('up');
  const [order, setOrder] = useState('');
  const [content, setContent] = useState('');
  const [vocabInput, setVocabInput] = useState('');
  const [customImageMap, setCustomImageMap] = useState<Record<string, string>>({});

  // Zhuyin (萌典) State: automatic readings + readings parents picked for polyphones
  const [autoReadings, setAutoReadings] = useState<Record<string, WordReading>>({});
  const [zhuyinOverrides, setZhuyinOverrides] = useState<Record<string, string>>({});

  // AI Image State
  const [aiImages, setAiImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Textarea Ref for inserting page breaks
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const resetForm = () => {
    setTitle('');
    setGrade('');
    setTerm('up');
    setOrder('');
    setContent('');
    setVocabInput('');
    setCustomImageMap({});
    setZhuyinOverrides({});
    setAutoReadings({});
    setAiImages({});
    setLoadingImages({});
    setEditId(null);
    setIsEditing(false);
  };

  /** A new lesson, already on a term when added from that term's shelf. */
  const startAdd = (onGrade?: number, onTerm?: Term, nextOrder?: number) => {
    resetForm();
    if (onGrade && onTerm) {
      setGrade(onGrade);
      setTerm(onTerm);
      if (nextOrder) setOrder(String(nextOrder));
    }
    setIsEditing(true);
  };

  const startEdit = (lesson: Lesson) => {
    setTitle(lesson.title);
    setGrade(lesson.grade ?? '');
    setTerm(lesson.term ?? 'up');
    setOrder(lesson.order ? String(lesson.order) : '');
    setContent(lesson.content);
    setVocabInput(lesson.vocabulary.join(' '));
    setCustomImageMap(lesson.customImages || {});
    setZhuyinOverrides(lesson.zhuyinOverrides || {});
    setEditId(lesson.id);
    setIsEditing(true);
    // Images will be loaded via effect when vocabulary updates
  };

  const handleDeleteClick = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLessonToDelete(lesson);
  };

  const confirmDelete = () => {
    if (lessonToDelete) {
      onUpdateLessons(lessons.filter(l => l.id !== lessonToDelete.id));
      setLessonToDelete(null);
    }
  };

  const handleCustomImageChange = (word: string, url: string) => {
    setCustomImageMap(prev => ({
      ...prev,
      [word]: url
    }));
  };

  const handleFileUpload = (word: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("圖片太大囉！請選小於 2MB 的照片");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleCustomImageChange(word, base64);
    };
    reader.readAsDataURL(file);
  };

  const insertPageBreak = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) {
        setContent(prev => prev + "\n\n===\n\n");
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    // Insert with newlines for readability
    const insertion = "\n\n===\n\n";

    const newContent = before + insertion + after;
    setContent(newContent);

    // Restore focus and cursor position (approximate)
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
    }, 0);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert("標題和內容不能空白喔！");
      return;
    }

    // Process vocabulary: split by space/comma/newline and filter empty
    const vocabList = vocabInput
      .split(/[\s,，、]+/)
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (vocabList.length < 1) {
       alert("至少要輸入一個生字喔！");
       return;
    }

    // Clean up customImageMap to only include words that are actually in the list
    const finalCustomImages: Record<string, string> = {};
    const finalZhuyinOverrides: Record<string, string> = {};
    vocabList.forEach(word => {
      if (customImageMap[word] && customImageMap[word].trim() !== '') {
        finalCustomImages[word] = customImageMap[word].trim();
      }
      if (zhuyinOverrides[word]) {
        finalZhuyinOverrides[word] = zhuyinOverrides[word];
      }
    });

    const lessonOrder = parseInt(order, 10);
    const original = editId ? lessons.find(l => l.id === editId) : undefined;
    const newLesson: Lesson = {
      id: editId || `lesson-${Date.now()}`,
      // A changed lesson stays the parent's, with the picture and text readings it came with
      ...(original && { edited: true }),
      ...(original?.picture && { picture: original.picture }),
      ...(original?.textReadings && { textReadings: original.textReadings }),
      title: title.trim(),
      ...(grade ? { grade, term } : {}),
      ...(lessonOrder > 0 ? { order: lessonOrder } : {}),
      content: content.trim(),
      vocabulary: vocabList,
      customImages: finalCustomImages,
      zhuyinOverrides: finalZhuyinOverrides
    };

    if (editId) {
      onUpdateLessons(lessons.map(l => l.id === editId ? newLesson : l));
    } else {
      onUpdateLessons([...lessons, newLesson]);
    }

    resetForm();
  };

  // Extract current words dynamically for the UI
  const currentWords = vocabInput.split(/[\s,，、]+/).map(v => v.trim()).filter(v => v.length > 0);

  // Effect to load existing AI images from cache whenever words change
  useEffect(() => {
    const loadImages = async () => {
      if (currentWords.length === 0) return;

      const newAiImages = { ...aiImages };
      let changed = false;

      for (const word of currentWords) {
        if (!newAiImages[word] && !loadingImages[word]) {
          try {
            const cached = await getCachedImage(word);
            if (cached) {
              newAiImages[word] = cached;
              changed = true;
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (changed) {
        setAiImages(newAiImages);
      }
    };

    // Debounce slightly to avoid heavy DB hits while typing
    const timeout = setTimeout(loadImages, 500);
    return () => clearTimeout(timeout);
  }, [vocabInput]);

  // Look up Taiwan-standard zhuyin for the vocabulary (polyphones follow the other words of this lesson)
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const words = Array.from(new Set<string>(currentWords));
      const results = await Promise.all(words.map(word => getWordReading(word, { context: words })));
      if (cancelled) return;
      setAutoReadings(Object.fromEntries(results.map(r => [r.word, r])));
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [vocabInput]);

  const playWordPreview = async (word: string) => {
    const reading = await getWordReading(word, { context: currentWords, override: zhuyinOverrides[word] });
    playChineseWord(word, reading.audioUrl);
  };

  // Handle generating/regenerating an image
  const handleGenerateAI = async (word: string, forceRegenerate: boolean = false) => {
    setLoadingImages(prev => ({ ...prev, [word]: true }));

    try {
      // Calling with skipCache=true if forceRegenerate
      const img = await generateImageForWord(word, undefined, forceRegenerate);
      if (img) {
        setAiImages(prev => ({ ...prev, [word]: img }));
      }
    } catch (e) {
      console.error("Failed to generate image", e);
    } finally {
      setLoadingImages(prev => {
        const next = { ...prev };
        delete next[word];
        return next;
      });
    }
  };

  const handleGenerateAllMissing = async () => {
     const missingWords = currentWords.filter(w => !aiImages[w] && !customImageMap[w]);
     if (missingWords.length === 0) return;

     // Process sequentially to avoid rate limits (or parallel in small batches)
     for (const word of missingWords) {
       await handleGenerateAI(word, false);
     }
  };

  if (isEditing) {
    return (
      <div className="min-h-screen bg-indigo-50 p-4 flex flex-col items-center overflow-y-auto">
         <div className="max-w-5xl w-full bg-white rounded-3xl p-6 shadow-xl border-4 border-indigo-100 mb-8">
            <h2 className="text-2xl font-bold text-indigo-800 mb-6 flex items-center gap-2">
               {editId ? <Edit3 /> : <Plus />}
               {editId ? '編輯課文' : '新增課文'}
            </h2>

            <div className="space-y-6">
               <div className="grid grid-cols-3 gap-3">
                 <div>
                    <label className="block text-gray-600 font-bold mb-1">年級</label>
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-lg bg-white"
                    >
                      <option value="">不分年級</option>
                      {GRADES.map(g => <option key={g} value={g}>{chineseNumeral(g)}年級</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-gray-600 font-bold mb-1">學期</label>
                    <select
                      value={term}
                      disabled={!grade}
                      onChange={e => setTerm(e.target.value as Term)}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-lg bg-white disabled:opacity-40"
                    >
                      <option value="up">上學期</option>
                      <option value="down">下學期</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-gray-600 font-bold mb-1">第幾課</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={order}
                      onChange={e => setOrder(e.target.value)}
                      placeholder="例如：3"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-lg"
                    />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-gray-600 font-bold mb-1">課文標題</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="例如：大自然"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-lg"
                    />
                 </div>
                 <div>
                    <label className="block text-gray-600 font-bold mb-1">本課生字 (用空白鍵隔開)</label>
                    <input
                      type="text"
                      value={vocabInput}
                      onChange={e => setVocabInput(e.target.value)}
                      placeholder="例如：太陽 天氣 小鳥"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-lg"
                    />
                 </div>
               </div>

               <div>
                  <div className="flex justify-between items-center mb-2">
                      <label className="block text-gray-600 font-bold">課文內容 (會念給孩子聽)</label>
                      <button
                          onClick={insertPageBreak}
                          className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition border border-orange-200"
                          title="在游標處插入分頁"
                      >
                          <Scissors size={14} /> 插入分頁
                      </button>
                  </div>
                  <textarea
                    ref={contentTextareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="請輸入課文內容..."
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none h-48 text-lg leading-relaxed"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                     小撇步：如果內容太長，可以點擊「插入分頁」或輸入 <span className="font-mono bg-gray-100 px-1 rounded">===</span> 來手動換頁。
                  </p>
               </div>

               {/* Image Management Section */}
               {currentWords.length > 0 && (
                 <div className="bg-indigo-50 p-4 md:p-6 rounded-2xl border-2 border-indigo-100">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-indigo-800 font-bold text-lg flex items-center gap-2">
                          <ImageIcon size={20} />
                          生字注音與圖片設定
                        </label>
                        <button
                          onClick={handleGenerateAllMissing}
                          className="text-sm bg-white hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-200 font-bold flex items-center gap-1 shadow-sm transition"
                        >
                          <Wand2 size={14} /> 自動補齊所有 AI 圖片
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentWords.map((word, idx) => {
                        const customUrl = customImageMap[word];
                        const aiUrl = aiImages[word];
                        const isLoading = loadingImages[word];
                        const displayUrl = customUrl || aiUrl;
                        const isUsingCustom = !!customUrl;
                        const reading = autoReadings[word];

                        return (
                          <div key={`${word}-${idx}`} className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3 group hover:border-indigo-300 transition-colors">

                             {/* Header */}
                             <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800 text-lg px-2 border-l-4 border-indigo-400">{word}</span>
                                {isUsingCustom && (
                                   <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">自訂圖片</span>
                                )}
                             </div>

                             {/* Zhuyin: automatic from 萌典, parents can pick another reading for polyphones */}
                             <div className="flex items-center gap-2 min-h-[32px]">
                                <button
                                  onClick={() => playWordPreview(word)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-500 rounded-lg shrink-0"
                                  title={reading?.audioUrl ? '聽教育部錄音' : '聽電腦語音（這個詞沒有錄音）'}
                                >
                                  <Volume2 size={16} />
                                </button>
                                {!reading ? (
                                  <span className="text-xs text-gray-400">查詢注音中...</span>
                                ) : reading.candidates.length > 1 ? (
                                  <select
                                    value={zhuyinOverrides[word] || ''}
                                    onChange={e => setZhuyinOverrides(prev => ({ ...prev, [word]: e.target.value }))}
                                    className={`flex-1 min-w-0 text-sm font-bold rounded-lg border-2 px-2 py-1 bg-white ${zhuyinOverrides[word] ? 'border-orange-300 text-orange-700' : 'border-gray-200 text-gray-700'}`}
                                  >
                                    <option value="">{reading.zhuyin}（自動）</option>
                                    {reading.candidates.filter(c => c !== reading.zhuyin).map(candidate => (
                                      <option key={candidate} value={candidate}>{candidate}</option>
                                    ))}
                                  </select>
                                ) : reading.zhuyin ? (
                                  <span className="text-sm font-bold text-gray-700">{reading.zhuyin}</span>
                                ) : (
                                  <span className="text-xs text-red-400 font-bold">查不到注音（請檢查網路或用字）</span>
                                )}
                                {reading && reading.candidates.length > 1 && (
                                  <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">破音字</span>
                                )}
                             </div>

                             {/* Image Preview Box - Smaller Height (h-32) */}
                             <div className="relative w-full h-32 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                                {isLoading ? (
                                   <div className="flex flex-col items-center gap-2 text-indigo-400">
                                      <Loader2 size={24} className="animate-spin" />
                                      <span className="text-xs font-bold">AI 繪圖中...</span>
                                   </div>
                                ) : displayUrl ? (
                                   <>
                                     <img
                                       src={displayUrl}
                                       alt={word}
                                       className="w-full h-full object-contain"
                                       onError={(e) => (e.currentTarget.style.display = 'none')}
                                     />
                                     {/* Redraw button */}
                                     {!isUsingCustom && (
                                       <div className="absolute bottom-2 right-2">
                                          <button
                                            onClick={() => handleGenerateAI(word, true)}
                                            className="bg-white/90 hover:bg-white text-indigo-600 px-2 py-1 rounded-full font-bold text-xs shadow-md flex items-center gap-1 backdrop-blur-sm border border-indigo-100 transition-transform active:scale-95"
                                            title="重新生成圖片"
                                          >
                                             <RefreshCw size={12} /> 重畫
                                          </button>
                                       </div>
                                     )}
                                   </>
                                ) : (
                                   <div className="flex flex-col items-center gap-2">
                                      <ImageIcon size={24} className="text-gray-200" />
                                      <button
                                        onClick={() => handleGenerateAI(word, false)}
                                        className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold shadow-sm transition"
                                      >
                                        生成 AI 圖片
                                      </button>
                                   </div>
                                )}
                             </div>

                             {/* Controls: Link Input + Upload Button */}
                             <div className="flex gap-2 items-center">
                                {/* Link Input */}
                                <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200 focus-within:border-blue-400 transition-all">
                                  <Link size={14} className="text-gray-400 shrink-0" />
                                  <input
                                    type="text"
                                    value={customUrl || ''}
                                    onChange={(e) => handleCustomImageChange(word, e.target.value)}
                                    placeholder="貼上網址..."
                                    className="w-full bg-transparent text-xs outline-none text-gray-600 placeholder-gray-400"
                                  />
                                  {customUrl && (
                                    <button onClick={() => handleCustomImageChange(word, '')} className="text-gray-400 hover:text-red-500">
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>

                                {/* Upload Button */}
                                <label
                                  className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg border border-gray-200 flex items-center justify-center transition-colors"
                                  title="上傳圖片"
                                >
                                  <Upload size={14} />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(word, e)}
                                  />
                                </label>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                 </div>
               )}
            </div>

            <div className="flex gap-4 mt-8 sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100">
               <button
                  onClick={resetForm}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
               >
                  取消
               </button>
               <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 shadow-md"
               >
                  儲存課文
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 p-4 flex flex-col relative">
       <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full">
          <button
            onClick={onBack}
            className="px-5 py-2 bg-white rounded-full shadow-md text-gray-500 hover:bg-gray-100 font-bold flex items-center gap-2 transform transition active:scale-95"
          >
             <Home size={20} /> {backLabel}
          </button>
          <h1 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
             <BookOpen className="text-indigo-500" /> {heading}
          </h1>
          <div className="w-10"></div>
       </div>

       <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-20">
          {/* Add New Button */}
          <button
             onClick={() => startAdd()}
             className="bg-white/50 border-4 border-dashed border-indigo-200 rounded-3xl p-5 flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-400 transition-all text-indigo-400"
          >
             <Plus size={32} />
             <span className="font-bold text-lg">新增課文</span>
          </button>

          {/* Lessons by term; each term can take a new lesson directly */}
          {lessonShelves(lessons).filter(shelf => shelf.lessons.length > 0).map(shelf => (
          <section key={shelf.key}>
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-xl font-black text-indigo-900">{shelf.label}<span className="text-sm text-indigo-400 font-bold ml-2">{shelf.lessons.length} 課</span></h2>
             {shelf.grade && shelf.term && (
               <button
                 onClick={() => startAdd(shelf.grade, shelf.term, Math.max(0, ...shelf.lessons.map(l => l.order ?? 0)) + 1)}
                 className="text-sm font-bold text-indigo-500 bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1"
               >
                 <Plus size={16} /> 新增這學期的課文
               </button>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shelf.lessons.map(lesson => (
             <div
               key={lesson.id}
               onClick={() => onSelectLesson(lesson)}
               className="bg-white rounded-3xl p-6 shadow-lg border-b-8 border-indigo-100 hover:border-indigo-300 hover:translate-y-[-2px] transition-all cursor-pointer relative group flex flex-col"
             >
                {/* Changed: Removed opacity-0 and group-hover classes for mobile visibility */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                   <button
                      onClick={(e) => { e.stopPropagation(); startEdit(lesson); }}
                      className="p-2 bg-gray-100 hover:bg-blue-100 text-blue-500 rounded-full shadow-sm"
                      title="編輯"
                   >
                      <Edit3 size={16} />
                   </button>
                   <button
                      onClick={(e) => handleDeleteClick(lesson, e)}
                      className="p-2 bg-gray-100 hover:bg-red-100 text-red-500 rounded-full shadow-sm"
                      title="刪除"
                   >
                      <Trash2 size={16} />
                   </button>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-1 pr-20">{lessonNumber(lesson) && <span className="text-indigo-400 mr-1">{lessonNumber(lesson)}</span>}{lesson.title}</h3>
                <LevelStars completed={progress?.[lesson.id] || []} total={8} size={16} className="mb-2" />
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">{lesson.content.replace(/===/g, ' ')}</p>

                <div className="bg-indigo-50 rounded-xl p-3">
                   <p className="text-xs font-bold text-indigo-400 mb-1">本課生字：</p>
                   <div className="flex flex-wrap gap-1">
                      {lesson.vocabulary.slice(0, 6).map((word, i) => (
                         <span key={i} className="bg-white text-indigo-600 px-2 py-0.5 rounded-md text-sm border border-indigo-100 shadow-sm">
                            {word}
                         </span>
                      ))}
                      {lesson.vocabulary.length > 6 && (
                         <span className="text-indigo-400 text-xs flex items-center">...</span>
                      )}
                   </div>
                   {lesson.customImages && Object.keys(lesson.customImages).length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-bold">
                         <ImageIcon size={12} /> 已指定 {Object.keys(lesson.customImages).length} 張圖片
                      </div>
                   )}
                </div>
             </div>
          ))}
          </div>
          </section>
          ))}
       </div>

       {/* Delete Confirmation Modal */}
       {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-red-100 relative">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">刪除課文？</h3>
            <p className="text-gray-500 mb-6 font-bold text-sm">
              確定要刪除「{lessonToDelete.title}」嗎？<br/>刪除後無法復原喔！
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setLessonToDelete(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
