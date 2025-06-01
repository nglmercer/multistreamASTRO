// Types definitions
interface DatabaseConfig {
    name: string;
    version: number;
    store: string;
}

interface DatabaseIndex {
    name: string;
    keyPath: string | string[];
    unique: boolean;
}

interface DatabaseItem {
    id: number;
    [key: string]: any;
}

interface EmitEventData {
    config: DatabaseConfig;
    data: DatabaseItem | number | null;
}

type EventCallback<T = any> = (data: T) => void;
type AllEventsCallback = (event: string, data: any) => void;
type RemoveListenerFunction = () => void;

interface ListenerInfo {
    callback: EventCallback | AllEventsCallback;
    once: boolean;
}

// Database configurations
const databases: Record<string, DatabaseConfig> = {
    commentEventsDB: { name: 'commentEvents', version: 1, store: 'commentEvents' },
    giftEventsDB: { name: 'giftEvents', version: 1, store: 'giftEvents' },
    bitsEventsDB: { name: 'bitsEvents', version: 1, store: 'bitsEvents' },
    likesEventsDB: { name: 'likesEvents', version: 1, store: 'likesEvents' },
    eventsDB: { name: 'Events', version: 1, store: 'events' },
    ActionsDB: { name: 'Actions', version: 1, store: 'actions' },
    banDB: { name: 'Bans', version: 1, store: 'bans' },
};

class IndexedDBManager {
    private dbConfig: DatabaseConfig;
    private emitter: Emitter | null;
    private db: IDBDatabase | null;
    private defaultIndexes: DatabaseIndex[];

    constructor(dbConfig: DatabaseConfig, emitter?: Emitter) {
        this.dbConfig = dbConfig;
        this.emitter = emitter || null;
        this.db = null;
        this.defaultIndexes = [];
    }

