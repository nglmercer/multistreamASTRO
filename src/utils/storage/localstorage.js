class LocalStorageManager {
    constructor(key) {
        this.key = key;
    }

    static async create(key) {
        const instance = new LocalStorageManager(key);
        await instance.initializeStorage();
        return instance;
    }

    async initializeStorage() {
        try {
            const currentData = await this.getAll();
            if (!Array.isArray(currentData)) {
                await this.saveItems([]);
            }
        } catch (error) {
            this.handleError('Error initializing storage', error);
             try {
                 await this.saveItems([]);
             } catch (saveError) {
                 console.error("Failed to reset storage after initialization error", saveError);
             }
        }
    }

    deepCopy(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            this.handleError('Error creating deep copy', error);
            return null;
        }
    }

    generateUniqueId(items, proposedId = null) {
        let numericProposedId = null;
        if (proposedId !== null && !isNaN(Number(proposedId))) {
            numericProposedId = Number(proposedId);
        }

        const existingIds = new Set(items.map(item => item.id));

        const findEmptySpace = () => {
            let i = 0;
            while (existingIds.has(i)) {
                i++;
            }
            return i;
        };

        if (numericProposedId !== null) {
            if (!existingIds.has(numericProposedId)) {
                return numericProposedId;
            }
             return findEmptySpace();
        }

        return findEmptySpace();
    }

    ensureObjectHasId(item, items) {
        const itemCopy = this.deepCopy(item);
        if (!itemCopy) return null;

        if (itemCopy.id !== undefined && !isNaN(Number(itemCopy.id))) {
             itemCopy.id = Number(itemCopy.id);
        } else if (itemCopy.id === undefined || itemCopy.id === null) {
            itemCopy.id = this.generateUniqueId(items);
        } else {
             itemCopy.id = this.generateUniqueId(items, itemCopy.id);
        }

        if (!isNaN(Number(itemCopy.id))) {
            itemCopy.id = Number(itemCopy.id);
        }

        return itemCopy;
    }

    async add(item) {
        try {
            let items = await this.getAll();
            if (!Array.isArray(items)) items = [];

            const itemWithId = this.ensureObjectHasId(item, items);
            if (!itemWithId) return false;

            const idExists = items.some(existingItem => existingItem.id === itemWithId.id);

            if (!idExists) {
                items.push(itemWithId);
                await this.saveItems(items);
                return itemWithId.id;
            } else {
                console.warn(`[LocalStorageManager:${this.key}] Item with ID ${itemWithId.id} already exists. Add operation skipped.`);
                return false;
            }
        } catch (error) {
            this.handleError('Error adding item', error);
            return false;
        }
    }

    async update(id, updatedData) {
        try {
            let items = await this.getAll();
             if (!Array.isArray(items)) items = [];

            const itemIndex = items.findIndex(item => item.id === id);

            if (itemIndex !== -1) {
                items[itemIndex] = { ...items[itemIndex], ...updatedData, id: id };
                await this.saveItems(items);
                return true;
            }
            console.warn(`[LocalStorageManager:${this.key}] Item with ID ${id} not found for update.`);
            return false;
        } catch (error) {
            this.handleError('Error updating item', error);
            return false;
        }
    }

    async remove(id) {
        try {
            let items = await this.getAll();
            if (!Array.isArray(items)) items = [];

            const initialLength = items.length;
            const updatedItems = items.filter(item => item.id !== id);

            if (updatedItems.length < initialLength) {
                await this.saveItems(updatedItems);
                return true;
            }
            return false;
        } catch (error) {
            this.handleError('Error removing item', error);
            return false;
        }
    }

    async get(id) {
        try {
            const items = await this.getAll();
             if (!Array.isArray(items)) return null;

            const item = items.find(item => item.id === id);
            return item ? this.deepCopy(item) : null;
        } catch (error) {
            this.handleError('Error getting item', error);
            return null;
        }
    }

    async getAll() {
        try {
            const itemsJson = localStorage.getItem(this.key);
            if (!itemsJson) {
                return [];
            }
            const items = JSON.parse(itemsJson);
            return Array.isArray(items) ? this.deepCopy(items) : [];
        } catch (error) {
            this.handleError('Error parsing items from localStorage', error);
            console.warn(`[LocalStorageManager:${this.key}] Corrupted data found. Resetting storage.`);
            await this.saveItems([]);
            return [];
        }
    }

    async saveItems(items) {
         if (!Array.isArray(items)) {
             console.error(`[LocalStorageManager:${this.key}] Attempted to save non-array data. Saving empty array instead.`);
             items = [];
         }
        try {
            const itemsCopy = this.deepCopy(items);
            if (itemsCopy === null) throw new Error("Deep copy failed before saving");
            localStorage.setItem(this.key, JSON.stringify(itemsCopy));
        } catch (error) {
            this.handleError('Error saving items', error);
        }
    }

    async clear() {
        try {
            await this.saveItems([]);
        } catch (error) {
            this.handleError('Error clearing storage', error);
        }
    }

     async valueExists(value) {
         try {
             const items = await this.getAll();
             if (!Array.isArray(items)) return false;
             // Considerar comparación profunda si los valores pueden ser objetos
             return items.some(item => JSON.stringify(item.value) === JSON.stringify(value));
         } catch (error) {
             this.handleError('Error checking value existence', error);
             return false;
         }
     }

    areObjectsEqual(obj1, obj2) {
        try {
            const { id: id1, ...rest1 } = obj1;
            const { id: id2, ...rest2 } = obj2;
            return JSON.stringify(rest1) === JSON.stringify(rest2);
        } catch (error) {
            this.handleError('Error comparing objects', error);
            return false;
        }
    }

    handleError(message, error) {
        console.error(`[LocalStorageManager:${this.key}] ${message}:`, error);
    }
}

