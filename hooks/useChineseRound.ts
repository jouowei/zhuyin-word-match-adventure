import { useRef, useState } from 'react';
import { Confusion, GameState, WordItem } from '../types';
import { INITIAL_WORD_SET } from '../constants';
import { generateImageForWord, generateLevelData } from '../services/geminiService';
import { buildFamilyRound, FamilyQuestion } from '../services/wordFamilies';
import { buildRadicalRound, RadicalQuestion } from '../services/radicals';
import { buildSyllableRound } from '../services/zhuyinPractice';
import { maxSymbolsFor } from '../services/dailyPath';
import { addCompletedLevel, reviewSchedule, statKey } from '../services/learningStats';
import { addToTally, chineseLevelRules, EMPTY_TALLY } from '../services/answers';
import { progressKeyFor, roundSource, studyFor } from '../services/wordSources';
import { playSound } from '../utils/sound';
import { Family } from './useFamilyData';
import { Answers } from './useAnswers';
import { Screen } from './useScreen';
import { PathLink } from './pathLink';

/** After the last answer of a round: time to hear the word and the praise and see the stars before moving on. */
export const ROUND_END_PAUSE = 2000;

/** A 今日冒險 round: planned words (most important first), which ones must be in, and how many items. */
export interface RoundPlan { words: string[]; focus: string[]; count: number; }

/**
 * The Chinese games (levels 1–8) with what a parent chose for the child (the zhuyin symbols, a lesson or every lesson)
 * or with the words due for review (複習時間), played in the 遊樂場 or as a 今日冒險 station.
 */
