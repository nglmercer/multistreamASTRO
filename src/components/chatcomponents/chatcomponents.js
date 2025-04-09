

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
        this._menuOptions = [];
        this._currentMessageData = null; // Almacena los datos del mensaje actual
    }

    connectedCallback() {
        
    }

    disconnectedCallback() {
        
    }

    setMessageData(data) {
        const { user, content, menu } = data;
        this._data = { ...data };
        this._menuOptions = menu?.options || [];
        this.renderMessage(user, content);
        this.setupMenu();
    }

    renderMessage(user, content) {
        const bgColor = user.photo ? '' : this.getRandomColor();
        const initial = user.photo ? '' : user.name.charAt(0).toUpperCase();
        const userBadgeshtml = renderUserBadges(user.userBadges);
        console.log("userBadgeshtml",userBadgeshtml, user);
        this.shadowRoot.innerHTML = `
        <style>
                  .absolute {
            position: absolute;
          }
          .bottom-0 {
            bottom: 0;
          }
          .right-0 {
            right: 0;
          }
          :host {
            display: flex;
            margin-bottom: 10px;
            position: relative;
          }
          img {
            max-width: 100%;
            max-height: min(250px,100%);
            height: auto;
            width: auto;
            display: block;
            margin-bottom: 5px;
          }
          .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            flex-shrink: 0;
          }
          .message-content {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin-right: 30px;
            gap: 0;
          }
          p {
            margin: 0;
            padding: 0;
          }
          .menu-button {
            position: absolute;
            right: 0;
            top: 0;
            cursor: pointer;
            padding: 5px;
            background: none;
            border: none;
            font-size: 16px;
            color: #666;
            transition: color 0.2s;
          }
          .menu-button:hover {
            color: #333;
          }
        </style>
        <div class="avatar" role="img" aria-label="User avatar">${initial}</div>
        ${userBadgeshtml ? userBadgeshtml : ''}
        <div class="message-content"></div>
        <button class="menu-button" role="button" aria-haspopup="true" aria-expanded="false">⋮</button>
      `;

        const avatar = this.shadowRoot.querySelector('.avatar');
        if (user.photo) {
            avatar.style.backgroundImage = `url(${user.photo})`;
            avatar.style.backgroundSize = 'cover';
        } else {
            avatar.style.backgroundColor = bgColor;
        }

        const messageContent = this.shadowRoot.querySelector('.message-content');
        content.forEach(item => {
            const messageItem = document.createElement('div');
            const classNameItem = item.class || 'message-item';
            messageItem.className = classNameItem;

            if (item.type === 'image') {
                const img = document.createElement('img');
                img.src = item.value;
                img.alt = 'message image';
                messageItem.appendChild(img);
            }

            if (item.type === 'text') {
                const p = document.createElement('p');
                p.textContent = item.value;
                p.className = `message-text ${classNameItem}`;
                messageItem.appendChild(p);
            }

            if (item.type === 'url') {
                const a = document.createElement('a');
                a.href = item.url;
                a.textContent = item.value;
                a.className = `message-text ${classNameItem}`;
                messageItem.appendChild(a);
            }

            messageContent.appendChild(messageItem);
        });

        //contextmenu
        messageContent.addEventListener('contextmenu',(event)=>{
            if(event.target.className.includes('message-text')){
                const menuButton = this.shadowRoot.querySelector('.menu-button');
                menuButton.click();
                this.EventEmit(event);
                event.preventDefault();
            }
        });
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
            else if (sceneType === 6){
                return {
                    name: 'TopRanker',
                    iconSymbol: `<img src='${url}' alt='Top Ranker'/>`, 
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

                // Add a title attribute for accessibility/hover info
                badgeElement.setAttribute('title', `${details.name} - Level ${badge.level}`);

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