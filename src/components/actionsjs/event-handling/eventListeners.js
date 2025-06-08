// src/event-handling/eventListeners.js
import { TiktokEmitter, tiktokLiveEvents, KickEmitter, kickLiveEvents } from '@utils/socketManager.ts';
import { saveEventData } from './eventSaver.js';
import { switcheventDb } from './eventDispatcher.js';
import { polifyfillEvalueKick } from './dataUtils.js';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';

const logger = new BrowserLogger('eventlisteners').setLevel(LogLevel.LOG);

const platformNames = {
    kick: 'kick',
    tiktok: 'tiktok',
};

// Buffer para acumular eventos
class EventBuffer {
    constructor(delayMs = 3000) {
        this.buffer = [];
        this.delayMs = delayMs;
        this.timeoutId = null;
    }

    addEvent(platform, eventType, data) {
        this.buffer.push({
            platform,
            eventType,
            data,
            timestamp: Date.now()
        });

        // Reiniciar el timer cada vez que llega un evento
        this.resetTimer();
    }

    resetTimer() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.flushBuffer();
        }, this.delayMs);
    }

    async flushBuffer() {
        if (this.buffer.length === 0) return;

        const eventsToSave = [...this.buffer];
        this.buffer = [];

        logger.log(`Flushing ${eventsToSave.length} buffered events`);

        // Guardar todos los eventos en paralelo
        const savePromises = eventsToSave.map(({ platform, eventType, data }) =>
            saveEventData(platform, eventType, data).catch(error => {
                logger.error(`Error saving event ${eventType} for ${platform}:`, error);
            })
        );

        await Promise.allSettled(savePromises);
        logger.log(`Completed saving ${eventsToSave.length} events`);
    }

    // Método para forzar el guardado inmediato si es necesario
    async forceFlush() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        await this.flushBuffer();
    }
}

// Crear instancia del buffer global
const eventBuffer = new EventBuffer(3000); // 3 segundos de delay

export function setupPlatformEventListeners() {
    tiktokLiveEvents.forEach(event => {
        TiktokEmitter.on(event, async (data) => {
            logger.log(`TikTok Event Received: ${event}`, data);
            
            // Procesar inmediatamente para switcheventDb
            switcheventDb(event, data, platformNames.tiktok);
            
            // Agregar al buffer para guardado diferido
            eventBuffer.addEvent(platformNames.tiktok, event, data);
        });
    });

    kickLiveEvents.forEach(event => {
        KickEmitter.on(event, async (data) => {
            logger.log(`Kick Event Received: ${event}`, data);
            
            if (event === "ChatMessage") {
                const polifyedData = polifyfillEvalueKick(data);
                switcheventDb(event, polifyedData, platformNames.kick);
                
                // Guardar los datos originales, no los polyfilled
                eventBuffer.addEvent(platformNames.kick, event, data);
            } else {
                switcheventDb(event, data, platformNames.kick);
                eventBuffer.addEvent(platformNames.kick, event, data);
            }
        });
    });

    logger.log("Platform event listeners initialized.", { TiktokEmitter, KickEmitter });
}

// Función para limpiar el buffer al cerrar la aplicación
export function cleanupEventBuffer() {
    return eventBuffer.forceFlush();
}