// The app's own texts, 一上 to 六下: six a term, growing longer, and shown with the right zhuyin.
import { LIBRARY_LESSONS } from '../lessons/library.ts';
import { INITIAL_LESSONS } from '../constants.ts';
import { lessonShelves } from '../services/lessonShelf.ts';
import { splitLessonPages } from '../services/lessonText.ts';
import { FONT_POLYPHONES_RAW } from '../zhuyin/fontPolyphones.ts';
import { existsSync } from 'fs';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const isHan = (ch: string) => /\p{Script=Han}/u.test(ch);
const hanCount = (text: string) => [...text].filter(isHan).length;

check('built in, next to the family\'s own lessons', LIBRARY_LESSONS.every(l => INITIAL_LESSONS.includes(l)));
check('ids are unique', new Set(INITIAL_LESSONS.map(l => l.id)).size === INITIAL_LESSONS.length);

const shelves = lessonShelves(LIBRARY_LESSONS).filter(s => s.lessons.length);
check('six lessons a term, 一上 to 六下', shelves.length === 12 && shelves.every(s => s.grade && s.lessons.map(l => l.order).join('') === '123456'),
  shelves.map(s => `${s.label}:${s.lessons.length}`));

const average = (grade: number, term: string) => {
  const texts = LIBRARY_LESSONS.filter(l => l.grade === grade && l.term === term);
  return texts.reduce((sum, l) => sum + hanCount(l.content), 0) / texts.length;
};
const averages = [1, 2, 3, 4, 5, 6].flatMap(grade => [average(grade, 'up'), average(grade, 'down')]);
check('texts grow longer term by term', averages.every((a, i) => i === 0 || a > averages[i - 1]), averages.map(Math.round));
check('一上 stays short', LIBRARY_LESSONS.filter(l => l.grade === 1 && l.term === 'up').every(l => hanCount(l.content) <= 45));

const missing = LIBRARY_LESSONS.flatMap(l => l.vocabulary.filter(w => !l.content.includes(w)).map(w => `${l.title}:${w}`));
check('every vocabulary word is in its text (for 課文尋寶)', missing.length === 0, missing);
const badTextReadings = LIBRARY_LESSONS.flatMap(l => Object.entries(l.textReadings || {})
  .filter(([phrase, reading]) => !l.content.includes(phrase) || reading.split(' ').length !== [...phrase].length).map(([phrase]) => `${l.title}:${phrase}`));
check('text readings: in the text, one syllable a character', badTextReadings.length === 0, badTextReadings);

const noPicture = LIBRARY_LESSONS.filter(l => !l.picture || !existsSync(`public${l.picture}`)).map(l => l.id);
check('every text has its picture (public/lesson-art)', noPicture.length === 0, noPicture);

const pages = LIBRARY_LESSONS.flatMap(l => splitLessonPages(l.content));
check('pages never start with a closing quote', pages.every(p => !p.startsWith('」')));
const longPages = pages.filter(p => hanCount(p) > 36);
check('a page is short enough to read on a phone (36 characters at most)', longPages.length === 0, longPages);

// Characters with more than one reading, outside the vocabulary words, must be read the common way (the font's
// default). Each of these was checked in its sentence; a new one needs checking, or a vocabulary word around it.
const READ_THE_COMMON_WAY = new Set([...'了家說的有和會給聽一呱好個大把放過幾冒吧跑們嗎啊可上包吃風要些頭看哈色各地身從幅車太不朵句那紅呢' +
  '著都還沒麼比長阿覺雨字少落排中乾請涼什六午抓南遠種讀扁噴正當喔騎伯百轉空倒間累更圈日葉洞淡石齊鳥喝淺掃查洗分卡提哇哪藏強胖切華磨難台員重兒行告蓋湯蝦咬差滑副衝朝養平傳背為嚇同塞折龜' +
  '衣王答歪漲度錢擋作女']);
const table = new Map<string, string[]>();
for (const entry of FONT_POLYPHONES_RAW.split('|')) {
  const [char] = [...entry];
  table.set(char, entry.slice(char.length).split(','));
}
const unchecked: string[] = [];
for (const l of LIBRARY_LESSONS) {
  const words = [...new Set([...l.vocabulary, ...Object.keys(l.textReadings || {})])].sort((a, b) => b.length - a.length);
  const chars = [...l.content];
  for (let i = 0; i < chars.length;) {
    const word = isHan(chars[i]) && words.find(w => chars.slice(i, i + [...w].length).join('') === w);
    if (word) { i += [...word].length; continue; }
    if (table.has(chars[i]) && !READ_THE_COMMON_WAY.has(chars[i])) unchecked.push(`${l.title}:${chars.slice(Math.max(0, i - 2), i + 3).join('')}`);
    i++;
  }
}
check('no character with several readings is left to chance', unchecked.length === 0, unchecked);
check('早上 / 晚上 / 爸爸 / 媽媽 in a text get their light second syllable', LIBRARY_LESSONS.every(l =>
  ['早上', '晚上', '爸爸', '媽媽', '奶奶', '名字', '覺得'].every(w => !l.content.includes(w) || l.vocabulary.includes(w) || l.textReadings?.[w])));

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
