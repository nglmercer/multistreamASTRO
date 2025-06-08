import { LitElement, html, css, type PropertyValues } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state } from 'lit/decorators.js';

interface DialogOption {
  label: string;
  class?: string;
  style?: string;
  callback?: (e: Event) => void;
}
interface PopupOption {
  html: string;
  callback?: (event: Event) => void;
}

export class DialogContent extends LitElement {
  static get properties() {
    return {
      title: { type: String, reflect: true },
      description: { type: String, reflect: true },
      theme: { type: String, reflect: true },
      options: { type: Array },
    };
  }

  title: string;
  description: string;
  theme: string;
  options: DialogOption[];

  constructor() {
    super();
    this.title = '';
    this.description = '';
    this.theme = 'light';
    this.options = [];
  }

  static get styles() {
    return css`
      :host {
        --dlg-padding: 1.5rem;
        --dlg-border-radius: 8px;
        --dlg-font-family: system-ui, -apple-system, sans-serif;
        --dlg-title-size: 1.5rem;
        --dlg-title-weight: 600;
        --dlg-desc-size: 1rem;
        --dlg-desc-opacity: 0.8;
        --dlg-desc-max-height: 500px;
        --dlg-button-padding: 0.5rem 1rem;
        --dlg-button-radius: 4px;
        --dlg-button-font-size: 0.875rem;
        --dlg-options-gap: 0.5rem;
        --dlg-slot-margin-top: 1rem;
        --transition-speed: 0.2s;

        --dlg-text-color: #1a1a1a;
        --dlg-border-color: #e5e5e5;
        --dlg-bg-color: #ffffff;
        --dlg-button-cancel-bg: #e5e5e5;
        --dlg-button-cancel-text: #1a1a1a;
        --dlg-button-cancel-hover-bg: #d9d9d9;

        --dlg-dark-text-color: #ffffff;
        --dlg-dark-border-color: #333333;
        --dlg-dark-bg-color: #2a2a2a;
        --dlg-dark-button-cancel-bg: #444444;
        --dlg-dark-button-cancel-text: #ffffff;
        --dlg-dark-button-cancel-hover-bg: #555555;

        --dlg-button-save-bg: #007bff;
        --dlg-button-save-text: white;
        --dlg-button-save-hover-bg: #0056b3;
        --dlg-button-delete-bg: #dc3545;
        --dlg-button-delete-text: white;
        --dlg-button-delete-hover-bg: #bd2130;

        display: block;
        font-family: var(--dlg-font-family);
      }

      .container {
        padding: var(--dlg-padding);
        border-radius: var(--dlg-border-radius);
        transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease, color var(--transition-speed) ease;
        border: 1px solid var(--dlg-border-color);
        background-color: var(--dlg-bg-color);
        color: var(--dlg-text-color);
      }

      .container.dark {
        border-color: var(--dlg-dark-border-color);
        background-color: var(--dlg-dark-bg-color);
        color: var(--dlg-dark-text-color);
      }

      .title {
        font-size: var(--dlg-title-size);
        font-weight: var(--dlg-title-weight);
        margin: 0 0 0.5rem 0;
      }

      .description {
        font-size: var(--dlg-desc-size);
        opacity: var(--dlg-desc-opacity);
        max-height: var(--dlg-desc-max-height);
        overflow-y: auto;
        margin: 0 0 1rem 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .options {
        display: flex;
        gap: var(--dlg-options-gap);
        flex-wrap: wrap;
        margin-top: var(--dlg-padding);
        justify-content: flex-end;
      }

      ::slotted(*) {
        display: block;
        margin-top: var(--dlg-slot-margin-top);
        margin-bottom: var(--dlg-slot-margin-top);
      }

      button {
        padding: var(--dlg-button-padding);
        border-radius: var(--dlg-button-radius);
        border: none;
        cursor: pointer;
        font-size: var(--dlg-button-font-size);
        font-family: inherit;
        transition: background-color var(--transition-speed) ease, opacity var(--transition-speed) ease;
        background-color: transparent;
        color: inherit;
        border: 1px solid transparent;
      }

      button:hover {
         opacity: 0.85;
      }

      .save-btn {
        background-color: var(--dlg-button-save-bg);
        color: var(--dlg-button-save-text);
        border-color: var(--dlg-button-save-bg);
      }
      .save-btn:hover {
        background-color: var(--dlg-button-save-hover-bg);
        border-color: var(--dlg-button-save-hover-bg);
        opacity: 1;
      }

      .cancel-btn {
        background-color: var(--dlg-button-cancel-bg);
        color: var(--dlg-button-cancel-text);
        border-color: var(--dlg-button-cancel-bg);
      }
      .cancel-btn:hover {
        background-color: var(--dlg-button-cancel-hover-bg);
        border-color: var(--dlg-button-cancel-hover-bg);
        opacity: 1;
      }
      .container.dark .cancel-btn {
        background-color: var(--dlg-dark-button-cancel-bg);
        color: var(--dlg-dark-button-cancel-text);
        border-color: var(--dlg-dark-button-cancel-bg);
      }
      .container.dark .cancel-btn:hover {
        background-color: var(--dlg-dark-button-cancel-hover-bg);
        border-color: var(--dlg-dark-button-cancel-hover-bg);
      }

      .delete-btn {
        background-color: var(--dlg-button-delete-bg);
        color: var(--dlg-button-delete-text);
        border-color: var(--dlg-button-delete-bg);
      }
      .delete-btn:hover {
        background-color: var(--dlg-button-delete-hover-bg);
        border-color: var(--dlg-button-delete-hover-bg);
        opacity: 1;
      }
    `;
  }

