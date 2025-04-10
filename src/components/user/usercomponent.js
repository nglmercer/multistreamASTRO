if (!customElements.get('user-profile')) {

    const platformIcons = {
      twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
      
      youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
      
      tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>',
      
      kick: '<svg viewBox="0 0 933 300" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H100V66.6667H133.333V33.3333H166.667V0H266.667V100H233.333V133.333H200V166.667H233.333V200H266.667V300H166.667V266.667H133.333V233.333H100V300H0V0ZM666.667 0H766.667V66.6667H800V33.3333H833.333V0H933.333V100H900V133.333H866.667V166.667H900V200H933.333V300H833.333V266.667H800V233.333H766.667V300H666.667V0ZM300 0H400V300H300V0ZM533.333 0H466.667V33.3333H433.333V266.667H466.667V300H533.333H633.333V200H533.333V100H633.333V0H533.333Z"/></svg>',
      
      facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
    };
    const platformThemes = {
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
    function hexToRgb(hex) {
      let r = 0, g = 0, b = 0;
      // 3 digits
      if (hex.length == 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      }
      // 6 digits
      else if (hex.length == 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
      }
      return `${r}, ${g}, ${b}`;
    }
    
    
    class UserProfile extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    
        // Initialize static instances map if it doesn't exist
        if (!UserProfile.instances) {
          UserProfile.instances = new Map();
        }
    
        // Get the group identifier from the attribute
        const groupId = this.getAttribute('group-id');
    
        // If no group-id is provided, create a unique instance
        if (!groupId) {
          this._state = this.createInitialState();
          this.loadFromLocalStorage();
        } else {
          // Check if an instance for this group already exists
          if (!UserProfile.instances.has(groupId)) {
            // Create new instance for this group
            UserProfile.instances.set(groupId, {
              state: this.createInitialState(),
              elements: new Set()
            });
          }
    
          // Add this element to the group
          const group = UserProfile.instances.get(groupId);
          group.elements.add(this);
    
          // Load state from localStorage if exists for the group
          // Note: loadFromLocalStorage now correctly uses the group state
          const key = `userProfileState_${groupId}`;
          const savedState = localStorage.getItem(key);
          if (savedState) {
              const groupData = UserProfile.instances.get(groupId);
              groupData.state = { ...groupData.state, ...JSON.parse(savedState) };
          }
        }
    
        this.groupId = groupId;
        this.activeListeners = new Set();
        this.render();
        // No retornamos 'this' explícitamente en el constructor
      }
    
      createInitialState() {
        return {
          connected: false,
          username: '',
          imageUrl: '/favicon.svg', // Default icon path
          // language removed
          connectionStatus: 'offline',
          platform: 'tiktok' // Default platform
        };
      }
    
      static get observedAttributes() {
        return ['minimal', 'group-id'];
      }
    
      attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'minimal') {
          this.render();
        } else if (name === 'group-id' && oldValue !== newValue) {
          // Handle group-id change: remove from old group
          if (oldValue) {
            const oldGroup = UserProfile.instances.get(oldValue);
            if (oldGroup) {
              oldGroup.elements.delete(this);
              if (oldGroup.elements.size === 0) {
                UserProfile.instances.delete(oldValue);
                // Optionally remove localStorage for the empty group
                // localStorage.removeItem(`userProfileState_${oldValue}`);
              }
            }
          }
    
          // Handle group-id change: add to new group or become individual
          if (newValue) {
            if (!UserProfile.instances.has(newValue)) {
              UserProfile.instances.set(newValue, {
                state: this.createInitialState(), // Start with fresh state for new group
                elements: new Set()
              });
            }
            UserProfile.instances.get(newValue).elements.add(this);
            // Load state for the new group
            this.loadFromLocalStorage();
          } else {
            // Became an individual instance
            this._state = this.createInitialState();
            this.loadFromLocalStorage(); // Load individual state if any
          }
    
          this.groupId = newValue;
          this.render();
        }
      }
    
      get isMinimal() {
        return this.hasAttribute('minimal');
      }
    
      get state() {
        // If grouped, return the shared group state, otherwise return instance state
        return this.groupId
          ? UserProfile.instances.get(this.groupId)?.state // Use optional chaining for safety
          : this._state;
      }
    
      set state(value) {
         // Update the correct state object (group or instance)
        if (this.groupId) {
          const group = UserProfile.instances.get(this.groupId);
          if (group) {
            group.state = value;
          }
        } else {
          this._state = value;
        }
      }
    
      render() {
        // Ensure state exists before rendering
        if (!this.state) {
            console.error('UserProfile: State is undefined. Cannot render.');
            // Attempt to recover state if possible, or provide default
            if (this.groupId) {
                const group = UserProfile.instances.get(this.groupId);
                if (!group || !group.state) {
                    // Re-initialize group state if missing
                    UserProfile.instances.set(this.groupId, {
                        state: this.createInitialState(),
                        elements: group ? group.elements : new Set([this])
                    });
                     this.loadFromLocalStorage(); // Try loading again after re-init
                }
            } else {
                 this._state = this.createInitialState();
                 this.loadFromLocalStorage(); // Try loading again after re-init
            }
            // If state is still somehow missing, use a temporary default
            if(!this.state){
                 console.warn('UserProfile: Using temporary default state for rendering.');
                 this.state = this.createInitialState();
            }
        }
    
        // Determine image content (SVG icon or img tag)
        let imageContent = '';
        const usePlatformIcon = !this.state.imageUrl || this.state.imageUrl === '/favicon.svg';
    
        if (usePlatformIcon && platformIcons && platformIcons[this.state.platform]) {
          imageContent = `<div class='profile-image icon'>${platformIcons[this.state.platform]}</div>`;
        } else {
          const imageSrc = this.state.imageUrl || '/favicon.svg'; // Fallback image
          imageContent = `<img class="profile-image" src="${imageSrc}" alt="Profile"/>`;
        }
    
        // Get platform theme for styling (provide a fallback default theme)
        const defaultTheme = { color: '#1a1a2e', hoverColor: '#4d7cff', textColor: '#ffffff' };
        const platformTheme = (platformThemes && platformThemes[this.state.platform]) || defaultTheme;
    
        this.shadowRoot.innerHTML =/*html*/`
          <style>
            ${this.getStyles(platformTheme)}
          </style>
          <div class="container ${this.state.connected ? 'connected' : ''} ${this.isMinimal ? 'minimal' : ''}">
            <div class="profile-wrapper">
              ${imageContent}
              <div
                class="status-indicator"
                data-status="${this.state.connectionStatus}"
                title="Status: ${this.state.connectionStatus}"
              ></div>
            </div>
            <input
              type="text"
              placeholder="Enter your name"
              value="${this.state.username || ''}"
              ${this.state.connected ? 'disabled' : ''}
            />
            <button class="${this.state.connected ? 'connected' : ''}">
              ${this.state.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        `;
    
        this.setupEventListeners();
      }
    
    
      setupEventListeners() {
        // Remove previous listeners to prevent duplicates
        this.activeListeners.forEach(({ element, type, handler }) => {
          element.removeEventListener(type, handler);
        });
        this.activeListeners.clear();
    
        const button = this.shadowRoot.querySelector('button');
        const input = this.shadowRoot.querySelector('input');
    
        if (button && input) { // Ensure elements exist
          const buttonHandler = () => {
            if (this.state.connected) {
              this.disconnect();
            } else if (input.value.trim()) {
              this.connect(input.value.trim());
            }
          };
    
          const inputHandler = (e) => {
            // Update state directly - no need for separate method if simple
             this.state = { ...this.state, username: e.target.value };
             // Note: No need to save here, save happens on connect/disconnect/set methods
             // If real-time saving is needed on input, call this.saveToLocalStorage() here.
          };
    
          button.addEventListener('click', buttonHandler);
          input.addEventListener('input', inputHandler);
    
          // Keep track of listeners for cleanup
          this.activeListeners.add({ element: button, type: 'click', handler: buttonHandler });
          this.activeListeners.add({ element: input, type: 'input', handler: inputHandler });
        } else {
            console.error("UserProfile: Could not find button or input elements for event listeners.");
        }
      }
    
      updateGroupElements() {
        if (this.groupId) {
          const group = UserProfile.instances.get(this.groupId);
          if (group) {
            group.elements.forEach(element => {
              // Only re-render other elements in the group, not this one
              if (element !== this) {
                element.render();
              }
            });
          }
        }
      }
    
      getStyles(platformTheme) {
        // Use the helper function for hexToRgb
        const mainColorRgb = hexToRgb(platformTheme.color || '#1a1a2e');
        const hoverColorRgb = hexToRgb(platformTheme.hoverColor || '#4d7cff');
    
        return /*css*/`
            :host {
               display: block; /* Ensure the host element takes up space */
               width: fit-content; /* Adjust width based on content by default */
            }
            .container {
              display: grid;
              /* Default: Single column layout */
              grid-template-columns: 1fr;
              grid-template-rows: auto auto auto; /* Rows for image, input, button */
              gap: 15px; /* Adjusted gap */
              padding: 20px;
              background-color: ${platformTheme.color || '#1a1a2e'};
              border-radius: 8px;
              color: #fff;
              justify-items: center; /* Center items horizontally */
              align-items: center; /* Center items vertically */
              width: 250px; /* Default width */
              box-sizing: border-box;
            }
            .container.minimal {
              /* Minimal: Three columns layout */
              grid-template-columns: auto 1fr auto; /* Image, Input (flexible), Button */
              grid-template-rows: 1fr; /* Single row */
              gap: 8px;
              padding: 8px;
              background-color: transparent;
              width: auto; /* Let grid define width */
              border-radius: 25px; /* Rounded ends for minimal */
              background-color: ${platformTheme.color || '#1a1a2e'}; /* Minimal can have background too */
              min-width: 200px; /* Minimum width for minimal mode */
            }
    
            .profile-wrapper {
              position: relative;
              display: inline-block; /* Needed for absolute positioning of status */
              grid-row: 1 / 2; /* Place in first row (default) */
              grid-column: 1 / 2; /* Place in first col (default & minimal) */
              line-height: 0; /* Prevent extra space below image/icon */
            }
    
            .status-indicator {
              position: absolute;
              bottom: 5px; /* Adjust position */
              right: 5px; /* Adjust position */
              width: 15px; /* Default size */
              height: 15px; /* Default size */
              border-radius: 50%;
              border: 2px solid ${platformTheme.color || '#1a1a2e'};
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
    
            /* Status Colors */
            .status-indicator[data-status="offline"] { background-color: #808080; }
            .status-indicator[data-status="online"] { background-color: #4CAF50; }
            .status-indicator[data-status="away"] { background-color: #FFC107; }
            .status-indicator[data-status="busy"] { background-color: #f44336; }
    
            .profile-image {
              width: 100px; /* Default size */
              height: 100px; /* Default size */
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid ${platformTheme.color || '#1a1a2e'};
              box-shadow: 0 4px 12px rgba(${mainColorRgb}, 0.3);
              transition: all 0.3s ease;
              display: block; /* Prevents bottom space */
            }
             .profile-image.icon {
               display: flex; /* Center SVG inside */
               justify-content: center;
               align-items: center;
               background-color: rgba(${mainColorRgb}, 0.1); /* Slight background for icon */
               padding: 5px; /* Padding around SVG */
               box-sizing: border-box; /* Include padding/border in size */
             }
             .profile-image.icon svg {
                 width: 70%; /* Adjust SVG size within the div */
                 height: 70%;
                 fill: ${platformTheme.textColor || '#ffffff'}; /* Color the SVG */
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
              border-color: ${platformTheme.hoverColor || '#4d7cff'};
            }
    
            input {
              width: 100%; /* Take full grid cell width */
              padding: 10px; /* Default padding */
              background-color: rgba(0,0,0, 0.2); /* Slightly transparent background */
              border: 2px solid transparent; /* Start transparent */
              border-radius: 6px;
              color: #fff;
              font-size: 14px;
              transition: all 0.3s ease;
              box-sizing: border-box;
              grid-row: 2 / 3; /* Place in second row (default) */
              grid-column: 1 / 2; /* Place in first col (default) */
            }
            .container.minimal input {
              padding: 6px 10px;
              font-size: 13px;
              grid-row: 1 / 2; /* Place in first row (minimal) */
              grid-column: 2 / 3; /* Place in second col (minimal) */
              border-radius: 15px; /* Rounded to match container */
               background-color: rgba(0,0,0, 0.3);
            }
    
            input:focus {
              outline: none;
              border-color: ${platformTheme.hoverColor || '#4d7cff'};
              background-color: rgba(0,0,0, 0.3);
              box-shadow: 0 0 10px rgba(${hoverColorRgb}, 0.3);
            }
            input::placeholder {
              color: #bbb; /* Lighter placeholder */
              opacity: 0.8;
            }
            input:disabled {
              background-color: rgba(0,0,0, 0.1);
              border-color: transparent;
              color: #aaa;
              cursor: not-allowed;
              box-shadow: none;
            }
    
            button {
              width: 100%; /* Take full grid cell width */
              padding: 10px 20px; /* Default padding */
              background: linear-gradient(135deg, ${platformTheme.color || '#4d7cff'} 0%, ${platformTheme.hoverColor || '#3b5998'} 100%);
              color: ${platformTheme.textColor || 'white'};
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              grid-row: 3 / 4; /* Place in third row (default) */
              grid-column: 1 / 2; /* Place in first col (default) */
            }
            .container.minimal button {
              width: auto; /* Fit content */
              padding: 6px 12px;
              font-size: 12px;
              grid-row: 1 / 2; /* Place in first row (minimal) */
              grid-column: 3 / 4; /* Place in third col (minimal) */
              border-radius: 15px; /* Rounded */
            }
    
            button:hover {
              filter: brightness(1.1); /* Simple hover effect */
              transform: translateY(-1px);
              box-shadow: 0 4px 10px rgba(${mainColorRgb}, 0.3);
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
      }
    
      connect(username) {
          const newState = {
              ...this.state,
              connected: true,
              username: username,
              // Keep existing imageUrl unless it's the default placeholder
              imageUrl: (this.state.imageUrl === '/favicon.svg') ? this.state.imageUrl : this.state.imageUrl || '/favicon.svg',
              connectionStatus: 'online'
          };
          this.state = newState; // Update state (group or instance)
          this.saveToLocalStorage();
          this.render(); // Render this instance
          this.updateGroupElements(); // Update others in the group
          this.dispatchEvent(new CustomEvent('userConnected', {
              detail: { username: this.state.username, state: { ...this.state } } // Send a copy
          }));
      }
    
      disconnect() {
        const newState = {
            ...this.state,
            connected: false,
            // Keep username, but reset status. Keep image.
            // imageUrl: '/favicon.svg', // Optionally reset image on disconnect? Keep for now.
            connectionStatus: 'offline'
        };
        this.state = newState;
        this.saveToLocalStorage();
        this.render();
        this.updateGroupElements();
        this.dispatchEvent(new CustomEvent('userDisconnected'));
      }
    
      setPlatform(platform) {
        // Ensure platform exists in themes/icons if needed for validation
        if (platformThemes && platformThemes[platform]) {
             const newState = { ...this.state, platform: platform };
             // If not connected, maybe update the icon immediately
             if(!this.state.connected && (!this.state.imageUrl || this.state.imageUrl === '/favicon.svg')) {
                 // This logic is now handled directly in render()
             }
             this.state = newState;
             this.saveToLocalStorage();
             this.render();
             this.updateGroupElements();
        } else {
            console.warn(`UserProfile: Platform "${platform}" not recognized.`);
        }
      }
    
      setConnectionStatus(status) {
        if (['offline', 'online', 'away', 'busy'].includes(status)) {
          const newState = { ...this.state, connectionStatus: status };
          // If setting to offline, maybe also set connected to false?
          if (status === 'offline') {
              newState.connected = false;
          } else {
              // If status is online/away/busy, user should be considered connected
              newState.connected = true;
          }
          this.state = newState;
          this.saveToLocalStorage();
          this.render();
          this.updateGroupElements();
          this.dispatchEvent(new CustomEvent('connectionStatusChanged', {
            detail: { status: this.state.connectionStatus }
          }));
        }
      }
    
      setProfileImage(url) {
        const newState = { ...this.state, imageUrl: url || '/favicon.svg' }; // Use default if url is empty
        this.state = newState;
        this.saveToLocalStorage();
        this.render();
        this.updateGroupElements();
      }
    
      loadFromLocalStorage() {
        // Key depends on whether it's grouped or individual
        const key = this.groupId ? `userProfileState_${this.groupId}` : `userProfileState_${this.uniqueId}`; // Need a unique ID for individual instances if saving state
    
        // Create a unique ID for non-grouped instances if one doesn't exist
        if (!this.groupId && !this.uniqueId) {
            // Simple unique ID generator (can be improved)
            this.uniqueId = `instance_${Math.random().toString(36).substring(2, 9)}`;
        }
        const actualKey = this.groupId ? `userProfileState_${this.groupId}` : `userProfileState_${this.uniqueId}`;
    
        const savedState = localStorage.getItem(actualKey);
    
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            // Merge saved state with initial state to ensure all keys exist
            const initialState = this.createInitialState();
            const mergedState = { ...initialState, ...parsedState };
    
            // Assign merged state to the correct place (group or instance)
            this.state = mergedState; // Use the setter
    
          } catch (e) {
            console.error("Failed to parse saved state from localStorage:", e);
            // Optionally remove corrupted data: localStorage.removeItem(actualKey);
          }
        }
         // No saved state, state should already be initialized from constructor/attributeChanged
      }
    
      saveToLocalStorage() {
         // Ensure state exists before trying to save
         if (!this.state) {
             console.warn("UserProfile: Attempted to save undefined state.");
             return;
         }
    
        // Determine the correct key
        if (!this.groupId && !this.uniqueId) {
             // Assign a unique ID if saving an individual instance for the first time
            this.uniqueId = `instance_${Math.random().toString(36).substring(2, 9)}`;
        }
        const key = this.groupId ? `userProfileState_${this.groupId}` : `userProfileState_${this.uniqueId}`;
    
        try {
            // Save the current state (group or instance based on the getter)
            localStorage.setItem(key, JSON.stringify(this.state));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
        }
      }
    
      disconnectedCallback() {
        // Remove from group if applicable
        if (this.groupId) {
          const group = UserProfile.instances.get(this.groupId);
          if (group) {
            group.elements.delete(this);
            // If the group is now empty, remove it from the map
            if (group.elements.size === 0) {
              UserProfile.instances.delete(this.groupId);
              // Optionally remove localStorage for the empty group
              // localStorage.removeItem(`userProfileState_${this.groupId}`);
              console.log(`Removed empty group: ${this.groupId}`);
            }
          }
        }
    
        // Clean up event listeners
        this.activeListeners.forEach(({ element, type, handler }) => {
          element.removeEventListener(type, handler);
        });
        this.activeListeners.clear();
        console.log('UserProfile disconnected and cleaned up.');
      }
    }
    
    // Define the custom element (no wrapper needed)
    customElements.define('user-profile', UserProfile);
      }