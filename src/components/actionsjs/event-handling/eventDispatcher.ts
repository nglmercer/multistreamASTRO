// src/event-handling/eventDispatcher.js
import { getAllDataFromDatabase, databases } from '@utils/idb.js';
import { processMatchedItems } from './actionProcessor.js';
import { polifyfillEvalueKick,polifyfillEvalueTWITCH } from './dataUtils.js';
import { evalueChat, evalueGift, evalueBits, evalueLikes, evalueFollow } from './ruleEngine.ts';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
const logger = new BrowserLogger('eventdispatcher')
    .setLevel(LogLevel.LOG);


const dbEventMapping = {
    "chat": databases.commentEventsDB,
    "gift": databases.giftEventsDB,
    "bits": databases.bitsEventsDB,
    "like": databases.likesEventsDB,
    "likes": databases.likesEventsDB,
    "follow": databases.followEventsDB,
    "ChatMessage": databases.commentEventsDB, // Kick's chat message
    "message": databases.commentEventsDB, // Twitch chat message
};

const eventEvaluators = {
    'ChatMessage': (array:any[], data:any, platform:string) => evalueChat(array, polifyfillEvalueKick(data), platform,'ChatMessage'),
    'message': (array:any[], data:any, platform:string) => evalueChat(array, polifyfillEvalueTWITCH(data), platform,'message'),
    'chat': evalueChat,
    'gift': evalueGift,
    'bits': evalueBits,
    'likes': evalueLikes,
    'like': evalueLikes,
    'follow': evalueFollow,
};

export async function switcheventDb(event:string, eventData:any, platform:string) {
    const targetDB = dbEventMapping[event as keyof typeof dbEventMapping];
    const evaluator = eventEvaluators[event as keyof typeof eventEvaluators];
    console.log("switcheventDb: Event received", event, eventData, platform);
    if (targetDB && evaluator) {
        try {
            const rulesArray = await getAllDataFromDatabase(targetDB);
            logger.log("switcheventDb: Rules fetched for event", event, rulesArray);
            
            const result = await evaluator(rulesArray, eventData, platform,event);
            logger.log(`switcheventDb: Evaluation result for ${event}`, result);

            if (result && result instanceof Map && result.size > 0) {
                const resultArray = Array.from(result.values());
                await processMatchedItems(resultArray, eventData, event);
            }
        } catch (error) {
            logger.error(`Error processing event ${event} in switcheventDb:`, error);
        }
    } else {
        logger.warn(`No DB mapping or evaluator found for event: ${event}`);
    }
}