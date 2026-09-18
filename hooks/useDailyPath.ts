import { useRef, useState } from 'react';
import { EnglishRoundItem, GameState } from '../types';
import {
  buildDailyPath, chooseLevel, completeStation, DailyPath, roundSizeFor, Station, StationResult, unfinishedToday,
} from '../services/dailyPath';
import {
  buildEnglishDailyPath, EnglishLearnCard, englishLevelInfo, englishStationLearnCards, pathUnit,
} from '../services/englishPath';
import { buildLearnCards, LearnCard } from '../services/learnItems';
import { englishStatKey, statKey } from '../services/learningStats';
import { EMPTY_TALLY, tallyOf } from '../services/answers';
import { lessonAssets, pathSource } from '../services/wordSources';
import { Family } from './useFamilyData';
import { Answers } from './useAnswers';
import { Screen } from './useScreen';
import { ChineseRound } from './useChineseRound';
import { EnglishRound } from './useEnglishRound';
import { ReadingLoops } from './useReadingLoops';

/**
 * 今日冒險 and 今日英文冒險: today's stations, starting each one's round or activity and moving on when it ends.
 * The path is kept while the child leaves it, so it can be resumed today.
 */
export const useDailyPath = ({ family, screen, answers, chinese, english, loops }: {
  family: Family;
  screen: Screen;
  answers: Answers;
  chinese: ChineseRound;
  english: EnglishRound;
  loops: ReadingLoops;
}) => {
  const [dailyPath, setDailyPath] = useState<DailyPath | null>(null);
  const pathRef = useRef<DailyPath | null>(null); // Latest path for callbacks fired from timers
  const [learnCards, setLearnCards] = useState<LearnCard[]>([]);
  const [englishLearnCards, setEnglishLearnCards] = useState<EnglishLearnCard[]>([]);

  const { currentUser } = family;
  const study = { gameMode: chinese.gameMode, activeLesson: chinese.activeLesson, lessons: family.lessons };

  const setPath = (path: DailyPath | null) => {
    pathRef.current = path;
    setDailyPath(path);
  };

  /** 今日冒險 with the zhuyin symbols, the active lesson, or every lesson. */
  const start = async () => {
    if (!currentUser) return;
    const { pool, label } = pathSource(study);
    const existing = pathRef.current;
    if (unfinishedToday(existing) && existing.label === label && existing.gameMode === study.gameMode) {
      screen.goTo(GameState.DAILY_PATH);
      return;
    }
    if (pool.length < 4) {
      alert('這裡的字太少囉！至少要有 4 個字才能開始今日冒險。');
      return;
    }
    screen.setBusy(true);
    try {
      setPath(await buildDailyPath({
        gameMode: study.gameMode, label, pool, stats: currentUser.wordStats, points: currentUser.points,
        lessonContent: study.gameMode === 'word' && study.activeLesson ? study.activeLesson.content : undefined,
      }));
      screen.goTo(GameState.DAILY_PATH);
    } catch (e) {
      console.error(e);
      alert('準備冒險時發生錯誤，請稍後再試！');
    } finally {
      screen.setBusy(false);
    }
  };

  const startEnglish = () => {
    if (!currentUser) return;
    const existing = pathRef.current;
    if (!(unfinishedToday(existing) && existing.language === 'en')) {
      setPath(buildEnglishDailyPath({ stats: currentUser.wordStats, points: currentUser.points }));
    }
    screen.goTo(GameState.DAILY_PATH);
  };

  const finishStation = (result: StationResult) => {
    const path = pathRef.current;
    if (!path) return;
    const { path: next, userChanges } = completeStation(path, result, currentUser);
    if (userChanges && currentUser) family.updateUser(currentUser.id, userChanges);
    setPath(next);
    screen.goTo(GameState.DAILY_PATH);
  };

  const launchEnglishStation = (path: DailyPath, station: Station, level?: number) => {
    const unit = english.allUnits.find(u => u.id === path.unitId);
    if (!unit || !currentUser) {
      finishStation(EMPTY_TALLY);
      return;
    }
    if (station.kind === 'story' || station.kind === 'find') {
      english.setActiveUnit(unit);
      loops.openEnglish(unit, station.kind === 'story' ? 'listen' : 'find', station.words, true);
      return;
    }
    if (station.kind === 'learn') {
      const cards = englishStationLearnCards(station, unit, currentUser.wordStats);
      if (!cards.length) {
        finishStation(EMPTY_TALLY);
        return;
      }
      setEnglishLearnCards(cards);
      screen.goTo(GameState.ENGLISH_LEARN);
      return;
    }
    const chosen = level ?? station.options[0];
    setPath(chooseLevel(path, chosen));
    // The warm-up mixes items from different units, so it doesn't count towards a unit's stars
    const roundUnit = pathUnit(station, unit, station.kind === 'warmup' ? 'path-warmup' : unit.id);
    const available = (roundUnit.kind === 'letters' ? roundUnit.letters : roundUnit.words)?.length || 0;
    english.start(chosen, { unit: roundUnit, count: Math.min(roundSizeFor(path, chosen), available) });
  };

  /** Starts the current station; `level` is the game the child picked (or the same one again). */
  const launchStation = async (level?: number) => {
    const path = pathRef.current;
    if (!path || !currentUser) return;
    const station = path.stations[path.current];
    if (!station || station.kind === 'summary') return;
    if (path.language === 'en') {
      launchEnglishStation(path, station, level);
      return;
    }

    if (station.kind === 'story' || station.kind === 'find') {
      if (!study.activeLesson) {
        finishStation(EMPTY_TALLY);
        return;
      }
      loops.openLesson(station.kind === 'story' ? 'listen' : 'find', station.words, true);
      return;
    }

    if (station.kind === 'learn') {
      screen.setBusy(true);
      try {
        const { pool, context } = pathSource(study);
        const known = pool.filter(item => (currentUser.wordStats?.[statKey(path.gameMode, item)]?.box ?? 0) >= 1);
        const cards = await buildLearnCards({
          gameMode: path.gameMode, newItems: station.words, candidates: [...known, ...pool], context, ...lessonAssets(study),
        });
        if (!cards.length) {
          finishStation(EMPTY_TALLY);
          return;
        }
        setLearnCards(cards);
        screen.goTo(GameState.LEARN_NEW);
      } catch (e) {
        console.error(e);
        alert('準備新朋友時發生錯誤，請稍後再試！');
      } finally {
        screen.setBusy(false);
      }
      return;
    }

    const chosen = level ?? station.options[0];
    setPath(chooseLevel(path, chosen));
    chinese.startStation(chosen, { words: station.words, focus: station.focus, count: roundSizeFor(path, chosen) });
  };

  return {
    dailyPath,
    learnCards,
    englishLearnCards,
    start,
    startEnglish,
    launchStation,
    finishStation,
    /** Learned during one of today's rounds: shown in today's results. */
    noteMastered: (label: string) => {
      const path = pathRef.current;
      if (path) setPath({ ...path, masteredToday: [...path.masteredToday, label] });
    },
    /** 認識新朋友 done: the new items come back for practice later today. */
    learnDone: (results: { character: string; helped: boolean }[]) => {
      const path = pathRef.current;
      if (!path || !currentUser) return;
      answers.recordIntroduced(results.map(r => statKey(path.gameMode, r.character)));
      finishStation(tallyOf(results.map(r => (r.helped ? 1 : 0))));
    },
    englishLearnDone: (results: { item: EnglishRoundItem; helped: boolean }[]) => {
      if (!currentUser) return;
      answers.recordIntroduced(results.map(r => englishStatKey(r.item)));
      finishStation(tallyOf(results.map(r => (r.helped ? 1 : 0))));
    },
    /** How the English games to choose from are shown on the map. */
    englishOptionInfo: (level: number, station: Station) =>
      englishLevelInfo(station.englishKind || english.allUnits.find(u => u.id === pathRef.current?.unitId)?.kind || 'words', level),
  };
};
