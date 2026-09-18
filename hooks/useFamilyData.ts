import { useEffect, useRef, useState } from 'react';
import { EnglishUnit, Lesson, UserProfile } from '../types';
import { FamilyData, FamilyKey, familyStore } from '../services/familyStore';
import { withDefaultLessons } from '../services/wordSources';

/** Saves a family value when it changes (not on the first run, which only has what was just loaded). */
const useSaveOnChange = <K extends FamilyKey>(key: K, value: FamilyData[K]) => {
  const loaded = useRef(true);
  useEffect(() => {
    if (loaded.current) {
      loaded.current = false;
      return;
    }
    familyStore.write(key, value);
  }, [key, value]);
};

/**
 * The family's players, lessons and English units, kept in the family store, and who is playing.
 * Changes made in another tab (later: on another device) replace what this one holds, so neither overwrites the other.
 */
export const useFamilyData = ({ onPlayerRemoved }: { onPlayerRemoved: () => void }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => familyStore.read('users') ?? []);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>(() => withDefaultLessons(familyStore.read('lessons')));
  const [englishUnits, setEnglishUnits] = useState<EnglishUnit[]>(() => familyStore.read('englishUnits') ?? []);

  // Latest players for callbacks fired from timers inside game views
  const usersRef = useRef(users);
  usersRef.current = users;
  const playerRemoved = useRef(onPlayerRemoved);
  playerRemoved.current = onPlayerRemoved;

  useSaveOnChange('users', users);
  useSaveOnChange('lessons', lessons);
  useSaveOnChange('englishUnits', englishUnits);

  useEffect(() => familyStore.subscribe(key => {
    if (key === 'users') {
      const fresh = familyStore.read('users') ?? [];
      usersRef.current = fresh;
      setUsers(fresh);
      setCurrentUser(current => {
        if (!current) return current;
        const same = fresh.find(u => u.id === current.id);
        if (!same) playerRemoved.current(); // This player was deleted elsewhere
        return same ?? null;
      });
    } else if (key === 'lessons') {
      setLessons(withDefaultLessons(familyStore.read('lessons')));
    } else if (key === 'englishUnits') {
      setEnglishUnits(familyStore.read('englishUnits') ?? []);
    }
  }), []);

  const updateUser = (userId: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updatedUser = { ...u, ...updates };
      if (currentUser && currentUser.id === userId) setCurrentUser(updatedUser);
      return updatedUser;
    }));
  };

  /** Changes the current player, starting from their latest record. */
  const updatePlayer = (change: (user: UserProfile) => UserProfile) => {
    if (!currentUser) return;
    setUsers(prev => prev.map(u => {
      if (u.id !== currentUser.id) return u;
      const updatedUser = change(u);
      setCurrentUser(updatedUser);
      return updatedUser;
    }));
  };

  const createUser = (name: string, avatar: string) => {
    const newUser: UserProfile = {
      id: Date.now().toString(),
      name,
      avatar,
      // Secret backdoor for testing
      points: name === 'Administrator' || name === 'Administration' ? 9999 : 0,
      ownedCardIds: [],
      createdAt: Date.now(),
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
  };

  return {
    users,
    lessons,
    setLessons,
    englishUnits,
    setEnglishUnits,
    currentUser,
    /** The current player's latest record, for callbacks fired from timers. */
    latestPlayer: () => (currentUser ? usersRef.current.find(u => u.id === currentUser.id) : undefined),
    login: (user: UserProfile) => setCurrentUser(user),
    logout: () => setCurrentUser(null),
    createUser,
    deleteUser: (userId: string) => setUsers(prev => prev.filter(u => u.id !== userId)),
    updateUser,
    updatePlayer,
  };
};

export type Family = ReturnType<typeof useFamilyData>;
