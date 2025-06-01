import {
  IndexedDBManager,
  getAllDataFromDatabase,
  type DatabaseItem,
} from "../idb.ts";

// Tipos específicos para el procesamiento de usuarios
interface EventData {
  userId?: string | number | null;
  uniqueId?: string;
  nickname?: string;
  profilePictureUrl?: string;
  userDetails?: {
    profilePictureUrls?: string[];
  };
  followRole?: number;
  isModerator?: boolean;
  isNewGifter?: boolean;
  isSubscriber?: boolean;
  gifterLevel?: number;
  teamMemberLevel?: number;
  likeCount?: number;
  diamondCount?: number;
}

interface UserData extends DatabaseItem {
  userId: string;
  uniqueId: string | null;
  nickname: string | null;
  profilePictureUrl: string | null;
  followRole: number | null;
  isModerator: boolean;
  isNewGifter: boolean;
  isSubscriber: boolean;
  gifterLevel: number;
  teamMemberLevel: number;
  totalLikesGiven: number;
  totalDiamondsGiven: number;
  lastEventType: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface UserListItem {
  user?: EventData;
  [key: string]: any;
}

type EventType =
  | "chat"
  | "gift"
  | "member"
  | "like"
  | "social"
  | "follow"
  | "subscribe"
  | "share"
  | "roomUser";

class UserProcessor {
  private dbManager: IndexedDBManager;

  constructor(dbManager: IndexedDBManager) {
    if (!dbManager) {
      throw new Error(
        "UserProcessor requires an instance of IndexedDBManager."
      );
    }
    this.dbManager = dbManager;
  }

  /**
   * Extrae y normaliza los datos del usuario desde un evento
   */
  private _extractUserData(eventData: EventData): Partial<UserData> | null {
    if (
      !eventData ||
      (eventData.userId === undefined && eventData.userId !== 0) ||
      eventData.userId === null
    ) {
      if (eventData && eventData.userId === 0) {
        eventData.userId = "0";
      } else if (!eventData || !eventData.userId) {
        return null; // Salir si userId es realmente nulo, indefinido o vacío
      }
    }

    const parseBool = (value: any): boolean =>
      typeof value !== "undefined" ? Boolean(value) : false;

    return {
      userId: String(eventData.userId), // Asegurar SIEMPRE que sea string
      uniqueId: eventData.uniqueId || null,
      nickname: eventData.nickname || null,
      profilePictureUrl:
        eventData.profilePictureUrl ||
        eventData.userDetails?.profilePictureUrls?.[0] ||
        null,
      followRole:
        eventData.followRole !== undefined ? eventData.followRole : null,
      isModerator: parseBool(eventData.isModerator),
      isNewGifter: parseBool(eventData.isNewGifter),
      isSubscriber: parseBool(eventData.isSubscriber),
      gifterLevel:
        eventData.gifterLevel !== undefined ? Number(eventData.gifterLevel) : 0,
      teamMemberLevel:
        eventData.teamMemberLevel !== undefined
          ? Number(eventData.teamMemberLevel)
          : 0,
    };
  }

  /**
   * Método auxiliar para obtener un usuario por ID de forma segura
   * Devuelve null si no existe en lugar de lanzar error
   */
  // En la clase UserProcessor
  private async _getUserSafely(
    userIdToFind: string | number
  ): Promise<UserData | null> {
    try {
      const allUsers = (await this.dbManager.getAllData()) as UserData[];
      const userIdStr = String(userIdToFind); // Asegurar que comparamos con string

      // u.id es la clave primaria en IndexedDB, puede ser número o string (si es > MAX_SAFE_INTEGER)
      // u.userId es el identificador de usuario específico del evento (string)
      const user = allUsers.find((u) => {
        // Compara u.id (clave primaria) como string contra userIdStr
        // Compara u.userId (clave de negocio) como string contra userIdStr
        return (
          String(u.id) === userIdStr ||
          (u.userId && String(u.userId) === userIdStr)
        );
      });
      return user || null;
    } catch (error) {
      // Este catch es principalmente para errores durante getAllData()
      console.error(
        `Error en _getUserSafely para el usuario ${userIdToFind}:`,
        error
      );
      return null; // Asegurar que se devuelve null ante cualquier error de getAllData
    }
  }

