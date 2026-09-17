import { WordItem, WordStat } from '../types';
import { getWordReading } from './moedict';

/**
 * 部件偵探: characters that share a meaning component (semantic radical), e.g. 河 海 洗 all have 氵.
 * Knowing that 氵 usually means water helps children learn and guess new characters
 * (radical awareness: Shu & Anderson 1997); it is taught from about second grade, so pictures and sound help.
 */

export interface RadicalCharacter {
  char: string;
  zhuyin: string;
  emoji: string;
  /**
   * Components visible in the character, or look-alikes (口 in 河, 母 in 海 looks like 女, 馬 in 媽 like 鳥):
   * the character is never a wrong choice when asking about those
   */
  alsoHas?: string;
}

export interface RadicalGroup {
  radical: string;      // As shown: 氵
  name: string;         // As said: 三點水
  meaning: string;      // 水
  meaningEmoji: string; // 💧
  members: RadicalCharacter[];
  /**
   * A likely new character with the same component. `avoid`: components not to test it against,
   * because it contains them too or something that looks like them (婆 has 氵, 霜 has 目 like 日) or their meaning is close (湖 and 下雨)
   */
  transfer: { char: string; zhuyin: string; gloss: string; avoid: string };
}

const c = (char: string, zhuyin: string, emoji: string, alsoHas = ''): RadicalCharacter => ({ char, zhuyin, emoji, alsoHas });

