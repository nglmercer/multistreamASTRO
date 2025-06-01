// src/ObjectStoreRepository.ts
import type { BaseMessage, QueryOptions, SearchOptions, StoreConfig, StoreStats } from './Types';

export class ObjectStoreRepository<T extends BaseMessage> {
  constructor(
    private db: IDBDatabase,
    private config: StoreConfig
  ) {}

  private get storeName(): string {
    return this.config.storeName;
  }

  private generateId(): string {
    const prefix = this.config.idPrefix ? `${this.config.idPrefix}_` : '';
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private enrichItem(item: Partial<T>): T {
    const fullItem = { ...item };

    if (this.config.autoGenerateId !== false && !fullItem.id && this.config.keyPath === 'id' && !this.config.autoIncrement) {
      fullItem.id = this.generateId();
    }
    if (!fullItem.timestamp) {
      fullItem.timestamp = Date.now();
    }
    // Asegurar que las propiedades obligatorias de BaseMessage existan
    return fullItem as T;
  }

  async add(item: Partial<T>): Promise<T> {
    const enrichedItem = this.enrichItem(item);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(enrichedItem);
      request.onsuccess = () => resolve(enrichedItem);
      request.onerror = () => reject(request.error);
    });
  }

  async addMany(items: Partial<T>[]): Promise<T[]> {
    const enrichedItems = items.map(item => this.enrichItem(item));
    return new Promise((resolve, reject) => {
      if (enrichedItems.length === 0) {
        resolve([]);
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      let completed = 0;

      enrichedItems.forEach(enrichedItem => {
        const request = store.add(enrichedItem);
        request.onsuccess = () => {
          completed++;
          if (completed === enrichedItems.length) {
            resolve(enrichedItems);
          }
        };
        // Si uno falla, la transacción falla.
        // Podrías querer manejar esto de forma diferente (ej. recolectar errores individuales)
      });
      transaction.oncomplete = () => {
         // Esto es redundante si ya resolvimos, pero útil si queremos confirmar la transacción
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async put(item: T): Promise<T> {
     // En put, el item ya debería tener un ID si el keyPath es 'id'
     // y no es autoIncrement. Si es autoIncrement, el ID se genera por IDB.
     // Si es un item nuevo y autoGenerateId es true, el ID debe ser generado antes de llamar a put.
     // Para simplificar, asumimos que si se usa put, el ID (o keyPath) ya está gestionado o el item es completo.
     // O, podríamos llamar a enrichItem también, pero sería más para `addOrUpdate`.
    const finalItem = this.enrichItem(item); // Asegura timestamp, y ID si no está y es configurable

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(finalItem);
      request.onsuccess = () => resolve(finalItem);
      request.onerror = () => reject(request.error);
    });
  }

  async putMany(items: T[]): Promise<T[]> {
    const finalItems = items.map(item => this.enrichItem(item));
    return new Promise((resolve, reject) => {
        if (finalItems.length === 0) {
            resolve([]);
            return;
        }
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        let completed = 0;

        finalItems.forEach(finalItem => {
            const request = store.put(finalItem);
            request.onsuccess = () => {
                completed++;
                if (completed === finalItems.length) {
                    resolve(finalItems);
                }
            };
        });
        transaction.oncomplete = () => { /* No es necesario resolver aquí si ya lo hicimos */ };
        transaction.onerror = () => reject(transaction.error);
    });
}


  async getById(id: string | number): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getProperty(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o && o[k] !== 'undefined' ? o[k] : undefined), obj);
  }

  private matchesFilters(item: T, filters?: Partial<Record<keyof T | string, any>>): boolean {
    if (!filters) return true;
    return Object.entries(filters).every(([key, value]) => {
      const itemValue = this.getProperty(item, key);
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      return itemValue === value;
    });
  }

  private fuzzyMatch(text: string, searchTerm: string): boolean {
    const search = searchTerm.toLowerCase();
    text = text.toLowerCase();
    let j = 0; // For text
    let i = 0; // For search
    while (j < text.length && i < search.length) {
      if (text[j] === search[i]) {
        i++;
      }
      j++;
    }
    return i === search.length;
  }

  async query(options: QueryOptions<T> = {}): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      let cursorSource: IDBIndex | IDBObjectStore = store;
      let range: IDBKeyRange | null = null;

      const dateField = options.dateRange?.field || 'timestamp';
      if (options.dateRange && this.hasIndex(dateField as string)) {
          cursorSource = store.index(dateField as string);
          range = IDBKeyRange.bound(options.dateRange.start, options.dateRange.end);
      } else if (options.sortBy && this.hasIndex(options.sortBy as string)) {
          cursorSource = store.index(options.sortBy as string);
      } else if (this.hasIndex('timestamp')) { // Default sort by timestamp if available
          cursorSource = store.index('timestamp');
      }
      // Si no hay índice para sortBy, la ordenación se hará post-lectura si es necesario.

      const direction = options.sortOrder === 'asc' ? 'next' : 'prev';
      const request = range ? cursorSource.openCursor(range, direction) : cursorSource.openCursor(null, direction);
      
      const results: T[] = [];
      let currentOffset = 0;
      let itemsAdded = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item = cursor.value as T;
          if (this.matchesFilters(item, options.filters)) {
            if (currentOffset >= (options.offset || 0)) {
              if (!options.limit || itemsAdded < options.limit) {
                results.push(item);
                itemsAdded++;
              } else {
                // Limit reached
                resolve(this.applySortAndSlice(results, options, true)); // Pass true for alreadySortedByCursor
                return;
              }
            }
            currentOffset++;
          }
          cursor.continue();
        } else {
          // Cursor finished
          resolve(this.applySortAndSlice(results, options, !!(options.sortBy && this.hasIndex(options.sortBy as string))));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  private applySortAndSlice(results: T[], options: QueryOptions<T>, alreadySortedByCursor: boolean = false): T[] {
    let sortedResults = results;
  
    // Sort only if sortBy is provided and not already sorted by cursor OR if cursor sort was on a different field
    if (options.sortBy && !alreadySortedByCursor) {
      const sortBy = options.sortBy as keyof T; // Cast, assuming it's a direct property for simplicity here
      sortedResults.sort((a, b) => {
        const valA = this.getProperty(a, sortBy as string);
        const valB = this.getProperty(b, sortBy as string);
  
        if (valA < valB) return options.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return options.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // If alreadySortedByCursor is true, results are already in the correct order from IDB.
    // No additional client-side sort needed unless sorting by a non-indexed field was requested.
  
    // Paginación (offset y limit) ya se aplicó durante la recolección del cursor para eficiencia.
    // Si la paginación no se pudo aplicar eficientemente con el cursor (ej. filtros complejos),
    // se podría aplicar aquí, pero es mejor hacerlo durante la iteración del cursor.
    // const start = options.offset || 0;
    // const end = options.limit ? start + options.limit : undefined;
    // return sortedResults.slice(start, end);
    return sortedResults; // Asumimos que el limit/offset ya fue manejado
  }


  async search(options: SearchOptions<T>): Promise<T[]> {
    // Primero, obtenemos una base de resultados usando QueryOptions (filtros, dateRange, sort inicial)
    // Esto puede reducir el conjunto de datos antes de la búsqueda de texto.
    const baseQueryOptions: QueryOptions<T> = { ...options };
    delete (baseQueryOptions as any).searchTerm; // No es parte de QueryOptions
    delete (baseQueryOptions as any).searchFields;
    delete (baseQueryOptions as any).fuzzy;

    const candidates = await this.query(baseQueryOptions);
    
    const searchTerm = options.searchTerm.toLowerCase();
    // Si no se especifican searchFields, intentamos usar todos los campos de string
    const searchFields = options.searchFields || this.getDefaultSearchableFields(candidates.length > 0 ? candidates[0] : undefined);

    const filteredResults = candidates.filter(item => {
      return searchFields.some(field => {
        const value = this.getProperty(item, field as string);
        if (typeof value === 'string') {
          return options.fuzzy
            ? this.fuzzyMatch(value, searchTerm)
            : value.toLowerCase().includes(searchTerm);
        }
        if (typeof value === 'number') {
          return value.toString().toLowerCase().includes(searchTerm);
        }
        // Podríamos extender para buscar en arrays de strings, etc.
        return false;
      });
    });

    // La ordenación final y el limit/offset se manejan por this.query o this.applySortAndSlice
    // Si searchFields no estaban indexados, el sort de this.query podría no ser el final.
    // Re-aplicar sort/slice si es necesario (aquí se simplifica, asumiendo que query ya lo hizo bien)
    return filteredResults; // query ya aplicó limit/offset, pero sobre el conjunto 'candidates'
                           // Si 'filteredResults' es mucho más pequeño, podrías re-evaluar la paginación.
                           // Por simplicidad, mantenemos el resultado filtrado.
  }

  private getDefaultSearchableFields(sampleItem?: T): (keyof T | string)[] {
    if (!sampleItem) return [];
    return Object.keys(sampleItem).filter(key => typeof (sampleItem as any)[key] === 'string') as (keyof T)[];
  }

  private hasIndex(indexName: string): boolean {
    try {
      return this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).indexNames.contains(indexName);
    } catch (e) {
      // Puede fallar si la transacción se cierra prematuramente o el store no existe (no debería pasar aquí)
      console.warn(`Error checking index ${indexName}:`, e);
      return false;
    }
  }
  
  async getByIndex(indexName: string, value: any, options: QueryOptions<T> = {}): Promise<T[]> {
    if (!this.hasIndex(indexName)) {
      return Promise.reject(new Error(`Index '${indexName}' does not exist in store '${this.storeName}'.`));
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index(indexName);
      
      // Usar getAll() con una clave es más eficiente para obtener todos los coincidentes.
      // openCursor es mejor si necesitas procesar uno por uno o aplicar lógica compleja.
      const request = index.getAll(IDBKeyRange.only(value));

      request.onsuccess = () => {
        let results = request.result as T[];
        // Aplicar filtros adicionales, ordenación y paginación si es necesario
        if (options.filters) {
          results = results.filter(item => this.matchesFilters(item, options.filters));
        }
        // Apply sort and slice (QueryOptions like limit, offset, sortBy, sortOrder)
        // Note: results from getAll(key) are typically sorted by the index's key, then by primary key.
        // If a different sort order is needed, or further sorting, applySortAndSlice will handle it.
        resolve(this.applySortAndSlice(results, options, true)); // true: sorted by index key
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStats(): Promise<StoreStats> {
    const count = await this.count();
    let oldestMessageTimestamp: number | undefined = undefined;
    let newestMessageTimestamp: number | undefined = undefined;

    if (count > 0 && this.hasIndex('timestamp')) {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const timestampIndex = transaction.objectStore(this.storeName).index('timestamp');
      
      const oldestRequest = timestampIndex.openCursor(null, 'next');
      const newestRequest = timestampIndex.openCursor(null, 'prev');

      await Promise.all([
        new Promise<void>(res => {
          oldestRequest.onsuccess = () => {
            if (oldestRequest.result) oldestMessageTimestamp = (oldestRequest.result.value as T).timestamp;
            res();
          };
          oldestRequest.onerror = () => res(); // Ignore error for stats
        }),
        new Promise<void>(res => {
          newestRequest.onsuccess = () => {
            if (newestRequest.result) newestMessageTimestamp = (newestRequest.result.value as T).timestamp;
            res();
          };
          newestRequest.onerror = () => res(); // Ignore error for stats
        })
      ]);
    }

    return {
      count,
      oldestMessageTimestamp,
      newestMessageTimestamp,
    };
  }

  async cleanup(): Promise<number> {
    if (!this.config.ttl || this.config.ttl <= 0) return 0;
    if (!this.hasIndex('timestamp')) {
      console.warn(`TTL cleanup for store '${this.storeName}' skipped: 'timestamp' index not found.`);
      return 0;
    }

    const cutoffDate = Date.now() - (this.config.ttl * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      // Rango para borrar: todos los elementos con timestamp MENOR O IGUAL a cutoffDate
      const range = IDBKeyRange.upperBound(cutoffDate, true); // true para no incluir cutoffDate (menores que)
                                                            // Para borrar los más viejos que cutoffDate, necesitamos <=
                                                            // upperBound(value, true) => keys < value
                                                            // upperBound(value, false) => keys <= value.
                                                            // Aquí queremos borrar <= cutoffDate.
                                                            // Pero el cursor itera de menor a mayor.
                                                            // Queremos todos los que sean ANTERIORES a cutoffDate.
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate)); // Registros donde timestamp < cutoffDate

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}