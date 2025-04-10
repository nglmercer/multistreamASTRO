

function getRandomColor(string) {
    let randomChar = string || Math.random().toString(36).substring(2, 15);
    return getColorByChar(randomChar);
    //return '#' + Math.floor(Math.random()*16777215).toString(16);
}
function getColorByChar(char) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    // Asignar un índice único para cada carácter del alfabeto
    const lowerChar = char.toLowerCase();
    const index = alphabet.indexOf(lowerChar);

    // Si no es un carácter alfabético, devuelve un color por defecto
    if (index === -1) return '#ff5733'; // Ejemplo de color por defecto

    // Convertir índice a un color HSL saturado y con luminosidad moderada
    const hue = (index / alphabet.length) * 360; // Distribuir colores uniformemente en el espectro
    const saturation = 85; // Alta saturación
    const lightness = 45; // Moderada luminosidad para evitar tonos muy claros o muy oscuros

    // Convertir HSL a HEX
    return hslToHex(hue, saturation, lightness);
}

// Función para convertir HSL a HEX
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
class MessageContainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
            resize: both;
            overflow: hidden;
          }
          .messages-wrapper {
            position: relative;
            min-height: 100%;
            max-height: 280px;
            overflow-y: auto;
          }
          .maxh-5rem {max-height: 5rem !important;}
          .maxh-10rem {max-height: 10rem !important;}
          .maxh-15rem {max-height: 15rem !important;}
          .maxh-20rem {max-height: 20rem !important;}
          .maxh-25rem {max-height: 25rem !important;}
          .maxh-30rem {max-height: 30rem !important;}
        </style>
        <div class="messages-wrapper" id="messagesWrapper">
          <slot></slot>
        </div>
      `;

        this.messagesWrapper = this.shadowRoot.querySelector('#messagesWrapper');
    }

    connectedCallback() {
        // Aplicar clases desde un atributo
        if (this.hasAttribute('wrapper-classes')) {
            this.messagesWrapper.className += ` ${this.getAttribute('wrapper-classes')}`;
        }

        // Aplicar estilo dinámico desde un atributo
        if (this.hasAttribute('wrapper-style')) {
            this.messagesWrapper.style.cssText += this.getAttribute('wrapper-style');
        }

        // Observador para detectar cambios en el contenedor principal
        if (this.messagesWrapper) {
            const observer = new MutationObserver(() => {
                this.scrollToBottom();
            });
            observer.observe(this.messagesWrapper, { childList: true });
        }

    }

    addMessage(messageData, autoHide = false) {
        const message = document.createElement('chat-message');

        message.setMessageData(messageData);
        message.addEventListener('message-menu', (event) => {
            this.dispatchEvent(new CustomEvent('message-menu', {
                detail: event.detail,
                bubbles: true,
                composed: true
            }));
        });
        this.messagesWrapper.appendChild(message);
        this.scrollToBottom();
        if (autoHide) message.setAutoHide(3000);
    }

    scrollToBottom() {
        this.messagesWrapper.scrollTop = this.messagesWrapper.scrollHeight;
    }
}
class ChatMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._currentMessageData = null; // Almacena los datos del mensaje actual
    }

    setMessageData(data) {
        const { user, content, containerClass } = data;
        this._data = { ...data };
        this.renderMessage(user, content, containerClass);
    }

    renderMessage(user, content, containerClass) {
        const bgColor = user.photo ? '' : this.getRandomColor();
        const initial = user.photo ? '' : user.name.charAt(0).toUpperCase();
        // --- Render badges FIRST ---
        const userBadgeshtml = renderUserBadges(user.userBadges);
        // console.log("userBadgeshtml", userBadgeshtml, user);
        const classContainer = 'message-content' + (containerClass ? ' ' + containerClass : '');
        this.shadowRoot.innerHTML = `
        <style>
        ${this.getStyles()}
        </style>
        <div class="avatar" role="img" aria-label="User avatar">${initial}</div>
        <div class="${classContainer}">
            ${userBadgeshtml ? userBadgeshtml : ''}
            </div>
        <button class="menu-button" role="button" aria-haspopup="true" aria-expanded="false">⋮</button>
      `;

        const avatar = this.shadowRoot.querySelector('.avatar');
        if (user.photo) {
            avatar.style.backgroundImage = `url(${user.photo})`;
            avatar.style.backgroundSize = 'cover';
            avatar.setAttribute('title', user.name);
        } else {
            avatar.style.backgroundColor = bgColor;
        }

        const messageContentContainer = this.shadowRoot.querySelector(`.message-content`); // Get the main container
        // console.log("messageContent", content);

        // --- Render content items AFTER badges ---
        content.forEach(item => {
            // Create a container for each logical item (optional but can help layout)
            const classNameItem = item.class || ''; // e.g., "username-text", "event-item-name", "timestamp-text absolute bottom-0 right-0"

            let element; // The actual p, img, a element

            if (item.type === 'image') {
                element = document.createElement('img');
                element.src = item.value;
                element.alt = item.alt || 'message image';
                // Apply specific class if needed, e.g., for icon styling
                element.className = `message-image ${classNameItem}`;
            } else if (item.type === 'url') {
                element = document.createElement('a');
                element.href = item.url;
                element.textContent = item.value;
                // Apply base text class and specific classes
                element.className = `message-text message-link ${classNameItem}`;
            } else { // Default to text
                element = document.createElement('p');
                element.textContent = item.value;
                // Apply base text class and specific classes
                element.className = `message-text ${classNameItem}`;
            }

            this.setAttribute(element, { name: 'title', value: item.title });
            this.setAttribute(element, { name: 'label', value: item.label });
            element.classList.add('message-item'); // Add a container class too
            messageContentContainer.appendChild(element); // Add container to flex parent
        });

        //contextmenu (ensure it's added after content is rendered)
         messageContentContainer.addEventListener('contextmenu',(event)=>{
            // Target the specific text/link elements if needed
            if(event.target.classList.contains('message-text')){
                const menuButton = this.shadowRoot.querySelector('.menu-button');
                menuButton.click();
                this.EventEmit(event);
                event.preventDefault();
            }
        });

         this.setupMenu(); // Setup menu after rendering
    }
    setAttribute(element, { name, value }) {
        if (name && value) {
            element.setAttribute(name, value);
        }
    }
    EventEmit(e){
      const dataMessage = { ...this._data, element: e };
      const event = new CustomEvent('message-menu', {
        detail: dataMessage,
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
    getStyles() {
        return /*css*/ `
          .absolute { position: absolute; }
          .relative { position: relative; }
          .bottom-0 { bottom: 0; }
          .right-0 { right: 0; }
          .ml-1 { margin-left: 4px; }
          .mr-1 { margin-right: 4px; }
          .mx-1 { margin-left: 4px; margin-right: 4px; }

          :host {
            display: flex;
            align-items: flex-start;
            margin-bottom: 4px;
            padding: 5px 8px;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            position: relative;
            color: #e0e0e0;
            font-family: sans-serif;
            line-height: 1.4;
          }

          .avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            margin-right: 8px;
            flex-shrink: 0;
            background-color: #555;
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
          }

          .message-content {
            flex-grow: 1;
            display: flex;
            margin-right: 0.5rem;
            padding-bottom: 10px;
            position: relative;
          }

          .message-content .badges-container {
             display: inline-flex;
             vertical-align: middle;
             margin-right: 5px;
          }

          .message-content .message-item {
             display: inline;
             margin-right: 4px;
             vertical-align: middle;
          }
           .message-content .message-item:last-child {
             margin-right: 0;
           }
          .message-content .message-item .message-text,
          .message-content .message-item .message-link {
             display: inline;
             white-space: normal;
             word-break: break-word;
          }
          .message-content .message-item .message-image {
             display: inline;
             vertical-align: middle;
          }
          .message-content .timestamp-text.absolute {
              position: absolute;
              bottom: -2px;
              right: 0px;
          }

          .grid-layout {
            flex-grow: 1;
            display: grid;
            grid-template-columns: auto 1fr;
            grid-template-rows: auto auto;
            align-items: center;
            row-gap: 3px;
            column-gap: 6px;
            margin-right: 1rem;
            padding-bottom: 10px;
            position: relative;
          }

          .grid-layout .badges-container {
            grid-row: 1;
            grid-column: 1;
            display: inline-flex;
            align-items: center;
            height: 18px;
          }

          .grid-layout .message-item:nth-of-type(1) {
            grid-row: 1;
            grid-column: 2;
            display: inline;
            vertical-align: baseline;
          }

          .grid-layout .message-item:nth-of-type(n+2) {
             grid-row: 2;
             grid-column: 1 / -1;
             display: inline;
             margin-right: 4px;
             vertical-align: middle;
          }
           .grid-layout .message-item:nth-of-type(n+2):last-child {
              margin-right: 0;
           }
           .grid-layout .message-item:nth-of-type(n+2) .message-text,
           .grid-layout .message-item:nth-of-type(n+2) .message-link {
                display: inline;
                white-space: normal;
                word-break: break-word;
           }
            .grid-layout .message-item:nth-of-type(n+2) .message-image {
                display: inline;
                vertical-align: middle;
           }

          .grid-layout .timestamp-text.absolute {
             position: absolute;
             bottom: -2px;
             right: 0;
          }

          .message-text {
            margin: 0; padding: 0; color: inherit;
          }
          .message-link {
            color: #64b5f6; text-decoration: none;
          }
          .message-link:hover { text-decoration: underline; }

          .message-image {
            height: 3rem; width: 3rem; object-fit: contain; margin: 0 2px;
          }

          .username-text { font-weight: bold; color: #ffffff; }
          .chat-message-text { color: #e0e0e0; }
          .event-action-text { color: #b0b0b0; font-size: 0.95em; }
          .event-item-name { color: #e0e0e0; font-weight: 500; }
          .event-quantity-text { font-weight: bold; color: #b0b0b0; font-size: 1.95em; }
          .system-message-text { font-style: italic; color: #a0a0a0; font-size: 0.9em; }
          .timestamp-text { font-size: 0.8em; color: #999; pointer-events: none; line-height: 1; }


          .badges-container {
             align-items: center;
             gap: 3px;
             vertical-align: middle;
             height: 18px;
          }
          .badge {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 1px 4px; border-radius: 3px; font-size: 0.8em;
            font-weight: bold; color: white; height: 16px; line-height: 1;
          }
          .badge-level { background-color: #1E88E5; }
          .badge-team { background-color: #E53935; }
          .badge-subscriber { background-color: transparent; padding: 0; height: 18px; }
          .badge-subscriber img { height: 100%; width: auto; display: block; }
          .badge-unknown { background-color: #757575; }
          .badge-icon { margin-right: 2px; display: inline-block; }


          .menu-button {
            position: absolute; right: 4px; top: 4px; cursor: pointer;
            padding: 3px; background: none; border: none; font-size: 16px;
            color: #aaa; transition: color 0.2s; line-height: 1; z-index: 1;
          }
          .menu-button:hover { color: #fff; }

          :host(.highlighted-message) { background-color: #6A1B9A; color: #ffffff; }
          :host(.highlighted-message) .username-text,
          :host(.highlighted-message) .chat-message-text,
          :host(.highlighted-message) .event-item-name { color: #ffffff; }
          :host(.highlighted-message) .event-action-text,
          :host(.highlighted-message) .event-quantity-text { color: #e0e0e0; }
          :host(.highlighted-message) .timestamp-text { color: #c0c0c0; }
          :host(.highlighted-message) .menu-button { color: #e0e0e0; }
          :host(.highlighted-message) .menu-button:hover { color: #ffffff; }
          :host(.highlighted-message) .badge {}
        `;
    }

    setupMenu() {
        const menuButton = this.shadowRoot.querySelector('.menu-button');

        menuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.EventEmit(event);
        });
    }

    getMessageData() {
        return this._data;
    }

    getRandomColor() {
        const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#FF9800'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    hide() {
        this.style.display = 'none';
    }

    // Method to remove the message from the DOM
    remove() {
        this.parentNode.removeChild(this);
    }
    setAutoHide(timeout) {
        // tiempo de espera antes de que se borre este elemento
        this._autoHideTimeout = timeout;
        setTimeout(() => {
            this.remove();
        }, timeout);
    }
}
if (!customElements.get('chat-message')) {
customElements.define('chat-message', ChatMessage);
}
if (!customElements.get('message-container')) {
customElements.define('message-container', MessageContainer);
}
function getBadgeDetails(sceneType,{level,url}) {
            // Scene Type 8: Level (Blue, Star Symbol)
            if (sceneType === 8) {
                return {
                    name: 'Level',
                    iconSymbol: '⭐'+ level, // Star symbol
                    cssClass: 'badge-level' // CSS class for styling
                };
            }
            // Scene Type 10: Team Level (Red, Heart Symbol)
            else if (sceneType === 10) {
                return {
                    name: 'Team Level',
                    iconSymbol: '❤️' + level, // Heart symbol
                    cssClass: 'badge-team' // CSS class for styling
                };
            }
            // sceneType 6: Top Ranker is a special case only return img element
            // badgeSceneType: 4 is image and suscriber
            else if (sceneType === 6 || sceneType === 4){
                return {
                    name: sceneType === 6 ? 'Top Ranker' : 'Subscriber',
                    iconSymbol: `<img src='${url}' alt='Top Ranker' style='height: min(24px,100dvh);width: min(24px,100dvw);content-box: fill-box;object-fit: cover;'/>`,
                    cssClass: 'badge-subscriber' // CSS class for styling
                };
            }
            // badgeSceneType 1 is moderator
            else if (sceneType === 1){
                return {
                    name: 'Moderator',
                    iconSymbol: `⚔️`,
                    cssClass: 'badge-subscriber' // CSS class for styling
                };
            }
            // Default for unknown types (Gray, Question Mark Symbol)
            else {
                return {
                    name: 'Unknown Badge',
                    iconSymbol: '❓', // Question mark symbol
                    cssClass: 'badge-unknown' // CSS class for styling
                };
            }
        }

        // --- Rendering Function ---
        /**
         * Renders user badges into the specified container.
         * @param {Array} userBadges - Array of badge objects.
         * @param {string} containerId - The ID of the HTML element to render into.
         */
        function renderUserBadges(userBadges) {


            // Check if userBadges is a valid array
            if (!Array.isArray(userBadges)) {
                return;
            }

            // Handle empty badge array
            if (userBadges.length === 0) {
                return;
            }

            // Create a container div for the badges with CSS class for layout
            const badgesContainer = document.createElement('div');
            badgesContainer.className = 'badges-container'; // Apply layout styles
            badgesContainer.style.display = 'flex';

            // Generate HTML for each badge
            userBadges.forEach(badge => {
                const details = getBadgeDetails(badge.badgeSceneType, badge);

                // Create the main badge element
                const badgeElement = document.createElement('div');
                // Apply base badge class and specific type class
                badgeElement.className = `badge ${details.cssClass}`;

                // Add icon symbol
                const iconSpan = document.createElement('span');
                iconSpan.className = 'badge-icon'; // Class for potential icon-specific styling
                iconSpan.innerHTML = details.iconSymbol;
                iconSpan.setAttribute('aria-hidden', 'true'); // Hide decorative icon from screen readers
                badgeElement.appendChild(iconSpan);
                const level = badge.displayType || badge.level;
                badgeElement.setAttribute('title', `${details.name} - Level `+ level);

                // Append the complete badge to the container
                badgesContainer.appendChild(badgeElement);
            });

            // Append the container with all badges to the main output div
            return badgesContainer.outerHTML;
        }
/**
 * 
 * [
  {
    "type": "image",
    "badgeSceneType": 6,
    "displayType": 1,
    "url": "https://p19-webcast.tiktokcdn.com/webcast-sg/new_top_gifter_version_2.png~tplv-obj.image"
  },
  {
    "type": "privilege",
    "privilegeId": "7138381176787539748",
    "level": 7,
    "badgeSceneType": 8
  },
  {
    "type": "privilege",
    "privilegeId": "7196929090442513157",
    "level": 1,
    "badgeSceneType": 10
  }
]
 */
import { webcomponentevent, appendMessage, handlechat, handlegift, mapEvent, arrayevents,lastElement } from '/src/utils/chat.js';

import { TiktokEmitter, socket } from '/src/utils/socketManager';
import { openPopup, returnexploreroptions, setPopupOptions,returnOptions } from '/src/components/menu/menuutils.js';
import {
    playTextwithproviderInfo
} from '/src/components/voicecomponents/initconfig.js';	
TiktokEmitter.on('chat', async (data) => {
//  console.log("TiktokEmitter",data);
  handlechat(data);
});
TiktokEmitter.on('gift', async (data) => {
//  console.log("TiktokEmitter",data);
  handlegift(data);
});
TiktokEmitter.on('play_arrow', async (data) => {
//  console.log("TiktokEmitter",data);
});
const chatcontainer = document.getElementById('chatcontainer');
chatcontainer.addEventListener('message-menu',(event)=>{
    console.log("event chatcontainer",event.detail);
    const messageData = event.detail;
    const optionsName = {
      "play_arrow": returnexploreroptions('play_arrow','play_arrow','play_arrow',()=>{
        TiktokEmitter.emit('play_arrow',messageData);
    }),
      "explorer-2":"Explorer 2",
      "explorer-3":"Explorer 3",
    }
    const menuOptions = [
      // emit array and foreach
      optionsName['play_arrow'],
        returnexploreroptions('explorer-2','Explorer 2','search',()=>{
            console.log("optionschat", messageData);
        }),
        returnexploreroptions('explorer-3','Explorer 3','menu',()=>{
            console.log("optionschat", messageData);
        }),
    ];
    setPopupOptions(returnOptions(menuOptions));
    openPopup(messageData.element?.originalTarget);
});
const giftcontainer = document.getElementById('giftcontainer');
giftcontainer.addEventListener('message-menu',(event)=>{
    console.log("event giftcontainer",event.detail);
    const messageData = event.detail;
    const optionsName = {
      "play_arrow": returnexploreroptions('play_arrow','play_arrow','play_arrow',()=>{
    }),
      "explorer-2":"Explorer 2",
      "explorer-3":"Explorer 3",
    }
    const menuOptions = [
      // emit array and foreach
      optionsName['play_arrow'],
        returnexploreroptions('explorer-2','Explorer 2','search',()=>{
            console.log("optionschat", messageData);
        }),
        returnexploreroptions('explorer-3','Explorer 3','menu',()=>{
            console.log("optionschat", messageData);
        }),
    ];
    setPopupOptions(returnOptions(menuOptions));
    openPopup(messageData.element?.originalTarget);
});
const eventscontainer = document.getElementById('eventscontainer');
eventscontainer.addEventListener('message-menu',(event)=>{
    console.log("event eventscontainer",event.detail);
    const messageData = event.detail;
    const optionsName = {
      "play_arrow": returnexploreroptions('play_arrow','play_arrow','play_arrow',()=>{
    }),
      "explorer-2":"Explorer 2",
      "explorer-3":"Explorer 3",
    }
    const menuOptions = [
      // emit array and foreach
      optionsName['play_arrow'],
        returnexploreroptions('explorer-2','Explorer 2','search',()=>{
            console.log("optionschat", messageData);
        }),
        returnexploreroptions('explorer-3','Explorer 3','menu',()=>{
            console.log("optionschat", messageData);
        }),
    ];
    setPopupOptions(returnOptions(menuOptions));
    openPopup(messageData.element?.originalTarget);
});
document.addEventListener('DOMContentLoaded', () => {
    lastElement();
});