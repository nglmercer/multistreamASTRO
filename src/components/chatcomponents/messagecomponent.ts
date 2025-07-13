import { LitElement, html, css,type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Types
interface User {
  name: string;
  photo?: string;
  userBadges?: Badge[];
}

interface Badge {
  badgeSceneType: number;
  level?: number;
  url?: string;
  displayType?: number;
}

interface ContentItem {
  type: 'text' | 'image' | 'url';
  value: string;
  class?: string;
  title?: string;
  label?: string;
  alt?: string;
  url?: string;
}

interface MessageData {
  user: User;
  content: ContentItem[];
  containerClass?: string;
}

// Utility Functions
function getColorByChar(char: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const lowerChar = char.toLowerCase();
  const index = alphabet.indexOf(lowerChar);

  if (index === -1) return '#ff5733';

  const hue = (index / alphabet.length) * 360;
  const saturation = 85;
  const lightness = 45;

  return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
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

function getBadgeDetails(sceneType: number, { level, url }: { level?: number; url?: string }) {
  if (sceneType === 8) {
    return {
      name: 'Level',
      iconSymbol: '⭐' + level,
      cssClass: 'badge-level'
    };
  }
  else if (sceneType === 10) {
    return {
      name: 'Team Level',
      iconSymbol: '❤️' + level,
      cssClass: 'badge-team'
    };
  }
  else if (sceneType === 6 || sceneType === 4) {
    return {
      name: sceneType === 6 ? 'Top Ranker' : 'Subscriber',
      iconSymbol: `<img src='${url}' alt='${sceneType === 6 ? 'Top Ranker' : 'Subscriber'}' style='height: min(24px,100dvh);width: min(24px,100dvw);content-box: fill-box;object-fit: cover;'/>`,
      cssClass: 'badge-subscriber'
    };
  }
  else if (sceneType === 1) {
    return {
      name: 'Moderator',
      iconSymbol: `⚔️`,
      cssClass: 'badge-subscriber'
    };
  }
  else {
    return {
      name: 'Unknown Badge',
      iconSymbol: '❓',
      cssClass: 'badge-unknown'
    };
  }
}

// Chat Message Component
@customElement('chat-message')
export class ChatMessage extends LitElement {
  @property({ type: Object }) messageData: MessageData | null = null;
  @property({ type: Boolean }) autoHide = false;
  @property({ type: Number }) autoHideTimeout = 3000;

  @state() private _autoHideTimer: number | null = null;

  static styles = css`
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
      margin: 0;
      padding: 0;
      color: inherit;
    }

    .message-link {
      color: #64b5f6;
      text-decoration: none;
    }

    .message-link:hover {
      text-decoration: underline;
    }

    .message-image {
      height: 3rem;
      width: 3rem;
      object-fit: contain;
      margin: 0 2px;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.8em;
      font-weight: bold;
      color: white;
      height: 16px;
      line-height: 1;
    }

    .badge-level { background-color: #1E88E5; }
    .badge-team { background-color: #E53935; }
    .badge-subscriber { background-color: transparent; padding: 0; height: 18px; }
    .badge-subscriber img { height: 100%; width: auto; display: block; }
    .badge-unknown { background-color: #757575; }
    .badge-icon { margin-right: 2px; display: inline-block; }

    .menu-button {
      position: absolute;
      right: 4px;
      top: 4px;
      cursor: pointer;
      padding: 3px;
      background: none;
      border: none;
      font-size: 16px;
      color: #aaa;
      transition: color 0.2s;
      line-height: 1;
      z-index: 1;
    }

    .menu-button:hover {
      color: #fff;
    }

    :host(.highlighted-message) {
      background-color: #6A1B9A;
      color: #ffffff;
    }

    :host(.highlighted-message) .username-text,
    :host(.highlighted-message) .chat-message-text,
    :host(.highlighted-message) .event-item-name {
      color: #ffffff;
    }

    :host(.highlighted-message) .event-action-text,
    :host(.highlighted-message) .event-quantity-text {
      color: #e0e0e0;
    }

    :host(.highlighted-message) .timestamp-text {
      color: #c0c0c0;
    }

    :host(.highlighted-message) .menu-button {
      color: #e0e0e0;
    }

    :host(.highlighted-message) .menu-button:hover {
      color: #ffffff;
    }
  `;

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('autoHide') && this.autoHide) {
      this.setupAutoHide();
    }
  }

  private setupAutoHide() {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
    }
    this._autoHideTimer = window.setTimeout(() => {
      this.remove();
    }, this.autoHideTimeout);
  }

  private renderBadges(userBadges?: Badge[]) {
    if (!Array.isArray(userBadges) || userBadges.length === 0) {
      return html``;
    }

    const badgesHtml = userBadges.map(badge => {
      const details = getBadgeDetails(badge.badgeSceneType, badge);
      const level = badge.displayType || badge.level;
      
      return html`
        <div 
          class="badge ${details.cssClass}"
          title="${details.name} - Level ${level}"
        >
          <span class="badge-icon" aria-hidden="true">
            ${unsafeHTML(details.iconSymbol)}
          </span>
        </div>
      `;
    });

    return html`<div class="badges-container">${badgesHtml}</div>`;
  }

  private renderContentItem(item: ContentItem) {
    const itemClasses = classMap({
      'message-item': true,
      [item.class || '']: Boolean(item.class)
    });

    switch (item.type) {
      case 'image':
        return html`
          <img 
            class="message-image ${itemClasses}"
            src="${item.value}"
            alt="${item.alt || 'message image'}"
            title="${item.title || ''}"
          />
        `;
      case 'url':
        return html`
          <a 
            class="message-text message-link ${itemClasses}"
            href="${item.url}"
            title="${item.title || ''}"
          >
            ${item.value}
          </a>
        `;
      default:
        return html`
          <p 
            class="message-text ${itemClasses}"
            title="${item.title || ''}"
          >
            ${item.value}
          </p>
        `;
    }
  }

  private handleMenuClick(event: Event) {
    event.stopPropagation();
    this.emitMenuEvent(event);
  }

  private handleContextMenu(event: Event) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('message-text')) {
      this.emitMenuEvent(event);
      event.preventDefault();
    }
  }

  private emitMenuEvent(event: Event) {
    const menuEvent = new CustomEvent('message-menu', {
      detail: { ...this.messageData, element: event },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(menuEvent);
  }

  render() {
    if (!this.messageData) return html``;

    const { user, content, containerClass } = this.messageData;
    const bgColor = user.photo ? '' : getColorByChar(user.name.charAt(0));
    const initial = user.photo ? '' : user.name.charAt(0).toUpperCase();

    const avatarStyles = styleMap({
      backgroundColor: user.photo ? 'transparent' : bgColor,
      backgroundImage: user.photo ? `url(${user.photo})` : 'none'
    });

    const contentClasses = classMap({
      'message-content': true,
      [containerClass || '']: Boolean(containerClass)
    });

    return html`
      <div 
        class="avatar" 
        style="${avatarStyles}"
        role="img" 
        aria-label="User avatar"
        title="${user.name}"
      >
        ${user.photo ? '' : initial}
      </div>
      
      <div 
        class="${contentClasses}"
        @contextmenu="${this.handleContextMenu}"
      >
        ${this.renderBadges(user.userBadges)}
        ${content.map(item => this.renderContentItem(item))}
      </div>
      
      <button 
        class="menu-button"
        role="button"
        aria-haspopup="true"
        aria-expanded="false"
        @click="${this.handleMenuClick}"
      >
        ⋮
      </button>
    `;
  }

  setMessageData(data: MessageData) {
    this.messageData = data;
  }

  setAutoHide(timeout: number) {
    this.autoHideTimeout = timeout;
    this.autoHide = true;
  }

  getMessageData() {
    return this.messageData;
  }

  hide() {
    this.style.display = 'none';
  }
}

// Message Container Component
@customElement('message-container')
export class MessageContainer extends LitElement {
  @property({ type: String, attribute: 'wrapper-classes' }) wrapperClasses = '';
  @property({ type: String, attribute: 'wrapper-style' }) wrapperStyle = '';

  @query('#messagesWrapper') messagesWrapper!: HTMLDivElement;

  static styles = css`
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

    .maxh-5rem { max-height: 5rem !important; }
    .maxh-10rem { max-height: 10rem !important; }
    .maxh-15rem { max-height: 15rem !important; }
    .maxh-20rem { max-height: 20rem !important; }
    .maxh-25rem { max-height: 25rem !important; }
    .maxh-30rem { max-height: 30rem !important; }
  `;

  firstUpdated() {
    this.setupMutationObserver();
  }

  private setupMutationObserver() {
    const observer = new MutationObserver(() => {
      this.scrollToBottom();
    });
    observer.observe(this.messagesWrapper, { childList: true });
  }

  addMessage(messageData: MessageData, autoHide = false) {
    const message = document.createElement('chat-message') as ChatMessage;
    message.setMessageData(messageData);
    
    message.addEventListener('message-menu', (event:any) => {
      this.dispatchEvent(new CustomEvent('message-menu', {
        detail: event.detail,
        bubbles: true,
        composed: true
      }));
    });

    this.messagesWrapper.appendChild(message);
    this.scrollToBottom();
    
    if (autoHide) {
      message.setAutoHide(3000);
    }
  }

  scrollToBottom() {
    this.messagesWrapper.scrollTop = this.messagesWrapper.scrollHeight;
  }

  render() {
    const wrapperClasses = classMap({
      'messages-wrapper': true,
      [this.wrapperClasses]: Boolean(this.wrapperClasses)
    });

    const wrapperStyles = styleMap({
      ...(this.wrapperStyle ? { cssText: this.wrapperStyle } : {})
    });

    return html`
      <div 
        id="messagesWrapper"
        class="${wrapperClasses}"
        style="${wrapperStyles}"
      >
        <slot></slot>
      </div>
    `;
  }
}