// familyStore against a fake browser: saving, reading, and hearing about changes from another tab.
const memory = new Map<string, string>();
const listeners: ((e: { key: string | null }) => void)[] = [];
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
  addEventListener: (type: string, fn: (e: { key: string | null }) => void) => { if (type === 'storage') listeners.push(fn); },
  removeEventListener: (type: string, fn: (e: { key: string | null }) => void) => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  },
};

const { familyStore } = await import('../services/familyStore');
const { checkParentPassword, clearParentPassword, hasParentPassword, setParentPassword } = await import('../services/parentLock');

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };

check('nothing saved yet', familyStore.read('users') === null);
const users = [{ id: 'u1', name: '小安', avatar: '🦖', points: 12, ownedCardIds: [] }] as any;
check('write', familyStore.write('users', users));
check('same key as before 2.1 (existing progress still loads)', memory.has('zhuyin_users'));
check('read back', familyStore.read('users')?.[0].name === '小安');
familyStore.remove('users');
check('remove', familyStore.read('users') === null);

memory.set('zhuyin_lessons', '{not json');
check('broken data reads as nothing', familyStore.read('lessons') === null);

const heard: string[] = [];
const stop = familyStore.subscribe(key => heard.push(key));
listeners.forEach(fn => fn({ key: 'zhuyin_users' }));
listeners.forEach(fn => fn({ key: 'english_custom_units' }));
listeners.forEach(fn => fn({ key: 'gemini_api_key' }));
check('other tabs\' changes are passed on by family key', heard.join(',') === 'users,englishUnits', heard);
stop();
listeners.forEach(fn => fn({ key: 'zhuyin_users' }));
check('unsubscribe', heard.length === 2);

check('parent password goes through the store', setParentPassword('4321') && memory.has('zhuyin_parent_lock') && hasParentPassword());
check('parent password check', checkParentPassword('4321') && !checkParentPassword('1234'));
clearParentPassword();
check('parent password cleared', !hasParentPassword());

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
