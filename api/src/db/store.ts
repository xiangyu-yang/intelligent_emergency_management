import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'iem.json');

interface StoreData {
  knowledgeBase: Record<string, any>;
  chatSessions: Record<string, any>;
  configs: Record<string, any>;
  files: Record<string, any>;
  [key: string]: Record<string, any>;
}

let storeData: StoreData = {
  knowledgeBase: {},
  chatSessions: {},
  configs: {},
  files: {},
};

let saveTimer: NodeJS.Timeout | null = null;

export function initStore() {
  console.log('[Store] Initializing JSON store at:', STORE_FILE);

  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }

  if (fs.existsSync(STORE_FILE)) {
    try {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      storeData = {
        knowledgeBase: loaded.knowledgeBase || {},
        chatSessions: loaded.chatSessions || {},
        configs: loaded.configs || {},
        files: loaded.files || {},
        ...loaded,
      };
      console.log('[Store] Loaded existing data from:', STORE_FILE);
    } catch (err) {
      console.error('[Store] Failed to load store file:', err);
    }
  }
}

function scheduleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveStore();
    saveTimer = null;
  }, 500);
}

function saveStore() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(storeData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Failed to save store:', err);
  }
}

function ensureCollection(collection: string) {
  if (!storeData[collection]) {
    storeData[collection] = {};
  }
}

export const jsonStore = {
  get(collection: string, id: string): any | undefined {
    ensureCollection(collection);
    return storeData[collection][id];
  },

  getAll(collection: string): any[] {
    ensureCollection(collection);
    return Object.values(storeData[collection]);
  },

  find(collection: string, predicate: (item: any) => boolean): any[] {
    ensureCollection(collection);
    return Object.values(storeData[collection]).filter(predicate);
  },

  findOne(collection: string, predicate: (item: any) => boolean): any | undefined {
    ensureCollection(collection);
    return Object.values(storeData[collection]).find(predicate);
  },

  insert(collection: string, data: any): any {
    ensureCollection(collection);
    const id = data.id || nanoid(12);
    const now = dayjs().toISOString();
    const record = {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };
    storeData[collection][id] = record;
    scheduleSave();
    return record;
  },

  update(collection: string, id: string, data: Partial<any>): any | undefined {
    ensureCollection(collection);
    const existing = storeData[collection][id];
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: dayjs().toISOString(),
    };
    storeData[collection][id] = updated;
    scheduleSave();
    return updated;
  },

  remove(collection: string, id: string): boolean {
    ensureCollection(collection);
    if (!storeData[collection][id]) return false;
    delete storeData[collection][id];
    scheduleSave();
    return true;
  },

  removeBy(collection: string, predicate: (item: any) => boolean): number {
    ensureCollection(collection);
    const items = Object.values(storeData[collection]);
    let count = 0;
    for (const item of items) {
      if (predicate(item)) {
        delete storeData[collection][item.id];
        count++;
      }
    }
    if (count > 0) scheduleSave();
    return count;
  },

  count(collection: string, predicate?: (item: any) => boolean): number {
    ensureCollection(collection);
    if (!predicate) return Object.keys(storeData[collection]).length;
    return Object.values(storeData[collection]).filter(predicate).length;
  },

  exists(collection: string, id: string): boolean {
    ensureCollection(collection);
    return !!storeData[collection][id];
  },

  flush(): void {
    saveStore();
  },
};

export { storeData };
