/**
 * Play-together ideas for parents, picked from what the child mixed up this week.
 * Joint media engagement (Takeuchi & Stevens 2011) and dialogic reading (Whitehurst et al. 1988):
 * the parent is part of the scaffold, off screen as well as on it.
 */

export interface ParentTip {
  title: string;
  how: string;
}

const has = (pair: string[], group: string) => pair.every(s => group.includes(s));

/** Sound pairs: aspirated vs not, front vs back nasal, retroflex vs flat, and so on. */
const symbolTip = (a: string, b: string): ParentTip => {
  const pair = [a, b];
  const both = `「${a}」和「${b}」`;
  if (['ㄅㄆ', 'ㄉㄊ', 'ㄍㄎ', 'ㄐㄑ', 'ㄓㄔ', 'ㄗㄘ'].some(g => has(pair, g))) {
    return {
      title: `${both}：衛生紙吹氣遊戲`,
      how: `拿一張衛生紙放在嘴巴前面。唸送氣的音（ㄆㄊㄎㄑㄔㄘ）時衛生紙會被吹動，唸 ㄅㄉㄍㄐㄓㄗ 時幾乎不動。讓孩子自己唸唸看，看誰能讓衛生紙動、誰能讓它不動。`,
    };
  }
  if (has(pair, 'ㄣㄥ') || has(pair, 'ㄢㄤ')) {
    return {
      title: `${both}：前鼻音、後鼻音`,
      how: `唸 ㄢ、ㄣ 時舌尖頂在上面牙齒後面；唸 ㄤ、ㄥ 時舌尖放下，舌頭後面往上抬。用成對的字玩「閉眼猜猜看」：真／蒸、金／京、分／風、山／商、班／幫，大人唸一個，孩子猜是哪一個。`,
    };
  }
  if (['ㄓㄗ', 'ㄔㄘ', 'ㄕㄙ'].some(g => has(pair, g))) {
    return {
      title: `${both}：舌頭翹起來還是平平的`,
      how: `一起照鏡子：唸 ㄓㄔㄕ 舌尖往上翹，唸 ㄗㄘㄙ 舌頭平平放在牙齒後面。用「紙／子」「書／蘇」練習。大人平常說話也可以放慢，把捲舌唸清楚給孩子聽。`,
    };
  }
  if (pair.some(s => 'ㄐㄑㄒ'.includes(s)) && pair.some(s => 'ㄓㄔㄕㄗㄘㄙ'.includes(s))) {
    return {
      title: `${both}：嘴角笑開的聲音`,
      how: `唸 ㄐㄑㄒ 時嘴角往兩邊笑開，舌頭平貼在下面牙齒後面。玩「笑臉音」：大人唸「西、師、絲」，孩子聽到笑臉音（ㄒ）就比出笑臉。`,
    };
  }
  if (has(pair, 'ㄈㄏ')) {
    return {
      title: `${both}：牙齒碰嘴唇`,
      how: `唸 ㄈ 時上排牙齒輕碰下嘴唇，唸 ㄏ 時嘴巴張開、聲音從喉嚨出來。用「飛／黑」「福／湖」讓孩子對著鏡子唸，看看牙齒有沒有碰到嘴唇。`,
    };
  }
  if (has(pair, 'ㄋㄌ') || has(pair, 'ㄇㄋ')) {
    return {
      title: `${both}：捏鼻子試試看`,
      how: `ㄇ、ㄋ 的聲音從鼻子出來，捏住鼻子就唸不長；ㄌ 的聲音從舌頭兩邊出來，捏鼻子也唸得出來。用「你／李」「拿／拉」一起捏鼻子唸唸看。`,
    };
  }
  if (has(pair, 'ㄧㄩ') || has(pair, 'ㄨㄩ')) {
    return {
      title: `${both}：嘴唇嘟起來`,
      how: `唸 ㄩ 時嘴唇嘟起來像吹口哨，舌頭在前面；ㄧ 嘴角往兩邊開；ㄨ 嘴唇圓圓的、舌頭往後。對著鏡子唸「衣、魚、屋」，看看嘴型怎麼變。`,
    };
  }
  if (['ㄛㄜ', 'ㄨㄛ', 'ㄠㄡ', 'ㄛㄡ'].some(g => has(pair, g))) {
    return {
      title: `${both}：嘴巴圓不圓`,
      how: `ㄛ、ㄨ 嘴巴圓圓的，ㄜ 嘴巴自然張開不用圓；ㄠ 嘴巴先張大再收小，ㄡ 一開始就不大。玩「嘴型模仿」：大人做嘴型不出聲，孩子猜是哪個音。`,
    };
  }
  return {
    title: `${both}：聽音拍卡`,
    how: `把這兩個注音寫在兩張小卡上。大人唸其中一個音（也可以唸有這個音的詞），孩子搶先拍對的卡；再交換，讓孩子唸、大人拍。`,
  };
};

