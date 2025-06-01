// src/event-handling/eventListeners.js
import { TiktokEmitter, tiktokLiveEvents, KickEmitter, kickLiveEvents } from '@utils/socketManager.ts';
import { saveEventData } from './eventSaver.js'; // Asumiendo que eventSaver.js está en el mismo dir
import { switcheventDb } from './eventDispatcher.js';
import { polifyfillEvalueKick } from './dataUtils.js';
import logger from '@utils/logger.js';

const platformNames = {
    kick: 'kick',
    tiktok: 'tiktok',
}

export function setupPlatformEventListeners() {
    tiktokLiveEvents.forEach(event => {
        TiktokEmitter.on(event, async (data) => {
            logger.log(`TikTok Event Received: ${event}`, data);
            switcheventDb(event, data,platformNames.tiktok); 
            await saveEventData(platformNames.tiktok, event, data);
        });
    });

    kickLiveEvents.forEach(event => {
        KickEmitter.on(event, async (data) => {
            logger.log(`Kick Event Received: ${event}`, data);
            if (event === "ChatMessage") {
                const polifyedData = polifyfillEvalueKick(data);
                switcheventDb(event, polifyedData, platformNames.kick); 
                await saveEventData(platformNames.kick, event, data);
            } else {
                switcheventDb(event, data, platformNames.kick); 
                await saveEventData(platformNames.kick, event, data);
            }
        });
    });

    logger.log("Platform event listeners initialized.", {TiktokEmitter, KickEmitter});
}