  render() {
    return html`
      <div class="container ${this.theme}">
        <h2 class="title">${this.title}</h2>
        <pre class="description">${this.description}</pre>
        <slot></slot>
        <div class="options">
          ${this.options.map((opt, i) => 
            html`<button 
              @click=${(e: Event) => this._handleOptionClick(e, i)}
              data-index="${i}"
              class="${opt.class || ''}"
              style="${opt.style || ''}"
            >${opt.label}</button>`
          )}
        </div>
      </div>
    `;
  }

  private _handleOptionClick(e: Event, index: number): void {
    if (this.options[index]?.callback && typeof this.options[index].callback === 'function') {
      this.options[index].callback!(e);
    } else {
      console.warn(`No valid callback found for option index ${index}`);
    }
  }
}

export class DialogContainer extends LitElement {
  static get properties() {
    return {
      visible: { type: Boolean, reflect: true },
      required: { type: Boolean, reflect: true }
    };
  }

  visible: boolean;
  required: boolean;

  constructor() {
    super();
    this.visible = false;
    this.required = false;
  }

  static get styles() {
    return css`
      :host {
        --overlay-bg: rgba(0, 0, 0, 0.5);
        --dlg-z-index: 1000;
        --transition-duration: 0.3s;
        --content-max-height: 90dvh;
        --content-border-radius: 16px;
        --content-padding: 8px;
        --content-bg: inherit;
        --content-color: inherit;

        display: block;
        background: inherit;
        color: inherit;
      }

      .dialog {
        position: fixed;
        inset: 0;
        background-color: var(--overlay-bg);

        display: flex;
        align-items: center;
        justify-content: center;

        z-index: var(--dlg-z-index);

        opacity: 0;
        visibility: hidden;

        transition: opacity var(--transition-duration) ease,
                    visibility var(--transition-duration) ease;
      }

      .dialog.visible {
        opacity: 1;
        visibility: visible;
      }
    `;
  }

  render() {
    return html`
      <div class="dialog ${this.visible ? 'visible' : ''}" @click="${this._handleOverlayClick}">
          <slot></slot>
      </div>
    `;
  }

  private _handleOverlayClick(e: Event): void {
    if (e.target === e.currentTarget && !this.required) {
      this.hide();
      this.emitClose();
    }
  }

