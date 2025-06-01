import { IndexedDBManager, getAllDataFromDatabase } from '../idb.ts';

class UserProcessor {
    constructor(dbManager) {
        if (!dbManager) {
            throw new Error("UserProcessor requires an instance of IndexedDBManager.");
        }
        this.dbManager = dbManager;
        //console.log("UserProcessor initialized.");
    }

    _extractUserData(eventData) {
        if (!eventData || typeof eventData.userId === 'undefined' || eventData.userId === null) {
            if (eventData && eventData.userId === 0) {
                 eventData.userId = "0";
            } else if (!eventData || !eventData.userId) {
                 return null; // Salir si userId es realmente nulo, indefinido o vacío
            }
        }


        const parseBool = (value) => typeof value !== 'undefined' ? Boolean(value) : false; // Devuelve true/false

        return {
            userId: String(eventData.userId), // *** Asegurar SIEMPRE que sea string ***
            uniqueId: eventData.uniqueId || null,
            nickname: eventData.nickname || null,
            profilePictureUrl: eventData.profilePictureUrl || (eventData.userDetails?.profilePictureUrls?.[0]) || null,
            followRole: eventData.followRole !== undefined ? eventData.followRole : null,
            isModerator: parseBool(eventData.isModerator),
            isNewGifter: parseBool(eventData.isNewGifter),
            isSubscriber: parseBool(eventData.isSubscriber),
            gifterLevel: eventData.gifterLevel !== undefined ? Number(eventData.gifterLevel) : 0, // Guardar como número
            teamMemberLevel: eventData.teamMemberLevel !== undefined ? Number(eventData.teamMemberLevel) : 0, // Guardar como número
        };
    }


    async upsertUserFromEvent(eventData, eventType) {
        const extractedUserData = this._extractUserData(eventData);

        if (!extractedUserData) {
            return null; // No hay datos para procesar
        }

        const userId = extractedUserData.userId; // Ya es string
        const nowISO = new Date().toISOString(); // Usar ISO para consistencia y ordenamiento

        try {
            // 1. Intentar obtener el usuario existente
            const existingUser = await this.dbManager.getDataById(userId);

            let finalUserData;

            if (existingUser) {

                const likesToAdd = (eventType === 'like' && eventData.likeCount > 0) ? Number(eventData.likeCount) : 0;
                const diamondsToAdd = (eventType === 'gift' && eventData.diamondCount > 0) ? Number(eventData.diamondCount) : 0;

                finalUserData = {
                    ...existingUser, // Mantener datos existentes (incluyendo firstSeenAt)
                    ...extractedUserData, // Sobrescribir con los datos más recientes del evento
                    totalLikesGiven: (existingUser.totalLikesGiven || 0) + likesToAdd,
                    totalDiamondsGiven: (existingUser.totalDiamondsGiven || 0) + diamondsToAdd,
                    lastEventType: eventType,
                    lastSeenAt: nowISO // Siempre actualizar
                };
            } else {
                const initialLikes = (eventType === 'like' && eventData.likeCount > 0) ? Number(eventData.likeCount) : 0;
                const initialDiamonds = (eventType === 'gift' && eventData.diamondCount > 0) ? Number(eventData.diamondCount) : 0;

                finalUserData = {
                    ...extractedUserData, // Datos base del evento
                    totalLikesGiven: initialLikes,
                    totalDiamondsGiven: initialDiamonds,
                    lastEventType: eventType,
                    firstSeenAt: nowISO, // Establecer en la primera inserción
                    lastSeenAt: nowISO
                };
            }

            // 2. Guardar (Insertar o Actualizar) usando saveData
            const savedUser = await this.dbManager.saveData(finalUserData);
            //console.log(`[${eventType}] User ${userId} ${existingUser ? 'updated' : 'inserted'} successfully.`);
            return savedUser;

        } catch (error) {
            console.error(`[${eventType}] Error processing user ${userId} in IndexedDB:`, error);
            // Podrías implementar reintentos o una cola de fallos aquí si es necesario
            return null; // Indicar fallo
        }
    }

     /**
     * Procesa eventos que contienen listas de usuarios (ej: roomUser).
     * @param {Array<object>} userList - Lista de objetos de usuario (ej: data.topViewers).
     * @param {string} baseEventType - El tipo de evento original (ej: 'roomUser').
     */
    async processUserListEvent(userList, baseEventType) {
        if (!Array.isArray(userList)) {
            console.warn(`[${baseEventType}] Expected an array of users, but got:`, userList);
            return;
        }

        const promises = userList.map(userData => {
             // A veces la lista tiene un objeto 'user' anidado
            const actualUserObject = userData.user || userData;
            return this.upsertUserFromEvent(actualUserObject, baseEventType);
        });
        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(`[${baseEventType}] Error processing user list:`, error);
        }
    }
}


const dbConfig = {
    name: 'TikTokLiveUsersDB', // Nombre de la base de datos
    version: 2, // Incrementa si cambias índices o estructura
    store: 'users'      // Nombre del object store (tabla)
};

// --- Inicialización ---
const dbManager = new IndexedDBManager(dbConfig);
const userProcessor = new UserProcessor(dbManager);

async function setupData(event, data) {
    try {
        // Eventos con datos de usuario directos
       if (['chat', 'gift', 'member', 'like', 'social', 'follow', 'subscribe', 'share'].includes(event)) {
           await userProcessor.upsertUserFromEvent(data, event);
       }
        // Evento con lista de usuarios
       else if (event === 'roomUser' && data && Array.isArray(data.topViewers)) {
            await userProcessor.processUserListEvent(data.topViewers, event);
       }
   } catch (error) {
       console.error(`Error processing event ${event} in client:`, error);
   }
}

async function displayAllUsers() {

}

dbManager.openDatabase().then(() => {
     displayAllUsers();
}).catch(err => {
     console.error("Failed to ensure database is open on startup:", err);
});


export { setupData, displayAllUsers, userProcessor };