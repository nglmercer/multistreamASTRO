// src/event-handling/middlewares/whitelist.ts
//@ts-ignore
import { BrowserLogger, LogLevel } from '@utils/Logger.js';
import { ReplacesValues } from '../dataUtils.js';
import {
    WHITELIST_TYPE,
    type WhitelistConfig,
    type MiddlewareContext,
    type MiddlewareResult,
    registerMiddleware
} from './middlewareTypes.js';

const logger = new BrowserLogger('whitelistMiddleware')
    .setLevel(LogLevel.LOG);

/**
 * Extrae un valor de un objeto de datos usando un path.
 */
function getValueFromData(path: string, data: any): string | undefined {
    if (!path || !data) return undefined;

    if (path.includes('{') && path.includes('}')) {
        return ReplacesValues(path, data);
    }

    let current = data;
    const parts = path.split('.');
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }
    return current !== undefined && current !== null ? String(current) : undefined;
}

function getKeywordsFromLocalStorage(key: string): string[] {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue === null) {
            logger.log(`[${WHITELIST_TYPE}] No keywords found in localStorage for key: ${key}`);
            return [];
        }
        let parsedKeywords = JSON.parse(storedValue);
        if (typeof parsedKeywords === 'string') {
            parsedKeywords = [parsedKeywords];
        }
        if (Array.isArray(parsedKeywords)) {
            return parsedKeywords
                .filter(kw => typeof kw.value === 'string' && kw.value.trim() !== '')
                .map(kw => kw.value.toLowerCase());
        }
        logger.warn(`[${WHITELIST_TYPE}] Invalid data type in localStorage for key ${key}. Expected array or string. Found:`, typeof parsedKeywords);
        return [];
    } catch (error) {
        logger.error(`[${WHITELIST_TYPE}] Error parsing keywords from localStorage for key ${key}:`, error);
        return [];
    }
}

async function whitelistHandler(
    config: WhitelistConfig,
    context: MiddlewareContext
): Promise<MiddlewareResult> {
    const { dataPath, localStorageKey, whitelistMode, skipAllMiddlewares } = config;
    const { eventType, platform, data } = context;

    logger.log(`[${WHITELIST_TYPE}] Executing for event ${eventType} on ${platform}. Config:`, config);

    if (!dataPath || !localStorageKey) {
        logger.warn(`[${WHITELIST_TYPE}] Configuración incompleta: dataPath o localStorageKey faltantes.`);
        return { shouldContinue: true, reason: "Configuración de middleware incompleta" };
    }

    const eventTextValue = getValueFromData(dataPath, data);
    if (eventTextValue === undefined) {
        logger.log(`[${WHITELIST_TYPE}] No se pudo extraer valor de dataPath ('${dataPath}') del evento.`, data);
        return { shouldContinue: true, reason: "Texto del evento no extraíble" };
    }

    const lowerEventText = eventTextValue.toLowerCase();
    const keywords = getKeywordsFromLocalStorage(localStorageKey);

    if (keywords.length === 0) {
        logger.log(`[${WHITELIST_TYPE}] No hay palabras clave definidas en localStorage para '${localStorageKey}'.`);
        return { shouldContinue: true, reason: "No hay palabras clave para whitelist" };
    }

    let matchFound = false;
    for (const keyword of keywords) {
        if (lowerEventText.includes(keyword)) {
            matchFound = true;
            break;
        }
    }

    if (whitelistMode === 'allowIfContains') {
        if (matchFound) {
            logger.log(`[${WHITELIST_TYPE}] Evento en whitelist: Texto ('${dataPath}') contiene palabra clave permitida.`);
            // Si está configurado para saltar todos los middlewares, marcar el contexto
            if (skipAllMiddlewares) {
                // Agregar una propiedad especial al contexto para indicar que debe saltar middlewares
                (context as any).skipRemainingMiddlewares = true;
            }
            return { shouldContinue: true, reason: "Contenido en whitelist" };
        }
    } else if (whitelistMode === 'allowIfNotContains') {
        if (!matchFound) {
            logger.log(`[${WHITELIST_TYPE}] Evento en whitelist: Texto ('${dataPath}') NO contiene palabra clave restringida.`);
            if (skipAllMiddlewares) {
                (context as any).skipRemainingMiddlewares = true;
            }
            return { shouldContinue: true, reason: "Contenido no contiene restricciones" };
        }
    }

    logger.log(`[${WHITELIST_TYPE}] Evento no está en whitelist, continúa procesamiento normal.`);
    return { shouldContinue: true, reason: "No está en whitelist, procesamiento normal" };
}

registerMiddleware(WHITELIST_TYPE, whitelistHandler);