class StringRater {
    constructor(raterName, storageManager) {
        if (!storageManager || typeof storageManager.getAll !== 'function') {
            throw new Error("StringRater requires a valid LocalStorageManager instance.");
        }
        this.raterName = raterName;
        this.storageManager = storageManager;
        this.rules = [];
    }

    addRule(rule) {
        if (!rule || typeof rule !== 'object' || !rule.type || (rule.value === undefined || rule.value === null) || typeof rule.points !== 'number') {
            console.warn(`[${this.raterName}] addRule: Invalid rule provided (missing type, value, or points).`, rule);
            return;
        }

        // Validar que el valor sea una cadena
        if (typeof rule.value !== 'string') {
            console.warn(`[${this.raterName}] addRule: Rule value must be a string.`, rule);
            return;
        }

        // Validar tipos de reglas para strings
        if (!['equal', 'contains', 'startsWith', 'endsWith'].includes(rule.type)) {
            console.warn(`[${this.raterName}] addRule: Invalid rule type for StringRater. Supported types: equal, contains, startsWith, endsWith.`, rule);
            return;
        }

        this.rules.push(rule);
    }

    removeRule(description) {
        const initialLength = this.rules.length;
        this.rules = this.rules.filter(rule => rule.description !== description);
        return this.rules.length < initialLength;
    }

    getRules() {
        return this.storageManager.deepCopy(this.rules);
    }

    _calculateScore(value) {
        // Validar que el valor a calificar sea una cadena
        if (typeof value !== 'string') {
            console.warn(`[${this.raterName}] _calculateScore: Value must be a string.`);
            return 0;
        }

        let score = 0;

        for (const rule of this.rules) {
            let match = false;
            try {
                switch (rule.type) {
                    case 'equal':
                        match = (value === rule.value);
                        break;
                    case 'contains':
                        match = value.includes(rule.value);
                        break;
                    case 'startsWith':
                        match = value.startsWith(rule.value);
                        break;
                    case 'endsWith':
                        match = value.endsWith(rule.value);
                        break;
                    default:
                        console.warn(`[${this.raterName}] _calculateScore: Unknown rule type: ${rule.type}`);
                }
            } catch (e) {
                console.error(`[${this.raterName}] Error applying rule:`, rule, 'to value:', value, e);
            }

            if (match) {
                score += rule.points;
            }
        }
        return score;
    }

