// src/event-handling/middlewares/preventIdenticalPrevious.ts
import { dbManager } from '../eventSaver.js'; // Ajusta la ruta si es necesario
import { BrowserLogger, LogLevel } from '@utils/Logger.js';
import { ReplacesValues } from '../dataUtils.js'; // Ajusta la ruta
import {
    PREVENT_IDENTICAL_PREVIOUS_TYPE,
    type PreventIdenticalPreviousConfig,
    type MiddlewareContext,
    type MiddlewareResult,
    registerMiddleware
} from './middlewareTypes.js';
import type { StoreConfig, QueryOptions, BaseMessage } from '@utils/storage/Types.js'; // Importar tipos necesarios

const logger = new BrowserLogger('preventIdenticalPreviousHandler')
    .setLevel(LogLevel.LOG);

function getValueFromData(path: string, data: any): string | undefined {
    if (!path || !data) return undefined; // Añadida verificación de data
    const template = `${path}`; // Asumimos que path no necesita ser interpretado como template aquí
                               // si es una clave directa como 'comment' o 'userId'.
                               // Si es un path anidado como 'user.id', ReplacesValues es útil.
                               // Para campos directos, data[path] sería más simple, pero ReplacesValues
                               // es más general si el path puede ser un template.
    
    // Si path es una clave simple (ej: "createTime", "comment")
    // y no una plantilla como "{user.id}"
    // podrías querer una lógica más directa:
    // if (path in data) return String(data[path]); return undefined;
    // Pero vamos a seguir con ReplacesValues asumiendo que maneja esto bien.
    // Es importante que ReplacesValues maneje correctamente el caso donde path es una clave simple.
    // Si path es "{algo}", ReplacesValues lo reemplaza. Si path es "algo", ¿ReplacesValues devuelve data.algo?
    // Asumiremos que ReplacesValues(path, data) busca data[path] si path no es un template.
    // O, si siempre es un template, entonces el path debería ser "{path}".
    // Para simplicidad, y basado en el uso con `contentPaths`, vamos a asumir que `ReplacesValues`
    // puede tomar una clave directa o un template.
    // Si `path` es una clave como "createTime", `ReplacesValues("createTime", data)` podría no funcionar
    // como `data.createTime`. `ReplacesValues("{createTime}", data)` sería más explícito
    // si `ReplacesValues` espera un template.
    // Por ahora, mantendré el uso original de ReplacesValues.

    // Ajuste para que ReplacesValues funcione si el path es una clave simple:
    // Si ReplacesValues espera un template, y `path` es una clave simple, se usa como tal.
    // Si path no contiene '{' ni '}', asumimos que es una clave directa.
    if (!path.includes('{') && !path.includes('}')) {
        let current = data;
        const parts = path.split('.');
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined; // Path no encontrado
            }
        }
        return current !== undefined && current !== null ? String(current) : undefined;
    }
    // Si es un template (contiene {}), usa ReplacesValues
    return ReplacesValues(template, data);
}


