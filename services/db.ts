
const DB_NAME = 'ZhuyinAdventureDB';
const IMAGE_STORE_NAME = 'images';
const AUDIO_STORE_NAME = 'audio';
const METADATA_STORE_NAME = 'metadata';
const DB_VERSION = 3;

// Open (or create) the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is supported
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.createObjectStore(METADATA_STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Save image to database
export const cacheImage = async (word: string, base64: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.put(base64, word);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving to DB:', error);
    // Fail silently so the app keeps working even if DB fails
    return Promise.resolve();
  }
};

// Retrieve image from database
export const getCachedImage = async (word: string): Promise<string | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.get(word);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error reading from DB:', error);
    return undefined;
  }
};

// Save audio to database
export const cacheAudio = async (key: string, base64: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      const request = store.put(base64, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving audio to DB:', error);
    return Promise.resolve();
  }
};

// Retrieve audio from database
export const getCachedAudio = async (key: string): Promise<string | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error reading audio from DB:', error);
    return undefined;
  }
};

export interface MetadataItem {
  character: string;
  zhuyin: string;
  emoji: string;
}

// Save metadata to database
export const cacheMetadata = async (word: string, data: MetadataItem): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const request = store.put(data, word);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving metadata to DB:', error);
    return Promise.resolve();
  }
};

// Dictionary (萌典) entries share the metadata store; `null` heteronyms means "not in the dictionary"
export const cacheDictionaryEntry = async (word: string, heteronyms: { zhuyin: string; audioId?: string }[] | null): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE_NAME], 'readwrite');
      const request = transaction.objectStore(METADATA_STORE_NAME).put({ heteronyms }, `moedict:${word}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving dictionary entry to DB:', error);
  }
};

export const getCachedDictionaryEntry = async (word: string): Promise<{ heteronyms: { zhuyin: string; audioId?: string }[] | null } | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE_NAME], 'readonly');
      const request = transaction.objectStore(METADATA_STORE_NAME).get(`moedict:${word}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error reading dictionary entry from DB:', error);
    return undefined;
  }
};

// Retrieve metadata from database
export const getCachedMetadata = async (word: string): Promise<MetadataItem | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE_NAME], 'readonly');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const request = store.get(word);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error reading metadata from DB:', error);
    return undefined;
  }
};
