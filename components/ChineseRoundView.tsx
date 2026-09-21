import React from 'react';
import { Confusion, UserProfile, WordItem } from '../types';
import { FamilyQuestion } from '../services/wordFamilies';
import { RadicalQuestion } from '../services/radicals';
import { skillCount, statKey } from '../services/learningStats';
import { toneSupportNeeded } from '../services/dailyPath';
import { GameView } from './GameView';
import { SpeakingGameView } from './SpeakingGameView';
import { SyllableSpellGameView } from './SyllableSpellGameView';
import { ToneGameView } from './ToneGameView';
import { WordFamilyGameView } from './WordFamilyGameView';
import { RadicalGameView } from './RadicalGameView';

interface ChineseRoundViewProps {
  currentUser: UserProfile;
  level: number;
  gameMode: 'word' | 'zhuyin';
  words: WordItem[];
  familyQuestions: FamilyQuestion[];
  radicalQuestions: RadicalQuestion[];
  onMatch: (id: string, helpLevel: number) => void;
  onAskAgain: (id: string) => boolean;
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
}

/** The game for a Chinese level, with support that fades as the child's skills grow. */
export const ChineseRoundView: React.FC<ChineseRoundViewProps> = ({
  currentUser, level, gameMode, words, familyQuestions, radicalQuestions, onMatch, onAskAgain, onMistake, onHome, onRefresh,
}) => {
  const stats = currentUser.wordStats;
  const common = { currentUser, currentWords: words, onMatch, onAskAgain, onHome, onRefresh };

  if (level === 5 || level === 6) {
    const Practice = level === 5 ? SyllableSpellGameView : ToneGameView;
    return (
      <Practice
        {...common}
        gameMode={gameMode}
        onMistake={onMistake}
        blendFirst={character => skillCount(stats, statKey(gameMode, character), 'spell') === 0}
        toneSupport={toneSupportNeeded(stats)}
      />
    );
  }
  if (level === 8) return <RadicalGameView {...common} questions={radicalQuestions} onMistake={id => onMistake(id)} />;
  if (level === 7) return <WordFamilyGameView {...common} questions={familyQuestions} onMistake={id => onMistake(id)} />;
  if (level === 4) return <SpeakingGameView {...common} gameMode={gameMode} />;
  return (
    <GameView
      {...common}
      currentDifficulty={level}
      gameMode={gameMode}
      onMistake={onMistake}
      writeStage={character => Math.min(3, skillCount(stats, statKey(gameMode, character), 'write'))}
    />
  );
};
