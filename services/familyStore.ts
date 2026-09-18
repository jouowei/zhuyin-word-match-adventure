import { EnglishUnit, Lesson, ParentLockRecord, UserProfile } from '../types';

/**
 * Where the family's data is kept. For now it is this browser's localStorage; a store synced with a family code
 * can take its place later without the rest of the app changing.
 * Changes made elsewhere (another tab now, another device once synced) are passed on, so two open tabs
 * no longer overwrite each other's players.
 */
export interface FamilyData {
  users: UserProfile[];
  lessons: Lesson[];
  englishUnits: EnglishUnit[];
  parentLock: ParentLockRecord;
}
export type FamilyKey = keyof FamilyData;

export interface FamilyStore {
  read<K extends FamilyKey>(key: K): FamilyData[K] | null;
  /** False when the device won't store it (private browsing, storage full). */
  write<K extends FamilyKey>(key: K, value: FamilyData[K]): boolean;
  remove(key: FamilyKey): void;
  /** Called with the key whenever that data changed somewhere else. */
  subscribe(listener: (key: FamilyKey) => void): () => void;
}

const STORAGE_KEYS: Record<FamilyKey, string> = {
  users: 'zhuyin_users',
  lessons: 'zhuyin_lessons',
  englishUnits: 'english_custom_units',
  parentLock: 'zhuyin_parent_lock',
};

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const localFamilyStore: FamilyStore = {
  read(key) {
    if (!hasStorage()) return null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS[key]);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error(`讀取 ${key} 失敗`, e);
      return null;
    }
  },
  write(key, value) {
    if (!hasStorage()) return false;
    try {
      window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`儲存 ${key} 失敗`, e);
      return false;
    }
  },
  remove(key) {
    if (!hasStorage()) return;
    try {
      window.localStorage.removeItem(STORAGE_KEYS[key]);
    } catch (e) {
      // Nothing stored
    }
  },
  subscribe(listener) {
    if (typeof window === 'undefined') return () => {};
    const keys = Object.keys(STORAGE_KEYS) as FamilyKey[];
    const onStorage = (e: StorageEvent) => {
      const key = keys.find(k => STORAGE_KEYS[k] === e.key);
      if (key) listener(key);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};

export const familyStore: FamilyStore = localFamilyStore;
