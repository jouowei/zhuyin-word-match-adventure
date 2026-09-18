/** Spoken instructions for the Chinese games; five-year-olds can't read the on-screen text yet. */

export const MODE_SELECT_INSTRUCTION = '選一個遊戲。點喇叭，可以聽聽每個遊戲怎麼玩。';

export interface LevelInfo {
  level: number;
  emoji: string;
  title: string;
  desc: string;
}

export const levelInfo = (level: number, gameMode: 'word' | 'zhuyin' | string): LevelInfo => {
  const zhuyin = gameMode === 'zhuyin';
  const all: LevelInfo[] = [
    { level: 1, emoji: '🏰', title: zhuyin ? '注音大冒險' : '字卡大冒險', desc: zhuyin ? '看注音符號找圖片' : '看圖片找國字' },
    { level: 2, emoji: '🎧', title: '聽力大師', desc: zhuyin ? '聽聲音找注音' : '聽聲音找國字' },
    { level: 3, emoji: '🖌️', title: '小小書法家', desc: zhuyin ? '照筆順寫注音' : '動手練習寫國字' },
    { level: 4, emoji: '🎙️', title: '小小播音員', desc: zhuyin ? '唸注音，和標準的比一比' : '大聲唸出圖卡' },
    { level: 5, emoji: '🧩', title: '拼音高手', desc: zhuyin ? '看圖片，拼出注音' : '看國字，拼出注音' },
    { level: 6, emoji: '🎵', title: '聲調偵探', desc: '聽聲音，找出第幾聲' },
    { level: 7, emoji: '👨‍👩‍👧', title: '字的家族', desc: '找出有同一個字的詞' },
    { level: 8, emoji: '🕵️', title: '部件偵探', desc: '找出有同一個部件的字' },
  ];
  return all[level - 1];
};

/** `zhuyinRound`: word rounds without pictures, where the zhuyin is shown instead. */
export const gameInstruction = (level: number, gameMode: 'word' | 'zhuyin' | string, zhuyinRound = false): string => {
  const zhuyin = gameMode === 'zhuyin';
  const target = zhuyinRound ? '注音' : '圖片';
  switch (level) {
    case 1:
      return zhuyin
        ? '點左邊的注音符號聽聲音，再點右邊有這個聲音的圖片。'
        : `點左邊的字聽一聽，再點右邊對的${target}。`;
    case 2:
      return `點耳朵聽聲音，再點右邊對的${zhuyin ? '注音符號' : '字'}。`;
    case 3:
      return zhuyin
        ? '先點注音符號，找到有這個聲音的圖片，再照著筆順寫一寫。'
        : `先點字，找到對的${target}，再跟著筆順寫一寫。`;
    case 4:
      return zhuyin
        ? '點麥克風，大聲唸出注音符號。唸完會先放標準的聲音，再放你的聲音，一樣就按大拇指！'
        : '點麥克風，大聲唸出卡片上的字。唸不出來的時候，可以先按喇叭聽一聽。';
    case 5:
      return '聽聽看這個字，照順序點出注音符號，最後選出第幾聲。';
    case 6:
      return '仔細聽，這個字是第幾聲？';
    case 7:
      return '聽聽看，哪些詞裡面有這個字？點圖片選出來，點喇叭可以先聽一聽。';
    case 8:
      return '先找出裡面有紅色部件的字。再看看新的字，哪一個和它的意思有關係？';
    default:
      return '';
  }
};

/**
 * Writing support fades as the child writes an item on their own (James & Engelhardt 2012:
 * writing freehand, not tracing, is what helps letter recognition).
 */
export const WRITING_STAGE_NAMES = ['描紅', '看起筆點寫', '自己寫', '聽音寫'];

export const zhuyinTraceInstruction = (stage: number) => [
  '從綠色的一號點開始，順著白點的方向，一筆一筆寫。',
  '這次沒有灰色的字了。從綠色的一號點開始，一筆一筆寫。',
  '看著上面的注音符號，自己在格子裡一筆一筆寫。',
  '聽聽看是哪一個注音符號，自己把它寫出來。',
][stage] || '';

export const writingInstruction = (stage: number) => [
  '先看紅色的筆順動畫，再跟著寫一次，寫好了按完成。',
  '照著數字的順序，從每個點開始寫，寫好了按完成。',
  '看著上面的字，自己在格子裡寫，寫好了按完成。',
  '聽聽看是哪一個字，看著注音把它寫出來，寫好了按完成。',
][stage] || '';

export const DAILY_PATH_INTRO = '今天的冒險有好幾站，一站一站完成吧！';
