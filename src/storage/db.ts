/**
 * Local-first persistence.
 *
 * IndexedDB is the primary store; `localStorage` is the fallback for private
 * windows or browsers that refuse to open a database. Whatever happens, a write
 * failure is reported rather than swallowed — the UI turns it into a visible
 * warning instead of pretending the set was saved.
 */

const DB_NAME = "zeus-training";
const DB_VERSION = 1;
const STORE = "state";
const CURRENT_KEY = "current";
const SNAPSHOT_PREFIX = "snapshot:";
const SNAPSHOT_LIMIT = 8;
const SNAPSHOT_INTERVAL_MS = 30 * 60_000;
const LOCAL_KEY = "zeus-training:state";

export type StorageKind = "indexeddb" | "localstorage" | "memory";

let cachedDb: IDBDatabase | null = null;
let kind: StorageKind | null = null;
let memory: unknown = null;
let lastSnapshotAt = 0;

export function storageKind(): StorageKind {
  return kind ?? "memory";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Ouverture IndexedDB refusée"));
    request.onblocked = () => reject(new Error("IndexedDB bloquée par un autre onglet"));
  });
}

async function db(): Promise<IDBDatabase> {
  if (cachedDb) return cachedDb;
  cachedDb = await openDatabase();
  cachedDb.onclose = () => {
    cachedDb = null;
  };
  return cachedDb;
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const tx = database.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = () => reject(tx.error ?? new Error("Transaction annulée"));
        tx.onerror = () => reject(tx.error ?? new Error("Transaction en erreur"));
      }),
  );
}

function readLocal(): unknown {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeLocal(value: unknown): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
}

/** Reads the persisted state, choosing (and remembering) the backing store. */
export async function loadState(): Promise<unknown> {
  try {
    const value = await transact<unknown>("readonly", (store) => store.get(CURRENT_KEY));
    kind = "indexeddb";
    // A previous session may have fallen back to localStorage; do not lose it.
    return value ?? readLocal();
  } catch {
    try {
      const value = readLocal();
      kind = "localstorage";
      return value;
    } catch {
      kind = "memory";
      return memory;
    }
  }
}

/** Writes the state, plus a rolling snapshot at most twice an hour. */
export async function saveState(value: unknown, now: number): Promise<void> {
  memory = value;
  if (kind === "localstorage") {
    writeLocal(value);
    return;
  }
  if (kind === "memory") return;

  try {
    await transact("readwrite", (store) => store.put(value, CURRENT_KEY));
    kind = "indexeddb";
    if (now - lastSnapshotAt > SNAPSHOT_INTERVAL_MS) {
      lastSnapshotAt = now;
      await writeSnapshot(value, now);
    }
  } catch {
    // Fall back once, then keep using the fallback for the rest of the session.
    kind = "localstorage";
    writeLocal(value);
  }
}

async function writeSnapshot(value: unknown, now: number): Promise<void> {
  try {
    await transact("readwrite", (store) => store.put(value, `${SNAPSHOT_PREFIX}${now}`));
    const keys = await transact<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    const snapshots = keys
      .filter((key): key is string => typeof key === "string" && key.startsWith(SNAPSHOT_PREFIX))
      .sort();
    const stale = snapshots.slice(0, Math.max(0, snapshots.length - SNAPSHOT_LIMIT));
    for (const key of stale) {
      await transact("readwrite", (store) => store.delete(key));
    }
  } catch {
    // Snapshots are a convenience, never a reason to fail a save.
  }
}

export type Snapshot = { key: string; date: number; value: unknown };

export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const keys = await transact<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    const snapshotKeys = keys
      .filter((key): key is string => typeof key === "string" && key.startsWith(SNAPSHOT_PREFIX))
      .sort()
      .reverse();
    const result: Snapshot[] = [];
    for (const key of snapshotKeys) {
      const value = await transact<unknown>("readonly", (store) => store.get(key));
      result.push({ key, date: Number(key.slice(SNAPSHOT_PREFIX.length)), value });
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Asks the browser to keep this origin's data out of the eviction queue.
 * Safari in particular clears "best effort" storage for sites unused for a
 * week — installing the app to the home screen plus this call avoids that.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function clearAll(): Promise<void> {
  memory = null;
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
  try {
    await transact("readwrite", (store) => store.clear());
  } catch {
    // ignore
  }
}