async function preventIdenticalPreviousHandler(
    config: PreventIdenticalPreviousConfig,
    context: MiddlewareContext
): Promise<MiddlewareResult> {
    const { platform, data, originalEventName } = context;
    const { userIdentifierPath, contentPaths } = config;

    console.log("data preventIdenticalPreviousHandler", config, context);

    if (!userIdentifierPath || !contentPaths || contentPaths.length === 0) {
        logger.warn(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Configuración incompleta.`);
        return { shouldContinue: true, reason: "Configuración incompleta" };
    }

    const currentUserId = getValueFromData(userIdentifierPath, data);
    if (!currentUserId) {
        logger.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] No se pudo extraer userIdentifier ('${userIdentifierPath}') de`, data);
        return { shouldContinue: true, reason: "ID de usuario no extraíble" };
    }

    const currentContentValues = contentPaths.map(path => getValueFromData(path, data));
    const storeName = `${platform}_${originalEventName}`;

    try {
        const storeConfigForMiddleware: StoreConfig = {
            storeName: storeName,
            keyPath: 'id',
            autoGenerateId: true,
            idPrefix: storeName,
            indexes: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                { name: 'userIdentifierIndex', keyPath: userIdentifierPath, options: { unique: false } }
            ]
        };

        const repo = await dbManager.getOrCreateStore<BaseMessage>(storeConfigForMiddleware);

        const queryOptions: QueryOptions<BaseMessage> = {
            filters: {
                [userIdentifierPath]: currentUserId
            },
            sortBy: 'timestamp',
            sortOrder: 'desc',
            limit: 1
        };
        
        console.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Consultando eventos previos para ${storeName} por ${currentUserId}...`);
        // @ts-ignore Asumimos que BaseMessage puede tener campos adicionales como los de 'data'
        const previousEvents: BaseMessage[] = await repo.query(queryOptions);
        console.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Eventos previos encontrados:`, previousEvents);

        if (!previousEvents || previousEvents.length === 0) {
            logger.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] No se encontraron eventos previos para ${storeName} por ${currentUserId}.`);
            return { shouldContinue: true, reason: "No hay eventos previos del usuario" };
        }

        const previousEvent = previousEvents[0]; // Es de tipo BaseMessage, más los datos originales

        if (previousEvent) {
            // Asumimos que los datos del evento están en la raíz del objeto `previousEvent`
            // tal como se guardan con `{ ...data }` en `saveEventData`.
            // `previousEvent` aquí es el objeto recuperado de la BD, que incluye `timestamp` (number)
            // y los campos originales de `data`.
            const previousContentValues = contentPaths.map(path => getValueFromData(path, previousEvent));
            
            const isIdentical = currentContentValues.length === previousContentValues.length &&
                                currentContentValues.every((val, index) => val === previousContentValues[index]);

            if (isIdentical) {
                // NUEVA LÓGICA DE TIMESTAMP AQUÍ
                const currentEventCreateTimeStr = getValueFromData('createTime', data); // 'createTime' del evento actual (viene como string de 'data')
                
                // `previousEvent.timestamp` debería ser un número (de BaseMessage)
                const previousEventTimestamp = previousEvent.timestamp; 

                if (!currentEventCreateTimeStr || previousEventTimestamp === undefined) {
                    logger.warn(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Timestamps no disponibles para comparación temporal. Evento actual createTime: ${currentEventCreateTimeStr}, Evento previo timestamp: ${previousEventTimestamp}. Permitido por precaución.`);
                    return { shouldContinue: true, reason: "Timestamps no disponibles para comparación" };
                }

                const currentEventTimestampMs = Number(currentEventCreateTimeStr);

                if (isNaN(currentEventTimestampMs)) {
                    logger.warn(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Timestamp actual ('${currentEventCreateTimeStr}') no es un número válido. Permitido por precaución.`);
                    return { shouldContinue: true, reason: "Timestamp actual inválido" };
                }
                
                const ONE_MINUTE_IN_MS = 1 * 60 * 1000;
                const timeDifferenceMs = currentEventTimestampMs - previousEventTimestamp;

                if (timeDifferenceMs <= ONE_MINUTE_IN_MS) {
                    logger.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Evento idéntico al anterior para ${storeName} por ${currentUserId} y dentro de las 24 horas (diferencia: ${timeDifferenceMs}ms). Bloqueando.`);
                    return { shouldContinue: false, reason: "Evento idéntico al anterior (dentro de 24h)" };
                } else {
                    logger.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Evento idéntico al anterior para ${storeName} por ${currentUserId}, PERO más antiguo de 24 horas (diferencia: ${timeDifferenceMs}ms). Permitido.`);
                    // No se bloquea, el flujo continúa.
                }
            }
        }
    } catch (error) {
        logger.error(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Error procesando para ${storeName}:`, error);
        return { shouldContinue: true, reason: "Error interno del middleware" };
    }

    return { shouldContinue: true };
}

registerMiddleware(PREVENT_IDENTICAL_PREVIOUS_TYPE, preventIdenticalPreviousHandler);