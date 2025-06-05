// user-profile.ts
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';

// Types
export interface PlatformTheme {
  color: string;
  hoverColor: string;
  textColor: string;
  states: {
    online: string;
    offline: string;
    away: string;
    busy: string;
  };
}
type platforms =  'twitch' | 'youtube' | 'tiktok' | 'kick' | 'facebook';
export interface UserProfileState {
  connected: boolean;
  username: string;
  imageUrl: string;
  connectionStatus: 'offline' | 'online' | 'away' | 'busy';
  platform: platforms;
}

// Custom Events
export class UserConnectedEvent extends CustomEvent<{ username: string; state: UserProfileState }> {
  constructor(detail: { username: string; state: UserProfileState }) {
    super('user-connected', { detail, bubbles: true, composed: true });
  }
}
export class UserConnectEvent extends CustomEvent<{ username: string; platform: platforms }> {
  constructor(detail: { username: string; platform: platforms }) {
    super('connect', { detail, bubbles: true, composed: true });
  }
}
export class UserDisconnectedEvent extends CustomEvent<void> {
  constructor() {
    super('user-disconnected', { bubbles: true, composed: true });
  }
}

export class ConnectionStatusChangedEvent extends CustomEvent<{ status: UserProfileState['connectionStatus'] }> {
  constructor(detail: { status: UserProfileState['connectionStatus'] }) {
    super('connection-status-changed', { detail, bubbles: true, composed: true });
  }
}

// Constants
const platformIcons: Record<string, string> = {
  twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>',
  kick: '<svg viewBox="0 0 933 300" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H100V66.6667H133.333V33.3333H166.667V0H266.667V100H233.333V133.333H200V166.667H233.333V200H266.667V300H166.667V266.667H133.333V233.333H100V300H0V0ZM666.667 0H766.667V66.6667H800V33.3333H833.333V0H933.333V100H900V133.333H866.667V166.667H900V200H933.333V300H833.333V266.667H800V233.333H766.667V300H666.667V0ZM300 0H400V300H300V0ZM533.333 0H466.667V33.3333H433.333V266.667H466.667V300H533.333H633.333V200H533.333V100H633.333V0H533.333Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
};

const platformThemes: Record<string, PlatformTheme> = {
  twitch: {
    color: '#9146FF',
    hoverColor: '#7C2BFF',
    textColor: '#FFFFFF',
    states: {
      online: 'live on Twitch!',
      offline: 'Go live on Twitch',
      away: 'Stream Paused',
      busy: 'Stream Ending Soon'
    }
  },
  youtube: {
    color: '#FF0000',
    hoverColor: '#CC0000',
    textColor: '#FFFFFF',
    states: {
      online: 'Live on YouTube!',
      offline: 'Go Live on YouTube',
      away: 'Stream Paused',
      busy: 'Ending Stream'
    }
  },
  tiktok: {
    color: '#000000',
    hoverColor: '#1a1a1a',
    textColor: '#FFFFFF',
    states: {
      online: 'Live on TikTok!',
      offline: 'Go Live on TikTok',
      away: 'Stream Paused',
      busy: 'Ending Stream'
    }
  },
  kick: {
    color: '#53FC18',
    hoverColor: '#45D614',
    textColor: '#000000',
    states: {
      online: 'live on Kick!',
      offline: 'Start live on Kick',
      away: 'Stream Paused',
      busy: 'Stream Ending Soon'
    }
  },
  facebook: {
    color: '#1877F2',
    hoverColor: '#0E5FC1',
    textColor: '#FFFFFF',
    states: {
      online: 'Live on',
      offline: 'Go Live',
      away: 'Stream Paused',
      busy: 'Ending Stream'
    }
  }
};

// Group Store Management
class GroupStoreManager {
  private static instance: GroupStoreManager;
  private groupStores = new Map<string, {
    state: UserProfileState;
    subscribers: Set<UserProfileComponent>;
    componentCount: number;
  }>();