  emitClose(): void {
    this.dispatchEvent(new CustomEvent('close'));
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}

@customElement('custom-popup')
export class CustomPopup extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      color-scheme: light dark;
      font-family: inherit;
    }
    
    .container {
      position: fixed;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      background-color: inherit;
      display: none;
      z-index: 1000;
      justify-content: center;
      flex-direction: column;
      min-width: inherit;
      width: 100%;
      max-width: min(300px, 100%);
      overflow: hidden;
      * {
        padding: 0;
        margin: 0;
        border-radius: 4px;
      }
    }
    .material-symbols-rounded {
      font-size: 48px;
      font-family: 'Material Symbols Outlined';
      opacity: 0.5;
    }
    .popup-option {
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      user-select: none;
      filter: contrast(200%) brightness(150%);
    }
    
    .popup-option:hover { 
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .default-font {
      font-family: sans-serif, Arial, Helvetica;
      font-size: 1.2rem;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-radius: 4px;
    }
    

    
    @media (prefers-color-scheme: dark) {
      .popup-option:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  `;

  @property({ type: Array })
  private _options: PopupOption[] = [];

  @state()
  private isVisible: boolean = false;

  @state()
  private posX: number = 0;

  @state()
  private posY: number = 0;

  private lastFocusedElement: HTMLElement | null = null;
  private handleClickOutsideBound: (event: MouseEvent) => void;

  constructor() {
    super();
    this.handleClickOutsideBound = this.handleClickOutside.bind(this);
  }

  // Getter and setter for options
  get options(): PopupOption[] {
    return this._options;
  }

  set options(newOptions: PopupOption[]) {
    this._options = [...newOptions];
    this.requestUpdate();
  }

  // Add a single option
  addOption(html: string, callback: (event: Event) => void): number {
    const wrappedCallback = (event: Event) => {
      callback(event);
      this.hide();
    };
    
    this._options.push({
      html,
      callback: wrappedCallback
    });
    
    this.requestUpdate();
    return this._options.length - 1;
  }

  // Set multiple options at once
  setOptions(options: { html: string; callback: (event: Event) => void }[]): void {
    this._options = options.map(option => ({
      html: option.html,
      callback: (event: Event) => {
        option.callback(event);
        this.hide();
      }
    }));
    
    this.requestUpdate();
  }

  // Clear all options
  clearOptions(): void {
    this._options = [];
    this.requestUpdate();
  }

  // Remove a specific option by index
  removeOption(index: number): boolean {
    if (index >= 0 && index < this._options.length) {
      this._options.splice(index, 1);
      this.requestUpdate();
      return true;
    }
    return false;
  }

  // Show the popup at specific coordinates
  show({x, y}: {x?: number, y?: number}): void {
    this.isVisible = true;
    
    if (x !== undefined && y !== undefined) {
      this.moveTo(x, y);
    }
    
    this.requestUpdate();
    
    // Add click outside listener after render
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutsideBound);
    }, 0);
  }

  // Hide the popup
  hide(): void {
    this.isVisible = false;
    this.requestUpdate();
    document.removeEventListener('click', this.handleClickOutsideBound);
  }

  // Move popup to specific coordinates
  moveTo(x: number, y: number): void {
    const container = this.shadowRoot?.querySelector('.container') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }
    
    this.posX = Math.max(0, x);
    this.posY = Math.max(0, y);
    this.requestUpdate();
  }

  // Show popup at a specific element
  showAtElement(element: HTMLElement): void {
    if (!element)return;
    const rect = element.getBoundingClientRect();
    const positions = {
      x: rect.left, 
      y: rect.bottom
    };
    console.log("showAtElement",element,positions)
    this.show(positions);
    this.lastFocusedElement = element;
  }

  // Handle click outside the popup
  handleClickOutside(event: MouseEvent): void {
    const path = event.composedPath();
    const container = this.shadowRoot?.querySelector('.container');
    
    if (
      container && 
      !path.includes(container) && 
      (!this.lastFocusedElement || !path.includes(this.lastFocusedElement))
    ) {
      this.hide();
    }
  }

  // Cleanup event listeners when element is removed
  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleClickOutsideBound);
  }

  // Update component when properties change
  updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    
    const container = this.shadowRoot?.querySelector('.container') as HTMLElement;
    if (container) {
      container.style.display = this.isVisible ? 'flex' : 'none';
      container.style.left = `${this.posX}px`;
      container.style.top = `${this.posY}px`;
    }
  }

  render() {
      return html`
        <div class="container">
          ${this._options.map((option) => html`
            <div class="popup-option" @click=${option.callback}>
              ${unsafeHTML(option.html)}
            </div>
          `)}
        </div>
      `;
    }
}

customElements.define('dialog-content', DialogContent);
customElements.define('dialog-container', DialogContainer);