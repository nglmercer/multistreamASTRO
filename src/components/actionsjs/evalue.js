import {getAllDataFromDatabase, databases} from '/src/components/actionsjs/idb.js';
import logger from '/src/utils/logger.js';
import {flattenObject, unflattenObject, replaceVariables} from '/src/utils/utils.js';
import {
    playTextwithproviderInfo
} from '/src/components/voicecomponents/initconfig.js';	
/*
    commentEventsDB: { name: 'commentEvents', version: 1, store: 'commentEvents' },
    giftEventsDB: { name: 'giftEvents', version: 1, store: 'giftEvents' },
    bitsEventsDB: { name: 'bitsEvents', version: 1, store: 'bitsEvents' },
    likesEventsDB: { name: 'likesEvents', version: 1, store: 'likesEvents' },
    eventsDB: { name: 'Events', version: 1, store: 'events' },
    ActionsDB: { name: 'Actions', version: 1, store: 'actions' },
*/
import {socket,TiktokEmitter,tiktokLiveEvents, localStorageManager } from '/src/utils/socketManager.ts';

tiktokLiveEvents.forEach(event => {
    TiktokEmitter.on(event, async (data) => {
        switcheventDb(event, data);
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
        const ProcesedActions = unflattenObject(actions);
        logger.log("Action", item.actions, ProcesedActions);
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
                    console.log("tts",A,B,C,ev);
                    playTextwithproviderInfo(replaceVariables(A.text,C));
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
        Object.keys(verifyObj).forEach(actionType => {
            const config = verifyObj[actionType]; // Get config { verify: [...], callback: fn }
            const actionData = action[actionType]; // Get the specific data part, e.g., action.minecraft
            // 1. Check if this action type exists in the current action object,
            //    is an object itself, and has its 'check' property set to true.
            if (actionData && typeof actionData === 'object' && actionData.check === true) {
                logger.log(`  - Action type '${actionType}' is ENABLED. Verifying properties...`);

                let allPropsValid = true;
                for (const propName of config.verify) {
                    if ((propName in actionData) || actionData[propName]) {
                    //    logger.log("Action",`    - Verification SUCCESSFUL.`,actionType);
                        allPropsValid = true;
                    }
                }
                if (allPropsValid) {
                    logger.log("Action",`    - Verification SUCCESSFUL for '${actionType}'. Executing callback.`);
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

    const eventSelect = document.getElementById('tiktok-event-select');
    const emitButton = document.getElementById('emit-tiktok-event-button');
    const statusDiv = document.getElementById('tiktok-event-status');

    function populateEventOptions() {
      // Clear previous options (keeping the placeholder)
      eventSelect.length = 1;
      statusDiv.textContent = '';
      emitButton.disabled = true; // Disable button initially

      try {
        const storedEvents = localStorageManager.getAll(); // Use the new getAll method
        const eventNames = Object.keys(storedEvents);

        if (eventNames.length === 0) {
          statusDiv.textContent = `No events found in localStorage for key "${STORAGE_KEY}".`;
          return;
        }

        // Sort for better readability
        eventNames.sort().forEach(eventName => {
          // Only add if there's actual data (or explicitly null, which is valid)
          if (storedEvents[eventName] !== undefined) {
             const option = document.createElement('option');
             option.value = eventName;
             // Display the event name. You could potentially show a snippet of data here too if useful.
             option.textContent = eventName;
             eventSelect.appendChild(option);
          }
        });

        // Enable button only if options were added
        if (eventSelect.options.length > 1) {
            // Keep button disabled until an event is selected
            eventSelect.addEventListener('change', () => {
                 emitButton.disabled = eventSelect.value === "";
            }, { once: false }); // Re-enable button when selection changes to a valid event
        } else {
             statusDiv.textContent = `No valid event data found in localStorage for key "${STORAGE_KEY}".`;
        }


      } catch (error) {
        console.error("Error reading or processing TikTok events from localStorage:", error);
        statusDiv.textContent = 'Error loading events from localStorage.';
      }
    }

    function handleEmitEvent() {
      const selectedEventName = eventSelect.value;

      if (!selectedEventName) {
        statusDiv.textContent = 'Please select an event type first.';
        return;
      }

      try {
        const eventData = localStorageManager.get(selectedEventName); // Cast needed if keys aren't perfectly typed generics

        if (eventData === undefined) {
          // Should not happen if populateEventOptions worked correctly, but safety check
           statusDiv.textContent = `Data for event "${selectedEventName}" not found in localStorage. Cannot emit.`;
           console.warn(`Attempted to emit event "${selectedEventName}" but no data was found.`);
           return;
        }

        console.log(`Simulating emit: Event='${selectedEventName}', Data=`, eventData);
        // THE CORE ACTION: Emit the event using the imported Emitter instance
        TiktokEmitter.emit(selectedEventName, eventData);

        statusDiv.textContent = `Successfully emitted "${selectedEventName}" event. Check console or listeners.`;

        // Optional: Briefly highlight the status
        statusDiv.style.color = 'green';
        setTimeout(() => { statusDiv.style.color = ''; }, 2000);


      } catch (error) {
        console.error(`Error retrieving or emitting event "${selectedEventName}":`, error);
        statusDiv.textContent = `Error emitting event "${selectedEventName}". Check console.`;
        statusDiv.style.color = 'red';
        setTimeout(() => { statusDiv.style.color = ''; }, 3000);
      }
    }

    // Initial population when the script runs
    populateEventOptions();

    // Add click listener to the button
    emitButton.addEventListener('click', handleEmitEvent);
export { switcheventDb, updateRules };