    async updateDataById(id: string | number, updatedData: Partial<DatabaseItem>): Promise<DatabaseItem> {
        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store: IDBObjectStore) => {
            return new Promise<DatabaseItem>((resolve, reject) => {
                // Convertir el id a número si es necesario y es requerido por la clave
                const numericId = typeof id === 'number' ? id : Number(id);

                if (isNaN(numericId)) {
                    return reject(new Error(`Invalid id: ${id}. The id must be a valid number.`));
                }

                // Intentar obtener el registro con el id especificado
                const getRequest = store.get(numericId);

                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        // Mezcla los datos existentes con los nuevos datos, manteniendo el id original
                        const newData: DatabaseItem = { ...getRequest.result, ...updatedData, id: numericId };
                        const putRequest = store.put(newData);

                        putRequest.onsuccess = () => {
                            this.emitter?.emit('update', { config: this.dbConfig, data: newData });
                            resolve(newData);
                        };
                        putRequest.onerror = () => reject(putRequest.error);
                    } else {
                        reject(new Error(`No data found with id ${numericId}`));
                    }
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        });
    }

    async getDataById(id: string | number): Promise<DatabaseItem> {
        return this.executeTransaction(this.dbConfig.store, 'readonly', (store: IDBObjectStore) => {
            return new Promise<DatabaseItem>((resolve, reject) => {
                // Convertir el id a número si es necesario
                const numericId = typeof id === 'number' ? id : Number(id);

                if (isNaN(numericId)) {
                    return reject(new Error(`Invalid id: ${id}. The id must be a valid number.`));
                }

                const request = store.get(numericId);

                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        reject(new Error(`No data found with id ${numericId}`));
                    }
                };

                request.onerror = () => reject(request.error);
            });
        });
    }

    async openDatabase(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.dbConfig.name, this.dbConfig.version);
            
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.dbConfig.store)) {
                    // Siempre usar 'id' como keyPath
                    const objectStore = db.createObjectStore(this.dbConfig.store, { 
                        keyPath: 'id', 
                        autoIncrement: false 
                    });
                    
                    this.defaultIndexes.forEach(index => {
                        if (!objectStore.indexNames.contains(index.name)) {
                            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                        }
                    });
                    console.log(`Object store ${this.dbConfig.store} created with indexes.`);
                } else {
                    // Verificar y añadir índices si faltan en una versión existente
                    const transaction = (event.target as IDBOpenDBRequest).transaction;
                    if (transaction) {
                        const objectStore = transaction.objectStore(this.dbConfig.store);
                        this.defaultIndexes.forEach(index => {
                            if (!objectStore.indexNames.contains(index.name)) {
                                objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                                console.log(`Index ${index.name} created for existing store ${this.dbConfig.store}.`);
                            }
                        });
                    }
                }
            };
            
            request.onsuccess = () => { 
                this.db = request.result; 
                resolve(this.db); 
            };
            
            request.onerror = () => { 
                console.error(`IDB Error opening ${this.dbConfig.name}:`, request.error); 
                reject(request.error); 
            };
        });
    }

    async executeTransaction<T>(
        storeName: string, 
        mode: IDBTransactionMode, 
        callback: (store: IDBObjectStore) => T | Promise<T>
    ): Promise<T> {
        try {
            const db = await this.openDatabase();
            
            return new Promise<T>((resolve, reject) => {
                if (!db || !db.objectStoreNames.contains(storeName)) {
                    console.error(`DB not open or store ${storeName} not found`);
                    return reject(new Error(`DB not open or store ${storeName} not found`));
                }

                const transaction = db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);
                let result: T | null = null;

                transaction.oncomplete = () => resolve(result !== null ? result : true as T);
                transaction.onerror = () => { 
                    console.error('IDB Transaction Error:', transaction.error); 
                    reject(transaction.error); 
                };
                transaction.onabort = () => { 
                    console.warn('IDB Transaction Aborted:', transaction.error); 
                    reject(transaction.error || new Error('Transaction aborted')); 
                };

                try {
                    const callbackResult = callback(store);
                    
                    if (callbackResult instanceof Promise) {
                        callbackResult
                            .then(res => { 
                                result = res; 
                            })
                            .catch(err => {
                                console.error("Error inside transaction callback promise:", err);
                                if (!transaction.error) {
                                    transaction.abort();
                                }
                                reject(err);
                            });
                    } else {
                        result = callbackResult;
                    }
                } catch (error) {
                    console.error("Error inside transaction callback sync:", error);
                    if (!transaction.error) {
                        transaction.abort();
                    }
                    reject(error);
                }
            });
        } catch (dbOpenError) {
            console.error("Failed to open DB for transaction:", dbOpenError);
            return Promise.reject(dbOpenError);
        }
    }

    async getAllData(): Promise<DatabaseItem[]> {
        return this.executeTransaction(this.dbConfig.store, 'readonly', (store: IDBObjectStore) => {
            return new Promise<DatabaseItem[]>((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async findMissingIds(allData: DatabaseItem[]): Promise<number[]> {
        const existingIds = allData
            .map(item => Number(item.id))
            .filter(id => !isNaN(id))
            .sort((a, b) => a - b);
        
        const missingIds: number[] = [];
        let expectedId = 0;
        
        for (const id of existingIds) {
            while (expectedId < id) {
                missingIds.push(expectedId);
                expectedId++;
            }
            expectedId = id + 1;
        }
        
        return missingIds;
    }

    async saveData(data: Partial<DatabaseItem>): Promise<DatabaseItem> {
        if (typeof data !== 'object' || data === null) {
            return Promise.reject(new Error("Invalid data: must be an object."));
        }

        const allData = await this.getAllData();
        let targetId: number;
        let isUpdate = false;

        const hasExplicitId = data.id !== undefined && data.id !== null && (typeof data.id === 'number' || !isNaN(Number(data.id)));
        const providedId = Number(data.id);
        
        if (hasExplicitId && !isNaN(providedId) && providedId >= 0) {
            targetId = providedId;
            isUpdate = allData.some(item => Number(item.id) === targetId);
        } else {
            const missingIds = await this.findMissingIds(allData);
            if (missingIds.length > 0) {
                targetId = missingIds[0];
            } else {
                const maxId = allData.length > 0 
                    ? Math.max(-1, ...allData.map(item => Number(item.id)).filter(id => !isNaN(id))) 
                    : -1;
                targetId = maxId + 1;
            }
            isUpdate = false;
        }

        const newData: DatabaseItem = { ...data, id: targetId } as DatabaseItem;
        const actionType = isUpdate ? 'update' : 'save';

        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store: IDBObjectStore) => {
            const request = store.put(newData);
            
            request.onerror = () => {
                console.error("Error in store.put:", request.error);
            };
            
            return newData;
        }).then(savedData => {
            this.emitter?.emit(actionType, { config: this.dbConfig, data: savedData });
            return savedData;
        });
    }

    async deleteData(id: string | number): Promise<number> {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return Promise.reject(new Error(`Invalid id for delete: ${id}`));
        }
        
        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store: IDBObjectStore) => {
            return new Promise<number>((resolve, reject) => {
                const request = store.delete(numericId);
                request.onsuccess = () => resolve(numericId);
                request.onerror = () => reject(request.error);
            });
        }).then(deletedId => {
            this.emitter?.emit('delete', { config: this.dbConfig, data: deletedId });
            return deletedId;
        });
    }

    async clearDatabase(): Promise<void> {
        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store: IDBObjectStore) => {
            return new Promise<void>((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => {
                    this.emitter?.emit('clear', { config: this.dbConfig, data: null });
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    static async getAllOrCreate(
        dbConfig: DatabaseConfig, 
        indexes: DatabaseIndex[] = []
    ): Promise<DatabaseItem[]> {
        return new Promise<DatabaseItem[]>((resolve, reject) => {
            const request = indexedDB.open(dbConfig.name, dbConfig.version);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(dbConfig.store)) {
                    const objectStore = db.createObjectStore(dbConfig.store, { keyPath: 'id' });
                    indexes.forEach(index => {
                        objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                    });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction([dbConfig.store], 'readonly');
                const store = transaction.objectStore(dbConfig.store);
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result);
                    db.close();
                };

                getAllRequest.onerror = () => {
                    reject(getAllRequest.error);
                    db.close();
                };
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

async function getAllDataFromDatabase(databaseConfig: DatabaseConfig): Promise<DatabaseItem[]> {
    if (!databaseConfig || !databaseConfig.name || !databaseConfig.version) {
        console.error("Invalid database configuration:", databaseConfig);
        return [];
    }
    
    return new Promise<DatabaseItem[]>((resolve) => {
        const request = indexedDB.open(databaseConfig.name, databaseConfig.version);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(databaseConfig.store)) {
                db.createObjectStore(databaseConfig.store, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(databaseConfig.store)) {
                db.close();
                resolve([]);
                return;
            }

            const transaction = db.transaction([databaseConfig.store], 'readonly');
            const store = transaction.objectStore(databaseConfig.store);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result);
                db.close();
            };

            getAllRequest.onerror = () => {
                resolve([]);
                db.close();
            };
        };

        request.onerror = () => {
            resolve([]);
        };
    });
}

class Emitter {
    private listeners: Map<string | symbol, ListenerInfo[]>;
    private readonly ALL_EVENTS: symbol;

    constructor() {
        this.listeners = new Map();
        this.ALL_EVENTS = Symbol('ALL_EVENTS');
    }

    on(event: string, callback: EventCallback): RemoveListenerFunction {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push({ callback, once: false });
        
        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                this.listeners.set(event, listeners.filter(
                    listener => listener.callback !== callback
                ));
            }
        };
    }

    once(event: string, callback: EventCallback): RemoveListenerFunction {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push({ callback, once: true });
        
        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                this.listeners.set(event, listeners.filter(
                    listener => listener.callback !== callback
                ));
            }
        };
    }

    onAny(callback: AllEventsCallback): RemoveListenerFunction {
        if (!this.listeners.has(this.ALL_EVENTS)) {
            this.listeners.set(this.ALL_EVENTS, []);
        }
        this.listeners.get(this.ALL_EVENTS)!.push({ callback, once: false });
        
        return () => {
            const listeners = this.listeners.get(this.ALL_EVENTS);
            if (listeners) {
                this.listeners.set(this.ALL_EVENTS, listeners.filter(
                    listener => listener.callback !== callback
                ));
            }
        };
    }

    onceAny(callback: AllEventsCallback): RemoveListenerFunction {
        if (!this.listeners.has(this.ALL_EVENTS)) {
            this.listeners.set(this.ALL_EVENTS, []);
        }
        this.listeners.get(this.ALL_EVENTS)!.push({ callback, once: true });
        
        return () => {
            const listeners = this.listeners.get(this.ALL_EVENTS);
            if (listeners) {
                this.listeners.set(this.ALL_EVENTS, listeners.filter(
                    listener => listener.callback !== callback
                ));
            }
        };
    }

    emit(event: string, data: any): void {
        // Ejecutar listeners específicos del evento
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event)!;
            
            listeners.forEach(listener => {
                (listener.callback as EventCallback)(data);
            });
            
            this.listeners.set(event, listeners.filter(
                listener => !listener.once
            ));
            
            if (this.listeners.get(event)!.length === 0) {
                this.listeners.delete(event);
            }
        }
        
        // Ejecutar listeners que escuchan todos los eventos
        if (this.listeners.has(this.ALL_EVENTS)) {
            const allListeners = this.listeners.get(this.ALL_EVENTS)!;
            
            allListeners.forEach(listener => {
                (listener.callback as AllEventsCallback)(event, data);
            });
            
            this.listeners.set(this.ALL_EVENTS, allListeners.filter(
                listener => !listener.once
            ));
            
            if (this.listeners.get(this.ALL_EVENTS)!.length === 0) {
                this.listeners.delete(this.ALL_EVENTS);
            }
        }
    }
}

const emitter = new Emitter();

export { 
    databases, 
    IndexedDBManager, 
    Emitter, 
    emitter, 
    getAllDataFromDatabase,
    type DatabaseConfig,
    type DatabaseIndex,
    type DatabaseItem,
    type EmitEventData
};

// Usage example
// const dbManager = new IndexedDBManager(databases.eventsDB, emitter);
// await dbManager.saveData({ name: 'User 1', points: 100 });
// await dbManager.updateDataById(1, { points: 150 });