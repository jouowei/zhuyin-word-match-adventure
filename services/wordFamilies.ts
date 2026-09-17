import { WordItem, WordStat } from '../types';
import { getWordReading } from './moedict';

/**
 * 字的家族: words that share a character (火車、火山、煙火).
 * Morphological awareness — hearing that words are built from shared parts — predicts
 * young children's Chinese character recognition (McBride-Chang et al. 2003), and is trained orally here:
 * pictures and recordings first, the written word appears once found.
 */

interface Family {
  head: string;
  emoji: string;
  words: [string, string][]; // word, picture
}

// Everyday words with a clear picture; 花生、熱狗 and similar (shared character, unrelated meaning) are left out
export const WORD_FAMILIES: Family[] = [
  { head: '火', emoji: '🔥', words: [['火車', '🚂'], ['火山', '🌋'], ['火箭', '🚀'], ['煙火', '🎆']] },
  { head: '車', emoji: '🚗', words: [['公車', '🚌'], ['腳踏車', '🚲'], ['汽車', '🚗'], ['救護車', '🚑']] },
  { head: '雨', emoji: '🌧️', words: [['雨傘', '☂️'], ['下雨', '🌧️'], ['雨鞋', '👢']] },
  { head: '雪', emoji: '❄️', words: [['雪人', '⛄'], ['下雪', '🌨️'], ['雪花', '❄️']] },
  { head: '魚', emoji: '🐟', words: [['金魚', '🐠'], ['鯊魚', '🦈'], ['章魚', '🐙'], ['鯨魚', '🐋']] },
  { head: '牛', emoji: '🐮', words: [['牛奶', '🥛'], ['蝸牛', '🐌'], ['水牛', '🐃'], ['乳牛', '🐄']] },
  { head: '球', emoji: '⚽', words: [['足球', '⚽'], ['籃球', '🏀'], ['氣球', '🎈'], ['地球', '🌏']] },
  { head: '電', emoji: '⚡', words: [['電視', '📺'], ['電話', '☎️'], ['電腦', '💻'], ['電燈', '💡']] },
  { head: '海', emoji: '🌊', words: [['海豚', '🐬'], ['海龜', '🐢'], ['海邊', '🏖️'], ['大海', '🌊']] },
  { head: '冰', emoji: '🧊', words: [['冰塊', '🧊'], ['冰淇淋', '🍦'], ['溜冰', '⛸️']] },
  { head: '蛋', emoji: '🥚', words: [['雞蛋', '🥚'], ['蛋糕', '🎂'], ['煎蛋', '🍳']] },
  { head: '手', emoji: '✋', words: [['手機', '📱'], ['手套', '🧤'], ['手錶', '⌚']] },
  { head: '眼', emoji: '👀', words: [['眼睛', '👀'], ['眼鏡', '👓'], ['眼淚', '😢']] },
  { head: '星', emoji: '⭐', words: [['星星', '⭐'], ['星球', '🪐'], ['流星', '🌠']] },
  { head: '馬', emoji: '🐴', words: [['斑馬', '🦓'], ['河馬', '🦛'], ['木馬', '🎠']] },
  { head: '雞', emoji: '🐔', words: [['小雞', '🐤'], ['公雞', '🐓'], ['雞蛋', '🥚']] },
  { head: '水', emoji: '💧', words: [['汽水', '🥤'], ['口水', '🤤'], ['水果', '🍇'], ['水牛', '🐃']] },
  { head: '花', emoji: '🌸', words: [['花瓶', '🏺'], ['開花', '🌸'], ['小花', '🌼']] },
  { head: '口', emoji: '👄', words: [['口罩', '😷'], ['口水', '🤤'], ['門口', '🚪']] },
  { head: '小', emoji: '🤏', words: [['小鳥', '🐦'], ['小狗', '🐶'], ['小貓', '🐱'], ['小花', '🌼']] },
  { head: '鞋', emoji: '👟', words: [['鞋子', '👟'], ['拖鞋', '🩴'], ['雨鞋', '👢']] },
];

export interface FamilyWord {
  word: string;
  emoji: string;
  zhuyin: string;
  audioUrl?: string;
  member: boolean; // Contains the family character
}

export interface FamilyQuestion {
  item: WordItem;        // The family character; matched when every member is found
  words: FamilyWord[];   // Four pictures: members first shuffled in with others
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

/**
 * A round of family questions. Characters from the lessons or already practised come first,
 * so the game connects to what the child is learning.
 */
export const buildFamilyRound = async (options: {
  vocabulary: string[];
  stats?: Record<string, WordStat>;
  count?: number;
}): Promise<FamilyQuestion[]> => {
  const count = options.count ?? 3;
  const lessonText = options.vocabulary.join('');
  const familiar = (f: Family) => lessonText.includes(f.head) || !!options.stats?.[`w:${f.head}`];
  const families = [...shuffle(WORD_FAMILIES.filter(familiar)), ...shuffle(WORD_FAMILIES.filter(f => !familiar(f)))].slice(0, count);
  const stamp = Date.now();

  return Promise.all(families.map(async (family, index) => {
    const memberCount = Math.min(family.words.length, Math.random() < 0.5 ? 2 : 3);
    const members = shuffle(family.words).slice(0, memberCount);
    const others = shuffle(
      WORD_FAMILIES.filter(f => f.head !== family.head).flatMap(f => f.words)
        .filter(([word]) => !word.includes(family.head))
    );
    const headReading = await getWordReading(family.head);
    const bare = (syllable: string) => syllable.replace(/[ˊˇˋ˙]/g, '');
    const headSound = bare(headReading.zhuyin);
    // Distinct words and pictures, so every card can be told apart; and no other word with the same sound
    // (雨鞋 among 魚 words would be a trap for a listening task)
    const picked: [string, string][] = [...members];
    for (const candidate of others) {
      if (picked.length >= 4) break;
      if (picked.some(([w, e]) => w === candidate[0] || e === candidate[1])) continue;
      const reading = await getWordReading(candidate[0]);
      if (headSound && reading.zhuyin.split(' ').some(s => bare(s) === headSound)) continue;
      picked.push(candidate);
    }
    const readings = await Promise.all(picked.map(([word]) => getWordReading(word)));
    return {
      item: {
        id: `family-${stamp}-${index}`,
        character: family.head,
        zhuyin: headReading.zhuyin,
        emoji: family.emoji,
        audioUrl: headReading.audioUrl,
        matched: false,
      },
      words: shuffle(picked.map(([word, emoji], i) => ({
        word,
        emoji,
        zhuyin: readings[i].zhuyin,
        audioUrl: readings[i].audioUrl,
        member: word.includes(family.head),
      }))),
    };
  }));
};
