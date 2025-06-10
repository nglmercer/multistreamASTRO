import Emitter, { emitter } from "./Emitter";

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
  id: string | number;
  [key: string]: any;
}

interface EmitEventData {
  config: DatabaseConfig;
  data: DatabaseItem | number | null;
  metadata?: {
    timestamp: number;
    operation: string;
    recordCount?: number;
  };
}
export type OperationType = 'import' | 'export' | 'add' | 'delete' | 'update';

export interface OperationStatusDetail {
  message: string;
  type: 'success' | 'error';
  operation: OperationType;
  recordCount?: number;
}

type emitevents = "update" | "save" | "delete" | "clear"|"export" | "import";

const EmitEvents: emitevents[] = [
  "update",
  "save", 
  "delete",
  "clear",
  "export",
  "import"
];

const databases: Record<string, DatabaseConfig> = {
  commentEventsDB: {
    name: "commentEvents",
    version: 1,
    store: "commentEvents",
  },
  giftEventsDB: { name: "giftEvents", version: 1, store: "giftEvents" },
  bitsEventsDB: { name: "bitsEvents", version: 1, store: "bitsEvents" },
  likesEventsDB: { name: "likesEvents", version: 1, store: "likesEvents" },
  followEventsDB: { name: "followEvents", version: 1, store: "followEvents"},
  eventsDB: { name: "Events", version: 1, store: "events" },
  ActionsDB: { name: "Actions", version: 1, store: "actions" },
  banDB: { name: "Bans", version: 1, store: "bans" },
};

class IndexedDBManager {
  private dbConfig: DatabaseConfig;
  public emitterInstance: Emitter;
  private db: IDBDatabase | null;
  private defaultIndexes: DatabaseIndex[];


  constructor(dbConfig: DatabaseConfig, customEmitter?: Emitter) {
    this.dbConfig = dbConfig;
    this.emitterInstance = customEmitter || emitter;
    this.db = null;
    this.defaultIndexes = [];
  }

  // Método mejorado para normalizar IDs - maneja correctamente el 0
  private normalizeId(id: string | number): string | number {
    if (typeof id === "string") {
      // Verificar si es un string que representa un número
      const trimmedId = id.trim();
      if (trimmedId === "") return id; // String vacío permanece como string
      
      const numValue = Number(trimmedId);
      if (!isNaN(numValue)) {
        // Es un número válido, verificar si es seguro como number
        return numValue > Number.MAX_SAFE_INTEGER ? trimmedId : numValue;
      }
      return trimmedId; // No es un número, mantener como string
    }

    if (typeof id === "number") {
      return id > Number.MAX_SAFE_INTEGER ? String(id) : id;
    }

    return id;
  }

