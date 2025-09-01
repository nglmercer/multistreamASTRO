// src/event-handling/eventListeners.js
import { TiktokEmitter, tiktokLiveEvents, KickEmitter, kickLiveEvents } from '@utils/socketManager.ts';
import { saveEventData } from './eventSaver.js';
import { switcheventDb } from './eventDispatcher.js';
import { polifyfillEvalueKick,polifyfillEvalueTWITCH } from './dataUtils.js';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';

const logger = new BrowserLogger('eventlisteners').setLevel(LogLevel.LOG);

const platformNames = {
    kick: 'kick',
    tiktok: 'tiktok',
};

// Buffer para acumular eventos
type Platform = string; // Ajusta según tus plataformas (e.g., 'web' | 'mobile')
type EventType = string; // Ajusta según los tipos de eventos

interface EventData {
    [key: string]: any;
}

interface BufferedEvent {
    platform: Platform;
    eventType: EventType;
    data: EventData;
    timestamp: number;
}

class EventBuffer {
    private buffer: BufferedEvent[];
    private delayMs: number;
    private timeoutId: NodeJS.Timeout | null;

    constructor(delayMs: number = 3000) {
        this.buffer = [];
        this.delayMs = delayMs;
        this.timeoutId = null;
    }

    addEvent(platform: Platform, eventType: EventType, data: EventData): void {
        this.buffer.push({
            platform,
            eventType,
            data,
            timestamp: Date.now(),
        });

        this.resetTimer();
    }

    private resetTimer(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.flushBuffer();
        }, this.delayMs);
    }

    private async flushBuffer(): Promise<void> {
        if (this.buffer.length === 0) return;

        const eventsToSave = [...this.buffer];
        this.buffer = [];

        logger.log(`Flushing ${eventsToSave.length} buffered events`);

        const savePromises = eventsToSave.map(({ platform, eventType, data }) =>
            saveEventData(platform, eventType, data).catch((error) => {
                logger.error(`Error saving event ${eventType} for ${platform}:`, error);
            })
        );

        await Promise.allSettled(savePromises);
        logger.log(`Completed saving ${eventsToSave.length} events`);
    }

    async forceFlush(): Promise<void> {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        await this.flushBuffer();
    }
}


// Crear instancia del buffer global
const eventBuffer = new EventBuffer(1000); // 3 segundos de delay
function getData(data: any): { data: any; event?: string; eventName?: string } {
  let lastEvent: string | undefined;
  let lastEventType: string | undefined;
  let current = data;

  // Función auxiliar para validar y asignar los eventos encontrados
  const checkAndSetEvent = (obj: any) => {
    // Nos aseguramos que el objeto es válido antes de acceder a sus propiedades
    if (obj && typeof obj === 'object') {
      if (typeof obj.eventType === 'string' && obj.eventType.length > 0) {
        lastEventType = obj.eventType;
      }
      if (typeof obj.event === 'string' && obj.event.length > 0) {
        lastEvent = obj.event;
      }
    }
  };

  // 1. Recorremos la estructura anidada mientras exista `current.data`
  while (current && typeof current === 'object' && 'data' in current) {
    checkAndSetEvent(current);
    current = current.data;
  }

  // 2. Comprobamos el último nivel (cuando el bucle termina)
  checkAndSetEvent(current);

  // 3. Determinamos el evento final de forma segura
  // Prioridad: lastEventType -> lastEvent -> valor por defecto
  const finalEvent = lastEventType || lastEvent;

  return {
    data: current,
    event: finalEvent,
    eventName: finalEvent, // Se asigna el mismo valor seguro
  };
}


export function setupPlatformEventListeners() {
  tiktokLiveEvents.forEach(event => {
    TiktokEmitter.on(event, async (rawData) => {
      let {data,eventName} = getData(rawData);
      logger.log(`TikTok Event Received: ${eventName||event}`, rawData);
      if (!eventName) {
        eventName = event; // Usar el evento original si no se encuentra ninguno en los datos
      }

      switcheventDb(eventName, data, platformNames.tiktok);
      eventBuffer.addEvent(platformNames.tiktok, eventName, data);
    });
  });

  kickLiveEvents.forEach(event => {
    KickEmitter.on(event, async (rawData) => {
      let {data,eventName} = getData(rawData);
      logger.log(`Kick Event Received: ${eventName||event}`, rawData);
      if (!eventName) {
        eventName = event; // Usar el evento original si no se encuentra ninguno en los datos
      }

      if (eventName === "ChatMessage") {
        const polyfilledData = polifyfillEvalueKick(data);
        switcheventDb(eventName, polyfilledData, platformNames.kick);
        eventBuffer.addEvent(platformNames.kick, eventName, polyfilledData);

      } else if (eventName === "message") {
        const polyfilledData = polifyfillEvalueTWITCH(data);
        switcheventDb(eventName, polyfilledData, platformNames.kick);
        eventBuffer.addEvent(platformNames.kick, eventName, polyfilledData);

      } else {
        switcheventDb(eventName, data, platformNames.kick);
        eventBuffer.addEvent(platformNames.kick, eventName, data);
      }
    });
  });

  logger.log("Platform event listeners initialized.", { TiktokEmitter, KickEmitter });
}


// Función para limpiar el buffer al cerrar la aplicación
export function cleanupEventBuffer() {
    return eventBuffer.forceFlush();
}