  static getInstance(): GroupStoreManager {
    if (!GroupStoreManager.instance) {
      GroupStoreManager.instance = new GroupStoreManager();
    }
    return GroupStoreManager.instance;
  }

  createGroupStore(groupId: string, initialState: UserProfileState, component: UserProfileComponent) {
    if (this.groupStores.has(groupId)) {
      const store = this.groupStores.get(groupId)!;
      store.subscribers.add(component);
      store.componentCount++;
      return store;
    }

    // Try to load saved state
    const savedState = this.loadStateFromStorage(groupId);
    const finalState = savedState ? { ...initialState, ...savedState } : initialState;

    const store = {
      state: finalState,
      subscribers: new Set<UserProfileComponent>([component]),
      componentCount: 1
    };

    this.groupStores.set(groupId, store);
    return store;
  }

  updateGroupState(groupId: string, update: Partial<UserProfileState>) {
    const store = this.groupStores.get(groupId);
    if (!store) return;

    const prevState = { ...store.state };
    store.state = { ...store.state, ...update };
    
    // Save to localStorage
    this.saveStateToStorage(groupId, store.state);
    
    // Notify all subscribers
    store.subscribers.forEach(component => {
      component.syncWithGroupState(store.state, prevState);
    });
  }

  removeFromGroup(groupId: string, component: UserProfileComponent) {
    const store = this.groupStores.get(groupId);
    if (!store) return;

    store.subscribers.delete(component);
    store.componentCount--;

    if (store.componentCount <= 0) {
      this.groupStores.delete(groupId);
    }
  }

  getGroupState(groupId: string): UserProfileState | null {
    return this.groupStores.get(groupId)?.state || null;
  }

