import { IndexedDBManager } from '@utils/storage/IndexedDBManager.js';
import type { StoreConfig, BaseMessage } from '@utils/storage/Types.js';
const dbManager = new IndexedDBManager('SocialEventsDB', 1);
let isInitialized = false;
interface EventDefinition {
  platform: 'tiktok' | 'kick';
  eventName: string;
}
async function initializeEventSaver(eventsToLog: EventDefinition[]): Promise<void> {
  if (isInitialized) {
    console.log('EventSaver ya está inicializado.');
    return;
  }

  console.log('Inicializando EventSaver...');

  const storeConfigs: StoreConfig[] = eventsToLog.map(eventDef => {
    const storeName = `${eventDef.platform}_${eventDef.eventName}`;
    return {
      storeName: storeName,
      keyPath: 'id', // Default, BaseMessage tiene 'id'
      autoGenerateId: true, // ObjectStoreRepository generará IDs
      idPrefix: storeName, // e.g., "tiktok_chat"
      indexes: [
        // El 'timestamp' index es crucial para búsquedas por fecha, TTL, etc.
        // IndexedDBManager ya intenta crear 'timestamp' por defecto, pero ser explícito es bueno.
        { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
        // Puedes añadir otros índices aquí si sabes que ciertos campos de tus eventos
        // se usarán frecuentemente para búsquedas. Por ejemplo, 'userId' en un evento de chat.
        // { name: 'userId', keyPath: 'payload.userId', options: { unique: false } } // si usas 'payload'
        // { name: 'userId', keyPath: 'userId', options: { unique: false } } // si los campos están en la raíz
      ],
      // Opcional: Configurar TTL (en días) para limpieza automática
      // ttl: 30, // Los eventos más viejos de 30 días se limpiarán con repo.cleanup()
    };
  });

  // Configurar los stores antes de inicializar la BD
  // Esto asegura que onupgradeneeded los cree si no existen
  dbManager.configureStores(storeConfigs);

  try {
    // Inicializar la conexión a la BD.
    // Esto creará la BD y los stores si es la primera vez o si la versión aumenta.
    await dbManager.initialize();
    console.log('IndexedDBManager inicializado y stores configurados.');
    isInitialized = true;

    // Opcional: Ejecutar limpieza de stores antiguos al inicio
    // Considera si esto es adecuado para tu caso de uso
    /*
    console.log('Ejecutando limpieza de stores...');
    const cleanupResults = await dbManager.cleanupAllStores();
    console.log('Resultados de la limpieza:', cleanupResults);
    */

  } catch (error) {
    console.error('Error inicializando EventSaver:', error);
    // Podrías querer reintentar o manejar este error de forma más robusta
    isInitialized = false; // Marcar como no inicializado para permitir reintentos
    throw error; // Relanzar para que el llamador sepa
  }
}

/**
 * Guarda los datos de un evento en el ObjectStore correspondiente.
 * @param platform 'tiktok' o 'kick'
 * @param eventName El nombre del evento (ej. 'chat', 'ChatMessage')
 * @param data Los datos del evento a guardar
 */
export async function saveEventData<TEventData extends Record<string, any>>(
  platform: 'tiktok' | 'kick',
  eventName: string,
  data: TEventData
): Promise<void> {
  if (!isInitialized) {
    // O podrías encolar el evento y procesarlo después de la inicialización.
    // O incluso llamar a initializeEventSaver aquí si aún no se ha llamado,
    // pero eso requeriría pasarle `eventsToLog` o tenerlo predefinido.
    console.warn('EventSaver no está inicializado. Llamando a saveEventData antes de tiempo. El evento no será guardado.');
    // throw new Error('EventSaver no está inicializado. Llama a initializeEventSaver primero.');
    return;
  }

  const storeName = `${platform}_${eventName}`;

  try {
    // El tipo genérico para getOrCreateStore sería el tipo de objeto que ESPERAS guardar.
    // Si solo pasas `data` directamente y esperas que `id` y `timestamp` se añadan,
    // entonces T sería algo como `TEventData & BaseMessage`.
    // ObjectStoreRepository<BaseMessage> es seguro porque BaseMessage es la base.
    const storeConfig: StoreConfig = { // Re-definir para getOrCreateStore, o recuperarla.
        storeName: storeName,
        keyPath: 'id',
        autoGenerateId: true,
        idPrefix: storeName,
        indexes: [{ name: 'timestamp', keyPath: 'timestamp' }]
    };
    const repository = await dbManager.getOrCreateStore<BaseMessage>(storeConfig);

    // Los datos que pasas a `add` deben ser `Partial<BaseMessage>`.
    // `ObjectStoreRepository.enrichItem` se encargará de añadir `id` y `timestamp`
    // si `autoGenerateId` es true y `keyPath` es 'id'.
    // Puedes guardar el payload directamente o anidarlo.
    // Opción 1: Guardar los campos de 'data' en la raíz del objeto (más fácil para indexar campos específicos de 'data')
    const itemToSave = { ...data }; // `enrichItem` añadirá id y timestamp

    // Opción 2: Anidar 'data' bajo una propiedad 'payload' (mantiene el original intacto)
    // const itemToSave = { payload: data }; // `enrichItem` añadirá id y timestamp

    // Asegúrate de que el tipo T en ObjectStoreRepository.add(item: Partial<T>) sea compatible
    // con lo que pasas. Como `repository` es `ObjectStoreRepository<BaseMessage>`, y
    // `itemToSave` es `Partial<BaseMessage>` (porque `enrichItem` lo completará), está bien.
    const savedItem = await repository.add(itemToSave);
    console.log(`Evento '${eventName}' de ${platform} guardado en '${storeName}' con ID: ${savedItem.id}`);

  } catch (error) {
    console.error(`Error guardando evento '${eventName}' de ${platform} en '${storeName}':`, error);
  }
}

// Exportar la función de inicialización también
export { initializeEventSaver, dbManager };