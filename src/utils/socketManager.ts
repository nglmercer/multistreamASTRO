import { io, Socket } from 'socket.io-client';
import Emitter, { emitter } from './Emitter';
import logger from './logger';
import LocalStorageManager from './LocalStorageManager'
import {setupData} from '../utils/userdata/UserProcessor.js';

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

// Define the type for the local storage manager
interface TiktokEventsStorage {
  [eventName: string]: any[];
}

const localStorageManager = new LocalStorageManager<TiktokEventsStorage>('TiktokEvents');

class SocketManager {
  private baseUrl: string = 'http://localhost:9001';
  public wsBaseUrl: string = 'ws://localhost:21213/';
  private socket: Socket;
  private ws: WebSocket | null = null; // Para WebSocket nativo, inicializar a null
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number = 5000; // 5 segundos
  private reconnectAttempts: number = 0; // Contador de intentos (opcional, para backoff)
  private maxReconnectAttempts: number = 10; // Limitar intentos (opcional)
  private TiktokEmitter: Emitter;
  public tiktokLiveEvents: TiktokEvent[] = [
    'chat', 'gift', 'connected', 'disconnected',
    'websocketConnected', 'error', 'member', 'roomUser',
    'like', 'social', 'emote', 'envelope', 'questionNew',
    'subscribe', 'follow', 'share', 'streamEnd',
    'availableGifts', 'roomInfo'
  ];

  constructor() {
    this.socket = io(this.baseUrl);
    this.TiktokEmitter = new Emitter();
    this.ws = new WebSocket(this.wsBaseUrl);
    
    console.log("event", 'Socket Manager Loaded', this.baseUrl, this.socket);
    
    this.initializeSocketEvents();
    this.connectWebSocket();
    
    // temporal test joinplatform
  //  this.joinplatform({ uniqueId: 'ju44444n._', platform: 'tiktok' });
    this.getRoomInfo({ uniqueId: 'ju44444n._', platform: 'tiktok' });
    this.getAvailableGifts({ uniqueId: 'ju44444n._', platform: 'tiktok' });
  }

  private initializeSocketEvents(): void {
    this.socket.on('connect', () => {
      console.log("event", 'Connected to server');
    });

    this.tiktokLiveEvents.forEach(event => {
      this.socket.on(event, async (data: any) => {
        setupData(event,data);
        this.tiktokhandlerdata(event, data);
      });
    });
  }

  private connectWebSocket(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Limpiar listeners del WebSocket anterior si existe para evitar fugas
    if (this.ws) {
        console.log("event", 'Cleaning up previous WebSocket listeners.');
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

    console.log("event", `Attempting WebSocket connection to ${this.wsBaseUrl} (Attempt ${this.reconnectAttempts + 1})`);
    this.ws = new WebSocket(this.wsBaseUrl); // Crear nueva instancia

    this.ws.onopen = () => {
      console.log("event", 'WebSocket connected successfully.');
      this.reconnectAttempts = 0; // Reiniciar contador al conectar exitosamente
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("event", 'Received message from WebSocket:', data); // Descomenta si necesitas mucho detalle
        this.tiktokhandlerdata(data.event, data.data);
      } catch (error) {
        console.error("event", 'Failed to parse WebSocket message:', event.data, error);
      }
    };

    this.ws.onerror = (error: Event) => {
      // Los errores a menudo preceden o causan un 'onclose',
      // pero es bueno loggearlos.
      console.error("event", 'WebSocket error:', error);
      // Podrías intentar cerrar aquí si el estado es raro, pero 'onclose' es más fiable para la reconexión.
      // if (this.ws) this.ws.close();
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log("event", `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
      this.ws = null; // Limpiar la referencia al socket cerrado

      // Intentar reconectar
      this.scheduleReconnect();
    };
  }

  // Método para programar la reconexión
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn("event", `WebSocket max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection attempts.`);
        return;
    }

    this.reconnectAttempts++;
    // Opcional: Implementar backoff exponencial
    // const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Ej: 5s, 10s, 20s, max 30s
    const delay = this.reconnectDelay; // Usando delay fijo por ahora

    console.log("event", `Scheduling WebSocket reconnect attempt #${this.reconnectAttempts} in ${delay / 1000} seconds...`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connectWebSocket(); // Intentar conectar de nuevo
    }, delay);
  }

  private tiktokhandlerdata(event: any, data: any): void {
    logger.log("event", event, data, 'TiktokLive');
    this.TiktokEmitter.emit(event, data);
    
    // Fix: Use add instead of addItem
    // Get current events array or initialize an empty array
    // Add the new event data
    // Store back to localStorage
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
}

const socketManager = new SocketManager();

export const socket = socketManager.getSocket();
export const TiktokEmitter = socketManager.getTiktokEmitter();
export default socketManager;