  /**
   * Inserta o actualiza un usuario basado en los datos del evento
   */
  async upsertUserFromEvent(
    eventData: EventData,
    eventType: EventType
  ): Promise<UserData | null> {
    const extractedUserData = this._extractUserData(eventData);

    if (!extractedUserData || !extractedUserData.userId) {
      return null; // No hay datos para procesar
    }

    const userId = extractedUserData.userId;
    const nowISO = new Date().toISOString();

    try {
      // 1. Intentar obtener el usuario existente de forma segura
      const existingUser = await this._getUserSafely(userId);

      let finalUserData: UserData;

      if (existingUser) {
        // Usuario existente - actualizar
        const likesToAdd =
          eventType === "like" && eventData.likeCount && eventData.likeCount > 0
            ? Number(eventData.likeCount)
            : 0;
        const diamondsToAdd =
          eventType === "gift" &&
          eventData.diamondCount &&
          eventData.diamondCount > 0
            ? Number(eventData.diamondCount)
            : 0;

        finalUserData = {
          ...existingUser, // Mantener datos existentes (incluyendo firstSeenAt)
          ...extractedUserData, // Sobrescribir con los datos más recientes del evento
          id: userId, // Asegurar que el ID sea consistente
          totalLikesGiven: (existingUser.totalLikesGiven || 0) + likesToAdd,
          totalDiamondsGiven:
            (existingUser.totalDiamondsGiven || 0) + diamondsToAdd,
          lastEventType: eventType,
          lastSeenAt: nowISO, // Siempre actualizar
        } as UserData;
      } else {
        // Nuevo usuario - crear
        const initialLikes =
          eventType === "like" && eventData.likeCount && eventData.likeCount > 0
            ? Number(eventData.likeCount)
            : 0;
        const initialDiamonds =
          eventType === "gift" &&
          eventData.diamondCount &&
          eventData.diamondCount > 0
            ? Number(eventData.diamondCount)
            : 0;

        finalUserData = {
          ...extractedUserData,
          id: userId, // Usar userId como ID principal
          totalLikesGiven: initialLikes,
          totalDiamondsGiven: initialDiamonds,
          lastEventType: eventType,
          firstSeenAt: nowISO, // Establecer en la primera inserción
          lastSeenAt: nowISO,
        } as UserData;
      }

      // 2. Guardar (Insertar o Actualizar) usando saveData
      const savedUser = (await this.dbManager.saveData(
        finalUserData
      )) as UserData;

/*       console.log(
        `[${eventType}] User ${userId} ${
          existingUser ? "updated" : "inserted"
        } successfully.`
      ); */
      return savedUser;
    } catch (error) {
      console.error(
        `[${eventType}] Error processing user ${userId} in IndexedDB:`,
        error
      );
      return null; // Indicar fallo
    }
  }

