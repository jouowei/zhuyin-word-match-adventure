// Lessons by school term: 一年級上學期 … 六年級下學期, and the rest.
import { chineseNumeral, lessonNumber, lessonShelves, termLabel, termShort } from '../services/lessonShelf.ts';
import { Lesson } from '../types.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };

check('numerals', [1, 9, 10, 11, 12, 20, 21, 99].map(chineseNumeral).join() === '一,九,十,十一,十二,二十,二十一,九十九', [1, 9, 10, 11, 12, 20, 21, 99].map(chineseNumeral));
check('term labels', termLabel(1, 'up') === '一年級上學期' && termLabel(6, 'down') === '六年級下學期' && termShort(3, 'down') === '三下');
check('lesson number', lessonNumber({ order: 12 }) === '第十二課' && lessonNumber({}) === '');

const lesson = (id: string, extra: Partial<Lesson> = {}): Lesson => ({ id, title: id, content: '', vocabulary: [], ...extra });
const lessons = [
  lesson('a', { grade: 1, term: 'up', order: 3 }),
  lesson('b', { grade: 1, term: 'up', order: 1 }),
  lesson('c', { grade: 1, term: 'up' }),
  lesson('d', { grade: 2, term: 'down', order: 2 }),
  lesson('e'),
  lesson('f', { grade: 1 }), // No term: not on a term shelf
];
const shelves = lessonShelves(lessons);
check('twelve terms in order, then the rest', shelves.length === 13 && shelves[0].label === '一年級上學期' && shelves[1].label === '一年級下學期' && shelves[11].label === '六年級下學期' && shelves[12].label === '其他課文');
check('lessons by number, unnumbered last', shelves[0].lessons.map(l => l.id).join() === 'b,a,c', shelves[0].lessons.map(l => l.id));
check('each on its own term', shelves[3].lessons.map(l => l.id).join() === 'd' && shelves[2].lessons.length === 0);
check('without a grade and term: 其他課文', shelves[12].lessons.map(l => l.id).join() === 'e,f');
check('no 其他課文 shelf when every lesson has a term', lessonShelves([lessons[0]]).length === 12);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