export const RADICAL_GROUPS: RadicalGroup[] = [
  {
    radical: '氵', name: '三點水', meaning: '水', meaningEmoji: '💧',
    members: [c('河', 'ㄏㄜˊ', '🏞️', '口'), c('海', 'ㄏㄞˇ', '🌊', '女'), c('洗', 'ㄒㄧˇ', '🧼'), c('游', 'ㄧㄡˊ', '🏊'), c('汗', 'ㄏㄢˋ', '💦')],
    transfer: { char: '湖', zhuyin: 'ㄏㄨˊ', gloss: '湖是很大的一片水', avoid: '口雨' },
  },
  {
    radical: '木', name: '木', meaning: '樹木', meaningEmoji: '🌳',
    members: [c('林', 'ㄌㄧㄣˊ', '🌲'), c('樹', 'ㄕㄨˋ', '🌳', '口'), c('椅', 'ㄧˇ', '🪑', '口'), c('桌', 'ㄓㄨㄛ', '🪵', '日')],
    transfer: { char: '松', zhuyin: 'ㄙㄨㄥ', gloss: '松是松樹', avoid: '艹' },
  },
  {
    radical: '口', name: '口', meaning: '嘴巴', meaningEmoji: '👄',
    members: [c('吃', 'ㄔ', '🍽️'), c('喝', 'ㄏㄜ', '🥤', '日'), c('叫', 'ㄐㄧㄠˋ', '📢'), c('唱', 'ㄔㄤˋ', '🎤', '日'), c('吹', 'ㄔㄨㄟ', '🌬️')],
    transfer: { char: '咬', zhuyin: 'ㄧㄠˇ', gloss: '咬是用嘴巴咬', avoid: '言' },
  },
  {
    radical: '扌', name: '提手旁', meaning: '手', meaningEmoji: '✋',
    members: [c('拍', 'ㄆㄞ', '👏', '日'), c('抱', 'ㄅㄠˋ', '🤗'), c('打', 'ㄉㄚˇ', '🥊'), c('拉', 'ㄌㄚ', '🪢')],
    transfer: { char: '推', zhuyin: 'ㄊㄨㄟ', gloss: '推是用手推', avoid: '' },
  },
  {
    radical: '艹', name: '草字頭', meaning: '草和植物', meaningEmoji: '🌱',
    members: [c('花', 'ㄏㄨㄚ', '🌸', '亻'), c('草', 'ㄘㄠˇ', '🌱', '日'), c('茶', 'ㄔㄚˊ', '🍵', '木'), c('菜', 'ㄘㄞˋ', '🥬', '木')],
    transfer: { char: '葉', zhuyin: 'ㄧㄝˋ', gloss: '葉是植物的葉子', avoid: '木' },
  },
  {
    radical: '亻', name: '單人旁', meaning: '人', meaningEmoji: '🧑',
    members: [c('你', 'ㄋㄧˇ', '🫵'), c('他', 'ㄊㄚ', '🧑'), c('休', 'ㄒㄧㄡ', '🛋️', '木'), c('住', 'ㄓㄨˋ', '🏠')],
    transfer: { char: '伴', zhuyin: 'ㄅㄢˋ', gloss: '伴是陪在一起的人', avoid: '女' },
  },
  {
    radical: '日', name: '日', meaning: '太陽', meaningEmoji: '☀️',
    members: [c('早', 'ㄗㄠˇ', '🌅'), c('晚', 'ㄨㄢˇ', '🌃'), c('晴', 'ㄑㄧㄥˊ', '☀️', '月'), c('明', 'ㄇㄧㄥˊ', '🌞', '月')],
    transfer: { char: '暖', zhuyin: 'ㄋㄨㄢˇ', gloss: '暖是太陽曬得暖暖的', avoid: '火目' },
  },
  {
    radical: '女', name: '女', meaning: '女生', meaningEmoji: '👩',
    members: [c('媽', 'ㄇㄚ', '👩', '鳥'), c('姐', 'ㄐㄧㄝˇ', '👱‍♀️', '目'), c('妹', 'ㄇㄟˋ', '👧', '木'), c('奶', 'ㄋㄞˇ', '👵')],
    transfer: { char: '婆', zhuyin: 'ㄆㄛˊ', gloss: '婆是婆婆、外婆', avoid: '氵亻' },
  },
  {
    radical: '虫', name: '虫', meaning: '蟲', meaningEmoji: '🐛',
    members: [c('蛇', 'ㄕㄜˊ', '🐍'), c('蚊', 'ㄨㄣˊ', '🦟'), c('蜂', 'ㄈㄥ', '🐝'), c('蝴', 'ㄏㄨˊ', '🦋', '口月')],
    transfer: { char: '蟻', zhuyin: 'ㄧˇ', gloss: '蟻是螞蟻，一種小蟲', avoid: '犭鳥扌' },
  },
  {
    radical: '火', name: '火', meaning: '火', meaningEmoji: '🔥',
    members: [c('燒', 'ㄕㄠ', '🔥'), c('炒', 'ㄔㄠˇ', '🍳'), c('烤', 'ㄎㄠˇ', '🍢'), c('燈', 'ㄉㄥ', '💡', '口')],
    transfer: { char: '爐', zhuyin: 'ㄌㄨˊ', gloss: '爐是火爐，燒火的地方', avoid: '日' },
  },
  {
    radical: '目', name: '目', meaning: '眼睛', meaningEmoji: '👁️',
    members: [c('眼', 'ㄧㄢˇ', '👀'), c('睛', 'ㄐㄧㄥ', '👁️', '月'), c('睡', 'ㄕㄨㄟˋ', '😴'), c('看', 'ㄎㄢˋ', '🔭', '扌')],
    transfer: { char: '眨', zhuyin: 'ㄓㄚˇ', gloss: '眨是眨眼睛', avoid: '日' },
  },
  {
    radical: '足', name: '足字旁', meaning: '腳', meaningEmoji: '🦶',
    members: [c('跑', 'ㄆㄠˇ', '🏃', '口'), c('跳', 'ㄊㄧㄠˋ', '🤸', '口'), c('踢', 'ㄊㄧ', '⚽', '口日'), c('路', 'ㄌㄨˋ', '🛣️', '口')],
    transfer: { char: '踩', zhuyin: 'ㄘㄞˇ', gloss: '踩是用腳踩', avoid: '木口扌' },
  },
  {
    radical: '言', name: '言字旁', meaning: '說話', meaningEmoji: '💬',
    members: [c('說', 'ㄕㄨㄛ', '🗣️', '口'), c('話', 'ㄏㄨㄚˋ', '💬', '口'), c('謝', 'ㄒㄧㄝˋ', '🙏', '口目'), c('請', 'ㄑㄧㄥˇ', '🙇', '口月')],
    transfer: { char: '講', zhuyin: 'ㄐㄧㄤˇ', gloss: '講是講話', avoid: '口' },
  },
  {
    radical: '鳥', name: '鳥', meaning: '鳥', meaningEmoji: '🐦',
    members: [c('鴨', 'ㄧㄚ', '🦆', '日'), c('鵝', 'ㄜˊ', '🦢'), c('鴿', 'ㄍㄜ', '🕊️', '口'), c('鷹', 'ㄧㄥ', '🦅', '亻')],
    transfer: { char: '鴕', zhuyin: 'ㄊㄨㄛˊ', gloss: '鴕是鴕鳥，一種很大的鳥', avoid: '犭虫' },
  },
  {
    radical: '雨', name: '雨字頭', meaning: '下雨和天氣', meaningEmoji: '🌧️',
    members: [c('雪', 'ㄒㄩㄝˇ', '❄️'), c('雷', 'ㄌㄟˊ', '⚡', '日'), c('雲', 'ㄩㄣˊ', '☁️'), c('霧', 'ㄨˋ', '🌫️')],
    transfer: { char: '霜', zhuyin: 'ㄕㄨㄤ', gloss: '霜是很冷的時候，地上結的白霜', avoid: '木目氵日' },
  },
  {
    radical: '犭', name: '犬字旁', meaning: '動物', meaningEmoji: '🐾',
    members: [c('狗', 'ㄍㄡˇ', '🐶', '口'), c('猴', 'ㄏㄡˊ', '🐵', '亻'), c('狐', 'ㄏㄨˊ', '🦊'), c('獅', 'ㄕ', '🦁')],
    transfer: { char: '狼', zhuyin: 'ㄌㄤˊ', gloss: '狼是一種動物', avoid: '鳥虫' },
  },
];

