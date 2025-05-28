import { LitElement, html, css,type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

interface PlatformTheme {
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

interface UserProfileState {
  connected: boolean;
  username: string;
  imageUrl: string;
  connectionStatus: 'offline' | 'online' | 'away' | 'busy';
  platform: 'twitch' | 'youtube' | 'tiktok' | 'kick' | 'facebook';
}

interface GroupInstance {
  state: UserProfileState;
  elements: Set<UserProfile>;
}

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

@customElement('user-profile')
export class UserProfile extends LitElement {
  @property({ type: Boolean })
  minimal = false;

  @property({ type: String, attribute: 'group-id' })
  groupId?: string;

  @state()
  private _currentState: UserProfileState = {
    connected: false,
    username: '',
    imageUrl: '/favicon.svg',
    connectionStatus: 'offline',
    platform: 'tiktok'
  };

  private static instances = new Map<string, GroupInstance>();
  private uniqueId?: string;

  static styles = css`
    :host {
      display: block;
      width: fit-content;
    }

    .container {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      gap: 15px;
      padding: 20px;
      border-radius: 8px;
      color: #fff;
      justify-items: center;
      align-items: center;
      width: 250px;
      box-sizing: border-box;
    }

    .container.minimal {
      grid-template-columns: auto 1fr auto;
      grid-template-rows: 1fr;
      gap: 8px;
      padding: 8px;
      background-color: transparent;
      width: auto;
      border-radius: 25px;
      min-width: 200px;
    }

    .profile-wrapper {
      position: relative;
      display: inline-block;
      grid-row: 1 / 2;
      grid-column: 1 / 2;
      line-height: 0;
    }

    .status-indicator {
      position: absolute;
      bottom: 5px;
      right: 5px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 2px solid var(--platform-color);
      transition: background-color 0.3s ease;
      box-sizing: border-box;
    }

    .container.minimal .status-indicator {
      width: 12px;
      height: 12px;
      bottom: 0;
      right: 0;
      border-width: 1.5px;
    }

    .status-indicator.offline { background-color: #808080; }
    .status-indicator.online { background-color: #4CAF50; }
    .status-indicator.away { background-color: #FFC107; }
    .status-indicator.busy { background-color: #f44336; }

    .profile-image {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--platform-color);
      box-shadow: 0 4px 12px var(--platform-shadow);
      transition: all 0.3s ease;
      display: block;
    }

    .profile-image.icon {
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--platform-background);
      padding: 5px;
      box-sizing: border-box;
    }

    .profile-image.icon svg {
      width: 70%;
      height: 70%;
      fill: var(--platform-text-color);
    }

    .container.minimal .profile-image {
      width: 36px;
      height: 36px;
      border-width: 2px;
    }

    .container.minimal .profile-image.icon svg {
      width: 60%;
      height: 60%;
    }

    .profile-image:hover {
      transform: scale(1.05);
      border-color: var(--platform-hover-color);
    }

    input {
      width: 100%;
      padding: 10px;
      background-color: rgba(0, 0, 0, 0.2);
      border: 2px solid transparent;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      transition: all 0.3s ease;
      box-sizing: border-box;
      grid-row: 2 / 3;
      grid-column: 1 / 2;
    }

    .container.minimal input {
      padding: 6px 10px;
      font-size: 13px;
      grid-row: 1 / 2;
      grid-column: 2 / 3;
      border-radius: 15px;
      background-color: rgba(0, 0, 0, 0.3);
    }

    input:focus {
      outline: none;
      border-color: var(--platform-hover-color);
      background-color: rgba(0, 0, 0, 0.3);
      box-shadow: 0 0 10px var(--platform-hover-shadow);
    }

    input::placeholder {
      color: #bbb;
      opacity: 0.8;
    }

    input:disabled {
      background-color: rgba(0, 0, 0, 0.1);
      border-color: transparent;
      color: #aaa;
      cursor: not-allowed;
      box-shadow: none;
    }

    button {
      width: 100%;
      padding: 10px 20px;
      background: var(--button-gradient);
      color: var(--platform-text-color);
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      grid-row: 3 / 4;
      grid-column: 1 / 2;
    }

    .container.minimal button {
      width: auto;
      padding: 6px 12px;
      font-size: 12px;
      grid-row: 1 / 2;
      grid-column: 3 / 4;
      border-radius: 15px;
    }

    button:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px var(--platform-shadow);
    }

    button:active {
      transform: translateY(0);
      filter: brightness(0.95);
    }

    button.connected {
      background: linear-gradient(135deg, #e94560 0%, #c23152 100%);
    }

    button.connected:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 10px rgba(233, 69, 96, 0.3);
    }
  `;

  constructor() {
    super();
    this.initializeState();
  }

  private initializeState(): void {
    if (!this.groupId) {
      this.loadFromLocalStorage();
    } else {
      if (!UserProfile.instances.has(this.groupId)) {
        UserProfile.instances.set(this.groupId, {
          state: this.createInitialState(),
          elements: new Set()
        });
      }

      const group = UserProfile.instances.get(this.groupId)!;
      group.elements.add(this);

      const key = `userProfileState_${this.groupId}`;
      const savedState = localStorage.getItem(key);
      if (savedState) {
        try {
          group.state = { ...group.state, ...JSON.parse(savedState) };
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }
    }
  }

  private createInitialState(): UserProfileState {
    return {
      connected: false,
      username: '',
      imageUrl: '/favicon.svg',
      connectionStatus: 'offline',
      platform: 'tiktok'
    };
  }

  private get currentState(): UserProfileState {
    if (this.groupId) {
      const group = UserProfile.instances.get(this.groupId);
      return group?.state || this.createInitialState();
    }
    return this._currentState;
  }

  private set currentState(value: UserProfileState) {
    if (this.groupId) {
      const group = UserProfile.instances.get(this.groupId);
      if (group) {
        group.state = value;
      }
    } else {
      this._currentState = value;
    }
    this.requestUpdate();
  }

  private hexToRgb(hex: string): string {
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

  private getCSSVariables(): Record<string, string> {
    const theme = platformThemes[this.currentState.platform] || platformThemes.tiktok;
    const mainColorRgb = this.hexToRgb(theme.color);
    const hoverColorRgb = this.hexToRgb(theme.hoverColor);

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

  private renderProfileImage() {
    const usePlatformIcon = !this.currentState.imageUrl || this.currentState.imageUrl === '/favicon.svg';
    
    if (usePlatformIcon && platformIcons[this.currentState.platform]) {
      return html`
        <div class="profile-image icon">
          ${unsafeHTML(platformIcons[this.currentState.platform])}
        </div>
      `;
    } else {
      return html`
        <img class="profile-image" src="${this.currentState.imageUrl || '/favicon.svg'}" alt="Profile"/>
      `;
    }
  }

  private handleConnect(): void {
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement;
    if (input?.value.trim()) {
      this.connect(input.value.trim());
    }
  }

  private handleDisconnect(): void {
    this.disconnect();
  }

  private handleInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.currentState = { ...this.currentState, username: target.value };
  }

  public connect(username: string): void {
    this.currentState = {
      ...this.currentState,
      connected: true,
      username: username,
      connectionStatus: 'online'
    };
    this.saveToLocalStorage();
    this.updateGroupElements();
    this.dispatchEvent(new CustomEvent('userConnected', {
      detail: { username: this.currentState.username, state: { ...this.currentState } }
    }));
  }

  public disconnect(): void {
    this.currentState = {
      ...this.currentState,
      connected: false,
      connectionStatus: 'offline'
    };
    this.saveToLocalStorage();
    this.updateGroupElements();
    this.dispatchEvent(new CustomEvent('userDisconnected'));
  }

  public setPlatform(platform: UserProfileState['platform']): void {
    if (platformThemes[platform]) {
      this.currentState = { ...this.currentState, platform };
      this.saveToLocalStorage();
      this.updateGroupElements();
    } else {
      console.warn(`UserProfile: Platform "${platform}" not recognized.`);
    }
  }

  public setConnectionStatus(status: UserProfileState['connectionStatus']): void {
    const newState = { ...this.currentState, connectionStatus: status };
    
    if (status === 'offline') {
      newState.connected = false;
    } else {
      newState.connected = true;
    }
    
    this.currentState = newState;
    this.saveToLocalStorage();
    this.updateGroupElements();
    this.dispatchEvent(new CustomEvent('connectionStatusChanged', {
      detail: { status: this.currentState.connectionStatus }
    }));
  }

  public setProfileImage(url: string): void {
    this.currentState = { ...this.currentState, imageUrl: url || '/favicon.svg' };
    this.saveToLocalStorage();
    this.updateGroupElements();
  }

  private updateGroupElements(): void {
    if (this.groupId) {
      const group = UserProfile.instances.get(this.groupId);
      if (group) {
        group.elements.forEach(element => {
          if (element !== this) {
            element.requestUpdate();
          }
        });
      }
    }
  }

  private loadFromLocalStorage(): void {
    if (!this.groupId && !this.uniqueId) {
      this.uniqueId = `instance_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    const key = this.groupId ? `userProfileState_${this.groupId}` : `userProfileState_${this.uniqueId}`;
    const savedState = localStorage.getItem(key);

    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const initialState = this.createInitialState();
        const mergedState = { ...initialState, ...parsedState };
        this.currentState = mergedState;
      } catch (e) {
        console.error("Failed to parse saved state from localStorage:", e);
      }
    }
  }

  private saveToLocalStorage(): void {
    if (!this.currentState) {
      console.warn("UserProfile: Attempted to save undefined state.");
      return;
    }

    if (!this.groupId && !this.uniqueId) {
      this.uniqueId = `instance_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    const key = this.groupId ? `userProfileState_${this.groupId}` : `userProfileState_${this.uniqueId}`;

    try {
      localStorage.setItem(key, JSON.stringify(this.currentState));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    
    if (changedProperties.has('groupId')) {
      this.initializeState();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    
    if (this.groupId) {
      const group = UserProfile.instances.get(this.groupId);
      if (group) {
        group.elements.delete(this);
        if (group.elements.size === 0) {
          UserProfile.instances.delete(this.groupId);
        }
      }
    }
  }

  render() {
    const containerClasses = {
      container: true,
      connected: this.currentState.connected,
      minimal: this.minimal
    };

    const statusClasses = {
      'status-indicator': true,
      [this.currentState.connectionStatus]: true
    };

    const buttonClasses = {
      connected: this.currentState.connected
    };

    return html`
      <div class=${classMap(containerClasses)} style=${styleMap(this.getCSSVariables())}>
        <div class="profile-wrapper">
          ${this.renderProfileImage()}
          <div 
            class=${classMap(statusClasses)}
            title="Status: ${this.currentState.connectionStatus}"
          ></div>
        </div>
        <input
          type="text"
          placeholder="Enter your name"
          .value=${this.currentState.username || ''}
          ?disabled=${this.currentState.connected}
          @input=${this.handleInputChange}
        />
        <button 
          class=${classMap(buttonClasses)}
          @click=${this.currentState.connected ? this.handleDisconnect : this.handleConnect}
        >
          ${this.currentState.connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    `;
  }
}