import { CompanionId, UserProfile } from '../types';

/** The adventure companion: the child picks one, and it talks and leads the way on the home map. */
export interface Companion {
  id: CompanionId;
  emoji: string;
  name: string;
  hello: string; // Said when the child looks at it while choosing
  bubble: string; // Speech bubble colours (Tailwind classes)
}

export const COMPANIONS: Companion[] = [
  { id: 'fox', emoji: '🦊', name: '小狐狸', hello: '我是小狐狸，我最會找東西了！', bubble: 'bg-orange-50 border-orange-300' },
  { id: 'bear', emoji: '🐻', name: '小熊', hello: '我是小熊，我們慢慢來，一起加油！', bubble: 'bg-amber-50 border-amber-300' },
  { id: 'dragon', emoji: '🐲', name: '小龍', hello: '我是小龍，我會噴火，也會認字喔！', bubble: 'bg-emerald-50 border-emerald-300' },
  { id: 'bunny', emoji: '🐰', name: '小兔', hello: '我是小兔，我跳得很快，我們出發吧！', bubble: 'bg-pink-50 border-pink-300' },
];

export const companionOf = (user: Pick<UserProfile, 'companion'>) => COMPANIONS.find(c => c.id === user.companion) ?? COMPANIONS[0];

/** Counting the way children say it: 兩站, 三個, not 2站. */
export const chineseNumber = (n: number) => (n >= 1 && n <= 10 ? '一兩三四五六七八九十'[n - 1] : String(n));

export interface HomeSituation {
  name: string;
  focus: string;          // What the Chinese adventure practises, as said: 注音符號 / 第一課：小船 / 所有課文的字
  chineseDone: boolean;   // Today's Chinese adventure is finished
  englishDone: boolean;
  stationsLeft: number;   // Today's Chinese adventure is under way: stations still to go (0 when not started)
  things: number;         // Things growing in the child's world
  greet: boolean;         // First time on the map in this visit: say hello
}

/** What the companion says on the home map. */
export const homeLine = (companion: Companion, s: HomeSituation): string => {
  const hello = s.greet ? `嗨，${s.name}！` : '';
  if (s.chineseDone && s.englishDone) {
    return `${hello}今天的冒險都完成了，好厲害！${s.things ? '點點看你種的花和樹，' : ''}也可以去遊樂場玩喔！`;
  }
  if (s.chineseDone) return `${hello}今天的冒險完成了，遊樂場開門囉！想學英文的話，按英文冒險。`;
  if (s.stationsLeft > 0) return `${hello}我們繼續冒險吧！還有${chineseNumber(s.stationsLeft)}站，按出發！`;
  if (s.englishDone) return `${hello}英文冒險完成了，遊樂場開門囉！要不要也去練${s.focus}？按出發！`;
  return `${hello}我是${companion.name}。今天我們一起練${s.focus}，按出發！`;
};

/** Tapping the companion: what it said, and what the world is for. */
export const companionTip = (line: string, things: number) =>
  things ? `${line}點點看你的花和樹，我會念出你學過的字。` : line;