const toneTip = (a: string, b: string): ParentTip => {
  const pair = [a, b];
  if (pair.includes('二聲') && pair.includes('三聲')) {
    return {
      title: '二聲和三聲：手勢幫忙',
      how: '二聲手往上爬坡，三聲手先往下再往上（像打勾）。日常說話時三聲常常只唸前半段（往下），孩子容易聽混；練習單字時，大人把三聲完整唸出來。吃飯時玩「媽、麻、馬、罵」，一邊唸一邊比手勢。',
    };
  }
  return {
    title: `${a}和${b}：比手勢數聲調`,
    how: '一聲手平平往前，二聲往上爬，三聲先下再上，四聲從高處溜下來。拿孩子認識的字，例如「媽、麻、馬、罵」「衣、移、椅、意」，一起邊唸邊比，再請孩子當老師考大人。',
  };
};

const wordTip = (a: string, b: string): ParentTip => ({
  title: `「${a}」和「${b}」：背後寫字猜猜看`,
  how: `用手指在孩子背上慢慢寫「${a}」或「${b}」，讓孩子猜是哪一個，再交換由孩子寫給你猜。猜完各用這個字說一句話，例如「我看到……」。`,
});

const SHORT_VOWELS: Record<string, string> = {
  a: 'a 唸 /æ/，嘴巴往兩邊張大',
  e: 'e 唸 /ɛ/，很像注音「ㄝ」',
  i: 'i 唸 /ɪ/，比「ㄧ」短、輕鬆',
  o: 'o 唸 /ɑ/，嘴巴張大像「ㄚ」',
  u: 'u 唸 /ʌ/，輕輕的像「ㄜ」',
};

/** English letters that look or sound alike. */
const letterTip = (a: string, b: string): ParentTip => {
  const pair = [a, b].sort().join('');
  if (['bd', 'bp', 'dq', 'pq', 'bq', 'dp'].includes(pair)) {
    return {
      title: `${a} 和 ${b}：長得很像的字母`,
      how: '兩手握拳、大拇指往上，左手是 b、右手是 d，合起來像一張床（bed）。b 先寫直線再在右邊畫圓，d 先畫圓再寫直線；p、q 的直線往下到地下室。一起用手指在空中寫，說出「先直線」或「先圓圈」。',
    };
  }
  if (['ck', 'cs', 'kq'].includes(pair)) {
    return {
      title: `${a} 和 ${b}：聲音很像的字母`,
      how: 'c 和 k 常常發一樣的 /k/，這是正常的，不算錯。可以玩「分類卡」：cat、car、cake 一堆，kite、king、key 一堆，多看幾次就會記住哪個字用哪個字母。',
    };
  }
  if (['mn', 'mw', 'nu', 'hn'].includes(pair)) {
    return {
      title: `${a} 和 ${b}：數數有幾座山`,
      how: 'm 有兩座小山，n 只有一座；u 是開口朝上的杯子。唸 /m/ 嘴巴閉起來「嗯～」，唸 /n/ 嘴巴張開、舌頭頂在上面牙齒後。用手指描字母時，邊描邊數山。',
    };
  }
  if ('aeiou'.includes(a) && 'aeiou'.includes(b)) {
    return {
      title: `${a} 和 ${b}：短母音`,
      how: `${SHORT_VOWELS[a] || ''}；${SHORT_VOWELS[b] || ''}。玩「換母音」：拿 hat → hit → hot → hut 這種只差一個母音的字，大人唸，孩子指出是哪一張圖。`,
    };
  }
  return {
    title: `${a} 和 ${b}：字母拍拍卡`,
    how: '把這兩個字母寫在卡片上。大人說字母的名字或聲音（也可以說開頭是這個聲音的字，例如 bear），孩子搶先拍對的卡；再交換角色。',
  };
};

