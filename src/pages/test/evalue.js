import {getAllDataFromDatabase, databases} from '/src/pages/test/idb.js';
import logger from '/src/utils/logger.js';
/*
    commentEventsDB: { name: 'commentEvents', version: 1, store: 'commentEvents' },
    giftEventsDB: { name: 'giftEvents', version: 1, store: 'giftEvents' },
    bitsEventsDB: { name: 'bitsEvents', version: 1, store: 'bitsEvents' },
    likesEventsDB: { name: 'likesEvents', version: 1, store: 'likesEvents' },
    eventsDB: { name: 'Events', version: 1, store: 'events' },
    ActionsDB: { name: 'Actions', version: 1, store: 'actions' },
*/
import socketManager from '/src/utils/socketManager.ts';

socketManager.tiktokLiveEvents.forEach(event => {
    socketManager.getTiktokEmitter().on(event, async (data) => {
        switcheventDb(event, data);
    });
});
console.log("init", socketManager.getTiktokEmitter());

// Configuración de reglas para diferentes tipos de eventos
const eventRules = {
    chat: {
        roleChecks: {
            "any": (data) => true,
            "sub": (data) => data.isSubscriber,
            "mod": (data) => data.isModerator,
            "gifter": (data) => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item, data) => true,
            "equal": (item, data) => item.value === data.comment,
            "startsWith": (item, data) => data.comment?.startsWith(item.value),
            "endsWith": (item, data) => data.comment?.endsWith(item.value),
            "contains": (item, data) => data.comment?.includes(item.value),
            "includes": (item, data) => data.comment?.includes(item.value)
        }
    },
    gift: {
        roleChecks: {
            "any": (data) => true,
            "sub": (data) => data.isSubscriber,
            "mod": (data) => data.isModerator,
            "gifter": (data) => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item, data) => true,
            "equal": (item, data) => item.value === data.giftName,
            "diamondValue": (item, data) => data.diamondCount >= parseInt(item.value)
        }
    },
    bits: {
        roleChecks: {
            "any": (data) => true,
            "sub": (data) => data.isSubscriber,
            "mod": (data) => data.isModerator,
            "gifter": (data) => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item, data) => true,
            "equal": (item, data) => parseInt(item.value) === data.bitsAmount,
            "InRange": (item, data) => data.bitsAmount >= parseInt(item.lessThan) && data.bitsAmount <= parseInt(item.greaterThan)
        }
    },
    likes: {
        roleChecks: {
            "any": (data) => true,
            "sub": (data) => data.isSubscriber,
            "mod": (data) => data.isModerator,
            "gifter": (data) => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item, data) => true,
            "equal": (item, data) => parseInt(item.value) === data.likeCount,
            "InRange": (item, data) => data.likeCount >= parseInt(item.lessThan) && data.likeCount <= parseInt(item.greaterThan)
        }
    }
};

// Función genérica para evaluar reglas
function evaluateRules(array, data, eventType) {
    let result = new Map();
    if (!array || !Array.isArray(array) || !data) return result;
    
    const rules = eventRules[eventType];
    if (!rules) return result;
    
    logger.log(`Evaluating ${eventType}`, array, data);
    
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        
        // Saltamos los elementos inactivos
        if (item.isActive === false) continue;
        
        // Verificación rápida si tiene el atributo bypass
        if (item.bypassChecks) {
            const itemId = item.id || i;
            result.set(itemId, item);
            continue;
        }
        
        // Verificamos las condiciones de rol
        const roleCheckFn = rules.roleChecks[item.role];
        if (!roleCheckFn || !roleCheckFn(data)) continue;
        
        // Verificamos las condiciones del comparador
        const comparatorCheckFn = rules.comparatorChecks[item.comparator];
        if (!comparatorCheckFn || !comparatorCheckFn(item, data)) continue;
        
        // Si pasa ambas verificaciones, lo agregamos al resultado
        const itemId = item.id || i;
        result.set(itemId, item);
    }
    
    return result;
}

// Funciones específicas que utilizan la función genérica
function evalueChat(array, data) {
    return evaluateRules(array, data, 'chat');
}

function evalueGift(array, data) {
    return evaluateRules(array, data, 'gift');
}

function evalueBits(array, data) {
    return evaluateRules(array, data, 'bits');
}

function evalueLikes(array, data) {
    return evaluateRules(array, data, 'likes');
}

function switcheventDb(event, eventData) {
    const dbEvents = {
        "chat": databases.commentEventsDB,
        "gift": databases.giftEventsDB,
        "bits": databases.bitsEventsDB,
        "likes": databases.likesEventsDB,
    };
    
    if (dbEvents[event]) {
        getAllDataFromDatabase(dbEvents[event]).then(array => {
            logger.log("originEvalue", event, array);
            let result;
            
            switch (event) {
                case 'chat':
                    result = evalueChat(array, eventData);
                    break;
                case 'gift':
                    result = evalueGift(array, eventData);
                    break;
                case 'bits':
                    result = evalueBits(array, eventData);
                    break;
                case 'likes':
                    result = evalueLikes(array, eventData);
                    break;
            }
            
            logger.log(`originEvalue`, result);
            
            // Procesar los resultados si los hay
            if (result && result instanceof Map && result.size > 0) {
                const resultArray = Array.from(result.values());
                processMatchedItems(resultArray, eventData, event);
            }
        });
    }
}

// Función para procesar elementos coincidentes
function processMatchedItems(items, eventData, eventType) {
    items.forEach( async item => {
        const actions = await filterItemsByIds(item.actions);
        logger.log("Action", item.actions, actions);
    });
}
async function filterItemsByIds(ids) {
    const items = await getAllDataFromDatabase(databases.ActionsDB);
    if (!Array.isArray(items) || !Array.isArray(ids)) {
        return [];
    }
    // convertir ids a numbers
    ids = ids.map(id => Number(id));
    const idSet = new Set(ids);
    
    const filteredItems = items.filter(item => {
        return item && item.id !== undefined && idSet.has(item.id);
    });
    return filteredItems;
}

// Función para actualizar reglas en tiempo de ejecución
function updateRules(eventType, newRules) {
    if (!eventRules[eventType]) {
        logger.error(`Event type ${eventType} does not exist`);
        return false;
    }
    
    if (newRules.roleChecks) {
        eventRules[eventType].roleChecks = {
            ...eventRules[eventType].roleChecks,
            ...newRules.roleChecks
        };
    }
    
    if (newRules.comparatorChecks) {
        eventRules[eventType].comparatorChecks = {
            ...eventRules[eventType].comparatorChecks,
            ...newRules.comparatorChecks
        };
    }
    
    logger.log(`Rules updated for ${eventType}:`, eventRules[eventType]);
    return true;
}

// Ejemplo de uso:
 switcheventDb('chat', { uniqueId: 'ju44444n._', comment: 'test', isModerator: false, isSubscriber: false, isNewGifter: true });

// Ejemplo de cómo actualizar reglas en tiempo de ejecución:
// updateRules('chat', {
//     roleChecks: {
//         "vip": (data) => data.isVIP  // Agregar nueva regla de rol
//     },
//     comparatorChecks: {
//         "exactLength": (item, data) => data.comment?.length === parseInt(item.value)  // Agregar nuevo comparador
//     }
// });

export { switcheventDb, updateRules };