import { Lesson } from '../types';
import { GRADES_1_2 } from './grade1-2';
import { GRADES_3_4 } from './grade3-4';
import { GRADES_5_6 } from './grade5-6';

/**
 * Short texts written for this app (not from any textbook), for 練習課文 when a family hasn't typed its own.
 * Four a term; length and words grow with the school term, the way the readers do.
 *
 * Pages are split with ===. In the text, a character with several readings is inside a vocabulary word (its reading
 * comes from 萌典), inside a phrase given in textReadings, or read the common way, which the font shows by default;
 * tests/lesson-library.test.ts checks this.
 */
export const LIBRARY_LESSONS: Lesson[] = [...GRADES_1_2, ...GRADES_3_4, ...GRADES_5_6];
