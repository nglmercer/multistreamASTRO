// src/event-handling/ruleEngine.js
import { dbManager } from './eventSaver.js'; // Importa dbManager
import { ReplacesValues } from './dataUtils.js'
import {
    type AnyMiddlewareConfig,
    type MiddlewareContext,
    type EventRules,
    type EventRuleEntry,
    middlewareRegistry,
    PREVENT_IDENTICAL_PREVIOUS_TYPE,
    PREVENT_DUPLICATE_FOLLOW_TYPE,
    CONTENT_FILTER_TYPE
} from './middlewares/middlewareTypes.js';
import { BrowserLogger, LogLevel } from '@utils/Logger.js';
import './middlewares/preventIdenticalPrevious.js';
import './middlewares/preventDuplicateFollow.js';
import './middlewares/contentFilter.js'
const logger = new BrowserLogger('ruleEngine')
    .setLevel(LogLevel.LOG); // Habilitar debug para más información
// Configuración de reglas para diferentes tipos de eventos
const platformEventTypeMap: Record<string, string> = {
    'ChatMessage': 'chat'
};
// @ts-ignore
// Asumiendo que tienes los tipos definidos como antes:
// import { type EventRules, type AnyMiddlewareConfig, PREVENT_IDENTICAL_PREVIOUS_TYPE } from './middlewares/middlewareTypes.js';

// Si quieres que la constante eventRules en sí misma no sea estrictamente tipada por ahora,
// pero sí quieres tipar los callbacks internos como (data: any) => ..., etc.
// Puedes usar `Record<string, any>` o `any` para la constante principal y luego
// ser específico dentro.

export const eventRules: Record<string, any> = { // O const eventRules: any = {
    chat: {
        middlewares: [
            {
                type: PREVENT_IDENTICAL_PREVIOUS_TYPE, // Idealmente: PREVENT_IDENTICAL_PREVIOUS_TYPE,
                enabled: true,
                userIdentifierPath: 'uniqueId',
                contentPaths: ['comment'],
            },
            {
                type: CONTENT_FILTER_TYPE, // Usar la constante importada
                enabled: true,
                dataPath: 'comment', // El campo del objeto 'data' que contiene el texto a verificar
                localStorageKey: 'blockedChatKeywords', // La clave en localStorage para la lista de palabras
                filterMode: 'blockIfContains', // Bloquear si el 'comment' CONTIENE alguna palabra de 'blockedChatKeywords'
                blockReason: 'Mensaje contiene una palabra prohibida.'
            },
            {
                type: CONTENT_FILTER_TYPE, // Usar la constante importada
                enabled: true,
                dataPath: 'uniqueId', // El campo del objeto 'data' que contiene el texto a verificar
                localStorageKey: 'blockedUsersKeywords', // La clave en localStorage para la lista de palabras
                filterMode: 'blockIfContains', // Bloquear si el 'comment' CONTIENE alguna palabra de 'blockedChatKeywords'
                blockReason: 'Mensaje contiene una usuario prohibido.'
            }
        ],
        roleChecks: {
            "any": (data: any): boolean => true,
            "sub": (data: any): boolean => data.isSubscriber,
            "mod": (data: any): boolean => data.isModerator,
            "gifter": (data: any): boolean => data.isNewGifter || data.gifterLevel,
            "usuario": (data: any,item:any): boolean => Number(data.userId) === Number(item.usuario),
        },
        comparatorChecks: {
            "any": (item: any, data: any): boolean => true,
            "equal": (item: any, data: any): boolean => item.value === data.comment,
            "startsWith": (item: any, data: any): boolean => data.comment?.startsWith(item.value),
            "endsWith": (item: any, data: any): boolean => data.comment?.endsWith(item.value),
            "contains": (item: any, data: any): boolean => data.comment?.includes(item.value),
            "includes": (item: any, data: any): boolean => data.comment?.includes(item.value)
        }
    },
    gift: {
        // middlewares: [], // Si no hay middlewares, puedes omitir la propiedad o poner un array vacío
        roleChecks: {
            "any": (data: any): boolean => true,
            "sub": (data: any): boolean => data.isSubscriber,
            "mod": (data: any): boolean => data.isModerator,
            "gifter": (data: any): boolean => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item: any, data: any): boolean => true,
            "equal": (item: any, data: any): boolean => item.value === data.giftName,
            "diamondValue": (item: any, data: any): boolean => data.diamondCount >= parseInt(item.value)
        }
    },
    bits: {
        // middlewares: [],
        roleChecks: {
            "any": (data: any): boolean => true,
            "sub": (data: any): boolean => data.isSubscriber,
            "mod": (data: any): boolean => data.isModerator,
            "gifter": (data: any): boolean => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item: any, data: any): boolean => true,
            "equal": (item: any, data: any): boolean => parseInt(item.value) === data.bitsAmount,
            "InRange": (item: any, data: any): boolean => data.bitsAmount >= parseInt(item.lessThan) && data.bitsAmount <= parseInt(item.greaterThan)
        }
    },
    likes: {
        // middlewares: [],
        roleChecks: {
            "any": (data: any): boolean => true,
            "sub": (data: any): boolean => data.isSubscriber,
            "mod": (data: any): boolean => data.isModerator,
            "gifter": (data: any): boolean => data.isNewGifter
        },
        comparatorChecks: {
            "any": (item: any, data: any): boolean => true,
            "equal": (item: any, data: any): boolean => parseInt(item.value) === data.likeCount,
            "InRange": (item: any, data: any): boolean => data.likeCount >= parseInt(item.lessThan) && data.likeCount <= parseInt(item.greaterThan)
        }
    },
    follow: {
        roleChecks: {
            "any": (data: any): boolean => true,
        },
        comparatorChecks: {
            "any": (item: any, data: any): boolean => true,
        },
        middlewares: [
            {
                type: PREVENT_DUPLICATE_FOLLOW_TYPE, 
                enabled: true,
                userIdentifierPath: 'uniqueId'
            }
        ]
    }
};
const LOCALSTORAGE_PREFIX = 'middleware_enabled_';

