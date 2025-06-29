// src/event-handling/dataUtils.js
import { ConfigurableReplacer } from '@components/replace/ConfigurableReplacer.js';

export function polifyfillEvalueKick(data) {
    /*KickEmitter ChatMessage 
    content: "hola pepe como estas"
    created_at: "2025-05-28T23:23:57+00:00"
    id: "1b6f9404-a314-44c1-9389-d4a766bf6b5d"
    metadata: Object { message_ref: "1748474637226" }
    sender: Object { id, username, slug, identity }

    id: 57654164
    identity: Object { color: "#93EBE0", badges: (1) […] }
    slug: "memelcer"
    username: "memelcer"
    ​​​
    type: "message"*/
    const Mapdata = {
        "comment": data.content,
        "uniqueId": data.sender.username,
        ...data
    }
    return Mapdata;
}

export function ReplacesValues(input, data) {
    const replacer = new ConfigurableReplacer();
    // Considera pasar la configuración de alguna manera si no siempre es 'default'
    // o si localStorage no está disponible en todos los contextos.
    const localgetStorageDataString = localStorage.getItem(`configReplacer_default`);
    if (localgetStorageDataString) {
        try {
            const parsedConfig = JSON.parse(localgetStorageDataString);
            if (typeof parsedConfig === 'object' && parsedConfig !== null) {
                replacer.config = parsedConfig;
            }
        } catch (error) {
            console.error("Error parsing configReplacer_default from localStorage:", error);
        }
    }
    const result = replacer.replaceWithTracking(input, data);
    return result.result;
}