  /**
   * Procesa eventos que contienen listas de usuarios (ej: roomUser).
   */
  async processUserListEvent(
    userList: UserListItem[],
    baseEventType: EventType
  ): Promise<void> {
    if (!Array.isArray(userList)) {
      console.warn(
        `[${baseEventType}] Expected an array of users, but got:`,
        userList
      );
      return;
    }

    const promises = userList.map((userData) => {
      // A veces la lista tiene un objeto 'user' anidado
      const actualUserObject = userData.user || userData;
      return this.upsertUserFromEvent(actualUserObject as EventData, baseEventType);
    });

    try {
      const results = await Promise.allSettled(promises);

      // Log de errores específicos sin detener el proceso completo
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[${baseEventType}] Error processing user at index ${index}:`,
            result.reason
          );
        }
      });
    } catch (error) {
      console.error(`[${baseEventType}] Error processing user list:`, error);
    }
  }

  /**
   * Obtiene todos los usuarios de la base de datos
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const users = (await this.dbManager.getAllData()) as UserData[];
      return users;
    } catch (error) {
      console.error("Error fetching all users:", error);
      return [];
    }
  }

  /**
   * Obtiene un usuario específico por ID
   */
  async getUserById(userId: string): Promise<UserData | null> {
    return this._getUserSafely(userId);
  }

  /**
   * Elimina un usuario por ID
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      await this.dbManager.deleteData(userId);
      console.log(`User ${userId} deleted successfully.`);
      return true;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Limpia toda la base de datos de usuarios
   */
  async clearAllUsers(): Promise<boolean> {
    try {
      await this.dbManager.clearDatabase();
      console.log("All users cleared successfully.");
      return true;
    } catch (error) {
      console.error("Error clearing users database:", error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    totalLikes: number;
    totalDiamonds: number;
    topGifters: UserData[];
    topLikers: UserData[];
  }> {
    try {
      const users = await this.getAllUsers();

      const totalUsers = users.length;
      const totalLikes = users.reduce(
        (sum, user) => sum + (user.totalLikesGiven || 0),
        0
      );
      const totalDiamonds = users.reduce(
        (sum, user) => sum + (user.totalDiamondsGiven || 0),
        0
      );

      const topGifters = [...users]
        .sort(
          (a, b) => (b.totalDiamondsGiven || 0) - (a.totalDiamondsGiven || 0)
        )
        .slice(0, 10);

      const topLikers = [...users]
        .sort((a, b) => (b.totalLikesGiven || 0) - (a.totalLikesGiven || 0))
        .slice(0, 10);

      return {
        totalUsers,
        totalLikes,
        totalDiamonds,
        topGifters,
        topLikers,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        totalUsers: 0,
        totalLikes: 0,
        totalDiamonds: 0,
        topGifters: [],
        topLikers: [],
      };
    }
  }
}

// Configuración de la base de datos
const dbConfig = {
  name: "TikTokLiveUsersDB",
  version: 2,
  store: "users",
};

// Inicialización
const dbManager = new IndexedDBManager(dbConfig);
const userProcessor = new UserProcessor(dbManager);

/**
 * Función principal para procesar eventos
 */
async function setupData(event: EventType, data: EventData): Promise<void> {
  try {
    // Eventos con datos de usuario directos
    if (
      [
        "chat",
        "gift",
        "member",
        "like",
        "social",
        "follow",
        "subscribe",
        "share",
      ].includes(event)
    ) {
      await userProcessor.upsertUserFromEvent(data, event);
    }
    // Evento con lista de usuarios
    else if (
      event === "roomUser" &&
      data &&
      "topViewers" in data &&
      Array.isArray((data as any).topViewers)
    ) {
      await userProcessor.processUserListEvent((data as any).topViewers, event);
    }
  } catch (error) {
    console.error(`Error processing event ${event} in client:`, error);
  }
}

/**
 * Función para mostrar todos los usuarios
 */
async function displayAllUsers(): Promise<UserData[]> {
  try {
    const users = await userProcessor.getAllUsers();
    console.log("All users:", users);
    return users;
  } catch (error) {
    console.error("Error displaying users:", error);
    return [];
  }
}

// Inicialización de la base de datos
dbManager
  .openDatabase()
  .then(() => {
    console.log("Database initialized successfully");
    return displayAllUsers();
  })
  .catch((err) => {
    console.error("Failed to ensure database is open on startup:", err);
  });

export {
  setupData,
  displayAllUsers,
  userProcessor,
  UserProcessor,
  type UserData,
  type EventData,
  type EventType,
};
