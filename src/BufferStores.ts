export interface BufferStore {
  init(): Promise<void>

  save(buffer: ArrayBuffer): Promise<void>

  getAll(): Promise<any[]>

  clear(): Promise<void>
}

export class IndexedDBBuffer implements BufferStore {
  private static dbName = 'wsBufferDB';
  private static storeName = 'audioChunks';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    this.db = await this.open();
    if (!this.db.objectStoreNames.contains(IndexedDBBuffer.storeName)) {
      const upgraded = await this.open(this.db.version + 1);
      this.db.close();
      this.db = upgraded;
    }
  }

  private open(version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IndexedDBBuffer.dbName, version);
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IndexedDBBuffer.storeName)) {
          db.createObjectStore(IndexedDBBuffer.storeName, {autoIncrement: true});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private get store() {
    if (!this.db) throw new Error('BufferStore not initialized');
    return this.db.transaction(IndexedDBBuffer.storeName, 'readwrite').objectStore(IndexedDBBuffer.storeName);
  }

  async save(buffer: ArrayBuffer) {
    try {
      this.store.add({buffer, ts: Date.now()});
    } catch (err) {
      console.warn('Buffer save failed', err);
    }
  }

  getAll(): Promise<any[]> {
    return new Promise(resolve => {
      const req = this.store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  async clear() {
    this.store.clear();
  }
}


export class InMemoryBuffer implements BufferStore {
  private buffers: Array<{ buffer: ArrayBuffer }> = [];

  async init() {
  }

  async save(buffer: ArrayBuffer) {
    this.buffers.push({buffer});
  }

  async getAll() {
    return this.buffers;
  }

  async clear() {
    this.buffers = [];
  }
}