    async addRatedItem(value) {
        // Validar que el valor sea una cadena
        if (typeof value !== 'string') {
            console.warn(`[${this.raterName}] addRatedItem: Value must be a string.`);
            return null;
        }

        try {
            const score = this._calculateScore(value);
            const newItem = {
                value: value,
                score: score,
                createdAt: new Date().toISOString()
            };
            const assignedId = await this.storageManager.add(newItem);
            if (assignedId !== false && assignedId !== undefined) {
                return await this.storageManager.get(assignedId);
            } else {
                return null;
            }
        } catch (error) {
            console.error(`[${this.raterName}] Error adding rated item:`, error);
            return null;
        }
    }

    async getRatedItem(id) {
        return this.storageManager.get(id);
    }

    async getAllRatedItems() {
        return this.storageManager.getAll();
    }

    async removeRatedItem(id) {
        return this.storageManager.remove(id);
    }

    async updateRatedItemValue(id, newValue) {
        // Validar que el nuevo valor sea una cadena
        if (typeof newValue !== 'string') {
            console.warn(`[${this.raterName}] updateRatedItemValue: New value must be a string.`);
            return false;
        }

        try {
            const itemExists = await this.storageManager.get(id);
            if (!itemExists) {
                console.warn(`[${this.raterName}] updateRatedItemValue: Item with ID ${id} not found.`);
                return false;
            }
            const newScore = this._calculateScore(newValue);
            const success = await this.storageManager.update(id, { value: newValue, score: newScore, updatedAt: new Date().toISOString() });
            return success;
        } catch (error) {
            console.error(`[${this.raterName}] Error updating item value for ID ${id}:`, error);
            return false;
        }
    }

    async reRateItem(id) {
        try {
            const item = await this.storageManager.get(id);
            if (!item) {
                console.warn(`[${this.raterName}] reRateItem: Item with ID ${id} not found.`);
                return false;
            }
            const newScore = this._calculateScore(item.value);
            if (item.score !== newScore) {
                return await this.storageManager.update(id, { score: newScore, lastRatedAt: new Date().toISOString() });
            }
            return true;
        } catch (error) {
            console.error(`[${this.raterName}] Error re-rating item ID ${id}:`, error);
            return false;
        }
    }

    async reRateAllItems() {
        console.log(`[${this.raterName}] Starting re-rating for all items...`);
        try {
            const items = await this.storageManager.getAll();
            if (!items || items.length === 0) {
                console.log(`[${this.raterName}] No items to re-rate.`);
                return true;
            }

            const updatedItems = [];
            let itemsChanged = 0;

            for (const item of items) {
                // Validar que cada elemento sea una cadena
                if (typeof item.value !== 'string') {
                    console.warn(`[${this.raterName}] reRateAllItems: Skipping item with non-string value:`, item);
                    updatedItems.push(item);
                    continue;
                }

                const newScore = this._calculateScore(item.value);
                if (item.score !== newScore) {
                    updatedItems.push({ ...item, score: newScore, lastRatedAt: new Date().toISOString() });
                    itemsChanged++;
                } else {
                    updatedItems.push(item);
                }
            }

            if (itemsChanged > 0) {
                console.log(`[${this.raterName}] ${itemsChanged} items had score updates. Saving...`);
                await this.storageManager.saveItems(updatedItems);
            } else {
                console.log(`[${this.raterName}] No score updates were needed for any items.`);
            }
            console.log(`[${this.raterName}] Re-rating complete.`);
            return true;
        } catch (error) {
            console.error(`[${this.raterName}] Error during reRateAllItems:`, error);
            return false;
        }
    }

