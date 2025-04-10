const databases = {
    eventsDB: { name: 'Events', version: 1, store: 'events' },
    ActionsDB: { name: 'Actions', version: 1, store: 'actions' },
    banDB: { name: 'BanManagement', version: 1, store: 'bannedItems' }
};


class IndexedDBManager {
    constructor(dbConfig, idbObserver) {
        this.dbConfig = dbConfig;
        this.idbObserver = idbObserver;
        this.db = null;
        // Definimos los índices que queremos para la tienda de usuarios
        this.defaultIndexes = [
            { name: 'uniqueId', keyPath: 'uniqueId', unique: false },
            { name: 'nickname', keyPath: 'nickname', unique: false },
            { name: 'lastSeenAt', keyPath: 'lastSeenAt', unique: false },
            // Puedes añadir más índices si necesitas buscar por otros campos
            // { name: 'gifterLevel', keyPath: 'gifterLevel', unique: false },
        ];
    }

    async openDatabase() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            console.log(`Attempting to open DB: ${this.dbConfig.name} v${this.dbConfig.version}`);
            const request = indexedDB.open(this.dbConfig.name, this.dbConfig.version);

            request.onupgradeneeded = (event) => {
                console.log(`onupgradeneeded event fired for DB: ${this.dbConfig.name}`);
                const db = event.target.result;
                let objectStore;
                if (!db.objectStoreNames.contains(this.dbConfig.store)) {
                    // *** CAMBIO CLAVE: Usar 'userId' (string) como keyPath ***
                    objectStore = db.createObjectStore(this.dbConfig.store, { keyPath: 'userId' });
                    console.log(`Object store ${this.dbConfig.store} created with keyPath: 'userId'.`);
                    // Crear índices definidos
                    this.defaultIndexes.forEach(index => {
                        if (!objectStore.indexNames.contains(index.name)) {
                            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                            console.log(`Index ${index.name} created.`);
                        }
                    });
                } else {
                    console.log(`Object store ${this.dbConfig.store} already exists. Checking indexes...`);
                    // Verificar y añadir índices si faltan en una versión existente
                    const transaction = event.target.transaction;
                    if (!transaction) {
                        console.error("Upgrade transaction not available!");
                        // Podríamos intentar reabrir la transacción, pero es complejo en onupgradeneeded
                        // Lo más seguro es indicar el fallo.
                        reject(new Error("Upgrade transaction not available"));
                        return; // Salir temprano
                    }
                    // Verificar que la transacción aún esté activa y el store exista
                    if (transaction.mode === 'versionchange' && db.objectStoreNames.contains(this.dbConfig.store)) {
                        try {
                            objectStore = transaction.objectStore(this.dbConfig.store);
                            this.defaultIndexes.forEach(index => {
                                if (!objectStore.indexNames.contains(index.name)) {
                                    objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                                    console.log(`Index ${index.name} added to existing store ${this.dbConfig.store}.`);
                                }
                            });
                        } catch (storeError) {
                            console.error(`Error accessing object store ${this.dbConfig.store} during upgrade:`, storeError);
                            // No rechazar aquí necesariamente, puede que la transacción ya esté abortando.
                            // Solo loguear el error.
                        }
                    } else {
                        console.warn(`Transaction mode is not 'versionchange' or store ${this.dbConfig.store} not found during index check.`);
                    }
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log(`Database ${this.dbConfig.name} opened successfully.`);
                // Escuchar eventos de cierre inesperado
                this.db.onclose = () => {
                    console.warn(`Database connection ${this.dbConfig.name} closed unexpectedly.`);
                    this.db = null; // Marcar como cerrado
                };
                this.db.onversionchange = () => {
                    console.warn(`Database version change detected for ${this.dbConfig.name}. Closing connection.`);
                    if (this.db) {
                        this.db.close();
                        this.db = null;
                    }
                };
                resolve(this.db);
            };

            request.onerror = (event) => { // Usar event directamente
                console.error(`IDB Error opening ${this.dbConfig.name}:`, event.target.error);
                reject(event.target.error);
            };

            request.onblocked = () => {
                console.warn(`Opening database ${this.dbConfig.name} is blocked. Close other tabs/connections.`);
                // Podríamos rechazar aquí o esperar
                reject(new Error(`Database opening blocked for ${this.dbConfig.name}`));
            };
        });
    }

    async executeTransaction(storeName, mode, callback) {
        try {
            const db = await this.openDatabase(); // Asegura que la BD esté abierta
            return new Promise((resolve, reject) => {
                // Prevenir errores si la DB se cerró inesperadamente
                if (!db || !db.objectStoreNames.contains(storeName)) {
                    const errorMsg = `DB "${db?.name || this.dbConfig.name}" not open or store "${storeName}" not found`;
                    console.error(errorMsg);
                    // Intentar reabrir la base de datos podría ser una opción aquí, pero aumenta la complejidad.
                    // Por ahora, rechazamos directamente.
                    return reject(new Error(errorMsg));
                }

                let transaction;
                try {
                    transaction = db.transaction(storeName, mode);
                } catch (transError) {
                    console.error(`Error creating transaction for store "${storeName}" (mode: ${mode}):`, transError);
                    // Esto puede ocurrir si la BD se cerró justo antes.
                    return reject(transError);
                }

                const store = transaction.objectStore(storeName);
                let callbackResult = null; // Para almacenar el resultado del callback

                transaction.oncomplete = () => {
                    // console.log(`Transaction on ${storeName} (mode: ${mode}) completed.`);
                    resolve(callbackResult !== undefined ? callbackResult : true); // Resuelve con el resultado del callback o true
                };

                transaction.onerror = (event) => {
                    console.error(`IDB Transaction Error on ${storeName} (mode: ${mode}):`, event.target.error);
                    reject(event.target.error);
                };

                transaction.onabort = (event) => {
                    console.warn(`IDB Transaction Aborted on ${storeName} (mode: ${mode}):`, event.target.error);
                    reject(event.target.error || new Error('Transaction aborted'));
                };

                // Ejecutar el callback que realiza la operación
                try {
                    const promiseOrValue = callback(store);
                    if (promiseOrValue instanceof Promise) {
                        promiseOrValue
                            .then(res => {
                                callbackResult = res; // Guardar resultado para oncomplete
                            })
                            .catch(err => {
                                console.error("Error inside async transaction callback:", err);
                                if (transaction && transaction.readyState !== 'done' && !transaction.error) {
                                    try { transaction.abort(); } catch (abortErr) { console.error("Error aborting transaction:", abortErr); }
                                }
                                reject(err); // Rechazar la promesa externa
                            });
                    } else {
                        callbackResult = promiseOrValue; // Guardar resultado sincrónico
                    }
                } catch (syncError) {
                    console.error("Error inside sync transaction callback:", syncError);
                    if (transaction && transaction.readyState !== 'done' && !transaction.error) {
                        try { transaction.abort(); } catch (abortErr) { console.error("Error aborting transaction:", abortErr); }
                    }
                    reject(syncError);
                }
            });
        } catch (dbOpenError) {
            console.error(`Failed to open DB "${this.dbConfig.name}" for transaction:`, dbOpenError);
            // No se pudo abrir la base de datos, rechazar la operación general
            return Promise.reject(dbOpenError);
        }
    }

    /**
     * Obtiene un registro por su userId (string).
     * Resuelve con el objeto encontrado o undefined si no existe.
     */
    async getDataById(userId) {
        // ** CAMBIO: Acepta string userId **
        if (typeof userId !== 'string' || !userId) {
            return Promise.reject(new Error(`Invalid userId: ${userId}. Must be a non-empty string.`));
        }
        return this.executeTransaction(this.dbConfig.store, 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                // ** CAMBIO: Usa userId directamente **
                const request = store.get(userId);
                request.onsuccess = () => {
                    // ** CAMBIO: Resuelve con undefined si no se encuentra, no rechaza **
                    resolve(request.result); // result será undefined si no se encontró
                };
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }

    /**
     * Guarda o actualiza un objeto en la base de datos.
     * Usa store.put() que realiza una operación upsert basada en el keyPath ('userId').
     * @param {object} data - El objeto a guardar. Debe tener la propiedad 'userId'.
     * @returns {Promise<object>} - Promesa que resuelve con el objeto guardado/actualizado.
     */
    async saveData(data) {
        // ** CAMBIO: Simplificado para UPSERT directo **
        if (typeof data !== 'object' || data === null || typeof data.userId !== 'string' || !data.userId) {
            return Promise.reject(new Error("Invalid data: must be an object with a valid string 'userId'."));
        }

        // Clona el objeto para evitar modificaciones inesperadas si se reutiliza fuera
        const dataToSave = { ...data };

        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store) => {
            // store.put hace el upsert automáticamente basado en el keyPath ('userId')
            return new Promise((resolve, reject) => {
                const request = store.put(dataToSave);
                request.onsuccess = () => {
                    // Resolvemos con el ID (userId) o el objeto guardado. El objeto es más útil.
                    resolve(dataToSave);
                };
                request.onerror = (event) => {
                    console.error("Error in store.put:", event.target.error);
                    reject(event.target.error);
                };
            });
        }).then(savedData => {
            // Notificar después de que la transacción se complete exitosamente
            // Determinar si fue 'save' o 'update' puede ser complejo sin una lectura previa,
            // pero 'put' es la acción. Podríamos notificar 'put' o 'upsert'.
            this.idbObserver?.notify('put', savedData); // Notificar 'put'
            return savedData; // Devolver los datos guardados
        }).catch(error => {
            console.error(`Error saving data for userId ${data.userId}:`, error);
            throw error; // Re-lanzar el error para que sea manejado externamente
        });
    }

    /**
     * Elimina un registro por su userId (string).
     * @param {string} userId - El ID del usuario a eliminar.
     * @returns {Promise<string>} - Promesa que resuelve con el userId eliminado.
     */
    async deleteData(userId) {
        // ** CAMBIO: Acepta string userId **
        if (typeof userId !== 'string' || !userId) {
            return Promise.reject(new Error(`Invalid userId for delete: ${userId}`));
        }
        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                // ** CAMBIO: Usa userId directamente **
                const request = store.delete(userId);
                request.onsuccess = () => resolve(userId); // Resolvemos con el ID eliminado
                request.onerror = (event) => reject(event.target.error);
            });
        }).then(deletedId => {
            this.idbObserver?.notify('delete', deletedId);
            return deletedId;
        }).catch(error => {
            console.error(`Error deleting data for userId ${userId}:`, error);
            throw error;
        });
    }

    // --- Otros métodos (getAllData, clearDatabase, etc.) parecen estar bien ---
    // --- Asegúrate que getAllDataFromDatabase también use el keyPath correcto si es necesario ---

    async getAllData() {
        return this.executeTransaction(this.dbConfig.store, 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []); // Devolver array vacío si no hay resultados
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }

    async clearDatabase() {
        return this.executeTransaction(this.dbConfig.store, 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => {
                    resolve(true); // Indicar éxito
                };
                request.onerror = (event) => reject(event.target.error);
            });
        }).then(() => {
            this.idbObserver?.notify('clear', null);
            return true;
        }).catch(error => {
            console.error(`Error clearing store ${this.dbConfig.store}:`, error);
            throw error;
        });
    }

    // Método updateDataById (Opcional, ya que saveData hace upsert)
    // Si decides mantenerlo, necesita usar string userId y get/put
    async updateDataById(userId, updatedData) {
        if (typeof userId !== 'string' || !userId) {
            return Promise.reject(new Error(`Invalid userId: ${userId}. Must be a non-empty string.`));
        }
        if (typeof updatedData !== 'object' || updatedData === null) {
            return Promise.reject(new Error("Invalid updatedData: must be an object."));
        }

        return this.executeTransaction(this.dbConfig.store, 'readwrite', async (store) => {
            // 1. Obtener el registro existente
            const getRequest = store.get(userId);
            const existingData = await new Promise((resolve, reject) => {
                getRequest.onsuccess = () => resolve(getRequest.result);
                getRequest.onerror = () => reject(getRequest.error);
            });

            if (!existingData) {
                throw new Error(`No data found with userId ${userId} to update.`);
            }

            // 2. Fusionar y guardar
            // Asegúrate de no sobrescribir el userId clave con algo de updatedData si no es intencional
            const newData = { ...existingData, ...updatedData, userId: userId }; // Asegura que userId se mantenga
            const putRequest = store.put(newData);

            return new Promise((resolve, reject) => {
                putRequest.onsuccess = () => resolve(newData);
                putRequest.onerror = () => reject(putRequest.error);
            });
        }).then(finalData => {
            this.idbObserver?.notify('update', finalData);
            return finalData;
        }).catch(error => {
            console.error(`Error updating data for userId ${userId}:`, error);
            throw error;
        });
    }

    // --- Métodos estáticos y auxiliares ---
    // findMissingIds probablemente ya no sea relevante si usamos userId como clave.
    // getAllOrCreate y getAllDataFromDatabase necesitan ser consistentes con keyPath: 'userId'
    static async getAllOrCreate(dbConfig, indexes = []) {
        // ... (Asegúrate que la creación del store use { keyPath: 'userId' }) ...
        // El resto de la lógica para obtener datos debería funcionar si la base ya está creada correctamente.
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbConfig.name, dbConfig.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(dbConfig.store)) {
                    const objectStore = db.createObjectStore(dbConfig.store, { keyPath: 'userId' }); // Clave aquí
                    // Crear índices adicionales si se proporcionan
                    indexes.forEach(index => {
                        if (!objectStore.indexNames.contains(index.name)) { // Evitar errores si ya existe
                            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                        }
                    });
                } else {
                    // Opcional: verificar/añadir índices si el store ya existe
                    const transaction = event.target.transaction;
                    if (transaction && db.objectStoreNames.contains(dbConfig.store)) {
                        const objectStore = transaction.objectStore(dbConfig.store);
                        indexes.forEach(index => {
                            if (!objectStore.indexNames.contains(index.name)) {
                                objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                            }
                        });
                    }
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(dbConfig.store)) {
                    console.warn(`Store ${dbConfig.store} not found after DB open in getAllOrCreate.`);
                    db.close();
                    resolve([]); // Devolver vacío si el store no se creó/encontró
                    return;
                }

                const transaction = db.transaction([dbConfig.store], 'readonly');
                const store = transaction.objectStore(dbConfig.store);
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result || []);
                    db.close();
                };
                getAllRequest.onerror = (e) => {
                    console.error("Error in getAllRequest (getAllOrCreate):", e.target.error);
                    reject(e.target.error);
                    db.close();
                };
                transaction.onerror = (e) => { // Añadir manejo de error de transacción
                    console.error("Error in transaction (getAllOrCreate):", e.target.error);
                    reject(e.target.error);
                    // No cerrar DB aquí, puede que ya esté cerrada o manejada por onsuccess/onerror de request
                }
            };

            request.onerror = (e) => {
                console.error("Error opening DB (getAllOrCreate):", e.target.error);
                reject(e.target.error);
            };
            request.onblocked = (e) => {
                console.warn("DB blocked (getAllOrCreate)");
                reject(new Error("Database blocked"));
            };
        });
    }
}

