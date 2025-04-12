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
  | 'streamEnd';

// Define the type for the local storage manager
interface TiktokEventsStorage {
  [eventName: string]: any[];
}

const localStorageManager = new LocalStorageManager<TiktokEventsStorage>('TiktokEvents');

class SocketManager {
  private baseUrl: string = 'http://localhost:9001';
  private wsBaseUrl: string = 'ws://localhost:21213/';
  private socket: Socket;
  private ws: WebSocket;
  private TiktokEmitter: Emitter;
  private tiktokLiveEvents: TiktokEvent[] = [
    'chat', 'gift', 'connected', 'disconnected',
    'websocketConnected', 'error', 'member', 'roomUser',
    'like', 'social', 'emote', 'envelope', 'questionNew',
    'subscribe', 'follow', 'share', 'streamEnd'
  ];

  constructor() {
    this.socket = io(this.baseUrl);
    this.TiktokEmitter = new Emitter();
    this.ws = new WebSocket(this.wsBaseUrl);
    
    console.log("event", 'Socket Manager Loaded', this.baseUrl, this.socket);
    
    this.initializeSocketEvents();
    this.initializeWebSocket();
    
    // temporal test joinplatform
  //  this.joinplatform({ uniqueId: 'foxsabe1', platform: 'tiktok' });
    this.getRoomInfo({ uniqueId: 'foxsabe1', platform: 'tiktok' });
    this.getAvailableGifts({ uniqueId: 'foxsabe1', platform: 'tiktok' });
  }

  private initializeSocketEvents(): void {
    this.socket.on('connect', () => {
      console.log("event", 'Connected to server');
    });

    this.tiktokLiveEvents.forEach(event => {
      this.socket.on(event, async (data: any) => {
        if (event === 'roomUser') {
          emitter.emit(event, data);
          localStorage.setItem('lastRoomUser', JSON.stringify(data));
        }
        setupData(event,data);
        this.tiktokhandlerdata(event, data);
      });
    });
  }

  private initializeWebSocket(): void {
    this.ws.onopen = () => {
      console.log("event", 'WebSocket connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      logger.log("event", 'Received message from server:', data);
      this.tiktokhandlerdata(data.event as TiktokEvent, data.data);
    };
  }

  private tiktokhandlerdata(event: TiktokEvent, data: any): void {
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