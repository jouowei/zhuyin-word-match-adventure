
import React, { useState, useEffect, useRef } from 'react';
import { WordItem, GameState, RewardCard, UserProfile, Lesson, EnglishUnit, EnglishRoundItem, Skill, Confusion } from './types';
import { isReviewDue, logAnswer, logMistake, logNewItems } from './services/activityLog';
import { INITIAL_WORD_SET, REWARD_CARDS, INITIAL_LESSONS, ZHUYIN_VOCABULARY } from './constants';
import { generateLevelData, generateImageForWord } from './services/geminiService';
import { getCachedImage, cacheImage } from './services/db';
import { playSound } from './utils/sound';
import { buildEnglishRound, ENGLISH_UNITS, LETTER_LEVELS, RHYME_LEVEL, ROUND_SIZE, WORD_LEVELS } from './english/curriculum';
import { LETTERS } from './english/letters';
import { buildRhymeRound, RhymeQuestion } from './english/families';
import {
  ALL_ENGLISH_WORDS, buildEnglishDailyPath, buildEnglishLearnCards, EnglishLearnCard, englishSentenceWords, pathUnit,
} from './services/englishPath';
import { EnglishLearnView } from './components/english/EnglishLearnView';
import { EnglishSentenceLoopView } from './components/english/EnglishSentenceLoopView';
import { EnglishFamilyGameView } from './components/english/EnglishFamilyGameView';
import { stopEnglishSpeech } from './utils/englishSpeech';
import { buildSyllableRound } from './services/zhuyinPractice';
import {
  addCompletedLevel, englishStatKey, FREE_PRACTICE_PROGRESS_KEY, isEnglishKey, masteredCount, recordIntroduced, recordMistake, recordSkill,
  recordSuccess, reviewSchedule, reviewWords, skillCount, statKey, todayKey, ZHUYIN_PROGRESS_KEY,
} from './services/learningStats';
import { buildDailyPath, DailyPath, maxSymbolsFor, roundSizeFor, Station, StationResult, toneSupportNeeded } from './services/dailyPath';
import { buildLearnCards, LearnCard } from './services/learnItems';
import { DailyPathView } from './components/DailyPathView';
import { WordFamilyGameView } from './components/WordFamilyGameView';
import { RadicalGameView } from './components/RadicalGameView';
import { LessonLoopView } from './components/LessonLoopView';
import { ParentReportView } from './components/ParentReportView';
import { BrowserNotice } from './components/BrowserNotice';
import { buildFamilyRound, FamilyQuestion } from './services/wordFamilies';
import { buildRadicalRound, RadicalQuestion } from './services/radicals';
import { wordsInText } from './services/lessonText';
import { LearnNewView } from './components/LearnNewView';
import { MASTERY_BONUS, pointsFor } from './services/scaffolding';
import { SyllableSpellGameView } from './components/SyllableSpellGameView';
import { ToneGameView } from './components/ToneGameView';

// View Components
import { LoginView } from './components/LoginView';
import { MenuView } from './components/MenuView';
import { DifficultySelectView } from './components/DifficultySelectView';
import { GameView } from './components/GameView';
import { SpeakingGameView } from './components/SpeakingGameView';
import { ShopView } from './components/ShopView';
import { VictoryView } from './components/VictoryView';
import { LoadingView } from './components/LoadingView';
import { LeaderboardView } from './components/LeaderboardView';
import { LessonManagerView } from './components/LessonManagerView';
import { LessonIntroView } from './components/LessonIntroView';
import { ZhuyinIntroView } from './components/ZhuyinIntroView';
import { EnglishHubView } from './components/english/EnglishHubView';
import { AlphabetChartView } from './components/english/AlphabetChartView';
import { EnglishUnitIntroView } from './components/english/EnglishUnitIntroView';
import { EnglishLevelSelectView } from './components/english/EnglishLevelSelectView';
import { EnglishMatchGameView } from './components/english/EnglishMatchGameView';
import { EnglishSpellGameView } from './components/english/EnglishSpellGameView';
import { EnglishTraceGameView } from './components/english/EnglishTraceGameView';
import { EnglishSpeakGameView } from './components/english/EnglishSpeakGameView';
import { EnglishUnitManagerView } from './components/english/EnglishUnitManagerView';

const MILESTONE_SIZE = 10;

/** 今日冒險 rounds: planned words (most important first), which ones must be in, and how many items. */
interface RoundPlan { words: string[]; focus: string[]; count: number; }

