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
        comment: data.content,
        type: data.type,
        uniqueId: data.sender?.username,
        nickname: data.sender?.slug,
        color: data.sender?.indentity?.color,
        emotes: data.emotes,// this is array of emotes
        profilePictureUrl: await GetAvatarUrlKick.getProfilePic(data.sender?.username),
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

    const messageData = JSON.parse(localStorage.getItem("lastChatMessage"));
    let newWebComponentChat = null;

    if (messageData) {
        const newData = await mapChatMessagetochat(messageData);
        HandleAccionEvent("chat", newData);
        console.log("mapChatMessagetochat", newData);

        newWebComponentChat = webcomponentchat(newData, defaultMenuChat, {
            type: "text",
            value: timeNow(),
            class: "bottom-right-0",
        });
    }

    const newMessage1 = webcomponenttemplate(newtextcontent);
    const newMessage2 = webcomponenttemplate(newnumbercontent, giftMenu);
    const newMessage3 = webcomponenttemplate(neweventcontent, giftMenu);

    if (newWebComponentChat) appendMessage(newWebComponentChat, "chatcontainer");
    appendMessage(newMessage1, "chatcontainer");
    appendMessage(newMessage2, "giftcontainer");
    appendMessage(newMessage3, "eventscontainer");
}

function appendMessage(data, container, autoHide = false) {
    const elementWebComponent = document.getElementById(container);
    //console.log("appendMessage", data, container, autoHide);
    elementWebComponent.addMessage(data, autoHide);
}


const arrayevents = ["like", "gift", "chat"];

// Funciones de manejo específicas
const handlechat = async (data, aditionaldata = { type: "text", value: timeNow(), class: "bottom-right-0" }) => {
    const newhtml = webcomponentchat(data, defaultMenuChat, aditionaldata);
    appendMessage(newhtml, "chatcontainer");
    console.log("chat", data)
}
const handlegift = async (data) => {
    const newhtml = webcomponentgift(data, defaultMenuChat, { type: "text", value: timeNow(), class: "bottom-right-0" });
    appendMessage(newhtml, "giftcontainer");
}
function webcomponentchat(data, optionmenuchat = [], additionaldata = {}) {
    return {
        user: {
            name: data.uniqueId,
            photo: data.profilePictureUrl,
            value: data.comment,
            data: data,
            ...data
        },
        content: [
            { type: 'text', value: data.uniqueId },
            { type: 'text', value: data.comment },
            additionaldata
            //  { type: 'image', value: data.profilePictureUrl }
        ],
        menu: {
            options: optionmenuchat
        }
    };
}
function webcomponentgift(data, optionmenu = [], additionaldata = {}) {
    return {
        user: {
            name: data.uniqueId,
            photo: data.profilePictureUrl,
            value: data.giftName,
            data: data,
        },
        content: [
            { type: 'text', value: data.uniqueId },
            { type: 'text', value: data.repeatCount },
            { type: 'text', value: data.giftName },
            { type: 'image', value: data.giftPictureUrl },
            additionaldata
        ],
        menu: {
            options: optionmenu
        }
    }
}
function webcomponentevent(data, optionmenu = [], additionaldata = {}) {
    return {
        user: {
            name: data.uniqueId,
            photo: data.profilePictureUrl,
            value: data.comment,
            data: data,
        },
        content: [
            { type: 'text', value: data.uniqueId },
            additionaldata
        ],
        menu: {
            options: optionmenu
        }
    }
}
function webcomponenttemplate(template = {}, optionmenuchat = defaultMenuChat, newdata = {}, additionaldata = {}) {
    if (template && template.user && template.content && template.content.length > 0) {
        return { ...template, menu: { options: optionmenuchat } };
    }
    return {
        user: newdata,
        content: [
            { type: 'text', value: data.comment },
            additionaldata
            //  { type: 'image', value: data.profilePictureUrl }
        ],
        menu: {
            options: optionmenuchat
        }
    };
}
export { 
    webcomponentevent,
    appendMessage,
    handlechat,
    handlegift,
    mapEvent,
    arrayevents,
    lastElement
}