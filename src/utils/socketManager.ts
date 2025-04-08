import { io, Socket } from 'socket.io-client';
import Emitter, { emitter } from './Emitter';
import logger from './logger';

interface RoomJoinData {
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
    
    // temporal test joinRoom
    this.joinRoom({ uniqueId: 'yayopio', platform: 'tiktok' });
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
  }

  public joinRoom(data: RoomJoinData): void {
    this.socket.emit('joinRoom', data);
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