import { io, Socket } from 'socket.io-client';
import Emitter, { emitter } from './Emitter';
import { BrowserLogger, LogLevel } from './Logger.ts'
import LocalStorageManager from './LocalStorageManager'
import {setupData,type EventType} from './userdata/UserProcessor.ts';
const logger = new BrowserLogger('socket')
  .setLevel(LogLevel.DISABLED);
interface JoinPlatformparams {
  uniqueId: string;
  platform: string;
}

type TiktokEvent = 
  | 'chat'
  | 'gift'
  | 'connected'
  | 'disconnected'
  | 'websocketConnected'
  | 'error'
  | 'member'
  | 'roomUser'
  | 'like'
  | 'social'
  | 'emote'
  | 'envelope'
  | 'questionNew'
  | 'subscribe'
  | 'follow'
  | 'share'
  | 'availableGifts'
  | 'roomInfo'
  | 'streamEnd';
  type KickEvent = 
  | 'ready'
  | 'ChatMessage'
  | 'Subscription'
  | 'disconnected'
  | 'connected'
  | 'login'
  | 'close';
interface TiktokEventsStorage {
  // Use specific types if possible, otherwise 'any' or 'object'
  [eventName: string]: any; // Or Record<TiktokEvent, any>
  // Example with more specific types (optional):
  // chat?: ChatEventData;
  // gift?: GiftEventData;
  // ... etc
}

const localStorageManager = new LocalStorageManager<TiktokEventsStorage>('TiktokEvents');
const apiKey = localStorage.getItem('tiktok_apiKey')
const wsUrl = `wss://ws.eulerstream.com?uniqueId=tv_asahi_news&apiKey=`;
class SocketManager {
  private baseUrl: string = 'http://localhost:9001';
  public wsBaseUrl: string = wsUrl;
  private socket: Socket;
  private ws: WebSocket | null = null; // Para WebSocket nativo, inicializar a null
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number = 5000; // 5 segundos
  private reconnectAttempts: number = 0; // Contador de intentos (opcional, para backoff)
  private maxReconnectAttempts: number = 10; // Limitar intentos (opcional)
  private TiktokEmitter: Emitter;
  private KickEmitter: Emitter;
  public tiktokLiveEvents: TiktokEvent[] | string[] = [
    'chat', 'gift', 'connected', 'disconnected',
    'websocketConnected', 'error', 'member', 'roomUser',
    'like', 'social', 'emote', 'envelope', 'questionNew',
    'subscribe', 'follow', 'share', 'streamEnd',
    'availableGifts', 'roomInfo'
  ];
  public kickLiveEvents: string[] | KickEvent[] = ['ready', 'ChatMessage', 'Subscription', 'disconnected', 'connected', 'login','close'];
  constructor() {
    this.socket = io(this.baseUrl);
    this.TiktokEmitter = new Emitter();
    this.KickEmitter = new Emitter();
    this.ws = new WebSocket(this.wsBaseUrl);
    
    logger.log("event", 'Socket Manager Loaded', this.baseUrl, this.socket);
    
    this.initializeSocketEvents();
    this.connectWebSocket(apiKey); // Conectar al WebSocket con la clave de API
    // temporal test joinplatform
  //  this.joinplatform({ uniqueId: 'ju44444n._', platform: 'tiktok' });
  //  this.getRoomInfo({ uniqueId: 'ju44444n._', platform: 'tiktok' });
  //  this.getAvailableGifts({ uniqueId: 'ju44444n._', platform: 'tiktok' });
  }

  private initializeSocketEvents(): void {
    this.socket.on('connect', () => {
      logger.log("event", 'Connected to server');
    });

    this.tiktokLiveEvents.forEach(event => {
      this.socket.on(event, async (data: any) => {
        this.tiktokhandlerdata(event, data);
      });
    });
    this.kickLiveEvents.forEach(event => {
      logger.log("event", `Listening for Kick event: ${event} on KickEmitter`);
      this.socket.on(event, (data: any) => {
        this.kickhandlerdata(event, data);
      });
    });
  }

  private connectWebSocket(key:string|null): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (!key && !apiKey) return;
    localStorage.setItem('tiktok_apiKey',String(key || apiKey)); // Guardar la clave en localStorage
    // Limpiar listeners del WebSocket anterior si existe para evitar fugas
    if (this.ws) {
        logger.log("event", 'Cleaning up previous WebSocket listeners.');
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        // No necesariamente cerrar aquí, ya que 'onclose' pudo haber disparado esto.
        // Si llamas a connectWebSocket manualmente, sí deberías cerrarlo antes.
        // if (this.ws.readyState !== WebSocket.CLOSED) {
        //   this.ws.close();
        // }
    }

    logger.log("event", `Attempting WebSocket connection to ${this.wsBaseUrl} (Attempt ${this.reconnectAttempts + 1})`);
    this.ws = new WebSocket(key ? (this.wsBaseUrl + key): (this.wsBaseUrl + apiKey)); // Crear nueva instancia

