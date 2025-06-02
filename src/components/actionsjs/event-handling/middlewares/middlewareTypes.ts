// src/event-handling/middlewares/middlewareTypes.ts
// Contexto que cada middleware recibirá para operar
export interface MiddlewareContext<TData = any> {
    eventType: string;      // El tipo de evento de reglas (ej. 'chat', 'gift')
    originalEventName: string; // El nombre del evento original de la plataforma (ej. 'ChatMessage', 'like')
    platform: 'tiktok' | 'kick' | string; // Plataforma actual
    data: TData;            // Datos del evento actual
    // Podrías añadir más contexto si es necesario, como `dbManager`
}

// Interfaz base para la configuración de cualquier middleware
export interface BaseMiddlewareConfig {
    type: string;       // Identificador único del tipo de middleware
    enabled: boolean;
    // Podrías añadir propiedades comunes como `order` para la ejecución
}

// Resultado de la ejecución de un middleware
export interface MiddlewareResult {
    shouldContinue: boolean; // false si el middleware bloquea el evento
    reason?: string;         // Opcional: razón del bloqueo/paso
}

// Interfaz para una función de middleware
export type MiddlewareFunction<TConfig extends BaseMiddlewareConfig, TData = any> =
    (config: TConfig, context: MiddlewareContext<TData>) => Promise<MiddlewareResult>;

// --- Ejemplo: Configuración para 'preventIdenticalPrevious' ---
export const PREVENT_IDENTICAL_PREVIOUS_TYPE = 'preventIdenticalPrevious';
export interface PreventIdenticalPreviousConfig extends BaseMiddlewareConfig {
    type: typeof PREVENT_IDENTICAL_PREVIOUS_TYPE;
    userIdentifierPath: string;
    contentPaths: string[];
}

// --- Ejemplo: Configuración para 'blockUser' (nuevo middleware hipotético) ---
export const BLOCK_USER_TYPE = 'blockUser';
export interface BlockUserConfig extends BaseMiddlewareConfig {
    type: typeof BLOCK_USER_TYPE;
    userIdsToBlock: string[];
    userIdentifierPath: string; // Cómo extraer el ID del usuario del evento 'data'
}

// --- Ejemplo: Configuración para 'rateLimitByUser' (nuevo middleware hipotético) ---
export const RATE_LIMIT_BY_USER_TYPE = 'rateLimitByUser';
export interface RateLimitByUserConfig extends BaseMiddlewareConfig {
    type: typeof RATE_LIMIT_BY_USER_TYPE;
    userIdentifierPath: string;
    maxRequests: number;
    timeWindowSeconds: number;
}
export const PREVENT_DUPLICATE_FOLLOW_TYPE = 'preventDuplicateFollow';
export interface PreventDuplicateFollowConfig extends BaseMiddlewareConfig {
    type: typeof PREVENT_DUPLICATE_FOLLOW_TYPE;
    userIdentifierPath: string; // Path para obtener el ID del usuario que realiza el follow
    // Opcional: podrías añadir un timeWindowSeconds si quieres que el bloqueo expire
    // timeWindowSeconds?: number; // Por defecto, podríamos usar 24h como en el otro
}



// Un objeto para registrar los middlewares y sus funciones ejecutoras
// La clave es el `type` del middleware, el valor es su función ejecutora.
export const middlewareRegistry = new Map<string, MiddlewareFunction<any, any>>();

// Función helper para registrar un middleware
export function registerMiddleware<TConfig extends BaseMiddlewareConfig, TData = any>(
    type: string,
    handler: MiddlewareFunction<TConfig, TData>
): void {
    if (middlewareRegistry.has(type)) {
        console.warn(`[MiddlewareRegistry] Middleware type "${type}" is already registered. Overwriting.`);
    }
    middlewareRegistry.set(type, handler);
}

// Un tipo unión para todas las configuraciones de middleware posibles
// Esto crecerá a medida que añadas más tipos de middleware
export type AnyMiddlewareConfig =
    | PreventIdenticalPreviousConfig
    | BlockUserConfig
    | RateLimitByUserConfig
    | PreventDuplicateFollowConfig;

// Actualiza tu definición de `eventRules` para usar este tipo
export interface EventRuleEntry {
    middlewares?: AnyMiddlewareConfig[]; // Array de configuraciones de middleware
    roleChecks: Record<string, (data: any) => boolean>;
    comparatorChecks: Record<string, (item: any, data: any) => boolean>;
    // otras propiedades específicas de la regla si las tienes
}

export type EventRules = Record<string, EventRuleEntry>;