export const useChineseRound = ({ family, screen, answers, path, onVictory }: {
  family: Family;
  screen: Screen;
  answers: Answers;
  path: PathLink;
  onVictory: () => void;
}) => {
  const [reviewMode, setReviewMode] = useState(false); // 複習時間 rounds use the words due for review from every lesson
  const [level, setLevel] = useState(1);
  const [words, setWords] = useState<WordItem[]>(INITIAL_WORD_SET);
  const [familyQuestions, setFamilyQuestions] = useState<FamilyQuestion[]>([]);   // 字的家族 round
  const [radicalQuestions, setRadicalQuestions] = useState<RadicalQuestion[]>([]); // 部件偵探 round
  // Latest round for callbacks fired from timers inside game views
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const fromPath = useRef(false); // The round being played is a 今日冒險 station
  const tally = useRef(EMPTY_TALLY);

  const { currentUser, lessons } = family;
  const focus = studyFor(currentUser?.studyFocus, lessons);
  const { activeLesson } = focus;
  const modeFor = (review: boolean) => (review ? 'word' : focus.gameMode); // Review is for lesson words
  const gameMode = modeFor(reviewMode);
  const progressKey = progressKeyFor({ gameMode, activeLesson }, reviewMode);

  /** `plan`: a 今日冒險 round with its own words and size. */
  const start = async (newLevel = level, plan?: RoundPlan) => {
    fromPath.current = !!plan;
    setLevel(newLevel);
    const stats = currentUser?.wordStats;
    // 今日冒險 rounds are never review rounds, even when started right after one
    const review = !plan && reviewMode;
    const gameMode = modeFor(review);
    const { words: available, customImages, zhuyinOverrides } = roundSource({ gameMode, activeLesson, lessons, reviewMode: review, stats });
    const sourceWords = plan ? plan.words : available;
    if (sourceWords.length < 4) {
      alert("目前課文裡的生字太少囉！請爸爸媽媽到「家長專區」新增課文和生字（至少 4 個）才能開始遊戲。");
      return;
    }

    screen.setBusy(true);
    try {
      const schedule = reviewSchedule(stats);
      let items: WordItem[] | null;
      if (newLevel === 7) {
        // 字的家族: one question per family character
        const questions = await buildFamilyRound({ vocabulary: sourceWords, stats, count: plan?.count ?? 3 });
        setFamilyQuestions(questions);
        items = questions.map(q => q.item);
      } else if (newLevel === 8) {
        // 部件偵探: one question per component, families of characters the child knows first
        const questions = await buildRadicalRound({ vocabulary: sourceWords, stats, count: plan?.count ?? 3 });
        setRadicalQuestions(questions);
        items = questions.map(q => q.item);
      } else if (newLevel === 5 || newLevel === 6) {
        // 拼音高手 / 聲調偵探 work on single syllables
        items = await buildSyllableRound({
          gameMode, vocabulary: sourceWords, zhuyinOverrides, schedule, forTone: newLevel === 6,
          count: plan?.count, focus: plan?.focus,
          maxSymbols: newLevel === 5 ? maxSymbolsFor(stats) : undefined,
        });
        if (!items) {
          alert("這裡的字太少囉，至少要有 4 個不同的字才能玩！");
          return;
        }
      } else {
        items = await generateLevelData(newLevel, sourceWords, customImages, gameMode, zhuyinOverrides, schedule, plan ? { count: plan.count, ordered: true } : undefined);
      }
      tally.current = EMPTY_TALLY;
      wordsRef.current = items;
      setWords(items);
      screen.goTo(GameState.PLAYING);

      // Pictures that weren't ready are made in the background (zhuyin rounds use emoji pictures)
      items.forEach(item => {
        if (gameMode === 'word' && newLevel <= 4 && !item.imageUrl && item.character.length <= 6) {
          generateImageForWord(item.character).then(url => {
            if (url) setWords(prev => prev.map(w => (w.id === item.id ? { ...w, imageUrl: url } : w)));
          });
        }
      });
    } catch (e) {
      console.error(e);
      alert("產生題目時發生錯誤，請稍後再試！");
    } finally {
      screen.setBusy(false);
    }
  };

  const onMatch = (id: string, helpLevel = 0) => {
    // Game views call this from timers, so always work from the latest round
    const target = wordsRef.current.find(item => item.id === id);
    if (!target || target.matched || !screen.showing(GameState.PLAYING)) return;
    const updated = wordsRef.current.map(item => (item.id === id ? { ...item, matched: true } : item));
    wordsRef.current = updated;
    setWords(updated);

    const roundComplete = updated.every(w => w.matched);
    const { tracksMemory, skill } = chineseLevelRules(level);
    answers.rewardAnswer({
      key: statKey(gameMode, target.character), label: target.character, helpLevel, tracksMemory, skill, inPath: fromPath.current,
      extra: u => ({
        zhuyinProgress: roundComplete && progressKey ? addCompletedLevel(u.zhuyinProgress, progressKey, level) : u.zhuyinProgress,
      }),
    });
    tally.current = addToTally(tally.current, helpLevel);

    if (roundComplete) {
      setTimeout(() => {
        if (!screen.showing(GameState.PLAYING)) return;
        playSound('cheer');
        if (fromPath.current) {
          fromPath.current = false;
          path.finish(tally.current);
          return;
        }
        onVictory();
      }, ROUND_END_PAUSE);
    }
  };

  // A wrong answer brings the word back soon (spaced review box 0)
  const onMistake = (id: string, confusion?: Confusion) => {
    const target = wordsRef.current.find(item => item.id === id);
    if (target) answers.recordMistake(statKey(gameMode, target.character), confusion, chineseLevelRules(level).mistakesTrackMemory);
  };

  return {
    gameMode,
    activeLesson,
    reviewMode, setReviewMode,
    progressKey,
    level, words, familyQuestions, radicalQuestions,
    start,
    /** A 今日冒險 station's round. */
    startStation: (newLevel: number, plan: RoundPlan) => {
      setReviewMode(false);
      start(newLevel, plan);
    },
    onMatch,
    onMistake,
    /** Leaving a round: back to the adventure map in 今日冒險, else to the 遊樂場. */
    leave: () => {
      if (fromPath.current) {
        fromPath.current = false;
        screen.goTo(GameState.DAILY_PATH);
        return;
      }
      setReviewMode(false);
      screen.goTo(GameState.PLAYGROUND);
    },
    /** 再玩一組: the same station again in 今日冒險, else a new round of the same level. */
    again: () => (fromPath.current ? path.replay(level) : start()),
  };
};

export type ChineseRound = ReturnType<typeof useChineseRound>;
