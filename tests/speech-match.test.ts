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
check('ㄆ is not ㄇ or ㄉ', !saidZhuyin('ㄆ', ['摸'], toPinyin) && !saidZhuyin('ㄆ', ['的'], toPinyin) && !saidZhuyin('ㄆ', ['m'], toPinyin));

// Said on its own, a sound comes back as a neighbouring one: these count
check('ㄨ heard as 福 (reported by a parent) / 呼 / 我', ['福', '呼', '我'].every(t => saidZhuyin('ㄨ', [t], toPinyin)));
check('ㄈ heard as 屋', saidZhuyin('ㄈ', ['屋'], toPinyin));
check('ㄅ and ㄆ mixed up', saidZhuyin('ㄆ', ['波'], toPinyin) && saidZhuyin('ㄅ', ['破'], toPinyin));
check('the vowel after a consonant can be short: 他 for ㄊ, 那 for ㄋ, 八 for ㄅ', saidZhuyin('ㄊ', ['他'], toPinyin) && saidZhuyin('ㄋ', ['那'], toPinyin) && saidZhuyin('ㄅ', ['八'], toPinyin));
check('ㄟ heard as 喂, ㄠ as 好', saidZhuyin('ㄟ', ['喂'], toPinyin) && saidZhuyin('ㄠ', ['好'], toPinyin));
// ...but a clearly different sound doesn't
const notThese: [string, string][] = [['ㄨ', '媽'], ['ㄨ', '一'], ['ㄅ', '的'], ['ㄇ', '你'], ['ㄚ', '一'], ['ㄧ', '啊'], ['ㄢ', '一'], ['ㄏ', '媽'], ['ㄐ', '字'], ['ㄙ', '雞'], ['ㄖ', '是'], ['ㄩ', '一']];
const wronglyAccepted = notThese.filter(([symbol, heard]) => saidZhuyin(symbol, [heard], toPinyin));
check('clearly different sounds are not accepted', wronglyAccepted.length === 0, wronglyAccepted);
const everyday = '就在人要會說上來們中'.split('');
const acceptedEveryday = everyday.filter(c => Object.keys(ZHUYIN_SAID).some(symbol => saidZhuyin(symbol, [c], toPinyin)));
check('everyday words are not taken for a symbol', acceptedEveryday.length === 0, acceptedEveryday);
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
