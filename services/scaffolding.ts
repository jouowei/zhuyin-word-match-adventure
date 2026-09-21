/**
 * Contingent help (Wood, Bruner & Ross 1976; Wood & Middleton 1975):
 * every wrong try on an item adds one level of help, and the next time the item comes up
 * the help is gone again, so the child first tries on their own.
 */
export const HELP_RETRY = 1;  // Name the wrong choice and let the child hear the question again
export const HELP_NARROW = 2; // Leave fewer choices
export const HELP_SHOW = 3;   // Show the answer; the child still taps or says it

export const nextHelp = (level: number) => Math.min(HELP_SHOW, level + 1);

/** Same rule in every game: answering on your own is what earns points. */
export const POINTS_ON_OWN = 10;
export const POINTS_WITH_HELP = 2;
export const MASTERY_BONUS = 20;

export const pointsFor = (helpLevel: number) => (helpLevel === 0 ? POINTS_ON_OWN : POINTS_WITH_HELP);

export const POINTS_RULE = `自己答對 +${POINTS_ON_OWN} 分・用了提示 +${POINTS_WITH_HELP} 分・學會一個字 +${MASTERY_BONUS} 分`;

export type PraiseKind = 'look' | 'listen' | 'spell' | 'say' | 'write';

// Praise what the child did, not how clever they are (Mueller & Dweck 1998)
const ON_OWN: Record<PraiseKind, string> = {
  look: '自己找到了！',
  listen: '你聽得好仔細！',
  spell: '自己拼出來了！',
  say: '我聽到了，唸得很清楚！',
  write: '一筆一筆寫好了！',
};

export const correctMessage = (helpLevel: number, kind: PraiseKind) =>
  helpLevel === 0 ? `${ON_OWN[kind]} +${POINTS_ON_OWN}分` : `完成了！ +${POINTS_WITH_HELP}分`;

/**
 * 亂猜不會比較快: guessing through the choices is the fastest way out when every try narrows them down, so an item
 * the child needed two or more tries for is asked once more, at the end of the round, before it counts.
 */
export const needsOneMoreTry = (helpLevel: number) => helpLevel >= HELP_NARROW;
export const ONE_MORE_TRY = '這題等一下再考一次喔！';

/** Wrong choices to hide at HELP_NARROW: all but one, keeping one the child hasn't tried yet when possible. */
export const choicesToHide = <T,>(wrong: T[], tried: T[] = []): T[] => {
  const untried = wrong.filter(item => !tried.includes(item));
  const pool = untried.length ? untried : wrong;
  const keep = pool[Math.floor(Math.random() * pool.length)];
  return wrong.filter(item => item !== keep);
};
