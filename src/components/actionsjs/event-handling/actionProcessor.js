// src/event-handling/actionProcessor.js
import { getAllDataFromDatabase, databases } from '@utils/idb.js';
import { unflattenObject } from '@utils/transform/objuf.ts';
import { playTextwithproviderInfo } from '@components/voicecomponents/initconfig.js';
import { executeHttpRequest } from "src/fetch/executor";
import { taskApi } from 'src/fetch/fetchapi.js';
import { socket } from '@utils/socketManager.ts'; // Asumiendo que socketManager exporta 'socket'
import { ReplacesValues } from './dataUtils.js';
import { nextSpeech } from '@components/voicecomponents/initconfig';
import {
    COMPARATORS,
    ROLECHECKS,
    CHATOPTIONS,
    COActions
} from '../constants.js'
async function filterItemsByIds(ids) {
    const items = await getAllDataFromDatabase(databases.ActionsDB);
    if (!Array.isArray(items) || !Array.isArray(ids)) {
        return [];
    }
    const numericIds = ids.map(id => Number(id));
    const idSet = new Set(numericIds);

    const filteredItems = items.filter(item => {
        return item && item.id !== undefined && idSet.has(item.id);
    });
    return filteredItems;
}

function processIndividualAction(verifyObj, ProcessedActions, eventData, eventType) {
    if (!ProcessedActions || !Array.isArray(ProcessedActions)) {
        return;
    }
    ProcessedActions.forEach(action => {
        if (!action || typeof action !== 'object') {
            return;
        }
        console.log("Processing action:", action); // Mantengo tus logs
        Object.keys(verifyObj).forEach(actionType => {
            const config = verifyObj[actionType];
            const actionData = action[actionType];
            
            const verifyprocess = (actionData && typeof actionData === 'object' && (actionData.check === true || String(actionData.check).toLowerCase() === "true"));
            
            if (verifyprocess) {
                console.log(`  - Action type '${actionType}' is ENABLED. Verifying properties...`, verifyprocess);

                let allPropsValid = true; // Asumimos validez inicial, luego verificamos
                // if (config.verify && config.verify.length > 0) { // Solo verificar si hay props que verificar
                //     allPropsValid = config.verify.every(propName => {
                //         const propExists = propName in actionData && actionData[propName] !== undefined && actionData[propName] !== null && actionData[propName] !== '';
                //         if (!propExists) {
                //              console.warn(`    - Property '${propName}' missing or invalid for action type '${actionType}'.`);
                //         }
                //         return propExists;
                //     });
                // }
                // Tu lógica original es más permisiva, la mantengo si esa es la intención:
                 for (const propName of config.verify) {
                     if ((propName in actionData) || actionData[propName]) { // Esta condición es un poco ambigua
                         allPropsValid = true; // Si cualquier prop está, se considera válido. ¿Es correcto?
                     }
                 }


                if (allPropsValid) {
                    console.log("Action", `    - Verification SUCCESSFUL for '${actionType}'. Executing callback.`);
                    config.callback(actionData, action, eventData, eventType);
                } else {
                    // logger.warn(`Action verification FAILED for '${actionType}' due to missing properties.`);
                }
            }
        });
    });
}


// Configuración de acciones y sus verificaciones/callbacks
// Es buena idea tener esto aquí, cerca de donde se usa.
const actionExecutionConfig = {
    "minecraft": {
        verify: ["check", "command"], // Propiedades a verificar (además de 'check' global)
        callback: (actionData, fullAction, eventData, eventType) => {
            console.log("Minecraft", actionData, fullAction, eventData, eventType);
            socket.emit("actions", { type: "minecraft", data: { ...actionData }, event: eventType });
            const proccessdata = ReplacesValues(actionData, eventData);
            taskApi.saveTasks("minecraft", {actionData: proccessdata});
        }
    },
    "tts": {
        verify: ["check", "text"],
        callback: (actionData, fullAction, eventData, eventType) => {
            let playnow = false;
            console.log("tts", actionData, fullAction, eventData, eventType);
            if (eventData.emotes && eventData.emotes.length >= 1) { // Usar eventData para emotes
                return;
            }
            if (eventData.giftId || eventData.giftName) playnow = true; // Usar eventData
            console.log("playnow", playnow);
            playTextwithproviderInfo(ReplacesValues(actionData.text, eventData), undefined, playnow);
        }
    },
    "overlay": {
        verify: ["check", "src", "content", "duration", "volume"],
        callback: (actionData, fullAction, eventData, eventType) => {
            console.log("overlay", actionData, fullAction, eventData, eventType);
            socket.emit("actions", { type: "overlay", data: { ...actionData }, event: eventType });
            const proccessdata = ReplacesValues(actionData, eventData);
            taskApi.saveTasks("overlay", {actionData: proccessdata});
        }
    },
    "keypress": {
        verify: ["check", "key"],
        callback: (actionData, fullAction, eventData, eventType) => {
            console.log("keypress", actionData, fullAction, eventData, eventType);
            socket.emit("actions", { type: "keypress", data: { ...actionData }, event: eventType });
            const proccessdata = ReplacesValues(actionData, eventData);
            taskApi.saveTasks("keypress", {actionData: proccessdata});
        }
    },
    "fetchForm": {
        verify: ["check", "value"], // 'value' debe existir en actionData.fetchForm
        callback: async (actionData, fullAction, eventData, eventType) => {
            console.log("fetchForm", actionData, fullAction, eventData, eventType);
            const { value } = actionData; // value viene de actionData.fetchForm.value
            if (value) { // 'check' ya fue verificado
                const proccessedValue = ReplacesValues(value, eventData);
                const result = await executeHttpRequest(proccessedValue);
                console.log("fetchForm result proccessedValue", result, proccessedValue);
            }
        }
    },
    "windowApi":{
        verify: ["check", "value"],
        callback: async ()=>{

        }
    }
};

export async function processMatchedItems(items, eventData, eventType) {
    for (const item of items) { // Usar for...of para await dentro del loop
        const actionsRaw = await filterItemsByIds(item.actions);
        if (actionsRaw.length === 0) continue;

        const processedActions = unflattenObject(actionsRaw); // Asumo que unflattenObject espera el array de acciones
        console.log("Action to process for item:", item.id, "Actions:", processedActions);
        
        // Llamar a la función que itera y procesa cada acción individualmente
        processIndividualAction(actionExecutionConfig, processedActions, eventData, eventType);
    }
}
async function filterUser(action, string) {
    if (!action || !string)return;
    const filterItem = document.querySelector("user-filter");
    if (!filterItem || !(COActions.addItemProgrammatically in filterItem) || !(COActions.removeItemProgrammatically in filterItem))return;
    console.log("filterItem",filterItem)
      switch (action){
            case COActions.ban:
                console.log(action, string);
            filterItem.addItemProgrammatically(string);
            break
            case COActions.unban:
                console.log(action, string);
            filterItem.removeItemProgrammatically(string);
            break
            default:
                console.log(action, string)
        }
}
function COMMANDCHAT(string) {
    const defaultSplit = " ";
    if (!string) return string;

    // Asegurarse de que sea string
    const validString = String(string);

    // Separar palabras
    const split = validString.split(defaultSplit);

    // Quitar la primera palabra (el comando)
    split.shift();

    // Unir el resto
    const joined = split.join(defaultSplit);

    // Eliminar caracteres no alfanuméricos ni espacios (solo letras, números y espacios)
    const cleaned = joined.replace(/[^a-zA-Z0-9\s]/g, '');

    return cleaned;
}

//console.log("COMMANDCHAT",COMMANDCHAT("!ban @eleqpmweqmweqmopwe "))