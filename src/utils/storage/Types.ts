// src/types.ts

export interface BaseMessage {
  id: string;
  timestamp: number;
  [key: string]: any; // Permite cualquier propiedad adicional
}

// Puedes crear tipos específicos que extiendan BaseMessage si lo necesitas
// export interface TwitchMessage extends BaseMessage {
//   platform: 'twitch';
//   channel: string;
//   username: string;
//   messageContent: string;
// }

export interface StoreConfig {
  storeName: string; // Nombre del object store
  keyPath?: string; // Default: 'id'
  autoIncrement?: boolean; // Default: false. Si es true, keyPath debe ser una propiedad que no se asigna manualmente.
  indexes?: IndexConfig[];
  ttl?: number; // Time to live en días para la limpieza automática
  autoGenerateId?: boolean; // Si debe generar ID automáticamente (si keyPath no es autoIncrement). Default: true
  idPrefix?: string; // Prefijo para IDs generados si autoGenerateId es true
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters; // Incluye unique, multiEntry, locale
}

export interface QueryOptions<T = BaseMessage> {
  limit?: number;
  offset?: number;
  sortBy?: keyof T | string; // string para permitir ordenar por sub-propiedades como 'metadata.date'
  sortOrder?: 'asc' | 'desc';
  filters?: Partial<Record<keyof T | string, any>>; // string para permitir filtrar por sub-propiedades
  dateRange?: { start: number; end: number; field?: keyof T | string }; // field default: 'timestamp'
}

export interface SearchOptions<T = BaseMessage> extends QueryOptions<T> {
  searchTerm: string;
  searchFields?: (keyof T | string)[]; // Campos específicos donde buscar (strings para sub-propiedades)
  fuzzy?: boolean; // Para búsquedas aproximadas
}

// Estadísticas de un store individual
export interface StoreStats {
  count: number;
  oldestMessageTimestamp?: number;
  newestMessageTimestamp?: number;
  customMetrics?: Record<string, any>; // Para estadísticas más específicas si es necesario
}

// Estadísticas globales
export interface GlobalStats {
  totalMessages: number;
  stores: Record<string, StoreStats>;
  overallTimeRange?: { oldest: number; newest: number };
}