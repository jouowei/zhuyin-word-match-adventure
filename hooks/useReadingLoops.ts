import { useState } from 'react';
import { EnglishUnit, GameState, Lesson } from '../types';
import { englishStatKey, statKey } from '../services/learningStats';
import { englishSentenceWords } from '../services/englishPath';
import { lessonFindWords } from '../services/wordSources';
import { tallyOf } from '../services/answers';
import { playSound } from '../utils/sound';
import { Answers } from './useAnswers';
import { Screen } from './useScreen';
import { PathLink } from './pathLink';

type LoopMode = 'listen' | 'find';
export interface LoopResult { word: string; helpLevel: number }

/**
 * Back to the text: 聽課文 and 課文尋寶 for a lesson, 聽句子 and 句子尋寶 for an English unit.
 * Opened from the lesson or unit page, or as a 今日冒險 station.
 */
export const useReadingLoops = ({ screen, answers, celebrate, path }: {
  screen: Screen;
  answers: Answers;
  celebrate: (text: string) => void;
  path: PathLink;
}) => {
  const [lessonLoop, setLessonLoop] = useState<{ mode: LoopMode; targets: string[]; fromPath: boolean } | null>(null);
  const [englishLoop, setEnglishLoop] = useState<{ mode: LoopMode; targets: string[]; fromPath: boolean; unit: EnglishUnit } | null>(null);

  const openLesson = (mode: LoopMode, targets: string[], fromPath: boolean) => {
    setLessonLoop({ mode, targets, fromPath });
    screen.goTo(GameState.LESSON_LOOP);
  };

  const openEnglish = (unit: EnglishUnit, mode: LoopMode, targets: string[], fromPath: boolean) => {
    setEnglishLoop({ mode, targets, fromPath, unit });
    screen.goTo(GameState.ENGLISH_SENTENCES);
  };

  /**
   * Finding a word in the text is recognising it, so it counts like the games. Only words already practised count
   * for review; the others were just found with the help of their sound.
   */
  const finish = (results: LoopResult[], keyOf: (word: string) => string, fromPath: boolean, doneText: string, back: GameState) => {
    results.forEach(r => {
      const key = keyOf(r.word);
      answers.rewardAnswer({ key, label: r.word, helpLevel: r.helpLevel, tracksMemory: answers.practised(key), inPath: fromPath });
    });
    const tally = tallyOf(results.map(r => r.helpLevel));
    if (fromPath) {
      path.finish(tally);
      return;
    }
    if (results.length) {
      playSound('cheer');
      celebrate(`${doneText}！自己找到 ${tally.onOwn} 個`);
    }
    screen.goTo(back);
  };

  return {
    lessonLoop,
    englishLoop,
    openLesson,
    openEnglish,
    /** 課文尋寶 from the lesson page. */
    startLessonFind: (lesson: Lesson) => {
      const words = lessonFindWords(lesson);
      if (!words.length) {
        alert('課文裡找不到生字表的字，先到課文管理加入生字吧！');
        return;
      }
      openLesson('find', words, false);
    },
    /** 句子尋寶 from the unit page: up to three of the unit's words that appear in its sentences. */
    startEnglishFind: (unit: EnglishUnit) => {
      const words = englishSentenceWords(unit, (unit.words || []).map(w => w.word))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      if (words.length) openEnglish(unit, 'find', words, false);
    },
    lessonLoopDone: (results: LoopResult[]) =>
      finish(results, word => statKey('word', word), !!lessonLoop?.fromPath, '課文尋寶完成', GameState.LESSON_INTRO),
    englishLoopDone: (results: LoopResult[]) =>
      finish(results, word => englishStatKey({ kind: 'word', text: word }), !!englishLoop?.fromPath, '句子尋寶完成', GameState.ENGLISH_UNIT_INTRO),
  };
};

export type ReadingLoops = ReturnType<typeof useReadingLoops>;