// Function to get the localStorage key for a specific middleware
function getMiddlewareLocalStorageKey(eventType: string, middlewareType: string): string {
    return `${LOCALSTORAGE_PREFIX}${eventType}_${middlewareType}`;
}

// Function to load middleware states from localStorage
function initializeMiddlewareStatesFromLocalStorage() {
    if (typeof localStorage === 'undefined') {
        logger.warn('localStorage is not available. Middleware states will not be persisted.');
        return;
    }

    for (const eventType in eventRules) {
        const ruleEntry = eventRules[eventType];
        if (ruleEntry.middlewares && Array.isArray(ruleEntry.middlewares)) {
            ruleEntry.middlewares.forEach((middleware:any) => {
                const key = getMiddlewareLocalStorageKey(eventType, middleware.type);
                const storedState = localStorage.getItem(key);
                if (storedState !== null) {
                    try {
                        middleware.enabled = JSON.parse(storedState);
                        logger.log(`[LocalStorage] Loaded state for ${key}: ${middleware.enabled}`);
                    } catch (e) {
                        logger.error(`[LocalStorage] Error parsing stored state for ${key}:`, e);
                    }
                }
            });
        }
    }
}

// Call initialization when the module loads (client-side)
if (typeof window !== 'undefined') { // Ensure this runs only in the browser
    initializeMiddlewareStatesFromLocalStorage();
}
export function updateMiddlewareEnabledState(eventType: string, middlewareType: string, isEnabled: boolean): boolean {
    const ruleEntry = eventRules[eventType];
    if (!ruleEntry || !ruleEntry.middlewares) {
        logger.warn(`[UpdateState] Event type "${eventType}" not found or has no middlewares.`);
        return false;
    }
    //@ts-ignore
    const middleware = ruleEntry.middlewares.find(m => m.type === middlewareType);
    if (!middleware) {
        logger.warn(`[UpdateState] Middleware type "${middlewareType}" not found for event "${eventType}".`);
        return false;
    }

    middleware.enabled = isEnabled;
    logger.log(`[UpdateState] Middleware ${eventType}.${middlewareType} set to ${isEnabled}`);

    if (typeof localStorage !== 'undefined') {
        const key = getMiddlewareLocalStorageKey(eventType, middleware.type);
        try {
            localStorage.setItem(key, JSON.stringify(isEnabled));
            logger.log(`[LocalStorage] Saved state for ${key}: ${isEnabled}`);
        } catch (e) {
            logger.error(`[LocalStorage] Error saving state for ${key}:`, e);
            // Potentially roll back the in-memory change or handle QuotaExceededError
            return false; 
        }
    }
    return true;
}

async function processMiddlewares(
    middlewareConfigs: AnyMiddlewareConfig[],
    context: MiddlewareContext
): Promise<boolean> {
    if (!middlewareConfigs || middlewareConfigs.length === 0) {
        return true;
    }

    for (const config of middlewareConfigs) {
        // The 'enabled' state is now read from the config object itself,
        // which would have been updated from localStorage.
        if (!config.enabled) {
            logger.log(`[ProcessMiddlewares] Middleware '${config.type}' for event '${context.eventType}' is disabled. Skipping.`);
            continue;
        }

        const handler = middlewareRegistry.get(config.type);
        if (!handler) {
            logger.warn(`[ProcessMiddlewares] No handler registered for middleware type: ${config.type}`);
            continue;
        }

        try {
            const result = await handler(config, context);
            if (!result.shouldContinue) {
                logger.log(`[ProcessMiddlewares] Middleware '${config.type}' blocked event '${context.eventType}'. Razón: ${result.reason || 'No especificada'}`);
                return false;
            }
        } catch (error) {
            logger.error(`[ProcessMiddlewares] Error executing middleware '${config.type}':`, error);
            // Optionally block if a middleware fails
            // return false;
        }
    }
    return true;
}


