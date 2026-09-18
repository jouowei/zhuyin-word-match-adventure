import React from 'react';
import { Confusion, EnglishRoundItem, EnglishUnit, UserProfile } from '../../types';
import { RhymeQuestion } from '../../english/families';
import { englishStatKey, skillCount } from '../../services/learningStats';
import { EnglishFamilyGameView } from './EnglishFamilyGameView';
import { EnglishMatchGameView } from './EnglishMatchGameView';
import { EnglishSpeakGameView } from './EnglishSpeakGameView';
import { EnglishSpellGameView } from './EnglishSpellGameView';
import { EnglishTraceGameView } from './EnglishTraceGameView';

interface EnglishRoundViewProps {
  currentUser: UserProfile;
  unit: EnglishUnit;
  level: number;
  items: EnglishRoundItem[];
  rhymeQuestions: RhymeQuestion[];
  onMatch: (id: string, helpLevel: number) => void;
  onMistake: (id: string, confusion?: Confusion) => void;
  onHome: () => void;
  onRefresh: () => void;
}

/** The game for an English level, with support that fades as the child's skills grow. */
export const EnglishRoundView: React.FC<EnglishRoundViewProps> = ({
  currentUser, unit, level, items, rhymeQuestions, onMatch, onMistake, onHome, onRefresh,
}) => {
  const stats = currentUser.wordStats;
  const common = { currentUser, items, onMatch, onHome, onRefresh };

  if (level === 5) return <EnglishFamilyGameView {...common} questions={rhymeQuestions} onMistake={id => onMistake(id)} />;
  if (level === 3) {
    return unit.kind === 'letters'
      ? <EnglishTraceGameView
          {...common}
          writeStage={item => Math.min(3, skillCount(stats, englishStatKey(item), item.traceCase === 'upper' ? 'writeUpper' : 'write'))}
        />
      : <EnglishSpellGameView
          {...common}
          onMistake={onMistake}
          blendFirst={word => skillCount(stats, englishStatKey({ kind: 'word', text: word }), 'spell') === 0}
        />;
  }
  if (level === 4) return <EnglishSpeakGameView {...common} />;
  return <EnglishMatchGameView {...common} onMistake={onMistake} unit={unit} level={level as 1 | 2} />;
};
