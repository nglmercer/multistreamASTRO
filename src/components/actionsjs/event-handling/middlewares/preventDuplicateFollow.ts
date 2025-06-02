// src/event-handling/middlewares/preventDuplicateFollow.ts
import { dbManager } from '../eventSaver.js'; // Ajusta la ruta si es necesario
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
import { ReplacesValues } from '../dataUtils.js'; // Ajusta la ruta
import {
    PREVENT_DUPLICATE_FOLLOW_TYPE,
    type PreventDuplicateFollowConfig,
    type MiddlewareContext,
    type MiddlewareResult,
    registerMiddleware
} from './middlewareTypes.js';
import type { StoreConfig, QueryOptions, BaseMessage } from '@utils/storage/Types.js';

const logger = new BrowserLogger('preventDuplicateFollowHandler')
    .setLevel(LogLevel.LOG);

// Helper function, similar to the one in preventIdenticalPrevious.ts
// Podrías mover esto a un archivo de utilidades si se repite mucho.
function getValueFromData(path: string, data: any): string | undefined {
    if (!path || !data) return undefined;
    if (!path.includes('{') && !path.includes('}')) {
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
    return ReplacesValues(`{${path}}`, data); // Asumimos que si tiene {}, es un template path
}

async function preventDuplicateFollowHandler(
    config: PreventDuplicateFollowConfig,
    context: MiddlewareContext
): Promise<MiddlewareResult> {
    const { platform, data, originalEventName, eventType } = context; // eventType será 'follow'
    const { userIdentifierPath } = config;

    if (!userIdentifierPath) {
        logger.warn(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Configuración incompleta: falta userIdentifierPath.`);
        return { shouldContinue: true, reason: "Configuración incompleta" };
    }

    const currentUserId = getValueFromData(userIdentifierPath, data);
    if (!currentUserId) {
        logger.log(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] No se pudo extraer userIdentifier ('${userIdentifierPath}') de`, data);
        return { shouldContinue: true, reason: "ID de usuario no extraíble" };
    }

    // Usamos eventType ('follow') para el storeName, ya que es específico para este tipo de evento.
    const storeName = `${platform}_${eventType}`; // ej: tiktok_follow, kick_follow

    try {
        // Asegurarnos que el store para follows exista y tenga el índice necesario
        const storeConfigForFollows: StoreConfig = {
            storeName: storeName,
            keyPath: 'id', // O el campo que uses como primary key para eventos guardados
            autoGenerateId: true,
            idPrefix: storeName,
            indexes: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                // Necesitamos poder buscar por el ID del usuario que hizo el follow
                { name: 'userFollowerId', keyPath: userIdentifierPath, options: { unique: false } }
            ]
        };
        // @ts-ignore Asumimos que BaseMessage puede tener campos adicionales como los de 'data'
        const repo = await dbManager.getOrCreateStore<BaseMessage & Record<string, any>>(storeConfigForFollows);

        const queryOptions: QueryOptions<BaseMessage> = {
            filters: {
                [userIdentifierPath]: currentUserId // Busca eventos con el mismo user ID
            },
            sortBy: 'timestamp',
            sortOrder: 'desc',
            limit: 1 // Solo necesitamos el más reciente, si existe
        };
        
        logger.log(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Consultando follows previos para ${storeName} por usuario ID: ${currentUserId}...`);
        const previousFollows = await repo.query(queryOptions);

        if (!previousFollows || previousFollows.length === 0) {
            logger.log(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] No se encontraron follows previos para el usuario ${currentUserId}. Permitido.`);
            return { shouldContinue: true, reason: "Primer follow registrado para este usuario" };
        }

        const previousFollowEvent = previousFollows[0];

        // Comparación de timestamps
        // Asumimos que 'data' del evento actual tiene 'createTime' como string de milisegundos
        // y 'previousFollowEvent.timestamp' es un número (milisegundos) guardado por dbManager.
        const currentEventCreateTimeStr = getValueFromData('createTime', data); // 'createTime' del evento actual
        const previousEventTimestamp = previousFollowEvent.timestamp;

        if (!currentEventCreateTimeStr || previousEventTimestamp === undefined) {
            logger.warn(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Timestamps no disponibles para comparación. Evento actual createTime: ${currentEventCreateTimeStr}, Evento previo timestamp: ${previousEventTimestamp}. Permitido por precaución.`);
            return { shouldContinue: true, reason: "Timestamps no disponibles para comparación" };
        }

        const currentEventTimestampMs = Number(currentEventCreateTimeStr);
        if (isNaN(currentEventTimestampMs)) {
            logger.warn(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Timestamp actual ('${currentEventCreateTimeStr}') no es un número válido. Permitido por precaución.`);
            return { shouldContinue: true, reason: "Timestamp actual inválido" };
        }
        
        // Podrías hacer configurable este umbral (ej. 7 días, 30 días, o indefinido)
        const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas por defecto
        // const TIME_WINDOW_MS = config.timeWindowSeconds ? config.timeWindowSeconds * 1000 : 24 * 60 * 60 * 1000;


        const timeDifferenceMs = currentEventTimestampMs - previousEventTimestamp;

        if (timeDifferenceMs <= TIME_WINDOW_MS) {
            logger.log(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Follow duplicado del usuario ${currentUserId} detectado dentro del umbral de tiempo (${TIME_WINDOW_MS / (60*60*1000)}h). Diferencia: ${timeDifferenceMs}ms. Bloqueando.`);
            return { shouldContinue: false, reason: `Follow duplicado del mismo usuario dentro de las ${TIME_WINDOW_MS / (60*60*1000)} horas.` };
        } else {
            logger.log(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Follow del usuario ${currentUserId} es un re-follow después del umbral de tiempo. Permitido.`);
        }

    } catch (error) {
        logger.error(`[Middleware:${PREVENT_DUPLICATE_FOLLOW_TYPE}] Error procesando para ${storeName}:`, error);
        return { shouldContinue: true, reason: "Error interno del middleware de follow" };
    }

    return { shouldContinue: true };
}

registerMiddleware(PREVENT_DUPLICATE_FOLLOW_TYPE, preventDuplicateFollowHandler);