  // Método mejorado para verificar si un ID existe
  private async idExists(id: string | number): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    
    return this.executeTransaction(
      this.dbConfig.store,
      "readonly",
      (store: IDBObjectStore) => {
        return new Promise<boolean>((resolve, reject) => {
          const request = store.get(normalizedId);
          
          request.onsuccess = () => {
            resolve(request.result !== undefined);
          };
          
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  // Método auxiliar para generar el siguiente ID disponible
  private async generateNextId(): Promise<number> {
    const allData = await this.getAllData();
    const numericIds = allData
      .map((item) => Number(item.id))
      .filter((id) => !isNaN(id) && Number.isFinite(id))
      .sort((a, b) => a - b);

    if (numericIds.length === 0) return 0;

    // Buscar el primer hueco disponible o usar max + 1
    for (let i = 0; i < numericIds.length; i++) {
      if (numericIds[i] !== i) {
        return i;
      }
    }
    
    return Math.max(...numericIds) + 1;
  }

  // Método mejorado para verificar si un valor es un ID válido
  private isValidId(id: any): id is string | number {
    if (id === null || id === undefined) return false;
    
    if (typeof id === "string") {
      return id.trim() !== "";
    }
    
    if (typeof id === "number") {
      return Number.isFinite(id);
    }
    
    return false;
  }

  async updateDataById(
    id: string | number,
    updatedData: Partial<DatabaseItem>
  ): Promise<DatabaseItem | null> {
    if (!this.isValidId(id)) {
      throw new Error("Invalid ID provided for update");
    }

    const normalizedId = this.normalizeId(id);
    const exists = await this.idExists(normalizedId);
    
    if (!exists) {
      return null; // El elemento no existe, no se puede actualizar
    }

    return this.executeTransaction(
      this.dbConfig.store,
      "readwrite",
      (store: IDBObjectStore) => {
        return new Promise<DatabaseItem | null>((resolve, reject) => {
          const getRequest = store.get(normalizedId);

          getRequest.onsuccess = () => {
            if (getRequest.result) {
              const newData: DatabaseItem = {
                ...getRequest.result,
                ...updatedData,
                id: normalizedId, // Mantener el ID original normalizado
              };
              
              const putRequest = store.put(newData);

              putRequest.onsuccess = () => {
                this.emitterInstance?.emit("update", {
                  config: this.dbConfig,
                  data: newData,
                });
                resolve(newData);
              };
              
              putRequest.onerror = () => reject(putRequest.error);
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => reject(getRequest.error);
        });
      }
    );
  }

  async getDataById(id: string | number): Promise<DatabaseItem | null> {
    if (!this.isValidId(id)) {
      return null;
    }

    const normalizedId = this.normalizeId(id);
    
    return this.executeTransaction(
      this.dbConfig.store,
      "readonly",
      (store: IDBObjectStore) => {
        return new Promise<DatabaseItem | null>((resolve, reject) => {
          const request = store.get(normalizedId);

          request.onsuccess = () => {
            resolve(request.result || null);
          };

          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  async saveData(data: Partial<DatabaseItem>): Promise<DatabaseItem> {
    if (typeof data !== "object" || data === null) {
      return Promise.reject(new Error("Invalid data: must be an object."));
    }

    let targetId: string | number;
    let isUpdate = false;

    // Verificar si se proporcionó un ID explícito
    const hasExplicitId = this.isValidId(data.id);

    if (hasExplicitId) {
      targetId = this.normalizeId(data.id as string | number);
      isUpdate = await this.idExists(targetId);
    } else {
      // Generar nuevo ID
      targetId = await this.generateNextId();
      isUpdate = false;
    }

    const newData: DatabaseItem = { ...data, id: targetId } as DatabaseItem;
    const actionType = isUpdate ? "update" : "save";

    return this.executeTransaction(
      this.dbConfig.store,
      "readwrite",
      (store: IDBObjectStore) => {
        return new Promise<DatabaseItem>((resolve, reject) => {
          const request = store.put(newData);

          request.onsuccess = () => {
            resolve(newData);
          };

          request.onerror = () => {
            console.error("Error in store.put:", request.error);
            reject(request.error);
          };
        });
      }
    ).then((savedData) => {
      this.emitterInstance?.emit(actionType, {
        config: this.dbConfig,
        data: savedData,
      });
      return savedData;
    });
  }

  async deleteData(id: string | number): Promise<string | number> {
    if (!this.isValidId(id)) {
      throw new Error("Invalid ID provided for deletion");
    }

    const keyId = this.normalizeId(id);

    return this.executeTransaction(
      this.dbConfig.store,
      "readwrite",
      (store: IDBObjectStore) => {
        return new Promise<string | number>((resolve, reject) => {
          const request = store.delete(keyId);
          request.onsuccess = () => resolve(keyId);
          request.onerror = () => reject(request.error);
        });
      }
    ).then((deletedId) => {
      this.emitterInstance?.emit("delete", { config: this.dbConfig, data: deletedId });
      return deletedId;
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
            keyPath: "id",
            autoIncrement: false,
          });

          this.defaultIndexes.forEach((index) => {
            if (!objectStore.indexNames.contains(index.name)) {
              objectStore.createIndex(index.name, index.keyPath, {
                unique: index.unique,
              });
            }
          });
          
          console.log(
            `Object store ${this.dbConfig.store} created with indexes.`
          );
        } else {
          // Verificar y añadir índices si faltan en una versión existente
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const objectStore = transaction.objectStore(this.dbConfig.store);
            this.defaultIndexes.forEach((index) => {
              if (!objectStore.indexNames.contains(index.name)) {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique,
                });
                console.log(
                  `Index ${index.name} created for existing store ${this.dbConfig.store}.`
                );
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
        console.error(
          `IDB Error opening ${this.dbConfig.name}:`,
          request.error
        );
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
          return reject(
            new Error(`DB not open or store ${storeName} not found`)
          );
        }

        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        let result: T | null = null;

        transaction.oncomplete = () =>
          resolve(result !== null ? result : (true as T));
          
        transaction.onerror = () => {
          console.error("IDB Transaction Error:", transaction.error);
          reject(transaction.error);
        };
        
        transaction.onabort = () => {
          console.warn("IDB Transaction Aborted:", transaction.error);
          reject(transaction.error || new Error("Transaction aborted"));
        };

        try {
          const callbackResult = callback(store);

          if (callbackResult instanceof Promise) {
            callbackResult
              .then((res) => {
                result = res;
              })
              .catch((err) => {
                console.error(
                  "Error inside transaction callback promise:",
                  err
                );
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
    return this.executeTransaction(
      this.dbConfig.store,
      "readonly",
      (store: IDBObjectStore) => {
        return new Promise<DatabaseItem[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  async findMissingIds(allData: DatabaseItem[]): Promise<number[]> {
    const existingIds = allData
      .map((item) => Number(item.id))
      .filter((id) => !isNaN(id))
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

  async clearDatabase(): Promise<void> {
    return this.executeTransaction(
      this.dbConfig.store,
      "readwrite",
      (store: IDBObjectStore) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => {
            this.emitterInstance?.emit("clear", { config: this.dbConfig, data: null });
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }
    );
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
          const objectStore = db.createObjectStore(dbConfig.store, {
            keyPath: "id",
          });
          indexes.forEach((index) => {
            objectStore.createIndex(index.name, index.keyPath, {
              unique: index.unique,
            });
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([dbConfig.store], "readonly");
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

async function getAllDataFromDatabase(
  databaseConfig: DatabaseConfig
): Promise<DatabaseItem[]> {
  if (!databaseConfig || !databaseConfig.name || !databaseConfig.version) {
    console.error("Invalid database configuration:", databaseConfig);
    return [];
  }

  return new Promise<DatabaseItem[]>((resolve) => {
    const request = indexedDB.open(databaseConfig.name, databaseConfig.version);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(databaseConfig.store)) {
        db.createObjectStore(databaseConfig.store, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(databaseConfig.store)) {
        db.close();
        resolve([]);
        return;
      }

      const transaction = db.transaction([databaseConfig.store], "readonly");
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

async function importDataToDatabase(
  databaseConfig: DatabaseConfig,
  data: DatabaseItem[]
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const request = indexedDB.open(databaseConfig.name, databaseConfig.version);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(databaseConfig.store)) {
        db.createObjectStore(databaseConfig.store, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([databaseConfig.store], "readwrite");
      const store = transaction.objectStore(databaseConfig.store);

      // Limpiar la base de datos antes de importar
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Agregar todos los datos
        let completed = 0;
        const total = data.length;

        if (total === 0) {
          db.close();
          resolve(true);
          return;
        }

        data.forEach((item) => {
          const addRequest = store.add(item);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              db.close();
              resolve(true);
            }
          };

          addRequest.onerror = () => {
            completed++;
            if (completed === total) {
              db.close();
              resolve(false);
            }
          };
        });
      };

      clearRequest.onerror = () => {
        db.close();
        resolve(false);
      };
    };

    request.onerror = () => {
      resolve(false);
    };
  });
}


export {
  databases,
  IndexedDBManager,
  getAllDataFromDatabase,
  importDataToDatabase,
  type DatabaseConfig,
  type DatabaseIndex,
  type DatabaseItem,
  type EmitEventData,
  type emitevents,
  EmitEvents
};

// Usage example
// const dbManager = new IndexedDBManager(databases.eventsDB, emitter);
// await dbManager.saveData({ name: 'User 1', points: 100 });
// await dbManager.updateDataById(0, { points: 150 }); // Ahora funciona correctamente con ID 0