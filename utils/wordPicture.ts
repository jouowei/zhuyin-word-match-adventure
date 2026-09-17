import { WordItem } from '../types';

/**
 * Built-in pictures for concrete words, so rounds work without the Gemini API.
 * Abstract words (的、和、那…) are left out on purpose: they get a "看注音，找國字" round instead.
 */
export const WORD_EMOJI: Record<string, string> = {
  // 自然與東西
  水: '💧', 山: '⛰️', 青山: '⛰️', 花: '🌸', 小花: '🌼', 開花: '🌸', 草: '🌱', 樹: '🌳',
  星: '⭐', 星星: '⭐', 星球: '🪐', 地球: '🌏', 太陽: '☀️', 月亮: '🌙', 雲: '☁️', 雨: '🌧️', 雪: '❄️', 火: '🔥',
  河: '🏞️', 河流: '🏞️', 船: '🚢', 小船: '⛵', 車: '🚗', 車子: '🚗', 球: '⚽', 家: '🏠', 門: '🚪', 書: '📖', 筆: '✏️',
  // 動物
  魚: '🐟', 小魚: '🐟', 金魚: '🐠', 貓: '🐱', 狗: '🐶', 鳥: '🐦', 小鳥: '🐦', 牛: '🐮', 馬: '🐴', 羊: '🐑', 豬: '🐷',
  雞: '🐔', 鴨: '🦆', 鴨子: '🦆', 兔子: '🐰', 老虎: '🐯', 獅子: '🦁', 猴子: '🐵', 大象: '🐘', 熊: '🐻', 青蛙: '🐸', 蝴蝶: '🦋',
  // 人與身體 (look-alikes such as 人 🧑 vs 爸爸 👨, 臉 🙂 vs 笑臉 😊 are left out)
  外星人: '👽', 爸爸: '👨', 爸: '👨', 媽媽: '👩', 媽: '👩', 寶寶: '👶', 朋友: '🧑‍🤝‍🧑', 做朋友: '🤝', 大家: '👨‍👩‍👧‍👦',
  手: '✋', 小手: '✋', 笑臉: '😊', 眼睛: '👀', 耳朵: '👂', 鼻子: '👃', 嘴巴: '👄', 腳: '🦶',
  // 動作與心情
  笑: '😄', 快樂: '😄', 幸福: '🥰', 招手: '👋', 抱: '🤗', 抱抱: '🤗', 泡泡: '🫧', 吹泡泡: '🫧',
  走: '🚶', 向前走: '🚶', 大叫: '📢', 一起玩: '🤹', 加油: '📣', 想: '💭', 張開: '👐',
  // 數字與方向
  一: '1️⃣', 二: '2️⃣', 三: '3️⃣', 上: '⬆️', 下: '⬇️', 左: '⬅️', 右: '➡️', 左右: '↔️',
  // 食物
  蘋果: '🍎', 香蕉: '🍌', 西瓜: '🍉', 蛋: '🥚', 飯: '🍚', 麵包: '🍞', 牛奶: '🥛',
};

export const hasPicture = (item: Pick<WordItem, 'imageUrl' | 'emoji'>) =>
  !!item.imageUrl || (!!item.emoji && item.emoji !== '❓');

/**
 * A picture round only works when every card has its own picture;
 * otherwise (missing or duplicate pictures like 魚/小魚) the round shows zhuyin instead.
 */
export const canPlayPictureRound = (items: Pick<WordItem, 'imageUrl' | 'emoji'>[]) => {
  if (!items.every(hasPicture)) return false;
  const emojis = items.filter(i => !i.imageUrl).map(i => i.emoji);
  return new Set(emojis).size === emojis.length;
};