    async clearAllRatedItems() {
        return this.storageManager.clear();
    }
}
class NumberRater {
    constructor(raterName, storageManager) {
        if (!storageManager || typeof storageManager.getAll !== 'function') {
            throw new Error("NumberRater requires a valid LocalStorageManager instance.");
        }
        this.raterName = raterName;
        this.storageManager = storageManager;
        this.rules = [];
    }

    addRule(rule) {
        if (!rule || typeof rule !== 'object' || !rule.type || (rule.value === undefined || rule.value === null) || typeof rule.points !== 'number') {
            console.warn(`[${this.raterName}] addRule: Invalid rule provided (missing type, value, or points).`, rule);
            return;
        }

        // Validar que el valor sea un número
        if (typeof rule.value !== 'number') {
            console.warn(`[${this.raterName}] addRule: Rule value must be a number.`, rule);
            return;
        }

        // Validar tipos de reglas para números
        if (!['equal', 'greaterThan', 'lessThan', 'range'].includes(rule.type)) {
            console.warn(`[${this.raterName}] addRule: Invalid rule type for NumberRater. Supported types: equal, greaterThan, lessThan, range.`, rule);
            return;
        }

        // Validar regla de rango
        if (rule.type === 'range') {
            if (rule.value2 === undefined || rule.value2 === null || typeof rule.value2 !== 'number') {
                console.warn(`[${this.raterName}] addRule: Rule type 'range' requires numeric 'value2'.`, rule);
                return;
            }
        }

        this.rules.push(rule);
    }

    removeRule(description) {
        const initialLength = this.rules.length;
        this.rules = this.rules.filter(rule => rule.description !== description);
        return this.rules.length < initialLength;
    }

    getRules() {
        return this.storageManager.deepCopy(this.rules);
    }

    _calculateScore(value) {
        // Validar que el valor a calificar sea un número
        if (typeof value !== 'number') {
            console.warn(`[${this.raterName}] _calculateScore: Value must be a number.`);
            return 0;
        }

        let score = 0;

        for (const rule of this.rules) {
            let match = false;
            try {
                switch (rule.type) {
                    case 'equal':
                        match = (value === rule.value);
                        break;
                    case 'greaterThan':
                        match = value > rule.value;
                        break;
                    case 'lessThan':
                        match = value < rule.value;
                        break;
                    case 'range':
                        // Asegurar que value <= value2 para el rango
                        const min = Math.min(rule.value, rule.value2);
                        const max = Math.max(rule.value, rule.value2);
                        match = (value >= min && value <= max);
                        break;
                    default:
                        console.warn(`[${this.raterName}] _calculateScore: Unknown rule type: ${rule.type}`);
                }
            } catch (e) {
                console.error(`[${this.raterName}] Error applying rule:`, rule, 'to value:', value, e);
            }

            if (match) {
                score += rule.points;
            }
        }
        return score;
    }

    async addRatedItem(value) {
        // Validar que el valor sea un número
        if (typeof value !== 'number') {
            console.warn(`[${this.raterName}] addRatedItem: Value must be a number.`);
            return null;
        }

        try {
            const score = this._calculateScore(value);
            const newItem = {
                value: value,
                score: score,
                createdAt: new Date().toISOString()
            };
            const assignedId = await this.storageManager.add(newItem);
            if (assignedId !== false && assignedId !== undefined) {
                return await this.storageManager.get(assignedId);
            } else {
                return null;
            }
        } catch (error) {
            console.error(`[${this.raterName}] Error adding rated item:`, error);
            return null;
        }
    }

    async getRatedItem(id) {
        return this.storageManager.get(id);
    }

    async getAllRatedItems() {
        return this.storageManager.getAll();
    }

    async removeRatedItem(id) {
        return this.storageManager.remove(id);
    }

