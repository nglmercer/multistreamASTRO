// src/IndexedDBManager.ts
import type { BaseMessage, StoreConfig, QueryOptions, SearchOptions, GlobalStats } from './Types';
import { ObjectStoreRepository } from './ObjectStoreRepository';

export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private stores = new Map<string, ObjectStoreRepository<any>>();
  private dbName: string;
  private version: number;
  private pendingStoreConfigs: StoreConfig[] = []; // Para stores a crear/actualizar

  constructor(dbName: string = 'AppGenericData', version: number = 1) {
    this.dbName = dbName;
    this.version = version; // Esta será la versión base, se incrementará si se añaden stores.
  }

  /**
   * Gets the current version of the database if it exists
   */
  private async getCurrentDbVersion(): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const currentVersion = db.version;
        db.close();
        resolve(currentVersion);
      };
      
      request.onerror = () => {
        // Database doesn't exist, so version 0
        resolve(0);
      };
      
      request.onupgradeneeded = (event) => {
        // This means we're creating a new database or upgrading
        const db = (event.target as IDBOpenDBRequest).result;
        const currentVersion = event.oldVersion;
        db.close();
        resolve(currentVersion);
      };
    });
  }

  /**
   * Initializes the database connection.
   * Must be called before any other database operations.
   * If new stores are defined via `configureStores` before initialization,
   * it will attempt to create them.
   */
  async initialize(): Promise<void> {
    if (this.db) return Promise.resolve();

    // Get current database version first
    const currentDbVersion = await this.getCurrentDbVersion();
    
    // Use the higher of the two versions
    const targetVersion = Math.max(this.version, currentDbVersion);
    
    // If we have pending stores and the database exists, we need to increment version
    if (this.pendingStoreConfigs.length > 0 && currentDbVersion > 0) {
      this.version = currentDbVersion + 1;
    } else if (currentDbVersion > 0) {
      this.version = currentDbVersion;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => reject(new Error(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error?.message}`));
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log(`Database '${this.dbName}' opened successfully, version ${this.db.version}.`);
        
        // Initialize repositories for existing stores
        for (const storeName of this.db.objectStoreNames) {
          if (!this.stores.has(storeName)) {
            const config = this.pendingStoreConfigs.find(c => c.storeName === storeName) || { storeName };
            this.stores.set(storeName, new ObjectStoreRepository(this.db, config));
          }
        }
        this.pendingStoreConfigs = []; 
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log(`Upgrading database '${this.dbName}' from version ${event.oldVersion} to ${event.newVersion}.`);
        this.db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        if (!transaction) {
          console.error("Upgrade transaction is null. Cannot create/update stores.");
          reject(new Error("Database upgrade failed: transaction is null."));
          return;
        }

        this.pendingStoreConfigs.forEach(config => {
          const explicitlyDefinedIndexNames = new Set(config.indexes?.map(idx => idx.name.toLowerCase()));

          if (!this.db!.objectStoreNames.contains(config.storeName)) {
            console.log(`Creating object store: ${config.storeName}`);
            const store = this.db!.createObjectStore(config.storeName, { 
              keyPath: config.keyPath || 'id',
              autoIncrement: config.autoIncrement || false,
            });

            // Create default 'timestamp' index if not explicitly defined
            if (!explicitlyDefinedIndexNames.has('timestamp')) {
                console.log(`Creating default 'timestamp' index for new store '${config.storeName}'.`);
                try {
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                } catch (e) {
                    const isConstraintErrorOnKeyPath = e instanceof DOMException && 
                                                       e.name === 'ConstraintError' && 
                                                       (config.keyPath === 'timestamp' || (Array.isArray(config.keyPath) && config.keyPath.includes('timestamp')));
                    if (!isConstraintErrorOnKeyPath) {
                        console.warn(`Could not create default 'timestamp' index for new store '${config.storeName}': ${(e as Error).message}.`);
                    }
                }
            }

            // Create all explicitly defined indexes
            config.indexes?.forEach(indexConfig => {
              try {
                store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
                console.log(`Created index '${indexConfig.name}' on '${config.storeName}'.`);
              } catch (e) {
                console.warn(`Could not create index '${indexConfig.name}' for store '${config.storeName}': ${(e as Error).message}. (It might already exist)`);
              }
            });
          } else {
            // Store exists, add missing indexes
            //  console.log(`Store ${config.storeName} already exists. Checking for missing indexes.`);
            const existingStore = transaction.objectStore(config.storeName);
            const existingIndexNames = new Set<string>();
            for(let i = 0; i < existingStore.indexNames.length; i++) {
                existingIndexNames.add(existingStore.indexNames[i].toLowerCase());
            }

            // Create default 'timestamp' index if missing
            if (!existingIndexNames.has('timestamp') && !explicitlyDefinedIndexNames.has('timestamp')) {
                console.log(`Creating default 'timestamp' index for existing store '${config.storeName}'.`);
                try {
                    existingStore.createIndex('timestamp', 'timestamp', { unique: false });
                } catch (e) {
                    console.warn(`Could not create default 'timestamp' index for existing store '${config.storeName}': ${(e as Error).message}.`);
                }
            }
            
            // Create missing indexes from configuration
            config.indexes?.forEach(indexConfig => {
                if (!existingIndexNames.has(indexConfig.name.toLowerCase())) {
                    try {
                        existingStore.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
                        console.log(`Created missing index '${indexConfig.name}' on existing store '${config.storeName}'.`);
                    } catch (e) {
                        console.warn(`Could not create missing index '${indexConfig.name}' for store '${config.storeName}': ${(e as Error).message}.`);
                    }
                }
            });
          }
        });
      };

      request.onblocked = () => {
        console.warn(`Database opening blocked. Close other connections to '${this.dbName}' and try again.`);
        reject(new Error(`Database opening blocked. Close other connections to '${this.dbName}' and try again.`));
      };
    });
  }

  /**
   * Pre-configures stores. These will be created or updated during `initialize()`
   * or can be used by `createStoreIfNotExists` later.
   * Call this *before* `initialize()` if you want stores created on initial setup.
   */
  public configureStores(storeConfigs: StoreConfig[]): void {
    storeConfigs.forEach(config => {
        // Avoid duplicates, update if configuration already exists
        const existingIndex = this.pendingStoreConfigs.findIndex(sc => sc.storeName === config.storeName);
        if (existingIndex > -1) {
            this.pendingStoreConfigs[existingIndex] = config;
        } else {
            this.pendingStoreConfigs.push(config);
        }
    });
  }

  /**
   * Gets or creates an ObjectStoreRepository for the given configuration.
   * If the store does not exist in the database, it will attempt to create it,
   * which involves incrementing the database version and re-opening it.
   */
  async getOrCreateStore<T extends BaseMessage>(config: StoreConfig): Promise<ObjectStoreRepository<T>> {
    if (!this.db) {
      // Database not initialized, add to pending and initialize
      this.configureStores([config]);
      await this.initialize();
    } else if (!this.db.objectStoreNames.contains(config.storeName)) {
      // Store doesn't exist, need version upgrade
      this.pendingStoreConfigs.push(config);
      const newVersion = this.db.version + 1;
      this.db.close();
      this.db = null;
      this.stores.clear();
      this.version = newVersion;
      
      console.log(`Attempting to create new store '${config.storeName}', upgrading DB to version ${newVersion}.`);
      await this.initialize();
    }
    
    // At this point, store should exist
    let repository = this.stores.get(config.storeName);
    if (!repository) {
        if (this.db && this.db.objectStoreNames.contains(config.storeName)) {
            repository = new ObjectStoreRepository<T>(this.db, config);
            this.stores.set(config.storeName, repository);
        } else {
            throw new Error(`Failed to create or find store repository for '${config.storeName}' after DB operations.`);
        }
    }
    return repository as ObjectStoreRepository<T>;
  }

  getStore<T extends BaseMessage>(storeName: string): ObjectStoreRepository<T> | undefined {
    if (!this.db) {
      console.warn('Database not initialized. Call initialize() first.');
      return undefined;
    }
    return this.stores.get(storeName) as ObjectStoreRepository<T> | undefined;
  }

  getAllStoreNames(): string[] {
    if (!this.db) return [];
    return Array.from(this.db.objectStoreNames);
  }

  async globalSearch<T extends BaseMessage>(options: SearchOptions<T>): Promise<T[]> {
    if (!this.db) return Promise.reject(new Error('Database not initialized.'));
    
    const allResults: T[] = [];
    for (const storeRepo of this.stores.values()) {
      try {
        const storeResults = await (storeRepo as ObjectStoreRepository<T>).search(options);
        allResults.push(...storeResults);
      } catch (error) {
        console.warn(`Error searching in store ${storeRepo['config'].storeName}:`, error);
      }
    }

    // Sort globally by timestamp and apply global limit
    allResults.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return allResults.slice(0, options.limit || 100);
  }

  async getGlobalStats(): Promise<GlobalStats> {
    if (!this.db) return Promise.reject(new Error('Database not initialized.'));

    const stats: GlobalStats = {
      totalMessages: 0,
      stores: {},
      overallTimeRange: { oldest: Infinity, newest: 0 }
    };

    for (const [name, repo] of this.stores.entries()) {
      const storeStats = await repo.getStats();
      stats.stores[name] = storeStats;
      stats.totalMessages += storeStats.count;
      
      if (storeStats.oldestMessageTimestamp !== undefined && storeStats.oldestMessageTimestamp < stats.overallTimeRange!.oldest) {
        stats.overallTimeRange!.oldest = storeStats.oldestMessageTimestamp;
      }
      if (storeStats.newestMessageTimestamp !== undefined && storeStats.newestMessageTimestamp > stats.overallTimeRange!.newest) {
        stats.overallTimeRange!.newest = storeStats.newestMessageTimestamp;
      }
    }
    if (stats.overallTimeRange?.oldest === Infinity) {
        delete stats.overallTimeRange;
    }

    return stats;
  }

  async cleanupAllStores(): Promise<Record<string, number>> {
    if (!this.db) return Promise.reject(new Error('Database not initialized.'));
    
    const results: Record<string, number> = {};
    for (const [name, repo] of this.stores.entries()) {
      try {
        results[name] = await repo.cleanup();
      } catch (error) {
        console.warn(`Error cleaning up store ${name}:`, error);
        results[name] = -1;
      }
    }
    return results;
  }

  /**
   * Deletes the entire database. Use with caution!
   */
  async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.stores.clear();
      }
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => {
        console.log(`Database ${this.dbName} deleted successfully.`);
        resolve();
      };
      deleteRequest.onerror = (event) => {
        console.error(`Error deleting database ${this.dbName}:`, (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
      deleteRequest.onblocked = () => {
        console.warn(`Database ${this.dbName} delete blocked. Close other connections.`);
        reject(new Error(`Database ${this.dbName} delete blocked. Close other connections.`));
      };
    });
  }

  /**
   * Forces a database version reset by deleting and recreating
   * Use this if you're getting persistent version conflicts
   */
  async resetDatabase(): Promise<void> {
    console.log(`Resetting database '${this.dbName}'...`);
    await this.deleteDatabase();
    this.version = 1; // Reset to initial version
    await this.initialize();
  }
}