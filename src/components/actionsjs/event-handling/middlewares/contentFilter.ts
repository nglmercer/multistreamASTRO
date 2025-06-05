// src/event-handling/middlewares/contentFilter.ts
import { BrowserLogger, LogLevel } from '@utils/Logger.js';
import { ReplacesValues } from '../dataUtils.js'; // Asumiendo que existe y funciona
import {
    CONTENT_FILTER_TYPE,
    type ContentFilterConfig,
    type MiddlewareContext,
    type MiddlewareResult,
    registerMiddleware
} from './middlewareTypes.js';

const logger = new BrowserLogger('contentFilterMiddleware')
    .setLevel(LogLevel.LOG);

/**
 * Extrae un valor de un objeto de datos usando un path.
 * El path puede ser una clave simple (ej: 'comment'), anidada (ej: 'user.id'),
 * o un template string (ej: '{user.name} dice {comment}').
 * Esta función es similar a la que usamos en `preventIdenticalPrevious`.
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
            logger.log(`[${CONTENT_FILTER_TYPE}] No keywords found in localStorage for key: ${key}`);
            return [];
        }
        let parsedKeywords = JSON.parse(storedValue);
        if (typeof parsedKeywords === 'string') {
            parsedKeywords = [parsedKeywords]; // Tratar string simple como array de un elemento
        }
        if (Array.isArray(parsedKeywords)) {
            return parsedKeywords
                .filter(kw => typeof kw === 'string' && kw.trim() !== '') // Filtrar no strings o vacíos
                .map(kw => kw.toLowerCase()); // Convertir a minúsculas
        }
        logger.warn(`[${CONTENT_FILTER_TYPE}] Invalid data type in localStorage for key ${key}. Expected array or string. Found:`, typeof parsedKeywords);
        return [];
    } catch (error) {
        logger.error(`[${CONTENT_FILTER_TYPE}] Error parsing keywords from localStorage for key ${key}:`, error);
        return [];
    }
}

async function contentFilterHandler(
    config: ContentFilterConfig,
    context: MiddlewareContext
): Promise<MiddlewareResult> {
    const { dataPath, localStorageKey, filterMode, blockReason } = config;
    const { eventType, platform, data } = context;

    logger.log(`[${CONTENT_FILTER_TYPE}] Executing for event ${eventType} on ${platform}. Config:`, config);

    if (!dataPath || !localStorageKey) {
        logger.warn(`[${CONTENT_FILTER_TYPE}] Configuración incompleta: dataPath o localStorageKey faltantes.`);
        return { shouldContinue: true, reason: "Configuración de middleware incompleta" };
    }

    const eventTextValue = getValueFromData(dataPath, data);
    if (eventTextValue === undefined) {
        logger.log(`[${CONTENT_FILTER_TYPE}] No se pudo extraer valor de dataPath ('${dataPath}') del evento.`, data);
        // Si el modo es 'blockIfNotContains', y no hay texto en el evento, entonces no contiene las palabras clave.
        if (filterMode === 'blockIfNotContains') {
             // Antes de bloquear, asegurémonos de que haya palabras clave para buscar.
             // Si no hay palabras clave y el modo es no contener, no tiene sentido bloquear.
            const keywords = getKeywordsFromLocalStorage(localStorageKey);
            if (keywords.length > 0) {
                return { shouldContinue: false, reason: blockReason || `Texto del evento no encontrado y se requiere contenido (${dataPath})` };
            }
        }
        // Si es 'blockIfContains', y no hay texto, no puede contener nada, así que continuar.
        return { shouldContinue: true, reason: "Texto del evento no extraíble" };
    }

    const lowerEventText = eventTextValue.toLowerCase();
    const keywords = getKeywordsFromLocalStorage(localStorageKey);

    if (keywords.length === 0) {
        logger.log(`[${CONTENT_FILTER_TYPE}] No hay palabras clave definidas en localStorage para '${localStorageKey}'.`);
        // Si el modo es 'blockIfNotContains' y no hay palabras clave, técnicamente no contiene ninguna palabra clave.
        // Podría interpretarse como que debe bloquear. Sin embargo, es más seguro permitir el paso si no hay palabras clave para filtrar.
        // Si el requisito es estricto: "debe contener una de estas (y no hay ninguna)", entonces sí bloquear.
        // Por ahora, si no hay keywords, no filtramos.
        if (filterMode === 'blockIfNotContains') {
            // Si no hay palabras clave que DEBA contener, es ambiguo. Por seguridad, continuamos.
            // Opcionalmente, podrías decidir bloquear aquí si la lógica es "debe contener una palabra de la lista Y la lista NO está vacía"
            // return { shouldContinue: false, reason: blockReason || `Lista de palabras clave vacía para ${localStorageKey} en modo 'blockIfNotContains'` };
        }
        return { shouldContinue: true, reason: "No hay palabras clave para filtrar" };
    }

    let matchFound = false;
    for (const keyword of keywords) {
        if (lowerEventText.includes(keyword)) {
            matchFound = true;
            break;
        }
    }

    const finalBlockReason = blockReason || 
        (filterMode === 'blockIfContains' ? 
            `Contenido coincide con palabra clave prohibida de '${localStorageKey}' en '${dataPath}'` :
            `Contenido no coincide con ninguna palabra clave requerida de '${localStorageKey}' en '${dataPath}'`);

    if (filterMode === 'blockIfContains') {
        if (matchFound) {
            logger.log(`[${CONTENT_FILTER_TYPE}] Bloqueando evento: Texto ('${dataPath}') contiene palabra clave. Modo: blockIfContains.`);
            return { shouldContinue: false, reason: finalBlockReason };
        }
    } else if (filterMode === 'blockIfNotContains') {
        if (!matchFound) {
            logger.log(`[${CONTENT_FILTER_TYPE}] Bloqueando evento: Texto ('${dataPath}') NO contiene palabra clave requerida. Modo: blockIfNotContains.`);
            return { shouldContinue: false, reason: finalBlockReason };
        }
    }

    logger.log(`[${CONTENT_FILTER_TYPE}] Evento permitido.`);
    return { shouldContinue: true };
}

registerMiddleware(CONTENT_FILTER_TYPE, contentFilterHandler);