export default function App() {
  // --- USER SYSTEM STATE ---
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('zhuyin_users');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load users", e);
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // --- GAME STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.LOGIN);
  const [gameMode, setGameMode] = useState<'word' | 'zhuyin'>('word');
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(1);
  const [currentWords, setCurrentWords] = useState<WordItem[]>(INITIAL_WORD_SET);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // --- LESSON STATE ---
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('zhuyin_lessons');
        if (saved) {
          const savedLessons = JSON.parse(saved);
          
          // Smart Merge: Check if there are new default lessons (like Lesson 6) 
          // that are present in code (INITIAL_LESSONS) but missing from storage.
          const mergedLessons = [...savedLessons];
          let hasNewContent = false;

          INITIAL_LESSONS.forEach(initLesson => {
            // If this initial lesson ID does not exist in the saved lessons, add it
            if (!savedLessons.some((l: Lesson) => l.id === initLesson.id)) {
               mergedLessons.push(initLesson);
               hasNewContent = true;
            }
          });

          // If we added new lessons, return the merged list
          return mergedLessons;
        }
      }
    } catch (e) {}
    return INITIAL_LESSONS;
  });

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // --- ENGLISH STATE ---
  const [customEnglishUnits, setCustomEnglishUnits] = useState<EnglishUnit[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('english_custom_units');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });
  const [activeEnglishUnit, setActiveEnglishUnit] = useState<EnglishUnit | null>(null);
  const [englishLevel, setEnglishLevel] = useState<number>(1);
  const [englishItems, setEnglishItems] = useState<EnglishRoundItem[]>([]);
  const [victorySource, setVictorySource] = useState<'chinese' | 'english'>('chinese');
  const [reviewMode, setReviewMode] = useState(false); // 複習時間 rounds use the words due for review as vocabulary
  const [celebration, setCelebration] = useState<{ id: number; text: string } | null>(null); // 學會一個字
  const [dailyPath, setDailyPath] = useState<DailyPath | null>(null); // 今日冒險 (kept while leaving, so it can be resumed today)
  const [learnCards, setLearnCards] = useState<LearnCard[]>([]);
  const [familyQuestions, setFamilyQuestions] = useState<FamilyQuestion[]>([]); // 字的家族 round
  const [radicalQuestions, setRadicalQuestions] = useState<RadicalQuestion[]>([]); // 部件偵探 round
  const [lessonLoop, setLessonLoop] = useState<{ mode: 'listen' | 'find'; targets: string[]; fromPath: boolean } | null>(null);
  const [englishLearnCards, setEnglishLearnCards] = useState<EnglishLearnCard[]>([]);
  const [englishLoop, setEnglishLoop] = useState<{ mode: 'listen' | 'find'; targets: string[]; fromPath: boolean; unit: EnglishUnit } | null>(null);
  const [rhymeQuestions, setRhymeQuestions] = useState<RhymeQuestion[]>([]); // 押韻家族 round
  const dailyPathRef = useRef<DailyPath | null>(null);
  const pathRoundRef = useRef(false); // The round being played belongs to 今日冒險
  const roundTallyRef = useRef<StationResult>({ onOwn: 0, total: 0 });

  const currentWordsRef = useRef(currentWords);
  currentWordsRef.current = currentWords;

  // Latest values for callbacks fired from timers inside game views
  const englishItemsRef = useRef(englishItems);
  englishItemsRef.current = englishItems;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const usersRef = useRef(users);
  usersRef.current = users;
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(celebrationTimer.current), []);

  // --- GLOBAL ASSETS STATE ---
  const [rewardImages, setRewardImages] = useState<Record<string, string>>({});
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [imageRefreshVersion, setImageRefreshVersion] = useState(0);

  const isMounted = useRef(false);

  // --- EFFECTS ---

  // Check for API Key in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const keyFromUrl = params.get('key');
      if (keyFromUrl) {
        localStorage.setItem('gemini_api_key', keyFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Load Saved Reward Images
  useEffect(() => {
    const loadRewardImages = async () => {
      const loaded: Record<string, string> = {};
      await Promise.all(REWARD_CARDS.map(async (card) => {
        try {
          const img = await getCachedImage(`reward_${card.id}`);
          if (img) loaded[card.id] = img;
        } catch(e) {}
      }));
      setRewardImages(prev => ({ ...prev, ...loaded }));
    };
    loadRewardImages();
  }, [gameState]); 

  // Save Users
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (isMounted.current) {
        try {
          localStorage.setItem('zhuyin_users', JSON.stringify(users));
        } catch (e) {}
      } else {
        isMounted.current = true;
      }
    }
  }, [users]);

  // Save Lessons
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage && isMounted.current) {
      try {
        localStorage.setItem('zhuyin_lessons', JSON.stringify(lessons));
      } catch (e) {}
    }
  }, [lessons]);

  // Start each new screen from the top
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [gameState]);

  // Save custom English units
  useEffect(() => {
    try {
      localStorage.setItem('english_custom_units', JSON.stringify(customEnglishUnits));
    } catch (e) {}
  }, [customEnglishUnits]);

  // --- ACTIONS ---

  const handleImageError = (id: string) => {
    setImageLoadErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleFileUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片太大囉！請選小一點的照片 (小於 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await cacheImage(`reward_${id}`, base64);
        setRewardImages(prev => ({ ...prev, [id]: base64 }));
        setImageLoadErrors(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateUserProfile = (userId: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedUser = { ...u, ...updates };
        if (currentUser && currentUser.id === userId) {
           setCurrentUser(updatedUser);
        }
        return updatedUser;
      }
      return u;
    }));
  };

  const createUser = (name: string, avatar: string) => {
    // Secret backdoor for testing
    const initialPoints = (name === 'Administrator' || name === 'Administration') ? 9999 : 0;
    
    const newUser: UserProfile = {
      id: Date.now().toString(),
      name,
      avatar,
      points: initialPoints,
      ownedCardIds: [],
      createdAt: Date.now()
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setGameState(GameState.MENU);
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Progress stars are kept per lesson, for the zhuyin symbols, and for free practice
  const progressKey = gameMode === 'zhuyin'
    ? ZHUYIN_PROGRESS_KEY
    : reviewMode ? null : activeLesson ? activeLesson.id : FREE_PRACTICE_PROGRESS_KEY;

  const celebrate = (text: string) => {
    clearTimeout(celebrationTimer.current);
    playSound('magic');
    setCelebration({ id: Date.now(), text });
    celebrationTimer.current = setTimeout(() => setCelebration(null), 2800);
  };

  /**
   * Points go to answers given without help, and the item moves on in spaced review.
   * `tracksMemory` is false where the game can't tell what the child remembers (speech recognition, tracing).
   */
  const rewardAnswer = (
    key: string, label: string, helpLevel: number, tracksMemory: boolean,
    extra?: (u: UserProfile) => Partial<UserProfile>, skill?: Skill,
  ) => {
    if (!currentUser) return;
    const now = Date.now();
    const independent = helpLevel === 0;
    const before = usersRef.current.find(u => u.id === currentUser.id);
    if (tracksMemory && before && recordSuccess(before.wordStats, key, independent, now).mastered) {
      celebrate(`學會了「${label}」！ +${MASTERY_BONUS}分`);
      const path = dailyPathRef.current;
      if (pathRoundRef.current && path) setPathState({ ...path, masteredToday: [...path.masteredToday, label] });
    }
    setUsers(prev => prev.map(u => {
      if (u.id !== currentUser.id) return u;
      const result = tracksMemory ? recordSuccess(u.wordStats, key, independent, now) : { stats: u.wordStats, mastered: false };
      const review = tracksMemory && isReviewDue(u.wordStats?.[key], now);
      const updatedUser: UserProfile = {
        ...u,
        points: u.points + pointsFor(helpLevel) + (result.mastered ? MASTERY_BONUS : 0),
        activity: logAnswer(u.activity, now, { independent, review, mastered: result.mastered, english: isEnglishKey(key) }),
        // Answers on own per skill let support fade: writing stages, blending before spelling, tone comparison
        wordStats: skill && independent ? recordSkill(result.stats, key, skill) : result.stats,
        ...extra?.(u),
      };
      setCurrentUser(updatedUser);
      return updatedUser;
    }));
  };

  /** `tracksMemory` is false for tasks that don't show what the child remembers; the mistake still goes into the parent report. */
  const recordWrongAnswer = (key: string, confusion?: Confusion, tracksMemory = true) => {
    if (!currentUser) return;
    const now = Date.now();
    setUsers(prev => prev.map(u => {
      if (u.id !== currentUser.id) return u;
      const updatedUser = {
        ...u,
        wordStats: tracksMemory ? recordMistake(u.wordStats, key, now) : u.wordStats,
        activity: logMistake(u.activity, now, { review: tracksMemory && isReviewDue(u.wordStats?.[key], now), confusion, english: isEnglishKey(key) }),
      };
      setCurrentUser(updatedUser);
      return updatedUser;
    }));
  };

  const handleCorrectMatch = (id: string, helpLevel = 0) => {
    // Game views call this from timers, so always work from the latest round
    const target = currentWordsRef.current.find(item => item.id === id);
    if (!target || target.matched || gameStateRef.current !== GameState.PLAYING) return;
    const updatedWords = currentWordsRef.current.map(item =>
      item.id === id ? { ...item, matched: true } : item
    );
    currentWordsRef.current = updatedWords;
    setCurrentWords(updatedWords);

    const roundComplete = updatedWords.every(w => w.matched);
    // Speech recognition misjudges children too often to count as remembering (or forgetting) a word;
    // 字的家族 and 部件偵探 are about how words and characters are built
    const tracksMemory = currentDifficulty !== 4 && currentDifficulty !== 7 && currentDifficulty !== 8;
    const skill = ({ 3: 'write', 5: 'spell', 6: 'tone' } as Record<number, Skill>)[currentDifficulty];
    rewardAnswer(statKey(gameMode, target.character), target.character, helpLevel, tracksMemory, u => ({
      zhuyinProgress: roundComplete && progressKey ? addCompletedLevel(u.zhuyinProgress, progressKey, currentDifficulty) : u.zhuyinProgress,
    }), skill);
    roundTallyRef.current = {
      onOwn: roundTallyRef.current.onOwn + (helpLevel === 0 ? 1 : 0),
      total: roundTallyRef.current.total + 1,
    };

    if (roundComplete) {
      setTimeout(() => {
        if (gameStateRef.current !== GameState.PLAYING) return;
        playSound('cheer');
        if (pathRoundRef.current) {
          finishStation(roundTallyRef.current);
          return;
        }
        setVictorySource('chinese');
        setGameState(GameState.VICTORY);
      }, 500);
    }
  };

  // A wrong answer brings the word back soon (spaced review box 0)
  const handleMistake = (id: string, confusion?: Confusion) => {
    const target = currentWordsRef.current.find(item => item.id === id);
    // 字的家族 and 部件偵探 ask how words and characters are built, not about remembering one
    if (target) recordWrongAnswer(statKey(gameMode, target.character), confusion, currentDifficulty !== 7 && currentDifficulty !== 8);
  };

  // --- 今日冒險 ---

  const setPathState = (path: DailyPath | null) => {
    dailyPathRef.current = path;
    setDailyPath(path);
  };

  /** What today's path draws from: the zhuyin symbols, the active lesson, or every lesson. */
  const pathSource = () => {
    if (gameMode === 'zhuyin') return { pool: ZHUYIN_VOCABULARY, label: '注音符號', context: [] as string[] };
    const words = activeLesson ? activeLesson.vocabulary : lessons.flatMap(l => l.vocabulary);
    const pool = Array.from(new Set<string>(words));
    return { pool, label: activeLesson ? activeLesson.title : '自由練習：所有課文的字', context: pool };
  };

  const lessonAssets = () => {
    const source = activeLesson ? [activeLesson] : lessons;
    return {
      customImages: Object.assign({}, ...source.map(l => l.customImages || {})) as Record<string, string>,
      zhuyinOverrides: Object.assign({}, ...source.map(l => l.zhuyinOverrides || {})) as Record<string, string>,
    };
  };

  const startDailyPath = async () => {
    if (!currentUser) return;
    const { pool, label } = pathSource();
    const existing = dailyPathRef.current;
    // Coming back the same day to the same content continues where the child left off
    if (existing && existing.date === todayKey() && existing.label === label && existing.gameMode === gameMode
      && existing.stations[existing.current]?.kind !== 'summary') {
      setGameState(GameState.DAILY_PATH);
      return;
    }
    if (pool.length < 4) {
      alert('這裡的字太少囉！至少要有 4 個字才能開始今日冒險。');
      return;
    }
    setIsGenerating(true);
    try {
      setPathState(await buildDailyPath({
        gameMode, label, pool, stats: currentUser.wordStats, points: currentUser.points,
        lessonContent: gameMode === 'word' && activeLesson ? activeLesson.content : undefined,
      }));
      setGameState(GameState.DAILY_PATH);
    } catch (e) {
      console.error(e);
      alert('準備冒險時發生錯誤，請稍後再試！');
    } finally {
      setIsGenerating(false);
    }
  };

  const launchStation = async (level?: number) => {
    const path = dailyPathRef.current;
    if (!path || !currentUser) return;
    const station = path.stations[path.current];
    if (!station || station.kind === 'summary') return;
    if (path.language === 'en') {
      launchEnglishStation(path, station, level);
      return;
    }

    if (station.kind === 'story' || station.kind === 'find') {
      if (!activeLesson) {
        finishStation({ onOwn: 0, total: 0 });
        return;
      }
      setLessonLoop({ mode: station.kind === 'story' ? 'listen' : 'find', targets: station.words, fromPath: true });
      setGameState(GameState.LESSON_LOOP);
      return;
    }

    if (station.kind === 'learn') {
      setIsGenerating(true);
      try {
        const { pool, context } = pathSource();
        const keyOf = (item: string) => statKey(path.gameMode, item);
        const known = pool.filter(item => (currentUser.wordStats?.[keyOf(item)]?.box ?? 0) >= 1);
        const cards = await buildLearnCards({
          gameMode: path.gameMode, newItems: station.words, candidates: [...known, ...pool], context, ...lessonAssets(),
        });
        if (!cards.length) {
          finishStation({ onOwn: 0, total: 0 });
          return;
        }
        setLearnCards(cards);
        setGameState(GameState.LEARN_NEW);
      } catch (e) {
        console.error(e);
        alert('準備新朋友時發生錯誤，請稍後再試！');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const chosen = level ?? station.options[0];
    setPathState({ ...path, stations: path.stations.map((s, i) => (i === path.current ? { ...s, chosen } : s)) });
    setReviewMode(false);
    setCurrentDifficulty(chosen);
    startNewLevel(chosen, { words: station.words, focus: station.focus, count: roundSizeFor(path, chosen) });
  };

  function finishStation(result: StationResult) {
    const path = dailyPathRef.current;
    if (!path) return;
    pathRoundRef.current = false;
    const stations = path.stations.map((s, i) => (i === path.current ? { ...s, result } : s));
    const next = { ...path, stations, current: path.current + 1 };
    setPathState(next);
    if (next.stations[next.current]?.kind === 'summary' && currentUser) {
      updateUserProfile(currentUser.id, next.language === 'en' ? { lastEnglishPath: next.date } : { lastDailyPath: next.date });
    }
    setGameState(GameState.DAILY_PATH);
  }

  // New items met in 認識新朋友 come back for practice later today
  const handleLearnDone = (results: { character: string; helped: boolean }[]) => {
    const path = dailyPathRef.current;
    if (!path || !currentUser) return;
    const now = Date.now();
    setUsers(prev => prev.map(u => {
      if (u.id !== currentUser.id) return u;
      const wordStats = results.reduce((stats, r) => recordIntroduced(stats, statKey(path.gameMode, r.character), now), u.wordStats || {});
      const updatedUser = { ...u, wordStats, activity: logNewItems(u.activity, now, results.length) };
      setCurrentUser(updatedUser);
      return updatedUser;
    }));
    finishStation({ onOwn: results.filter(r => !r.helped).length, total: results.length });
  };

  // --- 今日英文冒險 ---

  const allEnglishUnits = () => [...ENGLISH_UNITS, ...customEnglishUnits];

  const startEnglishDailyPath = () => {
    if (!currentUser) return;
    const existing = dailyPathRef.current;
    // Coming back the same day continues where the child left off
    if (existing && existing.language === 'en' && existing.date === todayKey() && existing.stations[existing.current]?.kind !== 'summary') {
      setGameState(GameState.DAILY_PATH);
      return;
    }
    setPathState(buildEnglishDailyPath({ stats: currentUser.wordStats, points: currentUser.points }));
    setGameState(GameState.DAILY_PATH);
  };

  const englishOptionInfo = (level: number, station: Station) => {
    const kind = station.englishKind || allEnglishUnits().find(u => u.id === dailyPathRef.current?.unitId)?.kind || 'words';
    const levels = kind === 'letters' ? LETTER_LEVELS : [...WORD_LEVELS, RHYME_LEVEL];
    const info = levels.find(l => l.level === level) || levels[0];
    return { emoji: info.emoji, title: info.title, desc: info.desc, instruction: info.instruction };
  };

  const launchEnglishStation = (path: DailyPath, station: Station, level?: number) => {
    const unit = allEnglishUnits().find(u => u.id === path.unitId);
    if (!unit || !currentUser) {
      finishStation({ onOwn: 0, total: 0 });
      return;
    }
    if (station.kind === 'story' || station.kind === 'find') {
      setActiveEnglishUnit(unit);
      setEnglishLoop({ mode: station.kind === 'story' ? 'listen' : 'find', targets: station.words, fromPath: true, unit });
      setGameState(GameState.ENGLISH_SENTENCES);
      return;
    }
    if (station.kind === 'learn') {
      const kind = station.englishKind || unit.kind;
      const all = kind === 'letters' ? LETTERS.map(l => l.lower) : ALL_ENGLISH_WORDS.map(w => w.word);
      const keyOf = (text: string) => englishStatKey({ kind: kind === 'letters' ? 'letter' : 'word', text });
      const known = all.filter(text => (currentUser.wordStats?.[keyOf(text)]?.box ?? 0) >= 1);
      const unitItems = kind === 'letters' ? unit.letters || [] : (unit.words || []).map(w => w.word);
      const cards = buildEnglishLearnCards({ kind, newItems: station.words, candidates: [...known, ...unitItems, ...all], units: [unit] });
      if (!cards.length) {
        finishStation({ onOwn: 0, total: 0 });
        return;
      }
      setEnglishLearnCards(cards);
      setGameState(GameState.ENGLISH_LEARN);
      return;
    }
    const chosen = level ?? station.options[0];
    setPathState({ ...path, stations: path.stations.map((s, i) => (i === path.current ? { ...s, chosen } : s)) });
    // Warm-up mixes items from different units, so it doesn't count towards a unit's stars
    const roundUnit = pathUnit(station, unit, station.kind === 'warmup' ? 'path-warmup' : unit.id);
    const available = (roundUnit.kind === 'letters' ? roundUnit.letters : roundUnit.words)?.length || 0;
    startEnglishRound(chosen, { unit: roundUnit, count: Math.min(roundSizeFor(path, chosen), available) });
  };

  const handleEnglishLearnDone = (results: { item: EnglishRoundItem; helped: boolean }[]) => {
    if (!currentUser) return;
    const now = Date.now();
    setUsers(prev => prev.map(u => {
      if (u.id !== currentUser.id) return u;
      const wordStats = results.reduce((stats, r) => recordIntroduced(stats, englishStatKey(r.item), now), u.wordStats || {});
      const updatedUser = { ...u, wordStats, activity: logNewItems(u.activity, now, results.length) };
      setCurrentUser(updatedUser);
      return updatedUser;
    }));
    finishStation({ onOwn: results.filter(r => !r.helped).length, total: results.length });
  };

  /** 句子尋寶 from the unit page: up to three of the unit's words that appear in its sentences. */
  const startEnglishSentenceFind = () => {
    if (!activeEnglishUnit) return;
    const words = englishSentenceWords(activeEnglishUnit, (activeEnglishUnit.words || []).map(w => w.word))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    if (!words.length) return;
    setEnglishLoop({ mode: 'find', targets: words, fromPath: false, unit: activeEnglishUnit });
    setGameState(GameState.ENGLISH_SENTENCES);
  };

  const handleEnglishLoopDone = (results: { word: string; helpLevel: number }[]) => {
    if (englishLoop?.fromPath) pathRoundRef.current = true; // So words learned here show in today's results
    // Only words already practised count for review
    results.forEach(r => {
      const key = englishStatKey({ kind: 'word', text: r.word });
      rewardAnswer(key, r.word, r.helpLevel, !!usersRef.current.find(u => u.id === currentUser?.id)?.wordStats?.[key]);
    });
    const tally = { onOwn: results.filter(r => r.helpLevel === 0).length, total: results.length };
    if (englishLoop?.fromPath) {
      finishStation(tally);
      return;
    }
    if (results.length) {
      playSound('cheer');
      celebrate(`句子尋寶完成！自己找到 ${tally.onOwn} 個`);
    }
    setGameState(GameState.ENGLISH_UNIT_INTRO);
  };

  // --- ENGLISH ACTIONS ---

  const openEnglishUnit = (unit: EnglishUnit) => {
    setActiveEnglishUnit(unit);
    // Review units mix everything, so skip the learning page
    setGameState(unit.stage === 0 ? GameState.ENGLISH_LEVEL_SELECT : GameState.ENGLISH_UNIT_INTRO);
  };

  /** `plan`: a 今日英文冒險 round with its own ordered unit and size. */
  const startEnglishRound = (level: number, plan?: { unit: EnglishUnit; count: number }) => {
    const unit = plan?.unit ?? activeEnglishUnit;
    if (!unit) return;
    pathRoundRef.current = !!plan;
    if (plan) setActiveEnglishUnit(plan.unit);
    let items: EnglishRoundItem[] | null;
    if (level === 5) {
      const questions = buildRhymeRound(unit, 3);
      setRhymeQuestions(questions || []);
      items = questions ? questions.map(q => q.item) : null;
    } else {
      items = buildEnglishRound(unit, level, reviewSchedule(currentUser?.wordStats), plan?.count);
    }
    if (!items) {
      alert(`這個單元的內容太少囉！至少需要 ${plan?.count ?? ROUND_SIZE} 個${unit.kind === 'letters' ? '字母' : '單字'}才能開始遊戲。`);
      return;
    }
    roundTallyRef.current = { onOwn: 0, total: 0 };
    stopEnglishSpeech();
    setEnglishLevel(level);
    setEnglishItems(items);
    setGameState(GameState.ENGLISH_PLAYING);
  };

  const handleEnglishMatch = (id: string, helpLevel = 0) => {
    if (gameStateRef.current !== GameState.ENGLISH_PLAYING || !currentUser || !activeEnglishUnit) return;
    const target = englishItemsRef.current.find(item => item.id === id);
    if (!target || target.matched) return;

    const updatedItems = englishItemsRef.current.map(item => item.id === id ? { ...item, matched: true } : item);
    englishItemsRef.current = updatedItems;
    setEnglishItems(updatedItems);

    const roundComplete = updatedItems.every(item => item.matched);
    const unitId = activeEnglishUnit.id;
    // Tracing letters and speech recognition don't show whether the child remembers the letter or word
    // 押韻家族 asks about word endings, not about remembering the word
    const tracksMemory = englishLevel !== 4 && englishLevel !== 5 && !(englishLevel === 3 && activeEnglishUnit.kind === 'letters');
    // Answers on own let writing support and the blending step fade
    const skill: Skill | undefined = englishLevel !== 3 ? undefined
      : activeEnglishUnit.kind === 'words' ? 'spell' : target.traceCase === 'upper' ? 'writeUpper' : 'write';
    roundTallyRef.current = {
      onOwn: roundTallyRef.current.onOwn + (helpLevel === 0 ? 1 : 0),
      total: roundTallyRef.current.total + 1,
    };

    rewardAnswer(englishStatKey(target), target.text, helpLevel, tracksMemory, u => {
      const englishProgress = { ...(u.englishProgress || {}) };
      if (roundComplete && !unitId.startsWith('path-')) {
        const levels = englishProgress[unitId] || [];
        if (!levels.includes(englishLevel)) englishProgress[unitId] = [...levels, englishLevel].sort((a, b) => a - b);
      }
      return { englishProgress };
    }, skill);

    if (roundComplete) {
      setTimeout(() => {
        if (gameStateRef.current !== GameState.ENGLISH_PLAYING) return;
        playSound('cheer');
        stopEnglishSpeech();
        if (pathRoundRef.current) {
          finishStation(roundTallyRef.current);
          return;
        }
        setVictorySource('english');
        setGameState(GameState.VICTORY);
      }, 1200);
    }
  };

  const handleEnglishMistake = (id: string, confusion?: Confusion) => {
    const target = englishItemsRef.current.find(item => item.id === id);
    if (target) recordWrongAnswer(englishStatKey(target), confusion, englishLevel !== 5);
  };

  const goToEnglishHub = () => {
    stopEnglishSpeech();
    setGameState(GameState.ENGLISH_HUB);
  };

  const startNewLevel = async (difficulty?: number, plan?: RoundPlan) => {
    pathRoundRef.current = !!plan;
    setIsGenerating(true);
    const diff = difficulty !== undefined ? difficulty : currentDifficulty;
    
    // Determine source words
    let sourceWords: string[] = [];
    let customImages: Record<string, string> = {};
    let zhuyinOverrides: Record<string, string> = {};

    const allLessonWords: string[] = Array.from(new Set<string>(lessons.flatMap((l: Lesson) => l.vocabulary)));
    lessons.forEach(l => Object.assign(zhuyinOverrides, l.zhuyinOverrides || {}));

    if (gameMode === 'zhuyin') {
      sourceWords = ZHUYIN_VOCABULARY;
    } else if (reviewMode) {
      // 複習時間: words due for review, topped up with other lesson words when there are fewer than four
      const due = reviewWords(currentUser?.wordStats).filter(w => allLessonWords.includes(w));
      const filler = allLessonWords.filter(w => !due.includes(w)).sort(() => Math.random() - 0.5);
      sourceWords = due.length >= 4 ? due : [...due, ...filler.slice(0, 4 - due.length)];
      lessons.forEach(l => Object.assign(customImages, l.customImages || {}));
    } else if (activeLesson) {
      // 1. Lesson Mode: Use words from the active lesson
      sourceWords = activeLesson.vocabulary;
      customImages = activeLesson.customImages || {};
      zhuyinOverrides = activeLesson.zhuyinOverrides || {};
    } else {
      // 2. Free Practice Mode: Use ALL words from ALL lessons
      const allVocab = new Set<string>();
      lessons.forEach(l => {
         l.vocabulary.forEach(v => allVocab.add(v));
         if (l.customImages) {
            Object.assign(customImages, l.customImages);
         }
         if (l.zhuyinOverrides) {
            Object.assign(zhuyinOverrides, l.zhuyinOverrides);
         }
      });
      sourceWords = Array.from(allVocab);
    }
    if (plan) sourceWords = plan.words;

    if (sourceWords.length < 4) {
      alert("目前課文裡的生字太少囉！請先去「課文模式」新增更多課文和生字 (至少4個) 才能開始遊戲。");
      setIsGenerating(false);
      return;
    }
    
    try {
      const schedule = reviewSchedule(currentUser?.wordStats);
      let newItems: WordItem[] | null;
      if (diff === 7) {
        // 字的家族: one question per family character
        const questions = await buildFamilyRound({ vocabulary: sourceWords, stats: currentUser?.wordStats, count: plan?.count ?? 3 });
        setFamilyQuestions(questions);
        newItems = questions.map(q => q.item);
      } else if (diff === 8) {
        // 部件偵探: one question per component, families of characters the child knows first
        const questions = await buildRadicalRound({ vocabulary: sourceWords, stats: currentUser?.wordStats, count: plan?.count ?? 3 });
        setRadicalQuestions(questions);
        newItems = questions.map(q => q.item);
      } else if (diff === 5 || diff === 6) {
        // 拼音高手 / 聲調偵探 work on single syllables
        newItems = await buildSyllableRound({
          gameMode, vocabulary: sourceWords, zhuyinOverrides, schedule, forTone: diff === 6,
          count: plan?.count, focus: plan?.focus,
          maxSymbols: diff === 5 ? maxSymbolsFor(currentUser?.wordStats) : undefined,
        });
        if (!newItems) {
          alert("這裡的字太少囉，至少要有 4 個不同的字才能玩！");
          return;
        }
      } else {
        newItems = await generateLevelData(diff, sourceWords, customImages, gameMode, zhuyinOverrides, schedule, plan ? { count: plan.count, ordered: true } : undefined);
      }
      roundTallyRef.current = { onOwn: 0, total: 0 };
      currentWordsRef.current = newItems;
      setCurrentWords(newItems);
      setGameState(GameState.PLAYING);

      // Async background generation for images that were not fast-loaded (zhuyin rounds use emoji pictures)
      newItems.forEach((item) => {
         if (gameMode === 'word' && diff <= 4 && !item.imageUrl && item.character.length <= 6) {
             generateImageForWord(item.character).then(url => {
                 if (url) {
                    setCurrentWords(prev => prev.map(w => w.id === item.id ? { ...w, imageUrl: url } : w));
                 }
             });
         }
      });
    } catch (e) {
      console.error(e);
      alert("產生題目時發生錯誤，請稍後再試！");
    } finally {
      setIsGenerating(false);
    }
  };

  /** Every 10 characters and zhuyin symbols learned earn one free family card (on top of buying with points). */
  const milestonesAvailable = (user: UserProfile) => Math.floor(masteredCount(user.wordStats) / MILESTONE_SIZE) - (user.milestoneClaims || 0);

  const claimMilestone = (card: RewardCard) => {
    if (!currentUser || milestonesAvailable(currentUser) <= 0) return;
    updateUserProfile(currentUser.id, {
      ownedCardIds: [...currentUser.ownedCardIds, card.id],
      milestoneClaims: (currentUser.milestoneClaims || 0) + 1,
    });
    playSound('magic');
    celebrate(`送你「${card.title}」！`);
  };

  // --- 課文循環 ---

  /** 課文尋寶 from the lesson page: up to three lesson words found in the text, longer words more likely. */
  const startLessonFind = () => {
    if (!activeLesson) return;
    const words = wordsInText(activeLesson.content, activeLesson.vocabulary)
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => [...b].length - [...a].length)
      .slice(0, 5)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    if (!words.length) {
      alert('課文裡找不到生字表的字，先到課文管理加入生字吧！');
      return;
    }
    setLessonLoop({ mode: 'find', targets: words, fromPath: false });
    setGameState(GameState.LESSON_LOOP);
  };

  const handleLessonLoopDone = (results: { word: string; helpLevel: number }[]) => {
    // Finding a word in the lesson is recognising it, so it counts for review like the games
    if (lessonLoop?.fromPath) pathRoundRef.current = true; // So words learned here show in today's results
    // Only words already practised count for review; the others were just found with the help of their sound
    results.forEach(r => {
      const key = statKey('word', r.word);
      rewardAnswer(key, r.word, r.helpLevel, !!usersRef.current.find(u => u.id === currentUser?.id)?.wordStats?.[key]);
    });
    const tally = { onOwn: results.filter(r => r.helpLevel === 0).length, total: results.length };
    if (lessonLoop?.fromPath) {
      pathRoundRef.current = false;
      finishStation(tally);
      return;
    }
    if (results.length) {
      playSound('cheer');
      celebrate(`課文尋寶完成！自己找到 ${tally.onOwn} 個`);
    }
    setGameState(GameState.LESSON_INTRO);
  };

  const purchaseCard = (card: RewardCard) => {
    if (!currentUser) return;
    if (currentUser.points >= card.cost) {
      updateUserProfile(currentUser.id, {
        points: currentUser.points - card.cost,
        ownedCardIds: [...currentUser.ownedCardIds, card.id]
      });
      playSound('success');
    } else {
      playSound('error');
    }
  };

  // --- RENDER ---

  if (isGenerating) return <LoadingView />;

  return (
    <>
      {renderScreen()}
      <BrowserNotice />
      {celebration && (
        <div key={celebration.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-pop">
          <div className="bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-900 px-8 py-4 rounded-3xl shadow-2xl border-4 border-white flex items-center gap-3 whitespace-nowrap">
            <span className="text-4xl animate-spin-slow">🌟</span>
            <span className="text-2xl md:text-3xl font-black">{celebration.text}</span>
          </div>
        </div>
      )}
    </>
  );

  function renderScreen() {
  switch (gameState) {
    case GameState.LOGIN:
      return (
        <LoginView 
          users={users} 
          onLogin={(u) => { setCurrentUser(u); setGameState(GameState.MENU); }} 
          onCreateUser={createUser}
          onDeleteUser={deleteUser}
        />
      );

    case GameState.MENU:
      return currentUser ? (
        <MenuView 
          currentUser={currentUser}
          currentVocabulary={[]} // Not used anymore
          activeLesson={activeLesson}
          onStart={() => {
            setGameMode('word');
            if (!activeLesson) setActiveLesson(null);
            setGameState(GameState.DIFFICULTY_SELECT);
          }}
          onZhuyinMode={() => {
            setGameMode('zhuyin');
            setActiveLesson(null);
            setGameState(GameState.ZHUYIN_INTRO);
          }}
          onEnglishMode={() => setGameState(GameState.ENGLISH_HUB)}
          reviewCount={reviewWords(currentUser.wordStats).filter(w => lessons.some(l => l.vocabulary.includes(w))).length}
          masteredCount={masteredCount(currentUser.wordStats)}
          onReviewMode={() => {
            setGameMode('word');
            setReviewMode(true);
            setGameState(GameState.DIFFICULTY_SELECT);
          }}
          lessonProgress={activeLesson ? currentUser.zhuyinProgress?.[activeLesson.id] || [] : []}
          onLessonMode={() => {
            setGameMode('word');
            setGameState(GameState.LESSON_SELECT);
          }}
          onReviewLesson={() => setGameState(GameState.LESSON_INTRO)}
          onExitLesson={() => setActiveLesson(null)}
          onShop={() => {
            setImageLoadErrors({});
            setImageRefreshVersion(v => v + 1);
            setGameState(GameState.SHOP);
          }}
          onLeaderboard={() => setGameState(GameState.LEADERBOARD)}
          onParentReport={() => setGameState(GameState.PARENT_REPORT)}
          milestonesAvailable={milestonesAvailable(currentUser)}
          onSettings={() => {}} // Disabled
          onLogout={() => { setCurrentUser(null); setGameState(GameState.LOGIN); }}
          onUpdateUser={updateUserProfile}
          isGenerating={isGenerating}
        />
      ) : null;

    case GameState.LESSON_SELECT:
      return (
        <LessonManagerView
           lessons={lessons}
           progress={currentUser?.zhuyinProgress}
           onSelectLesson={(lesson) => {
              setActiveLesson(lesson);
              setGameState(GameState.LESSON_INTRO);
           }}
           onUpdateLessons={setLessons}
           onBack={() => setGameState(GameState.MENU)}
        />
      );

    case GameState.LESSON_INTRO:
      if (!activeLesson) return null;
      return (
        <LessonIntroView 
           lesson={activeLesson}
           onStartGame={() => setGameState(GameState.DIFFICULTY_SELECT)}
           onBack={() => setGameState(GameState.MENU)} // Back to Menu (Lesson Dashboard)
           onFindWords={startLessonFind}
        />
      );

    case GameState.LESSON_LOOP:
      if (!currentUser || !activeLesson || !lessonLoop) return null;
      return (
        <LessonLoopView
          key={`${lessonLoop.mode}-${lessonLoop.targets.join()}`}
          currentUser={currentUser}
          lesson={activeLesson}
          mode={lessonLoop.mode}
          targets={lessonLoop.targets}
          onDone={handleLessonLoopDone}
          onMistake={word => recordWrongAnswer(statKey('word', word), undefined, false)}
          onBack={() => setGameState(lessonLoop.fromPath ? GameState.DAILY_PATH : GameState.LESSON_INTRO)}
          backLabel={lessonLoop.fromPath ? '冒險地圖' : '回課文'}
        />
      );

    case GameState.PARENT_REPORT:
      if (!currentUser) return null;
      return <ParentReportView currentUser={currentUser} lessons={lessons} activeLesson={activeLesson} onBack={() => setGameState(GameState.MENU)} />;

    case GameState.ZHUYIN_INTRO:
      return (
        <ZhuyinIntroView 
           onStartGame={() => setGameState(GameState.DIFFICULTY_SELECT)}
           onBack={() => setGameState(GameState.MENU)}
        />
      );

    case GameState.DIFFICULTY_SELECT:
      return (
        <DifficultySelectView
          onSelect={(diff) => { setCurrentDifficulty(diff); startNewLevel(diff); }}
          onBack={() => {
            if (gameMode === 'zhuyin') {
              setGameState(GameState.ZHUYIN_INTRO);
            } else {
              setReviewMode(false);
              setGameState(activeLesson && !reviewMode ? GameState.LESSON_INTRO : GameState.MENU);
            }
          }}
          activeLesson={reviewMode ? null : activeLesson}
          gameMode={gameMode}
          reviewMode={reviewMode}
          completedLevels={progressKey ? currentUser?.zhuyinProgress?.[progressKey] || [] : []}
          onDailyPath={startDailyPath}
          dailyDone={currentUser?.lastDailyPath === todayKey()}
        />
      );

    case GameState.DAILY_PATH:
      if (!currentUser || !dailyPath) return null;
      return (
        <DailyPathView
          path={dailyPath}
          currentUser={currentUser}
          onStart={launchStation}
          onHome={() => setGameState(dailyPath.language === 'en' ? GameState.ENGLISH_HUB : GameState.MENU)}
          optionInfo={dailyPath.language === 'en' ? englishOptionInfo : undefined}
        />
      );

    case GameState.LEARN_NEW:
      if (!currentUser || !dailyPath) return null;
      return (
        <LearnNewView
          currentUser={currentUser}
          cards={learnCards}
          gameMode={dailyPath.gameMode}
          onDone={handleLearnDone}
          onBack={() => setGameState(GameState.DAILY_PATH)}
        />
      );

    case GameState.PLAYING: {
      if (!currentUser) return null;
      // In 今日冒險, leaving a round goes back to the map and 'another set' replays the same station
      const goHome = () => {
        if (pathRoundRef.current) {
          pathRoundRef.current = false;
          setGameState(GameState.DAILY_PATH);
          return;
        }
        setReviewMode(false);
        setGameState(GameState.MENU);
      };
      const refresh = () => (pathRoundRef.current ? launchStation(currentDifficulty) : startNewLevel());
      const stats = currentUser.wordStats;
      const writeStage = (character: string) => Math.min(3, skillCount(stats, statKey(gameMode, character), 'write'));
      const blendFirst = (character: string) => skillCount(stats, statKey(gameMode, character), 'spell') === 0;
      const toneSupport = toneSupportNeeded(stats);
      if (currentDifficulty === 5 || currentDifficulty === 6) {
        const Practice = currentDifficulty === 5 ? SyllableSpellGameView : ToneGameView;
        return (
          <Practice
            currentUser={currentUser}
            currentWords={currentWords}
            gameMode={gameMode}
            onMatch={handleCorrectMatch}
            onMistake={handleMistake}
            onHome={goHome}
            onRefresh={refresh}
            blendFirst={blendFirst}
            toneSupport={toneSupport}
          />
        );
      }
      if (currentDifficulty === 8) {
        return (
          <RadicalGameView
            currentUser={currentUser}
            currentWords={currentWords}
            questions={radicalQuestions}
            onMatch={handleCorrectMatch}
            onMistake={id => handleMistake(id)}
            onHome={goHome}
            onRefresh={refresh}
          />
        );
      }
      if (currentDifficulty === 7) {
        return (
          <WordFamilyGameView
            currentUser={currentUser}
            currentWords={currentWords}
            questions={familyQuestions}
            onMatch={handleCorrectMatch}
            onMistake={id => handleMistake(id)}
            onHome={goHome}
            onRefresh={refresh}
          />
        );
      }
      if (currentDifficulty === 4) {
        return (
          <SpeakingGameView
            currentUser={currentUser}
            currentWords={currentWords}
            onMatch={handleCorrectMatch}
            onHome={goHome}
            onRefresh={refresh}
            gameMode={gameMode}
          />
        );
      }
      return (
        <GameView
          currentUser={currentUser}
          currentDifficulty={currentDifficulty}
          currentWords={currentWords}
          onMatch={handleCorrectMatch}
          onMistake={handleMistake}
          onHome={goHome}
          onRefresh={refresh}
          gameMode={gameMode}
          writeStage={writeStage}
        />
      );
    }

    case GameState.SHOP:
      if (!currentUser) return null;
      return (
        <ShopView 
          currentUser={currentUser}
          rewardImages={rewardImages}
          imageRefreshVersion={imageRefreshVersion}
          imageLoadErrors={imageLoadErrors}
          onBack={() => setGameState(GameState.MENU)}
          onPurchase={purchaseCard}
          masteredCount={masteredCount(currentUser.wordStats)}
          milestonesAvailable={milestonesAvailable(currentUser)}
          onClaimMilestone={claimMilestone}
          onUpdateUser={updateUserProfile}
          onFileUpload={handleFileUpload}
          onImageError={handleImageError}
        />
      );

    case GameState.LEADERBOARD:
      return <LeaderboardView users={users} onBack={() => setGameState(GameState.MENU)} />;

    case GameState.VICTORY:
      if (victorySource === 'english') {
        return (
          <VictoryView
            onHome={goToEnglishHub}
            onReplay={() => startEnglishRound(englishLevel)}
          />
        );
      }
      return (
        <VictoryView
          onHome={() => { setReviewMode(false); setGameState(GameState.MENU); }}
          onReplay={() => startNewLevel()}
        />
      );

    case GameState.ENGLISH_HUB:
      if (!currentUser) return null;
      return (
        <EnglishHubView
          currentUser={currentUser}
          customUnits={customEnglishUnits}
          onBack={() => setGameState(GameState.MENU)}
          onOpenUnit={openEnglishUnit}
          onDailyPath={startEnglishDailyPath}
          dailyDone={currentUser.lastEnglishPath === todayKey()}
          onAlphabet={() => setGameState(GameState.ENGLISH_ALPHABET)}
          onManageCustom={() => setGameState(GameState.ENGLISH_MANAGER)}
        />
      );

    case GameState.ENGLISH_ALPHABET:
      return <AlphabetChartView onBack={goToEnglishHub} />;

    case GameState.ENGLISH_MANAGER:
      return (
        <EnglishUnitManagerView
          units={customEnglishUnits}
          onSaveUnits={setCustomEnglishUnits}
          onBack={goToEnglishHub}
        />
      );

    case GameState.ENGLISH_UNIT_INTRO:
      if (!activeEnglishUnit) return null;
      return (
        <EnglishUnitIntroView
          unit={activeEnglishUnit}
          onBack={goToEnglishHub}
          onStartGame={() => setGameState(GameState.ENGLISH_LEVEL_SELECT)}
          onFindWords={englishSentenceWords(activeEnglishUnit, (activeEnglishUnit.words || []).map(w => w.word)).length ? startEnglishSentenceFind : undefined}
        />
      );

    case GameState.ENGLISH_LEARN:
      if (!currentUser) return null;
      return (
        <EnglishLearnView
          currentUser={currentUser}
          cards={englishLearnCards}
          onDone={handleEnglishLearnDone}
          onBack={() => setGameState(GameState.DAILY_PATH)}
        />
      );

    case GameState.ENGLISH_SENTENCES:
      if (!currentUser || !englishLoop) return null;
      return (
        <EnglishSentenceLoopView
          key={`${englishLoop.mode}-${englishLoop.targets.join()}`}
          currentUser={currentUser}
          unit={englishLoop.unit}
          mode={englishLoop.mode}
          targets={englishLoop.targets}
          onDone={handleEnglishLoopDone}
          onMistake={word => recordWrongAnswer(englishStatKey({ kind: 'word', text: word }), undefined, false)}
          onBack={() => setGameState(englishLoop.fromPath ? GameState.DAILY_PATH : GameState.ENGLISH_UNIT_INTRO)}
          backLabel={englishLoop.fromPath ? '冒險地圖' : '回單元'}
        />
      );

    case GameState.ENGLISH_LEVEL_SELECT:
      if (!activeEnglishUnit || !currentUser) return null;
      return (
        <EnglishLevelSelectView
          unit={activeEnglishUnit}
          completedLevels={currentUser.englishProgress?.[activeEnglishUnit.id] || []}
          onSelect={startEnglishRound}
          onBack={() => setGameState(activeEnglishUnit.stage === 0 ? GameState.ENGLISH_HUB : GameState.ENGLISH_UNIT_INTRO)}
        />
      );

    case GameState.ENGLISH_PLAYING: {
      if (!currentUser || !activeEnglishUnit) return null;
      // In 今日英文冒險, leaving a round goes back to the map and 'another set' replays the same station
      const inPath = pathRoundRef.current;
      const commonProps = {
        currentUser,
        items: englishItems,
        onMatch: handleEnglishMatch,
        onHome: inPath ? () => { pathRoundRef.current = false; stopEnglishSpeech(); setGameState(GameState.DAILY_PATH); } : goToEnglishHub,
        onRefresh: inPath ? () => launchStation(englishLevel) : () => startEnglishRound(englishLevel),
      };
      const stats = currentUser.wordStats;
      if (englishLevel === 5) {
        return <EnglishFamilyGameView {...commonProps} questions={rhymeQuestions} onMistake={id => handleEnglishMistake(id)} />;
      }
      if (englishLevel === 3) {
        return activeEnglishUnit.kind === 'letters'
          ? <EnglishTraceGameView
              {...commonProps}
              writeStage={item => Math.min(3, skillCount(stats, englishStatKey(item), item.traceCase === 'upper' ? 'writeUpper' : 'write'))}
            />
          : <EnglishSpellGameView
              {...commonProps}
              onMistake={handleEnglishMistake}
              blendFirst={word => skillCount(stats, englishStatKey({ kind: 'word', text: word }), 'spell') === 0}
            />;
      }
      if (englishLevel === 4) {
        return <EnglishSpeakGameView {...commonProps} />;
      }
      return <EnglishMatchGameView {...commonProps} onMistake={handleEnglishMistake} unit={activeEnglishUnit} level={englishLevel as 1 | 2} />;
    }

    default:
      return null;
  }
  }
}