    async updateRatedItemValue(id, newValue) {
        // Validar que el nuevo valor sea un número
        if (typeof newValue !== 'number') {
            console.warn(`[${this.raterName}] updateRatedItemValue: New value must be a number.`);
            return false;
        }

        try {
            const itemExists = await this.storageManager.get(id);
            if (!itemExists) {
                console.warn(`[${this.raterName}] updateRatedItemValue: Item with ID ${id} not found.`);
                return false;
            }
            const newScore = this._calculateScore(newValue);
            const success = await this.storageManager.update(id, { value: newValue, score: newScore, updatedAt: new Date().toISOString() });
            return success;
        } catch (error) {
            console.error(`[${this.raterName}] Error updating item value for ID ${id}:`, error);
            return false;
        }
    }

    async reRateItem(id) {
        try {
            const item = await this.storageManager.get(id);
            if (!item) {
                console.warn(`[${this.raterName}] reRateItem: Item with ID ${id} not found.`);
                return false;
            }
            const newScore = this._calculateScore(item.value);
            if (item.score !== newScore) {
                return await this.storageManager.update(id, { score: newScore, lastRatedAt: new Date().toISOString() });
            }
            return true;
        } catch (error) {
            console.error(`[${this.raterName}] Error re-rating item ID ${id}:`, error);
            return false;
        }
    }

    async reRateAllItems() {
        console.log(`[${this.raterName}] Starting re-rating for all items...`);
        try {
            const items = await this.storageManager.getAll();
            if (!items || items.length === 0) {
                console.log(`[${this.raterName}] No items to re-rate.`);
                return true;
            }

            const updatedItems = [];
            let itemsChanged = 0;

            for (const item of items) {
                // Validar que cada elemento sea un número
                if (typeof item.value !== 'number') {
                    console.warn(`[${this.raterName}] reRateAllItems: Skipping item with non-number value:`, item);
                    updatedItems.push(item);
                    continue;
                }

                const newScore = this._calculateScore(item.value);
                if (item.score !== newScore) {
                    updatedItems.push({ ...item, score: newScore, lastRatedAt: new Date().toISOString() });
                    itemsChanged++;
                } else {
                    updatedItems.push(item);
                }
            }

            if (itemsChanged > 0) {
                console.log(`[${this.raterName}] ${itemsChanged} items had score updates. Saving...`);
                await this.storageManager.saveItems(updatedItems);
            } else {
                console.log(`[${this.raterName}] No score updates were needed for any items.`);
            }
            console.log(`[${this.raterName}] Re-rating complete.`);
            return true;
        } catch (error) {
            console.error(`[${this.raterName}] Error during reRateAllItems:`, error);
            return false;
        }
    }

    async clearAllRatedItems() {
        return this.storageManager.clear();
    }
}



