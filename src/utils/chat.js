console.log("Chat Loaded");
function mapEvent(eventType, eventData) {

    switch (eventType) {
        case "chat":
            return baseData(eventData[1], 2, eventData);
        case "cheer":
            return { ...baseData(eventData[1], 2, eventData), bits: eventData[1].bits };
        case "join":
            return { uniqueId: eventData[1], nickname: eventData[1], isMod: !eventData[2], isSub: !eventData[2] };
        case "sub":
            return baseData(eventData[4],null, eventData);
        case "resub":
            return { ...baseData(eventData[5], null , eventData), nickname: eventData[3], uniqueId: eventData[3] };
        case "subgift":
            return { ...baseData(eventData[5], null , eventData), nickname: eventData[3], uniqueId: eventData[3] };
        case "submysterygift":
            return baseData(eventData[4],null, eventData);
        case "primepaidupgrade":
            return baseData(eventData[3], null, eventData);
        case "giftpaidupgrade":
            return baseData(eventData[4], null, eventData);
        case "raided":
            return { ...baseData(eventData[3], null, eventData), nickname: eventData[1], uniqueId: eventData[1] };
        default:
            return eventData;
    }
  }
function baseData(data, commentIndex = null, eventData) {
    let rawcomment = commentIndex !== null ? eventData[commentIndex] : undefined || data["system-msg"];
    return {
        uniqueId: data.username || eventData[1],
        nickname: data["display-name"] || eventData[1],
        isMod: data.mod,
        isSub: data.subscriber,
        isVip: data.vip,
        comment: getMessagestring(rawcomment, data).message,
        emotes: getMessagestring(rawcomment, data).emotes,
        data
    };
}
function getMessagestring(message, { emotes }) {
    if (!emotes) return { message: message, emotes: [] }; // Retorna mensaje original y un array vacío si no hay emotes

    // Array para almacenar los links de los emotes
    const emoteLinks = [];

    // Iterar sobre los emotes para acceder a los IDs y posiciones
    Object.entries(emotes).forEach(([id, positions]) => {
        // Usar solo la primera posición para encontrar la palabra clave del emote
        const position = positions[0];
        const [start, end] = position.split("-");
        const stringToReplace = message.substring(
            parseInt(start, 10),
            parseInt(end, 10) + 1
        );

        // Agregar el link del emote al array
        emoteLinks.push(`https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`);

        // En caso de error, agregar el emote de fallback
        const fallbackLink = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/animated/dark/1.0`;
        emoteLinks.push(fallbackLink);

        // Reemplazar la palabra clave del emote con un espacio en blanco
        message = message.replace(stringToReplace, ''); // Reemplaza el emote en el mensaje
    });

    // Retornar el mensaje sin emotes y el array de links de emotes
    return { message: message.trim(), emotes: emoteLinks }; // Elimina espacios en blanco innecesarios
}
async function mapChatMessagetochat(data) {
    return {
        user: data.sender,
        comment: data.content,
        type: data.type,
        uniqueId: data.sender?.username,
        nickname: data.sender?.slug,
        color: data.sender?.indentity?.color,
        emotes: data.emotes,// this is array of emotes
        profilePictureUrl: data.profilePictureUrl //await GetAvatarUrlKick.getProfilePic(data.sender?.username),
    }
}
function getTranslation(text) {
    return text;
}
const newtextcontent = {
    user: {
        name: "username",
        value: "uniqueId comment",
    },
    content: [
        { type: 'text', value: "uniqueId = username" },
        { type: 'text', value: "comentario = comment" },
    ],
}
const newnumbercontent = {
    user: {
        name: "username",
        value: "texto de prueba123123123",
    },
    content: [
        { type: 'text', value: "UniqueId" },
        { type: 'text', value: "1 = repeatCount" },
        { type: 'text', value: "rose = giftname" },
    ],
}
const neweventcontent = {
    user: {
        name: "username",
        value: "UniqueId",
    },
    content: [
        { type: 'text', value: "UniqueId" },
        { type: 'text', value: getTranslation('followed') },
    ],
}

const createMenu = (text, callback) => ({ text, callback });

const callbacks = {
    splitFilterWords: (messageData) => {
        console.log("Split Filter Words clicked", messageData);
        splitfilterwords(messageData.user.value);
    },
    filterWordAdd: (messageData) => {
        console.log("Filter Word Add clicked", messageData);
        filterwordadd(messageData.user.value);
    },
    blockUser: (messageData) => {
        console.log("Block User clicked", messageData);
        adduserinArray(messageData.user.name);
    },
    moreInfo: (messageData) => {
        console.log("More Info clicked", messageData);
    },
    respond: (messageData) => {
        console.log("Respond clicked", messageData);
    },
};
const defaultMenuChat = [
    createMenu("filtrar comentarios - dividir", callbacks.splitFilterWords),
    createMenu("filtrar comentario", callbacks.filterWordAdd),
    createMenu("Bloquear usuario", callbacks.blockUser),
];

const defaultEventsMenu = [
    createMenu("mas información", callbacks.moreInfo),
];

const giftMenu = [
    createMenu("Responder", callbacks.respond),
];

// Utilidades
const timeNow = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
};

async function lastElement() {
    console.log("lastelement");
    const TiktokEvents = localStorage.getItem("TiktokEvents");
    // descargar el string en json temporalmente usando una funcion
    if (TiktokEvents) {
        const OBJTiktokEvents = JSON.parse(TiktokEvents)
        console.log("TiktokEvents", OBJTiktokEvents);
        const messageData = OBJTiktokEvents.chat
        const giftData = OBJTiktokEvents.gift
        const eventData = OBJTiktokEvents.like
        if (messageData) {
            const newData = handlechat(messageData);
        } 
        if (giftData) {
            const newData = handlegift(giftData);
        }
        if (eventData) {
            const newData = handlevent(eventData);
        }

    }else {
        const newMessage1 = webcomponenttemplate(newtextcontent);
        appendMessage(newMessage1, "chatcontainer");
        const newMessage2 = webcomponenttemplate(newnumbercontent, giftMenu);
        appendMessage(newMessage2, "giftcontainer");
        const newMessage3 = webcomponenttemplate(neweventcontent, giftMenu);
        appendMessage(newMessage3, "eventscontainer");
    }


}

function appendMessage(data, container, autoHide = false) {
    const elementWebComponent = document.getElementById(container);
    //console.log("appendMessage", data, container, autoHide);
    elementWebComponent.addMessage(data, autoHide);
}


const arrayevents = ["like", "gift", "chat"];

// Funciones de manejo específicas
const handlechat = async (data, aditionaldata = { type: "text", value: timeNow(), class: "absolute bottom-0 right-0" }) => {
    const newhtml = webcomponentchat(data, aditionaldata);
    appendMessage(newhtml, "chatcontainer");
    console.log("chat", data)
}
const handlegift = async (data) => {
    const newhtml = webcomponentgift(data, { type: "text", value: timeNow(), class: "absolute bottom-0 right-0" });
    appendMessage(newhtml, "giftcontainer");
}
const handlevent = async (data) => {
    const newhtml =webcomponentevent(data, { type: "text", value: timeNow(), class: "absolute bottom-0 right-0" });
    appendMessage(newhtml, "eventscontainer");
}
const handlekickChat = async (data, aditionaldata = { type: "text", value: timeNow(), class: "absolute bottom-0 right-0" }) => {
    const parsedata = await mapChatMessagetochat(data);
    const newhtml = webcomponentchat(parsedata, aditionaldata);
    appendMessage(newhtml, "chatcontainer");
}
// Función helper para obtener datos de usuario con compatibilidad
function getUserData(data, field) {
    // Primero intenta obtener el dato directamente de data
    if (data[field] !== undefined && data[field] !== null) {
        return data[field];
    }
    
    // Si no existe o es null/undefined, intenta obtenerlo de data.user
    if (data.user && data.user[field] !== undefined && data.user[field] !== null) {
        return data.user[field];
    }
    
    // Si no existe en ninguno, retorna null o valor por defecto
    return null;
}

// Función mejorada webcomponentchat con compatibilidad
function webcomponentchat(data, additionaldata = {}) {
    const content = [
        { 
            type: 'text', 
            value: getUserData(data, 'nickname'), 
            title: getUserData(data, 'uniqueId'), 
            class: 'username-text' 
        },
        { 
            type: 'text', 
            value: getUserData(data, 'comment'), 
            class: 'chat-message-text' 
        },
        // { type: 'image', value: getUserData(data, 'profilePictureUrl') } // Avatar manejado por separado
    ];
    
    // Agregar additionaldata si tiene tipo válido
    if (additionaldata && additionaldata.type) {
        content.push(additionaldata);
    }
    
    return {
        user: {
            name: getUserData(data, 'uniqueId'),
            nickname: getUserData(data, 'nickname'),
            photo: getProfilePictureUrl(data),
            userBadges: getUserData(data, 'userBadges') || [],
            data: data // Mantener datos originales si son necesarios
        },
        content: content,
        containerClass: 'grid-layout'
    };
}


/**
 * Creates data structure for a gift event message.
 * @param {object} data - The raw gift event data.
 * @param {object} [additionaldata={}] - Optional additional content item (e.g., timestamp).
 * @returns {object} Data structure for ChatMessage component.
 */
function webcomponentgift(data, additionaldata = {}) {
    const content = [
        { type: 'text', value: data.nickname, title: data.uniqueId, class: 'username-text' },
        { type: 'text', value: ' sent ', class: 'event-action-text' }, // Added "sent" text
        { type: 'text', value: data.giftName, class: 'event-item-name' },
        // Conditionally add gift image only if URL exists
        ...(getgiftPictureUrl(data) ? [{ type: 'image', value: getgiftPictureUrl(data), class: 'message-image event-item-icon' }] : []), // Added specific class + base class
         // Conditionally add repeat count only if > 1 (or always display if needed)
        ...(data.repeatCount > 0 ? [{ type: 'text', value: ` x${data.repeatCount}`, class: 'event-quantity-text' }] : []) // Format as " xN"
    ];

    // Safely add additionaldata if it has a type
    if (additionaldata && additionaldata.type) {
        content.push(additionaldata);
    }

    return {
        user: {
            name: data.uniqueId,
            nickname: data.nickname,
            photo: getProfilePictureUrl(data),
            value: data.giftName, // Primary value associated with the event
            userBadges: data.userBadges || [],
            data: data,
        },
        content: content,
        containerClass: 'message-content' // Use standard layout for gift messages
    }
}
function getgiftPictureUrl(data){
    if (data.giftPictureUrl) {
        return data.giftPictureUrl;
    }
    const { giftDetails } = data;
    if (giftDetails?.giftImage && giftDetails.giftImage.giftPictureUrl) {
        return giftDetails.giftImage.giftPictureUrl;
    }
    return '/favicon.svg'; // Valor por defecto si no hay imagen
}
function getProfilePictureUrl(user) {
  if (user.profilePictureUrl) {
    return user.profilePictureUrl;
  }
  if (user.userDetails && Array.isArray(user.userDetails.profilePictureUrls) && user.userDetails.profilePictureUrls.length > 0) {
    return user.userDetails.profilePictureUrls[0];
  }
  if (user.profilePicture && Array.isArray(user.profilePicture.urls) && user.profilePicture.urls.length > 0) {
    return user.profilePicture.urls[0];
  }
  return '/favicon.svg'; // Valor por defecto si no hay imagen
}
function webcomponentevent(data, additionaldata = {}) {
    // Example: data.label could be "liked the LIVE", "joined", "shared the LIVE"
    const clearLabel = data.label ? data.label.replace(/{0:user}/i, '').trim() : ''; // Remove {0:user} from label
   const content = [
       { type: 'text', value: data.nickname, title: data.uniqueId, class: 'username-text' },
       // Add a space before the event label
       { type: 'text', value: clearLabel, class: 'system-message-text' } // Use system class for these types of events
   ];

   // Safely add additionaldata if it has a type
   if (additionaldata && additionaldata.type) {
       content.push(additionaldata);
   }

   return {
       user: {
           name: data.uniqueId,
           nickname: data.nickname,
           photo: getProfilePictureUrl(data),
            // 'value' might be the label or comment depending on event type
           value: data.label || data.comment || '',
           userBadges: data.userBadges || [],
           data: data,
       },
       content: content
   }
}
function webcomponenttemplate(template = {}, newdata = {}, additionaldata = {}) {
    if (template && template.user && template.content && template.content.length > 0) {
        return { ...template };
    }
    return {
        user: newdata,
        content: [
            { type: 'text', value: data.comment },
            additionaldata
            //  { type: 'image', value: data.profilePictureUrl }
        ]
    };
}
export { 
    webcomponentevent,
    appendMessage,
    handlechat,
    handlegift,
    mapEvent,
    arrayevents,
    lastElement,
    handlekickChat
}