  private loadStateFromStorage(groupId: string): Partial<UserProfileState> | null {
    try {
      const saved = localStorage.getItem(`userProfileState_${groupId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load state from storage:', e);
      return null;
    }
  }

  private saveStateToStorage(groupId: string, state: UserProfileState) {
    try {
      localStorage.setItem(`userProfileState_${groupId}`, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to storage:', e);
    }
  }
}

// Utility functions
function hexToRgb(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return `${r}, ${g}, ${b}`;
}

function getCSSVariables(platform: string) {
  const theme = platformThemes[platform] || platformThemes.tiktok;
  const mainColorRgb = hexToRgb(theme.color);
  const hoverColorRgb = hexToRgb(theme.hoverColor);

  return {
    '--platform-color': theme.color,
    '--platform-hover-color': theme.hoverColor,
    '--platform-text-color': theme.textColor,
    '--platform-shadow': `rgba(${mainColorRgb}, 0.3)`,
    '--platform-hover-shadow': `rgba(${hoverColorRgb}, 0.3)`,
    '--platform-background': `rgba(${mainColorRgb}, 0.1)`,
    '--button-gradient': `linear-gradient(135deg, ${theme.color} 0%, ${theme.hoverColor} 100%)`
  };
}

@customElement('user-profile')
export class UserProfileComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .user-profile {
      width: 100%;
    }

    .container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      background: var(--platform-background, rgba(145, 70, 255, 0.1));
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .container.connected {
      border-color: var(--platform-color, #9146FF);
      box-shadow: 0 4px 12px var(--platform-shadow, rgba(145, 70, 255, 0.3));
    }

    .container.minimal {
      padding: 8px;
      gap: 8px;
    }

    .profile-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .profile-image {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--platform-color, #9146FF);
    }

    .profile-image.icon {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--platform-color, #9146FF);
      color: var(--platform-text-color, #FFFFFF);
    }

    .profile-image.icon svg {
      width: 24px;
      height: 24px;
    }

    .status-indicator {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-indicator.online {
      background: #10b981;
    }

    .status-indicator.offline {
      background: #6b7280;
    }

    .status-indicator.away {
      background: #f59e0b;
    }

    .status-indicator.busy {
      background: #ef4444;
    }

    .input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }

    .input:focus {
      outline: none;
      border-color: var(--platform-color, #9146FF);
    }

    .input:disabled {
      background: #f3f4f6;
      color: #6b7280;
      cursor: not-allowed;
    }

    .button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--button-gradient, linear-gradient(135deg, #9146FF 0%, #7C2BFF 100%));
      color: var(--platform-text-color, #FFFFFF);
    }

    .button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--platform-hover-shadow, rgba(124, 43, 255, 0.3));
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .button.connecting {
      opacity: 0.8;
      cursor: wait;
    }

    .button.connected {
      background: #ef4444;
    }

    .button.connected:hover:not(:disabled) {
      background: #dc2626;
    }
  `;

  // Public properties
  @property({ type: Boolean }) minimal = false;
  @property({ type: String, attribute: 'group-id' }) groupId?: string;
  @property({ type: String }) platform: 'twitch' | 'youtube' | 'tiktok' | 'kick' | 'facebook' = 'twitch';

  // Internal state
  @state() private _state: UserProfileState = {
    connected: false,
    username: '',
    imageUrl: '/favicon.svg',
    connectionStatus: 'offline',
    platform: 'twitch'
  };

  @state() private inputValue = '';
  @state() private isConnecting = false;

  @query('input') private inputElement!: HTMLInputElement;

  private groupStore?: any;
  private groupStoreManager = GroupStoreManager.getInstance();
  private uniqueId = Math.random().toString(36).substring(2, 9);

  connectedCallback() {
    super.connectedCallback();
    this.initializeState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.groupId) {
      this.groupStoreManager.removeFromGroup(this.groupId, this);
    }
  }

  private initializeState() {
    // Initialize state with platform
    this._state = {
      ...this._state,
      platform: this.platform
    };

    if (this.groupId) {
      // Use shared state
      this.groupStore = this.groupStoreManager.createGroupStore(this.groupId, this._state, this);
      this._state = { ...this.groupStore.state };
    }

    this.inputValue = this._state.username || '';
  }

  // Method called by GroupStoreManager to sync state
  syncWithGroupState(newState: UserProfileState, prevState: UserProfileState) {
    this._state = { ...newState };
    this.inputValue = newState.username || '';
    
    this.dispatchEvents(prevState, newState);
    this.requestUpdate();
  }

  private updateState(update: Partial<UserProfileState>) {
    const prevState = { ...this._state };
    
    if (this.groupId && this.groupStore) {
      // Update shared state
      this.groupStoreManager.updateGroupState(this.groupId, update);
    } else {
      // Update individual state
      this._state = { ...this._state, ...update };
      this.dispatchEvents(prevState, this._state);
      this.requestUpdate();
    }
  }

  private dispatchEvents(prevState: UserProfileState, newState: UserProfileState) {
    // Dispatch connection status change event
    if (prevState.connectionStatus !== newState.connectionStatus) {
      this.dispatchEvent(new ConnectionStatusChangedEvent({ status: newState.connectionStatus }));
    }

    // Dispatch user connected event
    if (!prevState.connected && newState.connected) {
      this.dispatchEvent(new UserConnectedEvent({ username: newState.username, state: newState }));
    }

    // Dispatch user disconnected event
    if (prevState.connected && !newState.connected) {
      this.dispatchEvent(new UserDisconnectedEvent());
    }
  }

  private async handleConnect() {
    const username = this.inputValue.trim();
    if (!username || this.isConnecting || this._state.connected) {
      return;
    }

    this.isConnecting = true;
    this.updateState({ connectionStatus: 'busy' });

    try {
      await this.connect(username);
    } catch (error) {
      console.error('Connection failed:', error);
      this.updateState({
        connected: false,
        connectionStatus: 'offline'
      });
    } finally {
      this.isConnecting = false;
    }
  }

  private handleButtonClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    
    if (this._state.connected) {
      this.disconnect();
    } else {
      this.handleConnect();
    }
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    this.inputValue = value;
    
    // Only update username in state if not connected
    if (!this._state.connected) {
      this.updateState({ username: value });
    }
  }

  // Public methods
  async connect(username: string) {
    console.log('Connecting to:', username, 'on platform:', this._state.platform);
    this.dispatchEvent(new UserConnectEvent({username,platform:this.platform}))
    // Simulate async connection
/*     await new Promise(resolve => setTimeout(resolve, 500));
    
    // Emit socket event (if socket is available)
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.emit('join-platform', { 
        uniqueId: username, 
        platform: this._state.platform 
      });
    }
    
    this.updateState({
      connected: true,
      username: username,
      connectionStatus: 'online'
    }); */
  }

  disconnect() {
    console.log('Disconnecting from:', this._state.platform);
    
    this.updateState({
      connected: false,
      connectionStatus: 'offline'
    });
  }

  setPlatform(platform: UserProfileState['platform']) {
    if (platformThemes[platform]) {
      this.updateState({ platform });
    } else {
      console.warn(`Platform "${platform}" not recognized.`);
    }
  }

  setConnectionStatus(status: UserProfileState['connectionStatus']) {
    this.updateState({
      connectionStatus: status,
      connected: status !== 'offline'
    });
  }

  setProfileImage(url: string) {
    this.updateState({ imageUrl: url || '/favicon.svg' });
  }

  getState(): UserProfileState {
    return { ...this._state };
  }

  private renderProfileImage() {
    const usePlatformIcon = !this._state.imageUrl || this._state.imageUrl === '/favicon.svg';
    
    if (usePlatformIcon && platformIcons[this._state.platform]) {
      return html`
        <div class="profile-image icon">
          ${unsafeHTML(platformIcons[this._state.platform])}
        </div>
      `;
    } else {
      return html`
        <img 
          class="profile-image" 
          src="${this._state.imageUrl || '/favicon.svg'}" 
          alt="Profile"
        />
      `;
    }
  }

  private getButtonText() {
    if (this.isConnecting) {
      return 'Connecting...';
    }
    return this._state.connected ? 'Disconnect' : 'Connect';
  }

  private isButtonDisabled() {
    if (this.isConnecting) {
      return true;
    }
    
    if (this._state.connected) {
      return false;
    } else {
      return this.inputValue.trim().length === 0;
    }
  }

  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    // Update platform if prop changed
    if (changedProperties.has('platform') && this.platform !== this._state.platform) {
      this.setPlatform(this.platform);
    }
  }

  render() {
    const containerClasses = {
      container: true,
      connected: this._state.connected,
      disconnected: !this._state.connected,
      minimal: this.minimal
    };

    const statusClasses = {
      'status-indicator': true,
      [this._state.connectionStatus]: true
    };

    const buttonClasses = {
      button: true,
      connected: this._state.connected,
      connecting: this.isConnecting
    };

    return html`
      <div class="user-profile">
        <div 
          class=${classMap(containerClasses)} 
          style=${styleMap(getCSSVariables(this._state.platform))}
        >
          <div class="profile-wrapper">
            ${this.renderProfileImage()}
            <div 
              class=${classMap(statusClasses)}
              title="Status: ${this._state.connectionStatus}"
            ></div>
          </div>
          <input
            class="input"
            type="text"
            placeholder="Enter your name"
            .value=${this.inputValue}
            ?disabled=${this._state.connected}
            @input=${this.handleInputChange}
          />
          <button 
            class=${classMap(buttonClasses)}
            @click=${this.handleButtonClick}
            ?disabled=${this.isButtonDisabled()}
            type="button"
          >
            ${this.getButtonText()}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'user-profile': UserProfileComponent;
  }
}