export interface RadicalCard {
  char: string;
  zhuyin: string;
  emoji: string;
  audioUrl?: string;
  member: boolean;
}

export interface RadicalQuestion {
  item: WordItem;            // The component; matched when both steps are done
  group: RadicalGroup;
  cards: RadicalCard[];      // Four characters, two or three with the component
  showcase: string;          // A member that isn't on the cards, drawn to show the component where it sits
  guessChoices: GuessChoice[]; // Three new characters: which one is about this component's meaning?
}

export interface GuessChoice {
  char: string;
  zhuyin: string;
  gloss: string;
  audioUrl?: string;
  correct: boolean;
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

/** Groups whose characters the child is learning come first. */
export const buildRadicalRound = async (options: {
  vocabulary: string[];
  stats?: Record<string, WordStat>;
  count?: number;
}): Promise<RadicalQuestion[]> => {
  const count = options.count ?? 3;
  const text = options.vocabulary.join('');
  const familiar = (g: RadicalGroup) => g.members.some(m => text.includes(m.char) || !!options.stats?.[`w:${m.char}`]);
  const groups = [...shuffle(RADICAL_GROUPS.filter(familiar)), ...shuffle(RADICAL_GROUPS.filter(g => !familiar(g)))].slice(0, count);
  const stamp = Date.now();

  return Promise.all(groups.map(async (group, index) => {
    const members = shuffle(group.members).slice(0, Math.random() < 0.5 ? 2 : 3);
    // Wrong choices: characters that don't contain this component anywhere (not even as a part)
    const others = shuffle(RADICAL_GROUPS.filter(g => g.radical !== group.radical).flatMap(g => g.members))
      .filter(m => !(m.alsoHas || '').includes(group.radical));
    const picked: (RadicalCharacter & { member: boolean })[] = members.map(m => ({ ...m, member: true }));
    for (const other of others) {
      if (picked.length >= 4) break;
      if (!picked.some(p => p.emoji === other.emoji || p.char === other.char)) picked.push({ ...other, member: false });
    }
    const readings = await Promise.all(picked.map(p => getWordReading(p.char, { override: p.zhuyin })));
    // Semantic radical awareness (Shu & Anderson 1997): new characters with different components, only one fits the meaning
    const guessOthers = shuffle(RADICAL_GROUPS.filter(g => g.radical !== group.radical
      && !g.transfer.avoid.includes(group.radical) && !group.transfer.avoid.includes(g.radical))).slice(0, 2);
    const guessGroups = shuffle([group, ...guessOthers]);
    const guessReadings = await Promise.all(guessGroups.map(g => getWordReading(g.transfer.char, { override: g.transfer.zhuyin })));
    return {
      item: { id: `radical-${stamp}-${index}`, character: group.radical, zhuyin: '', emoji: group.meaningEmoji, matched: false },
      group,
      cards: shuffle(picked.map((p, i) => ({ char: p.char, zhuyin: p.zhuyin, emoji: p.emoji, audioUrl: readings[i].audioUrl, member: p.member }))),
      showcase: group.members.find(m => !members.includes(m))!.char,
      guessChoices: guessGroups.map((g, i) => ({ ...g.transfer, audioUrl: guessReadings[i].audioUrl, correct: g === group })),
    };
  }));
};
