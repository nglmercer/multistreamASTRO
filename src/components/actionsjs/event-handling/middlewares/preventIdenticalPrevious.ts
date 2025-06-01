// src/event-handling/middlewares/preventIdenticalPrevious.ts
import { dbManager } from '../eventSaver.js'; // Ajusta la ruta si es necesario
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
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
    .setLevel(LogLevel.LOG); // Habilitar debug para más información
function getValueFromData(path: string, data: any): string | undefined {
    if (!path) return undefined;
    const template = `${path}`;
    // Asumimos que ReplacesValues devuelve string. Si no, ajusta el tipo.
    return ReplacesValues(template, data);
}

async function preventIdenticalPreviousHandler(
    config: PreventIdenticalPreviousConfig,
    context: MiddlewareContext
): Promise<MiddlewareResult> {
    const { platform, data, originalEventName } = context; // originalEventName es clave
    const { userIdentifierPath, contentPaths } = config;
    console.log("data preventIdenticalPreviousHandler",config, context)
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
    const storeName = `${platform}_${originalEventName}`; // Usar originalEventName

    try {
        // Definir la configuración del store que este middleware espera.
        // Es crucial que el índice 'userIdentifier' (o como lo llames) exista.
        // El keyPath del índice debe ser el `userIdentifierPath` que se usa para filtrar.
        const storeConfigForMiddleware: StoreConfig = {
            storeName: storeName,
            keyPath: 'id', // Asumiendo 'id' es el keyPath de tus eventos, como en BaseMessage
            autoGenerateId: true,
            idPrefix: storeName, // Consistente con eventSaver
            indexes: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                // IMPORTANTE: Este índice es necesario para la consulta.
                // El nombre del índice puede ser 'userIdentifier' o userIdentifierPath directamente
                // si no contiene caracteres inválidos para nombres de índice.
                // Usaremos un nombre genérico y el keyPath dinámico.
                { name: 'userIdentifierIndex', keyPath: userIdentifierPath, options: { unique: false } }
            ]
        };

        // Usar getOrCreateStore para asegurar que el store y sus índices (especialmente userIdentifierPath) existan.
        // Esto podría causar una actualización de la versión de la BD si el índice no existe.
        const repo = await dbManager.getOrCreateStore<BaseMessage>(storeConfigForMiddleware);
        // Nota: Si getOrCreateStore falla o la BD está bloqueada, lanzará un error que se capturará abajo.

        // Construir las opciones de consulta para obtener los eventos del usuario, ordenados por timestamp descendente.
        const queryOptions: QueryOptions<BaseMessage> = {
            filters: {
                // Filtrar por el campo que contiene el ID del usuario.
                // La clave del filtro debe ser el `userIdentifierPath`.
                [userIdentifierPath]: currentUserId
            },
            sortBy: 'timestamp', // Queremos el evento más reciente
            sortOrder: 'desc',
            limit: 1 // Solo necesitamos el último evento
        };

        // Asumimos que el ObjectStoreRepository tiene un método `find` o similar
        // que acepta QueryOptions. Si usa `search`, y `search` puede operar solo con `filters`
        // y `sortBy/sortOrder`, también funcionaría. Si solo hay `getAll()` sin filtros,
        // tendrías que obtener todos y filtrar/ordenar en JS (menos eficiente).
        // Basado en la estructura de `QueryOptions`, un método `find` o `query` es lo más probable.
        // Si ObjectStoreRepository.ts NO tiene `find`, necesitarías implementar uno o usar
        // el método que sí permita filtrar por índice y ordenar.
        // Por ahora, asumiremos `find` como el método estándar del repositorio para tales consultas.
        console.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Consultando eventos previos para ${storeName} por ${currentUserId}...`,repo);
        //@ts-ignore
        const repodata = await repo.query(queryOptions); // O repo.search(queryOptions) si es el caso
        console.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Eventos previos encontrados:`, repodata);
        if (!repodata || repodata.length === 0) {
            logger.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] No se encontraron eventos previos para ${storeName} por ${currentUserId}.`);
            return { shouldContinue: true, reason: "No hay eventos previos del usuario" };
        }
        /*
        [{comment, uniqueId, timestamp, userId, ...}]
        */
        const previousEvents = repodata;
        
        if (!previousEvents || previousEvents.length === 0) {
            return { shouldContinue: true, reason: "No hay eventos previos del usuario" };
        }

        const previousEvent = previousEvents[0]; // Ya que limitamos a 1 y ordenamos desc

        if (previousEvent) {
            // Asumimos que los datos del evento están en la raíz del objeto `previousEvent`
            // tal como se guardan con `{ ...data }` en `saveEventData`.
            const previousContentValues = contentPaths.map(path => getValueFromData(path, previousEvent));
            const isIdentical = currentContentValues.length === previousContentValues.length &&
                                currentContentValues.every((val, index) => val === previousContentValues[index]);
++
            if (isIdentical) {
                logger.log(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Evento idéntico al anterior para ${storeName} por ${currentUserId}. Bloqueando.`);
                return { shouldContinue: false, reason: "Evento idéntico al anterior" };
            }
        }
    } catch (error) {
        logger.error(`[Middleware:${PREVENT_IDENTICAL_PREVIOUS_TYPE}] Error procesando para ${storeName}:`, error);
        // Decide si bloquear en caso de error. Por seguridad, continuar podría ser mejor.
        return { shouldContinue: true, reason: "Error interno del middleware" };
    }

    return { shouldContinue: true };
}

// Registrar este handler
registerMiddleware(PREVENT_IDENTICAL_PREVIOUS_TYPE, preventIdenticalPreviousHandler);