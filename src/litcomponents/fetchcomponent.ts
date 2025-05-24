import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic';
  token: string;
  username: string;
  password: string;
}

export interface RequestConfig {
  name: string;
  url: string;
  method: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
  bodyType: 'json' | 'text' | 'form' | 'urlencoded';
  auth: AuthConfig;
}

@customElement('http-request-config')
export class HttpRequestConfig extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      color-scheme: light dark;
      
      /* Variables CSS para colores - Light theme (default) */
      --bg-primary: #ffffff;
      --bg-secondary: #f9fafb;
      --bg-tertiary: #f3f4f6;
      --border-color: #e5e7eb;
      --border-focus: #3b82f6;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
      --accent-primary: #3b82f6;
      --accent-hover: #2563eb;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --success: #059669;
      --shadow: rgba(0, 0, 0, 0.1);
      --shadow-focus: rgba(59, 130, 246, 0.1);
      --input-bg: #ffffff;
      --disabled-bg: #f9fafb;
      --disabled-text: #9ca3af;
    }

    /* Dark theme automático basado en prefers-color-scheme */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-primary: #111827;
        --bg-secondary: #1f2937;
        --bg-tertiary: #374151;
        --border-color: #374151;
        --border-focus: #60a5fa;
        --text-primary: #f9fafb;
        --text-secondary: #d1d5db;
        --text-muted: #9ca3af;
        --accent-primary: #60a5fa;
        --accent-hover: #3b82f6;
        --danger: #f87171;
        --danger-bg: #1f2937;
        --success: #34d399;
        --shadow: rgba(0, 0, 0, 0.3);
        --shadow-focus: rgba(96, 165, 250, 0.2);
        --input-bg: #1f2937;
        --disabled-bg: #374151;
        --disabled-text: #6b7280;
      }
    }

    /* Override manual para forzar dark theme */
    :host([theme="dark"]) {
      --bg-primary: #111827;
      --bg-secondary: #1f2937;
      --bg-tertiary: #374151;
      --border-color: #374151;
      --border-focus: #60a5fa;
      --text-primary: #f9fafb;
      --text-secondary: #d1d5db;
      --text-muted: #9ca3af;
      --accent-primary: #60a5fa;
      --accent-hover: #3b82f6;
      --danger: #f87171;
      --danger-bg: #1f2937;
      --success: #34d399;
      --shadow: rgba(0, 0, 0, 0.3);
      --shadow-focus: rgba(96, 165, 250, 0.2);
      --input-bg: #1f2937;
      --disabled-bg: #374151;
      --disabled-text: #6b7280;
    }

    /* Override manual para forzar light theme */
    :host([theme="light"]) {
      --bg-primary: #ffffff;
      --bg-secondary: #f9fafb;
      --bg-tertiary: #f3f4f6;
      --border-color: #e5e7eb;
      --border-focus: #3b82f6;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
      --accent-primary: #3b82f6;
      --accent-hover: #2563eb;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --success: #059669;
      --shadow: rgba(0, 0, 0, 0.1);
      --shadow-focus: rgba(59, 130, 246, 0.1);
      --input-bg: #ffffff;
      --disabled-bg: #f9fafb;
      --disabled-text: #9ca3af;
    }

    .config-panel {
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1.5rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      box-shadow: 0 1px 3px var(--shadow);
    }

    .input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s ease;
      width: 100%;
      box-sizing: border-box;
      background: var(--input-bg);
      color: var(--text-primary);
    }

    .input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--shadow-focus);
    }

    .input:disabled {
      background: var(--disabled-bg);
      color: var(--disabled-text);
      cursor: not-allowed;
    }

    .select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
      width: 100%;
      box-sizing: border-box;
      background: var(--input-bg);
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .select:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--shadow-focus);
    }

    .select option {
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
    }

    .url-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem;
      align-items: center;
    }

    .tabs {
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-nav {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .tab-button {
      padding: 0.5rem 0.25rem;
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-button.active {
      color: var(--accent-primary);
      border-bottom-color: var(--accent-primary);
    }

    .tab-button:hover:not(.active) {
      color: var(--text-primary);
    }

    .tab-content {
      min-height: 200px;
    }

    .key-value-editor {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .key-value-row {
      display: grid;
      grid-template-columns: auto 1fr 1fr auto;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem;
      background: var(--bg-secondary);
      border-radius: 0.375rem;
      border: 1px solid var(--border-color);
    }

    .checkbox {
      width: 1rem;
      height: 1rem;
      accent-color: var(--accent-primary);
    }

    .remove-btn {
      padding: 0.5rem;
      color: var(--danger);
      background: none;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 0.2s;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remove-btn:hover {
      background: var(--danger-bg);
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      color: var(--accent-primary);
      background: var(--bg-secondary);
      border: 1px dashed var(--accent-primary);
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }

    .add-btn:hover {
      background: var(--bg-tertiary);
      border-color: var(--accent-hover);
      color: var(--accent-hover);
    }

    .textarea {
      width: 100%;
      height: 150px;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      background: var(--input-bg);
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .textarea:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--shadow-focus);
    }

    .auth-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .visibility-toggle {
      padding: 0.25rem;
      color: var(--text-secondary);
      background: none;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: color 0.2s;
      margin-left: auto;
    }

    .visibility-toggle:hover {
      color: var(--text-primary);
    }

    .space-y-4 > * + * {
      margin-top: 1rem;
    }

    .no-body-message {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      border: 1px dashed var(--border-color);
    }

    /* Theme toggle button (opcional) */
    .theme-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.2s ease;
    }

    .theme-toggle:hover {
      background: var(--bg-tertiary);
    }

    @media (max-width: 768px) {
      .url-row {
        grid-template-columns: 1fr;
      }
      
      .auth-grid {
        grid-template-columns: 1fr;
      }
      
      .tab-nav {
        gap: 1rem;
        flex-wrap: wrap;
      }
      
      .key-value-row {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
    }
  `;

  @property({ type: Object }) 
  config: RequestConfig = this.getDefaultConfig();

  @property({ type: String })
  mode: 'create' | 'edit' = 'create';

  @property({ type: String, reflect: true })
  theme: 'auto' | 'light' | 'dark' = 'auto';

  @state() 
  private activeTab = 0;

  @state() 
  private showSensitive = false;

  private methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  
  private bodyTypes = [
    { value: 'json', label: 'JSON' },
    { value: 'text', label: 'Text' },
    { value: 'form', label: 'Form Data' },
    { value: 'urlencoded', label: 'URL Encoded' }
  ];

  private getDefaultConfig(): RequestConfig {
    return {
      name: '',
      url: '',
      method: 'GET',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: '',
      bodyType: 'json',
      auth: { type: 'none', token: '', username: '', password: '' }
    };
  }

  // Método para cambiar el tema manualmente
  toggleTheme() {
    const themes: ('auto' | 'light' | 'dark')[] = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.theme);
    this.theme = themes[(currentIndex + 1) % themes.length];
  }

  // Obtener el icono del tema actual
  private getThemeIcon(): string {
    switch (this.theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      default: return '🔄';
    }
  }

  // Métodos públicos existentes...
  getConfig(): RequestConfig {
    return { ...this.config };
  }

  setConfig(config: RequestConfig) {
    this.config = { ...config };
    this.requestUpdate();
  }

  reset() {
    this.config = this.getDefaultConfig();
    this.activeTab = 0;
    this.requestUpdate();
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.name.trim()) {
      errors.push('El nombre es requerido');
    }
    
    if (!this.config.url.trim()) {
      errors.push('La URL es requerida');
    }
    
    if (this.config.bodyType === 'json' && this.config.body.trim()) {
      try {
        JSON.parse(this.config.body);
      } catch {
        errors.push('El cuerpo JSON no es válido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private emitChange() {
    this.dispatchEvent(new CustomEvent('config-change', {
      detail: this.getConfig(),
      bubbles: true
    }));
  }

  private updateConfig(updates: Partial<RequestConfig>) {
    this.config = { ...this.config, ...updates };
    this.emitChange();
    this.requestUpdate();
  }

  private addKeyValue(type: 'headers' | 'params') {
    const newItem = { key: '', value: '', enabled: true };
    this.updateConfig({
      [type]: [...this.config[type], newItem]
    });
  }

  private updateKeyValue(type: 'headers' | 'params', index: number, field: keyof KeyValue, value: string | boolean) {
    const items = [...this.config[type]];
    items[index] = { ...items[index], [field]: value };
    this.updateConfig({ [type]: items });
  }

  private removeKeyValue(type: 'headers' | 'params', index: number) {
    const items = this.config[type].filter((_, i) => i !== index);
    this.updateConfig({ [type]: items });
  }

  private renderKeyValueEditor(items: KeyValue[], type: 'headers' | 'params', placeholder: string) {
    return html`
      <div class="key-value-editor">
        ${items.map((item, index) => html`
          <div class="key-value-row">
            <input
              type="checkbox"
              class="checkbox"
              .checked=${item.enabled}
              @change=${(e: Event) => this.updateKeyValue(type, index, 'enabled', (e.target as HTMLInputElement).checked)}
            />
            <input
              type="text"
              class="input"
              placeholder="Clave"
              .value=${item.key}
              @input=${(e: Event) => this.updateKeyValue(type, index, 'key', (e.target as HTMLInputElement).value)}
            />
            <input
              type=${this.showSensitive || !item.key.toLowerCase().includes('auth') ? 'text' : 'password'}
              class="input"
              placeholder="Valor"
              .value=${item.value}
              @input=${(e: Event) => this.updateKeyValue(type, index, 'value', (e.target as HTMLInputElement).value)}
            />
            <button
              class="remove-btn"
              @click=${() => this.removeKeyValue(type, index)}
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        `)}
        <button
          class="add-btn"
          @click=${() => this.addKeyValue(type)}
        >
          ＋ Agregar ${placeholder}
        </button>
      </div>
    `;
  }

  render() {
    return html`
      <div class="config-panel" style="position: relative;">
        <!-- Theme toggle button (opcional) -->
        <button
          class="theme-toggle"
          @click=${this.toggleTheme}
          title="Cambiar tema: ${this.theme}"
        >
          ${this.getThemeIcon()}
        </button>

        <!-- Información básica -->
        <div class="form-group">
          <label class="form-label">Nombre de la configuración</label>
          <input
            type="text"
            class="input"
            placeholder="Mi API Request"
            .value=${this.config.name}
            @input=${(e: Event) => this.updateConfig({ name: (e.target as HTMLInputElement).value })}
          />
        </div>

        <div class="form-group">
          <label class="form-label">Endpoint</label>
          <div class="url-row">
            <select
              class="select"
              .value=${this.config.method}
              @change=${(e: Event) => this.updateConfig({ method: (e.target as HTMLSelectElement).value })}
            >
              ${this.methods.map(method => html`
                <option value=${method}>${method}</option>
              `)}
            </select>
            
            <input
              type="text"
              class="input"
              placeholder="https://api.ejemplo.com/endpoint"
              .value=${this.config.url}
              @input=${(e: Event) => this.updateConfig({ url: (e.target as HTMLInputElement).value })}
            />
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <nav class="tab-nav">
            ${['Parámetros', 'Headers', 'Auth', 'Body'].map((tab, index) => html`
              <button
                class="tab-button ${classMap({ active: this.activeTab === index })}"
                @click=${() => { this.activeTab = index; }}
              >
                ${tab}
              </button>
            `)}
            <button
              class="visibility-toggle"
              @click=${() => { this.showSensitive = !this.showSensitive; }}
              title="Mostrar/ocultar valores sensibles"
            >
              ${this.showSensitive ? '🙈' : '👁️'}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          ${this.activeTab === 0 ? html`
            <div>
              <h3 class="form-label">Parámetros de Query</h3>
              ${this.renderKeyValueEditor(this.config.params, 'params', 'parámetro')}
            </div>
          ` : nothing}

          ${this.activeTab === 1 ? html`
            <div>
              <h3 class="form-label">Headers</h3>
              ${this.renderKeyValueEditor(this.config.headers, 'headers', 'header')}
            </div>
          ` : nothing}

          ${this.activeTab === 2 ? html`
            <div>
              <h3 class="form-label">Autenticación</h3>
              <div class="space-y-4">
                <select
                  class="select"
                  .value=${this.config.auth.type}
                  @change=${(e: Event) => {
                    this.updateConfig({
                      auth: { ...this.config.auth, type: (e.target as HTMLSelectElement).value as any }
                    });
                  }}
                >
                  <option value="none">Sin autenticación</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                </select>

                ${this.config.auth.type === 'bearer' ? html`
                  <input
                    type=${this.showSensitive ? 'text' : 'password'}
                    class="input"
                    placeholder="Token"
                    .value=${this.config.auth.token}
                    @input=${(e: Event) => {
                      this.updateConfig({
                        auth: { ...this.config.auth, token: (e.target as HTMLInputElement).value }
                      });
                    }}
                  />
                ` : nothing}

                ${this.config.auth.type === 'basic' ? html`
                  <div class="auth-grid">
                    <input
                      type="text"
                      class="input"
                      placeholder="Usuario"
                      .value=${this.config.auth.username}
                      @input=${(e: Event) => {
                        this.updateConfig({
                          auth: { ...this.config.auth, username: (e.target as HTMLInputElement).value }
                        });
                      }}
                    />
                    <input
                      type=${this.showSensitive ? 'text' : 'password'}
                      class="input"
                      placeholder="Contraseña"
                      .value=${this.config.auth.password}
                      @input=${(e: Event) => {
                        this.updateConfig({
                          auth: { ...this.config.auth, password: (e.target as HTMLInputElement).value }
                        });
                      }}
                    />
                  </div>
                ` : nothing}
              </div>
            </div>
          ` : nothing}

          ${this.activeTab === 3 && !['GET', 'HEAD'].includes(this.config.method) ? html`
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h3 class="form-label">Cuerpo de la petición</h3>
                <select
                  class="select"
                  style="width: auto;"
                  .value=${this.config.bodyType}
                  @change=${(e: Event) => {
                    this.updateConfig({ bodyType: (e.target as HTMLSelectElement).value as any });
                  }}
                >
                  ${this.bodyTypes.map(type => html`
                    <option value=${type.value}>${type.label}</option>
                  `)}
                </select>
              </div>
              <textarea
                class="textarea"
                placeholder=${this.config.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Contenido del cuerpo'}
                .value=${this.config.body}
                @input=${(e: Event) => {
                  this.updateConfig({ body: (e.target as HTMLTextAreaElement).value });
                }}
              ></textarea>
            </div>
          ` : nothing}

          ${this.activeTab === 3 && ['GET', 'HEAD'].includes(this.config.method) ? html`
            <div class="no-body-message">
              Los métodos ${this.config.method} no permiten cuerpo en la petición
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }
}