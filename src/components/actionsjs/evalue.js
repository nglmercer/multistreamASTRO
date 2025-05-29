import {getAllDataFromDatabase, databases} from '@components/actionsjs/idb.js';
import logger from '@utils/logger.js';
import {flattenObject, unflattenObject, replaceVariables} from '@utils/utils.js';
import {
    playTextwithproviderInfo
} from '@components/voicecomponents/initconfig.js';
import { executeHttpRequest } from "src/fetch/executor";

/*
    commentEventsDB: { name: 'commentEvents', version: 1, store: 'commentEvents' },
    giftEventsDB: { name: 'giftEvents', version: 1, store: 'giftEvents' },
    bitsEventsDB: { name: 'bitsEvents', version: 1, store: 'bitsEvents' },
    likesEventsDB: { name: 'likesEvents', version: 1, store: 'likesEvents' },
    eventsDB: { name: 'Events', version: 1, store: 'events' },
    ActionsDB: { name: 'Actions', version: 1, store: 'actions' },
*/
import {socket,TiktokEmitter,tiktokLiveEvents, localStorageManager, KickEmitter,kickLiveEvents } from '@utils/socketManager.ts';

tiktokLiveEvents.forEach(event => {
    TiktokEmitter.on(event, async (data) => {
        switcheventDb(event, data);
    });
});
kickLiveEvents.forEach(event => {
    KickEmitter.on(event, async (data) => {
        console.log("KickEmitter",event,data);
        if (event === "ChatMessage") {
            const polifyedData = polifyfillEvalueKick(data);
            switcheventDb(event, polifyedData);
        }
    });
});
console.log("init", TiktokEmitter);

// Configuración de reglas para diferentes tipos de eventos
const eventRules = {

    chat: {
        roleChecks: {
            "any": (data) => true,
            "sub": (data) => data.isSubscriber,
            "mod": (data) => data.isModerator,
            "gifter": (data) => data.isNewGifter || data.gifterLevel
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
function polifyfillEvalueKick(data){
    /*KickEmitter ChatMessage 
content: "hola pepe como estas"
created_at: "2025-05-28T23:23:57+00:00"
id: "1b6f9404-a314-44c1-9389-d4a766bf6b5d"
metadata: Object { message_ref: "1748474637226" }
sender: Object { id, username, slug, identity }

id: 57654164
identity: Object { color: "#93EBE0", badges: (1) […] }
slug: "memelcer"
username: "memelcer"
​​​
type: "message"*/
    const Mapdata = {
        "comment": data.content,
        "uniqueId": data.sender.username,
        ...data
    }
    return Mapdata;
}
function switcheventDb(event, eventData) {
    const dbEvents = {
        "chat": databases.commentEventsDB,
        "gift": databases.giftEventsDB,
        "bits": databases.bitsEventsDB,
        "likes": databases.likesEventsDB,
        "ChatMessage":databases.commentEventsDB,
    };
    
    if (dbEvents[event]) {
        getAllDataFromDatabase(dbEvents[event]).then(array => {
            console.log("originEvalue", event, array);
            let result;
            
            switch (event) {
                case 'ChatMessage':
                    result = evalueChat(array, polifyfillEvalueKick(eventData));
                    break;
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
            
            console.log(`originEvalue`, result);
            
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
        const ProcesedActions = unflattenObject(actions);
        console.log("Action", item.actions, ProcesedActions);
        const verifyObj = {
            "minecraft": {
                verify: ["check","command"],
                callback: (A,B,C,ev)=>{
                    console.log("Minecraft",A,B,C,ev);
                    socket.emit("actions",{type:"minecraft",data:{A,B,C,ev},event:ev});
                }
            },
            "tts": {
                verify: ["check","text"],
                callback: (A,B,C,ev)=>{
                    let playnow;
                    console.log("tts",A,B,C,ev);
                    if (C.emotes && C.emotes.length >= 1){
                        return;
                    }
                    if (C.giftId || C.giftName) playnow = true; 
                    console.log("playnow",playnow)
                    playTextwithproviderInfo(replaceVariables(A.text,C),undefined,playnow);
                }
            },
            "overlay": {
                verify: ["check","src","content","duration","volume"],
                callback: (A,B,C,ev)=>{
                    console.log("overlay",A,B,C,ev);
                    socket.emit("actions",{type:"overlay",data:{A,B,C,ev},event:ev});
                }
            },
            "keypress": {
                verify: ["check","key"],
                callback: (A,B,C,ev)=>{
                    console.log("keypress",A,B,C,ev);
                    socket.emit("actions",{type:"keypress",data:{A,B,C,ev},event:ev});
                }
            },
            "fetchForm":{
                verify: ["check"],
                callback: async (A, B, C, ev) => {
                    console.log("fetchForm", A, B, C, ev);
                    const { check, value } = A;
                    if (check && value){
                        const result = await executeHttpRequest(value);
                        console.log("fetchForm result", result);
                    }
                }
            }
        }
        processActions(verifyObj, ProcesedActions, eventData, eventType);
    });
}
function processActions(verifyObj, ProcessedActions, eventData, eventType) {
    if (!ProcessedActions || !Array.isArray(ProcessedActions)) {
        return;
    }
    ProcessedActions.forEach(action => {
        if (!action || typeof action !== 'object') {
            return;
        }
        console.log("Processing action:", action);
        Object.keys(verifyObj).forEach(actionType => {
            const config = verifyObj[actionType]; // Get config { verify: [...], callback: fn }
            const actionData = action[actionType]; // Get the specific data part, e.g., action.minecraft
            // 1. Check if this action type exists in the current action object,
            //    is an object itself, and has its 'check' property set to true.
            const verifyprocess = (actionData && typeof actionData === 'object' && (actionData.check === true || actionData.check === "true"))
            if (verifyprocess) {
                console.log(`  - Action type '${actionType}' is ENABLED. Verifying properties...`,verifyprocess);

                let allPropsValid = true;
                for (const propName of config.verify) {
                    if ((propName in actionData) || actionData[propName]) {
                    //    logger.log("Action",`    - Verification SUCCESSFUL.`,actionType);
                        allPropsValid = true;
                    }
                }
                if (allPropsValid) {
                    console.log("Action",`    - Verification SUCCESSFUL for '${actionType}'. Executing callback.`);
                    config.callback(actionData, action, eventData, eventType);
                }
            } else {}
        });
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
// switcheventDb('chat', { uniqueId: 'ju44444n._', comment: 'test', isModerator: false, isSubscriber: false, isNewGifter: true });

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