(async () => {
    try {
        // Inicializar los gestores de almacenamiento
        const stringStorageKey = 'stringRatedItems';
        const numberStorageKey = 'numberRatedItems';
        
        const stringStorageManager = await LocalStorageManager.create(stringStorageKey);
        const numberStorageManager = await LocalStorageManager.create(numberStorageKey);
        
        console.log("LocalStorageManagers inicializados.");

        // Crear instancias de los calificadores
        const stringRater = new StringRater("StringRater", stringStorageManager);
        const numberRater = new NumberRater("NumberRater", numberStorageManager);
        
        console.log("Calificadores creados.");

        // Opcional: limpiar datos antiguos
        // await stringRater.clearAllRatedItems();
        // await numberRater.clearAllRatedItems();

        console.log("\n--- Definiendo Reglas para StringRater ---");
        stringRater.addRule({ type: 'equal', value: 'admin', points: 20, description: 'Es "admin"' });
        stringRater.addRule({ type: 'contains', value: 'test', points: 3, description: 'Contiene "test"' });
        stringRater.addRule({ type: 'startsWith', value: 'user', points: 5, description: 'Comienza con "user"' });
        stringRater.addRule({ type: 'endsWith', value: '.com', points: 2, description: 'Termina con ".com"' });
        console.log("Reglas de StringRater:", stringRater.getRules());

        console.log("\n--- Definiendo Reglas para NumberRater ---");
        numberRater.addRule({ type: 'equal', value: 100, points: 10, description: 'Exactamente 100' });
        numberRater.addRule({ type: 'greaterThan', value: 50, points: 5, description: 'Mayor que 50' });
        numberRater.addRule({ type: 'lessThan', value: 0, points: -2, description: 'Menor que 0 (negativo)' });
        numberRater.addRule({ type: 'range', value: 10, value2: 20, points: 7, description: 'Entre 10 y 20 inclusive' });
        numberRater.addRule({ type: 'equal', value: 0, points: 1, description: 'Exactamente 0'});
        console.log("Reglas de NumberRater:", numberRater.getRules());

        console.log("\n--- Agregando Elementos a StringRater ---");
        await stringRater.addRatedItem("test string");
        await stringRater.addRatedItem("admin");
        await stringRater.addRatedItem("user123");
        await stringRater.addRatedItem("example.com");
        await stringRater.addRatedItem("user@example.com");
        
        console.log("\n--- Agregando Elementos a NumberRater ---");
        await numberRater.addRatedItem(75);
        await numberRater.addRatedItem(-5);
        await numberRater.addRatedItem(100);
        await numberRater.addRatedItem(15);
        await numberRater.addRatedItem(0);

        console.log("\n--- Obteniendo Todos los Elementos de StringRater ---");
        const stringItems = await stringRater.getAllRatedItems();
        console.log("Elementos de StringRater:", stringItems);

        console.log("\n--- Obteniendo Todos los Elementos de NumberRater ---");
        const numberItems = await numberRater.getAllRatedItems();
        console.log("Elementos de NumberRater:", numberItems);

        console.log("\n--- Actualizando un Elemento en cada Rater ---");
        // Actualizar un string
        const stringUpdateSuccess = await stringRater.updateRatedItemValue(1, "updated test string");
        if (stringUpdateSuccess) {
            const updatedStringItem = await stringRater.getRatedItem(1);
            console.log("Elemento de string actualizado:", updatedStringItem);
        }
        
        // Actualizar un número
        const numberUpdateSuccess = await numberRater.updateRatedItemValue(1, -10);
        if (numberUpdateSuccess) {
            const updatedNumberItem = await numberRater.getRatedItem(1);
            console.log("Elemento de número actualizado:", updatedNumberItem);
        }

        console.log("\n--- Cambiando Reglas y Recalculando Scores ---");
        
        // Modificar reglas de StringRater
        stringRater.removeRule('Contiene "test"');
        stringRater.addRule({ type: 'contains', value: 'updated', points: 6, description: 'Contiene "updated"' });
        console.log("Reglas actualizadas de StringRater:", stringRater.getRules());
        await stringRater.reRateAllItems();
        
        // Modificar reglas de NumberRater
        numberRater.removeRule('Mayor que 50');
        numberRater.addRule({ type: 'lessThan', value: -5, points: -5, description: 'Menor que -5' });
        console.log("Reglas actualizadas de NumberRater:", numberRater.getRules());
        await numberRater.reRateAllItems();

        console.log("\n--- Elementos después de Re-Rate ---");
        const stringItemsAfterReRate = await stringRater.getAllRatedItems();
        console.log("StringRater después de re-rate:", stringItemsAfterReRate.map(i => ({id: i.id, value: i.value, score: i.score})));
        
        const numberItemsAfterReRate = await numberRater.getAllRatedItems();
        console.log("NumberRater después de re-rate:", numberItemsAfterReRate.map(i => ({id: i.id, value: i.value, score: i.score})));

    } catch (error) {
        console.error("Error en la ejecución principal:", error);
    }
})();