/** English words mixed up: one different vowel (hat/hot), or just two words not yet known well. */
const englishWordTip = (a: string, b: string): ParentTip => {
  const oneVowelApart = a.length === b.length && [...a].filter((ch, i) => ch !== b[i]).length === 1
    && [...a].some((ch, i) => ch !== b[i] && 'aeiou'.includes(ch) && 'aeiou'.includes(b[i]));
  if (oneVowelApart) {
    const i = [...a].findIndex((ch, k) => ch !== b[k]);
    return letterTip(a[i], b[i]);
  }
  return {
    title: `${a} 和 ${b}：圖卡拍拍樂`,
    how: `把 ${a}、${b} 兩張圖卡（或畫下來）放在桌上。大人說英文，孩子拍對的卡；再請孩子當老師說英文，大人拍。拍到後一起用英文說一句，例如 I see a ${a}.`,
  };
};

export const tipForConfusion = (key: string): ParentTip | null => {
  const [kind, rest] = key.split(':');
  const [a, b] = (rest || '').split('|');
  if (!a || !b) return null;
  if (kind === 'symbol') return symbolTip(a, b);
  if (kind === 'tone') return toneTip(a, b);
  if (kind === 'word') return wordTip(a, b);
  if (kind === 'letter') return letterTip(a, b);
  if (kind === 'enword') return englishWordTip(a, b);
  return null;
};

export const confusionLabel = (key: string) => (key.split(':')[1] || '').split('|').join(' ↔ ');

/** Ideas that always help, whatever was mixed up. */
export const GENERAL_TIPS: ParentTip[] = [
  {
    title: '出門找認識的字',
    how: '走在路上、逛超市時，找招牌和包裝上孩子學過的字。找到一個就擊掌，也可以拍照回家再唸一次。',
  },
  {
    title: '一天十分鐘就好',
    how: '每天完成一次「今日冒險」（大約十分鐘）比一次玩很久更有效：隔幾天再複習，字才記得牢。玩完陪孩子說說今天認識了哪些新朋友。',
  },
];

export const ENGLISH_TIPS: ParentTip[] = [
  {
    title: '每天一首英文兒歌',
    how: '唱字母歌時，指著字母表上的字母一個一個唱，孩子會把字母的名字和樣子連起來。',
  },
  {
    title: '先聽懂，再認字',
    how: '學英文單字時，先讓孩子聽懂意思（指著東西、比動作），再看字母怎麼拼。在家玩「Touch your nose」這類遊戲，比背單字有效。',
  },
];

/**
 * Questions for reading a lesson together, following dialogic reading's CROWD prompts:
 * Completion, Recall, Open-ended, Wh-, Distancing.
 */
export const readingPrompts = (lesson: { title: string; content: string; vocabulary: string[] }): { kind: string; prompt: string }[] => {
  const sentences = lesson.content.split(/(?<=[。！？!?])/).map(s => s.replace(/===/g, '').trim()).filter(Boolean);
  const words = lesson.vocabulary.filter(w => [...w].length >= 2);
  const prompts: { kind: string; prompt: string }[] = [];

  // A word in the middle of a sentence, so there is something to read before stopping
  const completion = sentences.flatMap(s => words.map(w => ({ s, w, cut: s.indexOf(w) }))).find(c => c.cut > 0);
  if (completion) {
    prompts.push({ kind: '接下去', prompt: `唸到「${completion.s.slice(0, completion.cut)}……」停下來，讓孩子接「${completion.w}」。` });
  }
  prompts.push({ kind: '回想', prompt: `讀完問：「〈${lesson.title.replace(/^第.課：/, '')}〉這一課說了什麼？」讓孩子用自己的話說。` });
  prompts.push({ kind: '開放', prompt: '問：「如果你也在課文裡，你會做什麼？」不管答什麼都接著問「然後呢？」' });
  prompts.push({ kind: '問問題', prompt: '用「誰、在哪裡、做什麼」來問，例如：「課文裡有誰？他們在哪裡？在做什麼？」' });
  const lifeWord = words[0] || lesson.vocabulary[0];
  if (lifeWord) prompts.push({ kind: '連結生活', prompt: `問：「我們家裡或路上，哪裡看過『${lifeWord}』？」` });
  return prompts;
};