// getAllDataFromDatabase (Función independiente)
// Asegúrate de que sea consistente con keyPath: 'userId'
async function getAllDataFromDatabase(databaseConfig) {
    return new Promise((resolve) => { // No necesita ser async la función externa
        let request;
        try {
            request = indexedDB.open(databaseConfig.name, databaseConfig.version);
        } catch (e) {
            console.error("Error calling indexedDB.open:", e);
            resolve([]); // Devuelve vacío si hay error inicial
            return;
        }


        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(databaseConfig.store)) {
                try {
                    db.createObjectStore(databaseConfig.store, { keyPath: 'userId' }); // Clave aquí
                } catch (e) {
                    console.error("Error creating object store in onupgradeneeded:", e);
                    // La transacción se abortará automáticamente
                }
            }
        };

        request.onsuccess = (event) => { // Usar event
            const db = event.target.result;

            // Verificar si el almacén de objetos existe DESPUÉS de abrir/actualizar
            if (!db.objectStoreNames.contains(databaseConfig.store)) {
                console.warn(`Store ${databaseConfig.store} not found after DB open.`);
                db.close();
                resolve([]);
                return;
            }

            let transaction;
            try {
                transaction = db.transaction([databaseConfig.store], 'readonly');
            } catch (e) {
                console.error("Error creating read transaction:", e);
                db.close();
                resolve([]);
                return;
            }

            const store = transaction.objectStore(databaseConfig.store);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result || []);
                // La transacción se completa automáticamente, la DB se cierra aquí
                db.close();
            };

            getAllRequest.onerror = (e) => {
                console.error("Error reading data:", e.target.error);
                resolve([]);
                db.close();
            };

            transaction.onabort = (e) => { // Manejar aborto
                console.warn("Read transaction aborted:", e.target.error);
                resolve([]); // Devolver vacío si la transacción falla
                db.close(); // Asegurar cierre
            }
            transaction.onerror = (e) => { // Manejar error general de transacción
                console.error("Read transaction error:", e.target.error);
                resolve([]);
                db.close();
            }
        };

        request.onerror = (event) => { // Usar event
            console.error(`Error opening database ${databaseConfig.name}:`, event.target.error);
            resolve([]);
        };

        request.onblocked = (event) => {
            console.warn(`Database ${databaseConfig.name} opening blocked.`);
            resolve([]); // O rechazar, dependiendo de cómo quieras manejarlo
        };
    });
}


// DBObserver (sin cambios)
class DBObserver {
    constructor() { this.listeners = []; }
    subscribe(cb) { this.listeners.push(cb); }
    unsubscribe(cb) { this.listeners = this.listeners.filter(l => l !== cb); }
    notify(act, data) { this.listeners.forEach(l => l(act, data)); }
}

// Exportar (si usas módulos ES6)
export { databases, IndexedDBManager, DBObserver, getAllDataFromDatabase }

// Usage example
// IndexedDBManager.updateData({ name: 'User 1', points: 100 }, 'name');
// IndexedDBManager.saveData({ na,additionalDatame: 'User 1', points: 100 }, 'name');