export async function evaluateRules(
    array: any[],
    data: any,
    rulesKey: string,
    platform: string,
    originalEventName: string
): Promise<Map<string, any>> {
    let result = new Map();
    if (!array || !Array.isArray(array) || !data) return result;

    const currentEventRuleEntry = eventRules[rulesKey];
    // Middlewares are processed first
    if (currentEventRuleEntry?.middlewares && currentEventRuleEntry.middlewares.length > 0) {
        const middlewareContext: MiddlewareContext = {
            eventType: rulesKey,
            originalEventName,
            platform,
            data
        };
        
        // processMiddlewares will now use the 'enabled' flag from the middleware config
        // which is synchronized with localStorage
        const middlewaresPassed = await processMiddlewares(currentEventRuleEntry.middlewares, middlewareContext);
        
        if (!middlewaresPassed) {
            logger.log(`[evaluateRules] Middlewares blocked event ${originalEventName} (rule: ${rulesKey}) for ${platform}.`);
            return result; // Event blocked, return empty map
        }
    }

    const rulesDefinition = eventRules[rulesKey];
    if (!rulesDefinition || !rulesDefinition.roleChecks || !rulesDefinition.comparatorChecks) {
        logger.warn(`[evaluateRules] No roleChecks or comparatorChecks for rule: ${rulesKey}`);
        return result;
    }
    
    logger.log(`Evaluating rule ${rulesKey} (original event: ${originalEventName}) on ${platform}`, data);
    
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (item.isActive === false) continue;
        if (item.bypassChecks) {
             const itemId = item.id || i;
             result.set(itemId, item);
             continue;
        }
        
        const roleCheckFn = rulesDefinition.roleChecks[item.role];
        if (!roleCheckFn || !roleCheckFn(data,item)) continue;
        
        const comparatorCheckFn = rulesDefinition.comparatorChecks[item.comparator];
        if (!comparatorCheckFn || !comparatorCheckFn(item, data)) continue;
        
        const itemId = item.id || i;
        result.set(itemId, item);
    }
    
    return result;
}

// Los evaluadores específicos ahora deben pasar 'platform'
// Esto requiere que 'switcheventDb' les pase 'platform'
export async function evalueChat(array: any[], data: any, platform: string, originalEventName: string) {
    return await evaluateRules(array, data, 'chat', platform, originalEventName);
}

export async function evalueGift(array: any[], data: any, platform: string, originalEventName: string) {
    return await evaluateRules(array, data, 'gift', platform, originalEventName);
}
export async function evalueBits(array: any[], data: any, platform: string, originalEventName: string) {
    // 'bits' podría ser un alias. Si es así, el eventType en eventRules debe ser 'bits'
    // y platform ('kick', 'twitch', etc.) ayudará a encontrar el store correcto.
    return await evaluateRules(array, data, 'bits', platform, originalEventName);
}

export async function evalueLikes(array: any[], data: any, platform: string, originalEventName: string) {
    return await evaluateRules(array, data, 'likes',platform, originalEventName);
}
export async function evalueFollow(array: any[], data: any, platform: string, originalEventName: string) {
    // 'follow' es un evento especial que puede tener middlewares específicos.
    console.log('evalueFollow', array, data, platform, originalEventName);
    return await evaluateRules(array, data, 'follow', platform, originalEventName);
}

// Función para actualizar reglas en tiempo de ejecución
export function updateRules(eventType: string, newRules: Partial<EventRuleEntry>) {
    const targetRuleKey = platformEventTypeMap[eventType] || eventType;
    if (!eventRules[targetRuleKey]) {
        logger.error(`Rule key ${targetRuleKey} (from eventType ${eventType}) does not exist`);
        return false;
    }

    // Fusionar de forma más segura, especialmente para middlewares
    if (newRules.roleChecks) {
        eventRules[targetRuleKey].roleChecks = {
            ...eventRules[targetRuleKey].roleChecks,
            ...newRules.roleChecks
        };
    }
    if (newRules.comparatorChecks) {
        eventRules[targetRuleKey].comparatorChecks = {
            ...eventRules[targetRuleKey].comparatorChecks,
            ...newRules.comparatorChecks
        };
    }
    if (newRules.middlewares) {
        // Reemplazar completamente o fusionar inteligentemente. Reemplazar es más simple.
        eventRules[targetRuleKey].middlewares = newRules.middlewares;
    }
    
    logger.log(`Rules updated for ${targetRuleKey}:`, eventRules[targetRuleKey]);
    return true;
}

