// Speaking games: what the recognizer writes is compared by sound, leniently, the way children speak.
import { pinyin } from 'pinyin-pro';
import { normalizeSyllable, saidWord, saidZhuyin, ZHUYIN_SAID } from '../services/speechMatch.ts';
import { ZHUYIN_SYMBOLS } from '../zhuyin/symbols.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const toPinyin = (text: string) => pinyin(text, { toneType: 'none', type: 'array', v: true }) as string[];

check('every zhuyin symbol has its sounds', ZHUYIN_SYMBOLS.every(s => ZHUYIN_SAID[s.symbol]?.length), ZHUYIN_SYMBOLS.filter(s => !ZHUYIN_SAID[s.symbol]).map(s => s.symbol));
check('merged sounds', normalizeSyllable('zhi') === 'zi' && normalizeSyllable('sheng') === 'sen' && normalizeSyllable('xing') === 'xin' && normalizeSyllable('lü') === 'lv');

// ㄆ said by a child: the recognizer writes a character that sounds like it
check('ㄆ heard as 婆 / 破 / 潑 / 噗', ['婆', '破', '潑', '噗'].every(t => saidZhuyin('ㄆ', [t], toPinyin)));
check('ㄆ heard as the letter p or po', saidZhuyin('ㄆ', ['p'], toPinyin) && saidZhuyin('ㄆ', ['Po'], toPinyin));
check('ㄆ written as ㄆ', saidZhuyin('ㄆ', ['ㄆ'], toPinyin));
check('ㄆ is not ㄅ', !saidZhuyin('ㄆ', ['波'], toPinyin) && !saidZhuyin('ㄆ', ['b'], toPinyin));
check('any of the guesses counts', saidZhuyin('ㄇ', ['你好', '摸'], toPinyin));
check('ㄓ said like ㄗ is fine', saidZhuyin('ㄓ', ['資'], toPinyin) && saidZhuyin('ㄕ', ['思'], toPinyin));
check('ㄥ said like ㄣ is fine', saidZhuyin('ㄥ', ['恩'], toPinyin));
check('vowels', saidZhuyin('ㄚ', ['啊'], toPinyin) && saidZhuyin('ㄧ', ['一'], toPinyin) && saidZhuyin('ㄩ', ['魚'], toPinyin) && saidZhuyin('ㄦ', ['兒'], toPinyin));
// What recognizers typically write when a child says each symbol
const HEARD: Record<string, string> = {
  ㄅ: '波播伯', ㄆ: '婆破潑', ㄇ: '摸魔末', ㄈ: '佛福', ㄉ: '得的德', ㄊ: '特', ㄋ: '呢', ㄌ: '樂了', ㄍ: '哥個', ㄎ: '科可', ㄏ: '喝和',
  ㄐ: '雞基', ㄑ: '七期', ㄒ: '西吸', ㄓ: '知之', ㄔ: '吃池', ㄕ: '師是', ㄖ: '日', ㄗ: '資字', ㄘ: '詞次', ㄙ: '思四',
  ㄧ: '衣一', ㄨ: '屋五', ㄩ: '魚雨', ㄚ: '啊阿', ㄛ: '喔哦', ㄜ: '鵝餓', ㄝ: '耶欸', ㄞ: '愛哀', ㄟ: '欸誒', ㄠ: '熬奧', ㄡ: '歐偶',
  ㄢ: '安暗', ㄣ: '恩嗯', ㄤ: '昂', ㄥ: '鞥嗯', ㄦ: '兒二',
};
const missed = Object.entries(HEARD).flatMap(([symbol, chars]) => [...chars].filter(c => !saidZhuyin(symbol, [c], toPinyin)).map(c => symbol + c));
check('every symbol, said by a child, is heard as itself', missed.length === 0, missed);
check('nothing heard is not a match', !saidZhuyin('ㄆ', [''], toPinyin) && !saidZhuyin('ㄆ', [], toPinyin));
check('a different sound is not a match', !saidZhuyin('ㄆ', ['貓'], toPinyin));

// Words
check('the word itself', saidWord('小船', ['小船'], toPinyin));
check('a homophone', saidWord('小船', ['小川'], toPinyin));
check('inside a longer sentence', saidWord('快樂', ['我很快樂喔'], toPinyin));
check('taiwanese merges', saidWord('老師', ['老絲'], toPinyin) && saidWord('星星', ['心心'], toPinyin));
check('wrong word', !saidWord('小船', ['小魚'], toPinyin));
check('sounds out of order', !saidWord('快樂', ['樂快'], toPinyin));

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
