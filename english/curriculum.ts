import { EnglishUnit, EnglishWord, EnglishRoundItem } from '../types';
import { LETTERS, getLetter } from './letters';
import { englishStatKey, pickWithReview, ReviewSchedule } from '../services/learningStats';
import { hasRhymeFamilies } from './families';

export const ROUND_SIZE = 4;

export interface EnglishStage {
  id: number;
  title: string;
  subtitle: string;
  badge: string;     // Tailwind classes for the stage badge
  panel: string;     // Tailwind classes for the stage panel
  text: string;      // Tailwind text color
}

export const ENGLISH_STAGES: EnglishStage[] = [
  { id: 1, title: '第一站：字母王國', subtitle: 'ABC Letters', badge: 'bg-pink-500', panel: 'bg-pink-50 border-pink-200', text: 'text-pink-700' },
  { id: 2, title: '第二站：拼讀森林', subtitle: 'Short Vowels', badge: 'bg-green-500', panel: 'bg-green-50 border-green-200', text: 'text-green-700' },
  { id: 3, title: '第三站：生活單字城', subtitle: 'Everyday Words', badge: 'bg-sky-500', panel: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
  { id: 4, title: '第四站：進階拼讀山', subtitle: 'More Phonics', badge: 'bg-purple-500', panel: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  { id: 5, title: '我的單字', subtitle: 'My Words', badge: 'bg-orange-500', panel: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
];

export interface EnglishLevel {
  level: number;
  emoji: string;
  title: string;
  desc: string;
  instruction: string; // Spoken to children who can't read yet
  color: 'blue' | 'red' | 'amber' | 'purple' | 'green';
}

export const LETTER_LEVELS: EnglishLevel[] = [
  { level: 1, emoji: '🔠', title: '大小寫配對', desc: '找到一樣的大寫和小寫字母', instruction: '先點左邊的大寫字母，再點右邊一樣的小寫字母。', color: 'blue' },
  { level: 2, emoji: '🎧', title: '開頭音偵探', desc: '聽單字，找出開頭的字母', instruction: '點耳朵聽單字，再找出這個單字開頭的字母。', color: 'red' },
  { level: 3, emoji: '✏️', title: '字母描寫', desc: '照著筆順在四線格上描字母', instruction: '點一個字母，從綠色的一號點開始，照著順序描寫。', color: 'amber' },
  { level: 4, emoji: '🎙️', title: '小小播音員', desc: '看圖片，大聲說出英文', instruction: '先按喇叭聽一聽，再按麥克風，大聲說出英文。', color: 'purple' },
];

export const WORD_LEVELS: EnglishLevel[] = [
  { level: 1, emoji: '🏰', title: '看圖找單字', desc: '讀讀看單字，配對圖片', instruction: '先點左邊的單字聽一聽，再點右邊對的圖片。', color: 'blue' },
  { level: 2, emoji: '🎧', title: '聽力大師', desc: '聽聲音，找出正確的單字', instruction: '點耳朵聽聲音，再點右邊對的單字。', color: 'red' },
  { level: 3, emoji: '🧩', title: '拼字高手', desc: '一個一個字母拼出單字', instruction: '聽聽看單字，照順序點字母，把單字拼出來。', color: 'amber' },
  { level: 4, emoji: '🎙️', title: '小小播音員', desc: '看圖片，大聲唸出單字', instruction: '先按喇叭聽一聽，再按麥克風，大聲唸出單字。', color: 'purple' },
];

/** Rhyme families, for word units with rhyming words (short vowels and some others). Not counted in a unit's four stars. */
export const RHYME_LEVEL: EnglishLevel = {
  level: 5, emoji: '🏠', title: '押韻家族', desc: '找出結尾聲音一樣的字',
  instruction: '聽聽看，哪些字的結尾聲音和這個字一樣？點圖片選出來，點喇叭可以先聽一聽。', color: 'green',
};

export const getLevels = (unit: EnglishUnit) =>
  unit.kind === 'letters' ? LETTER_LEVELS : hasRhymeFamilies(unit) ? [...WORD_LEVELS, RHYME_LEVEL] : WORD_LEVELS;

/** The four stars of a unit: levels 1–4. */
export const unitStars = (levels: number[] | undefined) => (levels || []).filter(level => level <= 4).length;

const w = (word: string, emoji: string, zh: string): EnglishWord => ({ word, emoji, zh });

export const ENGLISH_UNITS: EnglishUnit[] = [
  // --- Stage 1: Letters ---
  {
    id: 'abc-1', stage: 1, kind: 'letters', icon: '🍎',
    title: '字母 Aa – Ee', subtitle: 'Letters A–E',
    letters: ['a', 'b', 'c', 'd', 'e'],
    tip: '每個字母都有「名字」和「聲音」。B 的名字唸 bee，聲音是 /b/，就是 bear 開頭的聲音！',
  },
  {
    id: 'abc-2', stage: 1, kind: 'letters', icon: '🐟',
    title: '字母 Ff – Jj', subtitle: 'Letters F–J',
    letters: ['f', 'g', 'h', 'i', 'j'],
    tip: 'G 在 goat 裡唸 /g/，J 在 juice 裡唸 /dʒ/。唸唸看，喉嚨的感覺不一樣喔！',
  },
  {
    id: 'abc-3', stage: 1, kind: 'letters', icon: '🪁',
    title: '字母 Kk – Oo', subtitle: 'Letters K–O',
    letters: ['k', 'l', 'm', 'n', 'o'],
    tip: 'K 和 C 常常發出一樣的 /k/ 聲音。M 的聲音是閉著嘴巴「嗯～」。',
  },
  {
    id: 'abc-4', stage: 1, kind: 'letters', icon: '🐷',
    title: '字母 Pp – Tt', subtitle: 'Letters P–T',
    letters: ['p', 'q', 'r', 's', 't'],
    tip: 'b、d、p、q 長得很像！p 是先寫直線到地下室再畫圓，q 是先畫圓再寫直線。Q 後面常常跟著 u。',
  },
  {
    id: 'abc-5', stage: 1, kind: 'letters', icon: '🦓',
    title: '字母 Uu – Zz', subtitle: 'Letters U–Z',
    letters: ['u', 'v', 'w', 'x', 'y', 'z'],
    tip: 'X 很調皮，常常躲在單字最後面，像 fox、box、six，唸 /ks/。',
  },

  // --- Stage 2: Short vowels (CVC) ---
  {
    id: 'cvc-a', stage: 2, kind: 'words', icon: '🐱',
    title: '短母音 a', subtitle: 'cat · hat · map',
    tip: '短母音 a 唸 /æ/，嘴巴往兩邊張大。把開頭音和尾巴連起來：c + at = cat！',
    words: [w('cat', '🐱', '貓'), w('hat', '👒', '帽子'), w('bat', '🦇', '蝙蝠'), w('rat', '🐀', '老鼠'), w('map', '🗺️', '地圖'), w('cap', '🧢', '棒球帽'), w('van', '🚐', '廂型車'), w('pan', '🍳', '平底鍋'), w('can', '🥫', '罐頭'), w('bag', '👜', '袋子')],
    sentences: ['A cat has a hat.', 'The rat is in the van.', 'I have a map and a bag.'],
  },
  {
    id: 'cvc-e', stage: 2, kind: 'words', icon: '🐔',
    title: '短母音 e', subtitle: 'bed · hen · pen',
    tip: '短母音 e 唸 /ɛ/，很像注音的「ㄝ」，嘴巴輕輕張開。',
    words: [w('bed', '🛏️', '床'), w('hen', '🐔', '母雞'), w('pen', '🖊️', '原子筆'), w('net', '🥅', '網子'), w('jet', '✈️', '噴射機'), w('web', '🕸️', '蜘蛛網'), w('ten', '🔟', '十'), w('leg', '🦵', '腿'), w('red', '🔴', '紅色'), w('wet', '💦', '濕的')],
    sentences: ['The hen is on the bed.', 'I see ten red pens.', 'My leg is wet.'],
  },
  {
    id: 'cvc-i', stage: 2, kind: 'words', icon: '🐷',
    title: '短母音 i', subtitle: 'pig · six · pin',
    tip: '短母音 i 唸 /ɪ/，比注音「ㄧ」更短、更輕鬆，嘴巴不要太用力。',
    words: [w('pig', '🐷', '豬'), w('six', '6️⃣', '六'), w('pin', '📌', '圖釘'), w('lip', '👄', '嘴唇'), w('kid', '🧒', '小孩'), w('dig', '⛏️', '挖'), w('win', '🏆', '贏'), w('bin', '🗑️', '垃圾桶')],
    sentences: ['The pig can dig.', 'Six kids win!', 'Put it in the bin.'],
  },
  {
    id: 'cvc-o', stage: 2, kind: 'words', icon: '🦊',
    title: '短母音 o', subtitle: 'dog · fox · box',
    tip: '短母音 o 唸 /ɑ/，嘴巴張得大大的，很像注音的「ㄚ」。',
    words: [w('dog', '🐶', '狗'), w('fox', '🦊', '狐狸'), w('box', '📦', '箱子'), w('pot', '🍲', '鍋子'), w('log', '🪵', '木頭'), w('hot', '🔥', '熱的'), w('hop', '🦘', '跳'), w('dot', '⚫', '圓點')],
    sentences: ['The dog is on a log.', 'A fox is in the box.', 'The pot is hot!'],
  },
  {
    id: 'cvc-u', stage: 2, kind: 'words', icon: '☀️',
    title: '短母音 u', subtitle: 'bus · sun · cup',
    tip: '短母音 u 唸 /ʌ/，有點像注音的「ㄜ」，輕輕地發聲。',
    words: [w('bus', '🚌', '公車'), w('sun', '☀️', '太陽'), w('cup', '☕', '杯子'), w('bug', '🐛', '蟲'), w('hug', '🤗', '擁抱'), w('nut', '🥜', '堅果'), w('run', '🏃', '跑'), w('tub', '🛁', '浴缸'), w('cut', '✂️', '剪')],
    sentences: ['The bug is in the cup.', 'I run in the sun.', 'Give me a hug!'],
  },

  // --- Stage 3: Everyday words ---
  {
    id: 'colors', stage: 3, kind: 'words', icon: '🌈',
    title: '顏色', subtitle: 'Colors',
    tip: '看到東西時，用英文說說看它是什麼顏色！',
    words: [w('red', '🔴', '紅色'), w('blue', '🔵', '藍色'), w('green', '🟢', '綠色'), w('yellow', '🟡', '黃色'), w('orange', '🟠', '橘色'), w('purple', '🟣', '紫色'), w('black', '⚫', '黑色'), w('white', '⚪', '白色'), w('brown', '🟤', '咖啡色')],
    sentences: ['I like red.', 'The sky is blue.', 'I see a green frog.'],
  },
  {
    id: 'numbers', stage: 3, kind: 'words', icon: '🔢',
    title: '數字 1–10', subtitle: 'Numbers',
    tip: '邊數手指邊說英文數字，最容易記住！',
    words: [w('one', '1️⃣', '一'), w('two', '2️⃣', '二'), w('three', '3️⃣', '三'), w('four', '4️⃣', '四'), w('five', '5️⃣', '五'), w('six', '6️⃣', '六'), w('seven', '7️⃣', '七'), w('eight', '8️⃣', '八'), w('nine', '9️⃣', '九'), w('ten', '🔟', '十')],
    sentences: ['One, two, three!', 'I am seven.', 'I have ten fingers.'],
  },
  {
    id: 'animals', stage: 3, kind: 'words', icon: '🐘',
    title: '動物', subtitle: 'Animals',
    tip: '很多動物在字母課出現過，找找看牠們的開頭字母是什麼？',
    words: [w('dog', '🐶', '狗'), w('cat', '🐱', '貓'), w('bird', '🐦', '鳥'), w('fish', '🐟', '魚'), w('duck', '🦆', '鴨子'), w('lion', '🦁', '獅子'), w('tiger', '🐯', '老虎'), w('monkey', '🐵', '猴子'), w('elephant', '🐘', '大象'), w('rabbit', '🐰', '兔子'), w('bear', '🐻', '熊'), w('frog', '🐸', '青蛙')],
    sentences: ['I see a bird.', 'The lion is big.', 'A frog can jump.'],
  },
  {
    id: 'food', stage: 3, kind: 'words', icon: '🍌',
    title: '水果與食物', subtitle: 'Fruit & Food',
    tip: '吃飯的時候，用英文說說看桌上有什麼！',
    words: [w('apple', '🍎', '蘋果'), w('banana', '🍌', '香蕉'), w('grapes', '🍇', '葡萄'), w('orange', '🍊', '柳橙'), w('lemon', '🍋', '檸檬'), w('peach', '🍑', '桃子'), w('egg', '🥚', '蛋'), w('milk', '🥛', '牛奶'), w('bread', '🍞', '麵包'), w('rice', '🍚', '飯'), w('cake', '🎂', '蛋糕'), w('water', '💧', '水')],
    sentences: ['I like apples.', 'I eat bread and eggs.', 'Can I have some milk?'],
  },
  {
    id: 'body', stage: 3, kind: 'words', icon: '🖐️',
    title: '身體', subtitle: 'My Body',
    tip: '和爸媽玩「Touch your ___」：爸媽說 Touch your nose，你就摸鼻子！',
    words: [w('eye', '👁️', '眼睛'), w('ear', '👂', '耳朵'), w('nose', '👃', '鼻子'), w('mouth', '👄', '嘴巴'), w('hand', '✋', '手'), w('foot', '🦶', '腳'), w('arm', '💪', '手臂'), w('leg', '🦵', '腿')],
    sentences: ['Touch your nose.', 'I have two eyes.', 'Clap your hands!'],
  },
  {
    id: 'family', stage: 3, kind: 'words', icon: '🏡',
    title: '家人', subtitle: 'My Family',
    tip: '對家人說 I love you，是最棒的英文練習！',
    words: [w('mom', '👩', '媽媽'), w('dad', '👨', '爸爸'), w('baby', '👶', '寶寶'), w('boy', '👦', '男孩'), w('girl', '👧', '女孩'), w('grandma', '👵', '奶奶／外婆'), w('grandpa', '👴', '爺爺／外公'), w('friend', '🧑‍🤝‍🧑', '朋友')],
    sentences: ['I love my mom.', 'This is my dad.', 'You are my friend.'],
  },

  // --- Stage 4: More phonics ---
  {
    id: 'digraphs', stage: 4, kind: 'words', icon: '🚢',
    title: '兩個字母一個音', subtitle: 'sh · ch · th',
    tip: 'sh 像叫人安靜的「噓～」；ch 像火車 choo choo；th 要把舌頭輕輕放在上下牙齒中間。',
    words: [w('ship', '🚢', '船'), w('shell', '🐚', '貝殼'), w('fish', '🐟', '魚'), w('chick', '🐤', '小雞'), w('cheese', '🧀', '起司'), w('lunch', '🍱', '午餐'), w('three', '3️⃣', '三'), w('bath', '🛁', '洗澡'), w('thumb', '👍', '大拇指')],
    sentences: ['The fish is by the ship.', 'The chick eats cheese.', 'Three ducks take a bath.'],
  },
  {
    id: 'long-vowels', stage: 4, kind: 'words', icon: '🐝',
    title: '長母音 ee · oo', subtitle: 'bee · tree · moon',
    tip: 'ee 唸 /i/，像注音「ㄧ」拉長；oo 常唸 /u/，像注音「ㄨ」拉長。',
    words: [w('bee', '🐝', '蜜蜂'), w('tree', '🌳', '樹'), w('feet', '🦶', '腳（複數）'), w('sheep', '🐑', '綿羊'), w('moon', '🌙', '月亮'), w('food', '🍔', '食物'), w('boot', '👢', '靴子'), w('spoon', '🥄', '湯匙'), w('pool', '🏊', '游泳池')],
    sentences: ['I see a bee in the tree.', 'Look at the moon!', 'Wipe your feet.'],
  },
  {
    id: 'magic-e', stage: 4, kind: 'words', icon: '🪄',
    title: '魔法 e', subtitle: 'cake · bike · home',
    tip: '單字最後的 e 不發音，但它有魔法！會讓前面的母音唸出字母名字：kit → kite、cut → cute。',
    words: [w('cake', '🎂', '蛋糕'), w('bike', '🚲', '腳踏車'), w('kite', '🪁', '風箏'), w('home', '🏠', '家'), w('bone', '🦴', '骨頭'), w('rose', '🌹', '玫瑰'), w('five', '5️⃣', '五'), w('nine', '9️⃣', '九'), w('cute', '🥰', '可愛的')],
    sentences: ['I ride my bike home.', 'The dog has a bone.', 'Five kites fly high.'],
  },
];

const dedupeWords = (words: EnglishWord[]) => {
  const seen = new Set<string>();
  return words.filter(item => {
    const key = item.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Virtual units that mix everything learned so far
export const REVIEW_UNITS: EnglishUnit[] = [
  {
    id: 'review-letters', stage: 0, kind: 'letters', icon: '🎲',
    title: '字母綜合挑戰', subtitle: 'All Letters A–Z',
    letters: LETTERS.map(l => l.lower),
    tip: '26 個字母全部混在一起，看看你認得幾個！',
  },
  {
    id: 'review-words', stage: 0, kind: 'words', icon: '🎯',
    title: '單字綜合挑戰', subtitle: 'All Words',
    words: dedupeWords(ENGLISH_UNITS.flatMap(u => u.words || [])),
    tip: '所有學過的單字混在一起，挑戰你的記憶力！',
  },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const shuffleItems = shuffle;

/**
 * Returns null when the unit doesn't have enough content for a round.
 * `plannedCount`: 今日冒險 already ordered the unit's items; take that many from the front.
 */
export const buildEnglishRound = (unit: EnglishUnit, level: number, schedule?: ReviewSchedule, plannedCount?: number): EnglishRoundItem[] | null => {
  const stamp = Date.now();
  const count = plannedCount ?? ROUND_SIZE;

  if (unit.kind === 'letters') {
    const letters = unit.letters || [];
    if (letters.length < count) return null;
    // Letters and words due for review come first, then ones not practised yet
    const picked = plannedCount
      ? shuffle(letters.slice(0, count))
      : pickWithReview(letters, count, letter => englishStatKey({ kind: 'letter', text: letter }), schedule);
    return picked.map((letter, i) => {
      const info = getLetter(letter)!;
      return {
        id: `en-${stamp}-${i}`,
        kind: 'letter',
        text: info.lower,
        keyword: info.keyword,
        emoji: info.emoji,
        zh: info.zh,
        traceCase: level === 3 ? (i % 2 === 0 ? 'upper' : 'lower') : undefined,
        matched: false,
      };
    });
  }

  let pool = dedupeWords(unit.words || []);
  if (level === 3) {
    // Spelling long words is frustrating for beginners
    const shortWords = pool.filter(item => item.word.length <= 6);
    if (shortWords.length >= count) pool = shortWords;
  }
  if (pool.length < count) return null;

  const picked = plannedCount
    ? shuffle(pool.slice(0, count))
    : pickWithReview(pool, count, item => englishStatKey({ kind: 'word', text: item.word }), schedule);
  return picked.map((item, i) => ({
    id: `en-${stamp}-${i}`,
    kind: 'word',
    text: item.word,
    keyword: item.word,
    emoji: item.emoji,
    zh: item.zh,
    matched: false,
  }));
};

/** Look up a word in the built-in curriculum (used to auto-fill custom units). */
export const lookupEnglishWord = (word: string): EnglishWord | undefined => {
  const key = word.trim().toLowerCase();
  if (!key) return undefined;
  for (const unit of ENGLISH_UNITS) {
    const found = unit.words?.find(item => item.word === key);
    if (found) return found;
  }
  const letter = LETTERS.find(l => l.keyword === key);
  if (letter) return { word: letter.keyword, emoji: letter.emoji, zh: letter.zh };
  return undefined;
};

export const getRecommendedUnitId = (progress: Record<string, number[]> | undefined): string | undefined => {
  const next = ENGLISH_UNITS.find(unit => unitStars(progress?.[unit.id]) < 4);
  return next?.id;
};
