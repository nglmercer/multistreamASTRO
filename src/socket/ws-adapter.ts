import Emitter from '../utils/Emitter.ts';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface Message {
  id: string;
  type: 'sent' | 'received';
  data: string | object;
  timestamp: number;
}

export interface ConnectionOptions {
  id: string;
  url: string;
  name?: string;
  autoReconnect?: boolean; // NEW: Enable/disable auto-reconnect
  reconnectInterval?: number; // NEW: Time between retries (ms)
  maxReconnectAttempts?: number; // NEW: Limit number of attempts
  onOpen?: (client: WsClient) => void;
  onClose?: (client: WsClient) => void;
  onError?: (error: Event, client: WsClient) => void;
  onMessage?: (message: Message, client: WsClient) => void;
}

export interface ConnectionState {
  id: string;
  url: string;
  name?: string;
  status: ConnectionStatus;
}

export class WsClient extends Emitter {
  public readonly id: string;
  public readonly name?: string;
  public readonly url: string;

  private ws: WebSocket | null = null;
  private state: ConnectionState;
  private options: ConnectionOptions;

  private reconnectAttempts = 3; // NEW
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null; // NEW

  constructor(options: ConnectionOptions) {
    super();
    this.id = options.id;
    this.name = options.name;
    this.url = options.url;
    this.options = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: Infinity,
      ...options,
    };

    this.state = {
      id: this.id,
      url: this.url,
      name: this.name,
      status: 'disconnected',
    };
  }

  public getState(): ConnectionState {
    return { ...this.state };
  }

  public connect(): void {
    if (this.ws) {
      console.warn(`[${this.id}] Ya existe una conexión o se está intentando conectar.`);
      return;
    }

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.clearReconnect();
        this.updateStatus('connected');
        this.options.onOpen?.(this);
      };

      this.ws.onclose = () => {
        this.updateStatus('disconnected');
        this.ws = null;
        this.options.onClose?.(this);

        if (this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (errorEvent) => {
        console.error(`[${this.id}] Error en WebSocket:`, errorEvent);
        this.updateStatus('error');
        this.options.onError?.(errorEvent, this);
      };

      this.ws.onmessage = (event) => this.handleMessage(event);
    } catch (error) {
      console.error(`[${this.id}] Falló al crear el WebSocket:`, error);
      this.updateStatus('error');
      this.ws = null;
      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.clearReconnect(); // NEW: Stop future reconnect attempts
  }

  public send(data: string | object): void {
    if (this.state.status !== 'connected' || !this.ws) {
      console.error(`[${this.id}] No se puede enviar, la conexión no está activa.`);
      return;
    }

    const messageData = typeof data === 'object' ? JSON.stringify(data) : data;
    this.ws.send(messageData);

    const sentMessage: Message = {
      id: crypto.randomUUID(),
      type: 'sent',
      data,
      timestamp: Date.now(),
    };
    this.emit('message', sentMessage);
  }

  private updateStatus(status: ConnectionStatus): void {
    this.state.status = status;
    this.emit('statusChange', this.getState());
  }

  private handleMessage(event: MessageEvent): void {
    let data: string | object;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      data = event.data;
    }

    const receivedMessage: Message = {
      id: crypto.randomUUID(),
      type: 'received',
      data,
      timestamp: Date.now(),
    };

    this.emit('message', receivedMessage);
    this.options.onMessage?.(receivedMessage, this);
  }

  /** --- AUTO-RECONNECT METHODS --- */

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts ?? Infinity)) {
      console.warn(`[${this.id}] Máximo número de reintentos alcanzado.`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`[${this.id}] Reintentando conexión en ${this.options.reconnectInterval}ms (intento ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }
}