    this.ws.onopen = () => {
      logger.log("event", 'WebSocket connected successfully.');
      this.reconnectAttempts = 0; // Reiniciar contador al conectar exitosamente
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        logger.log("event", 'Received message from WebSocket:', data); // Descomenta si necesitas mucho detalle
        this.tiktokhandlerdata(data.event, data.data);
      } catch (error) {
        logger.error("event", 'Failed to parse WebSocket message:', event.data, error);
      }
    };

    this.ws.onerror = (error: Event) => {
      // Los errores a menudo preceden o causan un 'onclose',
      // pero es bueno loggearlos.
      logger.error("event", 'WebSocket error:', error);
      // Podrías intentar cerrar aquí si el estado es raro, pero 'onclose' es más fiable para la reconexión.
      // if (this.ws) this.ws.close();
    };

    this.ws.onclose = (event: CloseEvent) => {
      logger.log("event", `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
      this.ws = null; // Limpiar la referencia al socket cerrado

      // Intentar reconectar
      this.scheduleReconnect();
    };
  }

  // Método para programar la reconexión
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.warn("event", `WebSocket max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection attempts.`);
        return;
    }

    this.reconnectAttempts++;
    // Opcional: Implementar backoff exponencial
    // const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Ej: 5s, 10s, 20s, max 30s
    const delay = this.reconnectDelay; // Usando delay fijo por ahora

    logger.log("event", `Scheduling WebSocket reconnect attempt #${this.reconnectAttempts} in ${delay / 1000} seconds...`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connectWebSocket(localStorage.getItem('tiktok_apiKey')); // Intentar conectar de nuevo
    }, delay);
  }

  private tiktokhandlerdata(event: any, data: any): void {
    logger.log("event", event, data, 'TiktokLive');
    this.TiktokEmitter.emit(event, data);
    setupData(event as EventType,data);
    // Fix: Use add instead of addItem
    // Get current events array or initialize an empty array
    // Add the new event data
    // Store back to localStorage
    localStorageManager.set(event, data);
  }
  private kickhandlerdata(event: any, data: any): void {
    logger.log("event", event, data, 'KickLive');
    this.KickEmitter.emit(event, data);
    localStorageManager.set(event, data);
  }
  public joinplatform(data: JoinPlatformparams): void {
    this.socket.emit('join-platform', data);
  }
  public getRoomInfo(data: JoinPlatformparams): void {
    this.socket.emit('getRoomInfo', data);
  }
  public getAvailableGifts(data: JoinPlatformparams): void {
    this.socket.emit('getAvailableGifts', data);
  }
  public getSocket(): Socket {
    return this.socket;
  }

  public getTiktokEmitter(): Emitter {
    return this.TiktokEmitter;
  }
  public getKickEmitter(): Emitter {
    return this.KickEmitter;
  }
}
const initializeSocketManager = (): SocketManager => {
  if (typeof window !== 'undefined') {
    if (!(window as any)._socketManager) {
      console.log("Creating a new SocketManager instance.");
      (window as any)._socketManager = new SocketManager();
    }
    return (window as any)._socketManager;
  }
  // En el servidor (SSR de Astro), no creamos la instancia.
  // Podríamos devolver un objeto "mock" si fuera necesario.
  return null as any; 
};
const socketManager = initializeSocketManager();
interface BaseData {
  user?: any; // 'user' es opcional.
  [key: string]: any;
}

// Datos con la estructura aplanada (las propiedades del usuario son opcionales).
interface FlattenedData {
  [key: string]: any;
}

// El tipo de entrada puede ser una u otra estructura.
type InputData = BaseData | FlattenedData;

function flattenUserDataTSRobust(data: InputData): FlattenedData {
  // Comprobamos si 'user' existe y es un objeto. 'in' es un type guard.
  if ('user' in data && typeof data.user === 'object' && data.user !== null) {
    const { user, ...restOfData } = data;
    return {
      ...restOfData,
      ...user
    };
  }

  // Si no hay propiedad 'user', los datos ya están aplanados, así que los devolvemos como están.
  return { ...data };
}
function getValidEventName(eventName: string, tiktokEvents:   [], kickEvents: string[]): string {
  if (!eventName) {
    return '';
  }

  // Combinar todos los eventos válidos
  const allValidEvents = [...tiktokEvents, ...kickEvents];
  
  // Buscar si algún evento válido está contenido en el eventName
  for (const validEvent of allValidEvents) {
    if (eventName.toLowerCase().includes(validEvent.toLowerCase())) {
      return validEvent;
    }
  }

  // Si no se encuentra coincidencia, retornar string vacío
  return '';
}

export const socket = socketManager.getSocket();
export const TiktokEmitter = socketManager.getTiktokEmitter();
export const KickEmitter = socketManager.getKickEmitter();
export const tiktokLiveEvents = socketManager.tiktokLiveEvents;
export const kickLiveEvents = socketManager.kickLiveEvents;
const TypeMessages = ["KICK_LIVE_EVENT","TIKTOK_LIVE_EVENT"];
window.addEventListener('message', (event) => {
    // IMPORTANTE: Verificar el origen por seguridad
    console.log('Mensaje recibido:', event.data);
    if (!event.data) return;
    if (event.data.type && event.data.payload) {
      const {eventName,data} = event.data.payload;
      if (!eventName || !data) return;  
      if (TypeMessages[0] === event.data.type) {
        const cleanEventName = getValidEventName(eventName,[],socketManager.kickLiveEvents);
        KickEmitter.emit(cleanEventName, data.data ? data.data : data);
      } else if (TypeMessages[1] === event.data.type) {        
        TiktokEmitter.emit(eventName, flattenUserDataTSRobust(data));
        setupData(eventName as EventType,flattenUserDataTSRobust(data));
      }
      localStorageManager.set(eventName, flattenUserDataTSRobust(data));
    }
}); 

export {localStorageManager,socketManager}
export default socketManager;
