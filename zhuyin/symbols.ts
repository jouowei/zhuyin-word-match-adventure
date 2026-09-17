export interface ZhuyinSymbol {
  symbol: string;
  group: 'initial' | 'medial' | 'final';
  audio: string;        // 教育部《國語注音符號手冊》recording
  example: string;      // Picture word that contains the sound
  exampleEmoji: string;
}

// Audio files come from 教育部《國語注音符號手冊》開放部件 (CC BY 4.0), renamed by Unicode code point.
const audioFor = (symbol: string) => `/audio/zhuyin/${symbol.codePointAt(0)!.toString(16)}.wav`;

const s = (symbol: string, group: ZhuyinSymbol['group'], example: string, exampleEmoji: string): ZhuyinSymbol =>
  ({ symbol, group, audio: audioFor(symbol), example, exampleEmoji });

export const ZHUYIN_SYMBOLS: ZhuyinSymbol[] = [
  // 聲母
  s('ㄅ', 'initial', '爸爸', '👨'), s('ㄆ', 'initial', '跑步', '🏃'), s('ㄇ', 'initial', '貓', '🐱'),
  s('ㄈ', 'initial', '飛機', '✈️'), s('ㄉ', 'initial', '蛋', '🥚'), s('ㄊ', 'initial', '太陽', '☀️'),
  s('ㄋ', 'initial', '牛', '🐮'), s('ㄌ', 'initial', '老虎', '🐯'), s('ㄍ', 'initial', '狗', '🐶'),
  s('ㄎ', 'initial', '恐龍', '🦖'), s('ㄏ', 'initial', '花', '🌸'), s('ㄐ', 'initial', '雞', '🐔'),
  s('ㄑ', 'initial', '氣球', '🎈'), s('ㄒ', 'initial', '西瓜', '🍉'), s('ㄓ', 'initial', '豬', '🐷'),
  s('ㄔ', 'initial', '車', '🚗'), s('ㄕ', 'initial', '獅子', '🦁'), s('ㄖ', 'initial', '肉', '🍖'),
  s('ㄗ', 'initial', '嘴巴', '👄'), s('ㄘ', 'initial', '草', '🌱'), s('ㄙ', 'initial', '松鼠', '🐿️'),
  // 介母
  s('ㄧ', 'medial', '椅子', '🪑'), s('ㄨ', 'medial', '烏龜', '🐢'), s('ㄩ', 'medial', '魚', '🐟'),
  // 韻母
  s('ㄚ', 'final', '鴨子', '🦆'), s('ㄛ', 'final', '婆婆', '👵'), s('ㄜ', 'final', '鵝', '🦢'),
  s('ㄝ', 'final', '椰子', '🥥'), s('ㄞ', 'final', '愛心', '❤️'), s('ㄟ', 'final', '杯子', '🥤'),
  s('ㄠ', 'final', '帽子', '🧢'), s('ㄡ', 'final', '手', '✋'), s('ㄢ', 'final', '山', '⛰️'),
  s('ㄣ', 'final', '人', '🧑'), s('ㄤ', 'final', '羊', '🐑'), s('ㄥ', 'final', '燈', '💡'),
  s('ㄦ', 'final', '耳朵', '👂'),
];

export const getZhuyinSymbol = (symbol: string) => ZHUYIN_SYMBOLS.find(item => item.symbol === symbol);

export interface ToneInfo {
  mark: string;      // What to show ('ˉ' is not written in real zhuyin)
  name: string;
  example: string;   // 媽 麻 馬 罵 嗎
  exampleZhuyin: string;
}

export const TONES: ToneInfo[] = [
  { mark: 'ˉ', name: '一聲', example: '媽', exampleZhuyin: 'ㄇㄚ' },
  { mark: 'ˊ', name: '二聲', example: '麻', exampleZhuyin: 'ㄇㄚˊ' },
  { mark: 'ˇ', name: '三聲', example: '馬', exampleZhuyin: 'ㄇㄚˇ' },
  { mark: 'ˋ', name: '四聲', example: '罵', exampleZhuyin: 'ㄇㄚˋ' },
  { mark: '˙', name: '輕聲', example: '嗎', exampleZhuyin: '˙ㄇㄚ' },
];
