// src/event-handling/ruleEngine.js
import { dbManager } from './eventSaver.js'; // Importa dbManager
import { ReplacesValues } from './dataUtils.js'
import {
    type AnyMiddlewareConfig,
    type MiddlewareContext,
    type EventRules, // Tipado para eventRules
    type EventRuleEntry,
    middlewareRegistry
} from './middlewares/middlewareTypes.js';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
import './middlewares/preventIdenticalPrevious.js';

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

const eventRules: Record<string, any> = { // O const eventRules: any = {
    chat: {
        middlewares: [
            {
                type: 'preventIdenticalPrevious', // Idealmente: PREVENT_IDENTICAL_PREVIOUS_TYPE,
                enabled: true,
                userIdentifierPath: 'uniqueId',
                contentPaths: ['comment'],
            }
        ],
        roleChecks: {
            "any": (data: any): boolean => true,
            "sub": (data: any): boolean => data.isSubscriber,
            "mod": (data: any): boolean => data.isModerator,
            "gifter": (data: any): boolean => data.isNewGifter || data.gifterLevel
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
            "sub": (data: any): boolean => data.isSubscriber,
            "mod": (data: any): boolean => data.isModerator,
            "gifter": (data: any): boolean => data.isNewGifter
        },
        middlewares: [ // Corregido de 'middleware' a 'middlewares'
            {
                type: 'preventIdenticalPrevious', // Idealmente: PREVENT_IDENTICAL_PREVIOUS_TYPE,
                enabled: true,
                userIdentifierPath: 'uniqueId',
                contentPaths: ['uniqueId','nickname']
            }
        ]
    }
};
async function processMiddlewares(
    middlewareConfigs: AnyMiddlewareConfig[], // Array de configuraciones de middleware para el evento actual
    context: MiddlewareContext
): Promise<boolean> {
    if (!middlewareConfigs || middlewareConfigs.length === 0) {
        return true; // No hay middlewares, continuar
    }

    // Podrías ordenar los middlewares aquí si tuvieran una propiedad `order`
    // middlewareConfigs.sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const config of middlewareConfigs) {
        if (!config.enabled) {
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
                logger.log(`[ProcessMiddlewares] Middleware '${config.type}' bloqueó el evento. Razón: ${result.reason || 'No especificada'}`);
                return false; // Un middleware bloqueó, detener el procesamiento
            }
        } catch (error) {
            logger.error(`[ProcessMiddlewares] Error ejecutando middleware '${config.type}':`, error);
            // Decide si un error en un middleware debe bloquear el evento.
            // Por seguridad, podría ser mejor continuar o tener una config para esto.
            // return false; // Opcional: bloquear si un middleware falla
        }
    }
    return true; // Todos los middlewares habilitados pasaron
}


export async function evaluateRules(
    array: any[],
    data: any,
    rulesKey: string, // ej. 'chat', 'gift' (el tipo de regla a usar)
    platform: 'tiktok' | 'kick' | string,
    originalEventName: string // ej. 'ChatMessage', 'like' (el evento original de la plataforma)
): Promise<Map<string, any>> {
    let result = new Map();
    if (!array || !Array.isArray(array) || !data) return result;

    // Obtener la configuración de middlewares para el rulesKey actual
    const currentEventRuleEntry = eventRules[rulesKey];
    const middlewareConfigsToRun = currentEventRuleEntry?.middlewares;
    if (middlewareConfigsToRun && middlewareConfigsToRun.length > 0) {
        const middlewareContext: MiddlewareContext = {
            eventType: rulesKey, // El tipo de evento de regla que se está procesando
            originalEventName,  // El nombre del evento original de la plataforma
            platform,
            data
        };
        
        const middlewaresPassed = await processMiddlewares(middlewareConfigsToRun, middlewareContext);
        logger.log(middlewareConfigsToRun, 'middlewareConfigsToRun',middlewaresPassed, middlewareContext);
        if (!middlewaresPassed) {
            logger.log(`[evaluateRules] Middlewares bloquearon el evento ${originalEventName} (regla: ${rulesKey}) para ${platform}.`);
            // Notificar a `switcheventDb` si el evento fue bloqueado para no guardarlo.
            // Esto requiere que `evaluateRules` devuelva más que solo el `Map`.
            // Por ejemplo: return { results: new Map(), wasBlocked: true };
            return result; // O un objeto especial
        }
    }


    // El resto de tu lógica de evaluateRules...
    const rulesDefinition = eventRules[rulesKey]; // `rulesKey` ya es el correcto aquí
    if (!rulesDefinition || !rulesDefinition.roleChecks || !rulesDefinition.comparatorChecks) {
        logger.warn(`[evaluateRules] No se encontraron roleChecks o comparatorChecks para el tipo de regla: ${rulesKey}`);
        return result;
    }
    
    logger.log(`Evaluating rule ${rulesKey} (original event: ${originalEventName}) on ${platform}`, array, data);
    
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        
        if (item.isActive === false) continue;
        // @ts-ignore
        if (item.bypassChecks && currentEventRuleEntry?.middlewares?.every((m) => !m.enabled)) {
            // Si bypassChecks está activo Y NINGÚN middleware está activo para esta regla,
            // entonces podríamos saltar los chequeos. O, podrías tener una propiedad `bypassMiddlewares` en el item.
            // Por ahora, el bypass se aplica después de los middlewares.
        }
        if (item.bypassChecks) {
             const itemId = item.id || i;
             result.set(itemId, item);
             continue;
        }
        
        const roleCheckFn = rulesDefinition.roleChecks[item.role];
        if (!roleCheckFn || !roleCheckFn(data)) continue;
        
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

