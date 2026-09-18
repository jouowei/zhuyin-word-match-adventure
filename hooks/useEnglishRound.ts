import { useRef, useState } from 'react';
import { Confusion, EnglishRoundItem, EnglishUnit, GameState } from '../types';
import { buildEnglishRound, ENGLISH_UNITS, ROUND_SIZE } from '../english/curriculum';
import { buildRhymeRound, RhymeQuestion } from '../english/families';
import { englishStatKey, reviewSchedule } from '../services/learningStats';
import { addToTally, EMPTY_TALLY, englishLevelRules } from '../services/answers';
import { stopEnglishSpeech } from '../utils/englishSpeech';
import { playSound } from '../utils/sound';
import { Family } from './useFamilyData';
import { Answers } from './useAnswers';
import { Screen } from './useScreen';
import { PathLink } from './pathLink';
import { ROUND_END_PAUSE } from './useChineseRound';

/** The English games (levels 1–5) for a unit, played on their own or as a 今日英文冒險 station. */
export const useEnglishRound = ({ family, screen, answers, path, onVictory }: {
  family: Family;
  screen: Screen;
  answers: Answers;
  path: PathLink;
  onVictory: () => void;
}) => {
  const [activeUnit, setActiveUnit] = useState<EnglishUnit | null>(null);
  const [level, setLevel] = useState(1);
  const [items, setItems] = useState<EnglishRoundItem[]>([]);
  const [rhymeQuestions, setRhymeQuestions] = useState<RhymeQuestion[]>([]); // 押韻家族 round
  // Latest round for callbacks fired from timers inside game views
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const fromPath = useRef(false); // The round being played is a 今日英文冒險 station
  const tally = useRef(EMPTY_TALLY);

  const goToHub = () => {
    stopEnglishSpeech();
    screen.goTo(GameState.ENGLISH_HUB);
  };

  /** `plan`: a 今日英文冒險 round with its own ordered unit and size. */
  const start = (newLevel: number, plan?: { unit: EnglishUnit; count: number }) => {
    const unit = plan?.unit ?? activeUnit;
    if (!unit) return;
    fromPath.current = !!plan;
    if (plan) setActiveUnit(plan.unit);
    let roundItems: EnglishRoundItem[] | null;
    if (newLevel === 5) {
      const questions = buildRhymeRound(unit, 3);
      setRhymeQuestions(questions || []);
      roundItems = questions ? questions.map(q => q.item) : null;
    } else {
      roundItems = buildEnglishRound(unit, newLevel, reviewSchedule(family.currentUser?.wordStats), plan?.count);
    }
    if (!roundItems) {
      alert(`這個單元的內容太少囉！至少需要 ${plan?.count ?? ROUND_SIZE} 個${unit.kind === 'letters' ? '字母' : '單字'}才能開始遊戲。`);
      return;
    }
    tally.current = EMPTY_TALLY;
    stopEnglishSpeech();
    setLevel(newLevel);
    setItems(roundItems);
    screen.goTo(GameState.ENGLISH_PLAYING);
  };

  const onMatch = (id: string, helpLevel = 0) => {
    if (!screen.showing(GameState.ENGLISH_PLAYING) || !family.currentUser || !activeUnit) return;
    const target = itemsRef.current.find(item => item.id === id);
    if (!target || target.matched) return;

    const updated = itemsRef.current.map(item => (item.id === id ? { ...item, matched: true } : item));
    itemsRef.current = updated;
    setItems(updated);

    const roundComplete = updated.every(item => item.matched);
    const unitId = activeUnit.id;
    const { tracksMemory, skill } = englishLevelRules(level, activeUnit.kind, target.traceCase);
    tally.current = addToTally(tally.current, helpLevel);

    answers.rewardAnswer({
      key: englishStatKey(target), label: target.text, helpLevel, tracksMemory, skill, inPath: fromPath.current,
      extra: u => {
        const englishProgress = { ...(u.englishProgress || {}) };
        // The 今日英文冒險 warm-up (path-warmup) mixes units, so it earns no unit stars
        if (roundComplete && !unitId.startsWith('path-')) {
          const levels = englishProgress[unitId] || [];
          if (!levels.includes(level)) englishProgress[unitId] = [...levels, level].sort((a, b) => a - b);
        }
        return { englishProgress };
      },
    });

    if (roundComplete) {
      setTimeout(() => {
        if (!screen.showing(GameState.ENGLISH_PLAYING)) return;
        playSound('cheer');
        stopEnglishSpeech();
        if (fromPath.current) {
          fromPath.current = false;
          path.finish(tally.current);
          return;
        }
        onVictory();
      }, ROUND_END_PAUSE);
    }
  };

  const onMistake = (id: string, confusion?: Confusion) => {
    const target = itemsRef.current.find(item => item.id === id);
    if (target && activeUnit) answers.recordMistake(englishStatKey(target), confusion, englishLevelRules(level, activeUnit.kind).mistakesTrackMemory);
  };

  return {
    allUnits: [...ENGLISH_UNITS, ...family.englishUnits],
    activeUnit, setActiveUnit,
    level, items, rhymeQuestions,
    goToHub,
    openUnit: (unit: EnglishUnit) => {
      setActiveUnit(unit);
      // Review units mix everything, so skip the learning page
      screen.goTo(unit.stage === 0 ? GameState.ENGLISH_LEVEL_SELECT : GameState.ENGLISH_UNIT_INTRO);
    },
    start,
    onMatch,
    onMistake,
    /** Leaving a round: back to the adventure map in 今日英文冒險, else to the English map. */
    leave: () => {
      if (fromPath.current) {
        fromPath.current = false;
        stopEnglishSpeech();
        screen.goTo(GameState.DAILY_PATH);
        return;
      }
      goToHub();
    },
    /** 再玩一組: the same station again in 今日英文冒險, else a new round of the same level. */
    again: () => (fromPath.current ? path.replay(level) : start(level)),
  };
};

export type EnglishRound = ReturnType<typeof useEnglishRound>;
