// src/main.js (o como llames a tu archivo principal)
import logger from '@utils/logger.js';
import { initializeEventSaver } from './event-handling/eventSaver.ts'; // Ajusta la ruta
import { setupPlatformEventListeners } from './event-handling/eventListeners.js';
import { kickLiveEvents, tiktokLiveEvents } from '@utils/socketManager.ts';

// Exportaciones principales de tu sistema de eventos si necesitas accederlas desde fuera
export { updateRules } from './event-handling/ruleEngine.ts';


async function initializeEventSystem() {
    const allEventsToLog = [
        ...kickLiveEvents.map(eventName => ({ platform: 'kick', eventName })),
        ...tiktokLiveEvents.map(eventName => ({ platform: 'tiktok', eventName }))
    ];

    try {
        await initializeEventSaver(allEventsToLog);
        logger.log("Event saving system initialized.");

        setupPlatformEventListeners(); // Configura los listeners de TikTok y Kick
        logger.log("Platform event listeners setup complete.");

        logger.log("Event handling system fully initialized.");

    } catch (error) {
        logger.error("Error setting up event handling system:", error);
    }
}

// Iniciar el sistema
initializeEventSystem();