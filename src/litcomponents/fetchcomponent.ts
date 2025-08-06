import { LitElement, css, CSSResult,html, nothing } from 'lit';
import { property, state,customElement } from 'lit/decorators.js';
// http-request-config.ts - Componente de configuración extendido
import { classMap } from 'lit-html/directives/class-map.js';
import { BaseHttpComponent } from './fetch/fetchbase';
import type { KeyValue,RequestConfig, FieldConstraint, RequestTemplate, BodyTemplate, AuthConfig,FetchResult } from './fetch/types';

@customElement('http-request-config')
export class HttpRequestConfig extends BaseHttpComponent {
  static styles = [BaseHttpComponent.baseStyles];

  @state() 
  private activeTab = 0;
  
  @state() 
  private showSensitive = false;

  getConfig(): RequestConfig {
    return { ...this.config };
  }

setConfig(config: RequestConfig) {
  if (this.template) {
    this.config = this.getDefaultConfig();
    this.config = { ...this.config, ...config };
    this.applyTemplate();
  } else {
    this.config = { ...config };
  }
  
  this.validateAllFields();
  this.requestUpdate();
}

  private applyTemplate() {
    if (!this.template) return;

    // Aplicar configuración base del template
    if (this.template.baseConfig) {
      this.config = { ...this.config, ...this.template.baseConfig };
    }

    // Aplicar headers requeridos
    if (this.template.requiredHeaders) {
      // 🔥 CAMBIO: Filtrar headers que no son del template antes de agregar los nuevos
      const existingCustomHeaders = this.config.headers.filter(h => 
        !this.template?.requiredHeaders?.some(rh => rh.key === h.key)
      );
      
      // Combinar headers custom con los requeridos del template
      this.config.headers = [
        ...existingCustomHeaders,
        ...this.template.requiredHeaders.map(header => ({ ...header }))
      ];
    }

    // Aplicar body template
    if (this.template.bodyTemplate) {
      this.config.body = JSON.stringify(this.template.bodyTemplate.schema, null, 2);
      this.config.bodyType = 'json'; // Forzar tipo JSON para templates
    }
  }
  public changeTemplate(newTemplate: RequestTemplate | undefined) {
  const currentConfig = { ...this.config };
  this.template = newTemplate;
  
  if (newTemplate) {
    // Preservar solo algunos campos al cambiar template
    const preservedFields = {
      name: currentConfig.name || newTemplate.baseConfig.name || '',
      url: currentConfig.url || newTemplate.baseConfig.url || '',
    };
    
    this.setConfig(preservedFields as RequestConfig);
  } else {
    // Sin template, mantener configuración actual
    this.setConfig(currentConfig);
  }
}
  validate(): { isValid: boolean; errors: string[] } {
    this.validateAllFields();
    const errorMessages = Object.values(this.errors);
    
    return {
      isValid: errorMessages.length === 0,
      errors: errorMessages
    };
  }

  reset() {
    this.config = this.getDefaultConfig();
    this.errors = {};
    this.activeTab = 3;
    this.showSensitive = false;
    
    if (this.template) {
      this.applyTemplate();
    }
    
    this.requestUpdate();
  }

  private addKeyValue(type: 'headers' | 'params') {
    const newItem = { key: '', value: '', enabled: true };
    const constraint = this.getFieldConstraint(type);
    
    if (constraint?.type === 'readonly') return;
    
    const maxItems = type === 'params' ? this.template?.maxParams : undefined;
    if (maxItems && this.config[type].length >= maxItems) return;
    
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
    const isReadonly = this.isFieldReadonly(type);
    const maxItems = type === 'params' ? this.template?.maxParams : undefined;
    const canAdd = !isReadonly && (!maxItems || items.length < maxItems);

    return html`
      <div class="key-value-editor">
        ${items.map((item, index) => html`
          <div class="key-value-row" style="display: grid; grid-template-columns: auto 1fr 1fr auto; gap: 0.5rem; align-items: center; padding: 0.5rem; background: var(--bg-secondary); border-radius: 0.375rem; border: 1px solid var(--border-color); margin-bottom: 0.5rem;">
            <input
              type="checkbox"
              class="checkbox"
              .checked=${item.enabled}
              .disabled=${isReadonly}
              @change=${(e: Event) => this.updateKeyValue(type, index, 'enabled', (e.target as HTMLInputElement).checked)}
              style="width: 1rem; height: 1rem; accent-color: var(--accent-primary);"
            />
            <input
              type="text"
              class="input ${isReadonly ? 'readonly' : ''}"
              placeholder="Clave"
              .value=${item.key}
              .readOnly=${isReadonly}
              @input=${(e: Event) => this.updateKeyValue(type, index, 'key', (e.target as HTMLInputElement).value)}
            />
            <input
              type=${this.showSensitive || !item.key.toLowerCase().includes('auth') ? 'text' : 'password'}
              class="input ${isReadonly ? 'readonly' : ''}"
              placeholder="Valor"
              .value=${item.value}
              .readOnly=${isReadonly}
              @input=${(e: Event) => this.updateKeyValue(type, index, 'value', (e.target as HTMLInputElement).value)}
            />
            <button
              class="button danger"
              style="padding: 0.5rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"
              .disabled=${isReadonly}
              @click=${() => this.removeKeyValue(type, index)}
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        `)}
        ${canAdd ? html`
          <button
            class="button secondary"
            style="display: flex; align-items: center; gap: 0.5rem; border: 1px dashed var(--accent-primary); color: var(--accent-primary);"
            @click=${() => this.addKeyValue(type)}
          >
            ＋ Agregar ${placeholder}
          </button>
        ` : nothing}
      </div>
    `;
  }

  private renderBodyEditor() {
    if (['GET', 'HEAD'].includes(this.config.method)) {
      return html`
        <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: var(--bg-secondary); border-radius: 0.5rem; border: 1px dashed var(--border-color);">
          Los métodos ${this.config.method} no permiten cuerpo en la petición
        </div>
      `;
    }

    const bodyTemplate = this.template?.bodyTemplate;
    const isBodyReadonly = this.isFieldReadonly('body');

    if (bodyTemplate) {
      return this.renderTemplatedBodyEditor(bodyTemplate);
    }

    return html`
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
          <h3 class="form-label">Cuerpo de la petición</h3>
          <select
            class="select"
            style="width: auto;"
            .value=${this.config.bodyType}
            .disabled=${isBodyReadonly}
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
          class="textarea ${isBodyReadonly ? 'readonly' : ''} ${this.errors['body'] ? 'error' : ''}"
          placeholder=${this.config.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Contenido del cuerpo'}
          .value=${this.config.body}
          .readOnly=${isBodyReadonly}
          @input=${(e: Event) => {
            this.updateConfig({ body: (e.target as HTMLTextAreaElement).value });
          }}
        ></textarea>
        ${this.errors['body'] ? html`
          <div class="error-message">${this.errors['body']}</div>
        ` : nothing}
      </div>
    `;
  }

  private renderTemplatedBodyEditor(bodyTemplate: BodyTemplate) {
    let bodyData: any;
    try {
      bodyData = JSON.parse(this.config.body || '{}');
    } catch {
      bodyData = {};
    }

    return html`
      <div>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${bodyTemplate.editableFields.map(fieldPath => {
            const fieldType = bodyTemplate.fieldTypes[fieldPath];
            const currentValue = this.getNestedValue(bodyData, fieldPath);
            const error = this.errors[`body.${fieldPath}`];
            
                            return html`
              <div class="form-group">
                <label class="form-label">${fieldPath} (${fieldType})</label>
                ${this.renderTemplateField(fieldPath, fieldType, currentValue, bodyData)}
                ${error ? html`<div class="error-message">${error}</div>` : nothing}
              </div>
            `;
          })}
        </div>
        
        <div style="margin-top: 1rem;">
          <label class="form-label">Vista previa JSON</label>
          <textarea
            class="textarea readonly"
            .value=${JSON.stringify(bodyData, null, 2)}
            readonly
            style="min-height: 100px; font-size: 0.75rem;"
          ></textarea>
        </div>
      </div>
    `;
  }

  private renderTemplateField(fieldPath: string, fieldType: string, currentValue: any, bodyData: any) {
    const arrayItemType = this.template?.bodyTemplate?.arrayItemTypes?.[fieldPath];
    
    switch (fieldType) {
      case 'string':
        return html`
          <input
            type="text"
            class="input ${this.errors[`body.${fieldPath}`] ? 'error' : ''}"
            .value=${currentValue || ''}
            @input=${(e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              this.setNestedValue(bodyData, fieldPath, value);
              this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
            }}
          />
        `;
        
      case 'number':
        return html`
          <input
            type="number"
            class="input ${this.errors[`body.${fieldPath}`] ? 'error' : ''}"
            .value=${currentValue || 0}
            @input=${(e: Event) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              this.setNestedValue(bodyData, fieldPath, value);
              this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
            }}
          />
        `;
        
      case 'boolean':
        return html`
          <select
            class="select"
            .value=${currentValue ? 'true' : 'false'}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value === 'true';
              this.setNestedValue(bodyData, fieldPath, value);
              this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        `;
        
      case 'array':
        return this.renderArrayField(fieldPath, currentValue || [], arrayItemType || 'string', bodyData);
        
      case 'object':
        return html`
          <textarea
            class="textarea"
            style="min-height: 80px;"
            .value=${JSON.stringify(currentValue || {}, null, 2)}
            @input=${(e: Event) => {
              try {
                const value = JSON.parse((e.target as HTMLTextAreaElement).value);
                this.setNestedValue(bodyData, fieldPath, value);
                this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
              } catch (error) {
                // Mantener el valor actual si el JSON no es válido
              }
            }}
          ></textarea>
        `;
        
      default:
        return html`<span>Tipo no soportado: ${fieldType}</span>`;
    }
  }

  private renderArrayField(fieldPath: string, arrayValue: any[], itemType: string, bodyData: any) {
    return html`
      <div style="border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-weight: 500;">Array de ${itemType} (${arrayValue.length} elementos)</span>
          <button
            class="button secondary"
            style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
            @click=${() => {
              const newValue = this.getDefaultValueForType(itemType);
              const newArray = [...arrayValue, newValue];
              this.setNestedValue(bodyData, fieldPath, newArray);
              this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
            }}
          >
            + Agregar
          </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto;">
          ${arrayValue.map((item, index) => html`
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${this.renderArrayItemInput(item, itemType, (newValue) => {
                const newArray = [...arrayValue];
                newArray[index] = newValue;
                this.setNestedValue(bodyData, fieldPath, newArray);
                this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
              })}
              <button
                class="button danger"
                style="padding: 0.25rem 0.5rem; font-size: 0.75rem; min-width: 60px;"
                @click=${() => {
                  const newArray = arrayValue.filter((_, i) => i !== index);
                  this.setNestedValue(bodyData, fieldPath, newArray);
                  this.updateConfig({ body: JSON.stringify(bodyData, null, 2) });
                }}
              >
                ✕
              </button>
            </div>
          `)}
          
          ${arrayValue.length === 0 ? html`
            <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-style: italic;">
              Array vacío. Haz clic en "Agregar" para añadir elementos.
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private renderArrayItemInput(value: any, itemType: string, onChange: (value: any) => void) {
    switch (itemType) {
      case 'string':
        return html`
          <input
            type="text"
            class="input"
            style="flex: 1;"
            .value=${value}
            @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
          />
        `;
      case 'number':
        return html`
          <input
            type="number"
            class="input"
            style="flex: 1;"
            .value=${value}
            @input=${(e: Event) => onChange(parseFloat((e.target as HTMLInputElement).value))}
          />
        `;
      case 'boolean':
        return html`
          <select
            class="select"
            style="flex: 1;"
            .value=${value ? 'true' : 'false'}
            @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value === 'true')}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        `;
      default:
        return html`<span>Tipo no soportado</span>`;
    }
  }

  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return null;
    }
  }

  render() {
    const allowedMethods = this.template?.allowedMethods || this.methods;
    
    return html`
      <div class="panel" style="position: relative;">
        <!-- Theme toggle button -->
        <button
          class="button secondary"
          style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem; width: auto;"
          @click=${() => {
            const themes: ('auto' | 'light' | 'dark')[] = ['auto', 'light', 'dark'];
            const currentIndex = themes.indexOf(this.theme);
            this.theme = themes[(currentIndex + 1) % themes.length];
          }}
          title="Cambiar tema: ${this.theme}"
        >
          ${this.theme === 'light' ? '☀️' : this.theme === 'dark' ? '🌙' : '🔄'}
        </button>

        ${this.template ? html`
          <div style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; border-left: 4px solid var(--accent-primary);">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--accent-primary);">${this.template.name}</h3>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">${this.template.description}</p>
          </div>
        ` : nothing}

        <!-- Información básica -->
        <div class="form-group">
          <label class="form-label ${this.isFieldRequired('name') ? 'required' : ''}">Nombre de la configuración</label>
          <input
            type="text"
            class="input ${this.isFieldReadonly('name') ? 'readonly' : ''} ${this.errors['name'] ? 'error' : ''}"
            placeholder="Mi API Request"
            .value=${this.config.name}
            .readOnly=${this.isFieldReadonly('name')}
            @input=${(e: Event) => this.updateConfig({ name: (e.target as HTMLInputElement).value })}
          />
          ${this.errors['name'] ? html`<div class="error-message">${this.errors['name']}</div>` : nothing}
        </div>

        <div class="form-group">
          <label class="form-label ${this.isFieldRequired('url') ? 'required' : ''}">Endpoint</label>
          <div class="url-row" style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; align-items: center;">
            <select
              class="select"
              .value=${this.config.method}
              .disabled=${this.isFieldReadonly('method')}
              @change=${(e: Event) => this.updateConfig({ method: (e.target as HTMLSelectElement).value })}
            >
              ${allowedMethods.map(method => html`
                <option value=${method}>${method}</option>
              `)}
            </select>
            
            <input
              type="text"
              class="input ${this.isFieldReadonly('url') ? 'readonly' : ''} ${this.errors['url'] ? 'error' : ''}"
              placeholder="https://api.ejemplo.com/endpoint"
              .value=${this.config.url}
              .readOnly=${this.isFieldReadonly('url')}
              @input=${(e: Event) => this.updateConfig({ url: (e.target as HTMLInputElement).value })}
            />
          </div>
          ${this.errors['url'] ? html`<div class="error-message">${this.errors['url']}</div>` : nothing}
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <nav class="tab-nav">
            ${!this.isFieldHidden('params') ? html`
              <button
                class="tab-button ${this.activeTab === 0 ? 'active' : ''}"
                @click=${() => { this.activeTab = 0; }}
              >
                Parámetros
              </button>
            ` : nothing}
            
            ${!this.isFieldHidden('headers') ? html`
              <button
                class="tab-button ${this.activeTab === 1 ? 'active' : ''}"
                @click=${() => { this.activeTab = 1; }}
              >
                Headers
              </button>
            ` : nothing}
            
            ${!this.isFieldHidden('auth') ? html`
              <button
                class="tab-button ${this.activeTab === 2 ? 'active' : ''}"
                @click=${() => { this.activeTab = 2; }}
              >
                Auth
              </button>
            ` : nothing}
            
            ${!this.isFieldHidden('body') ? html`
              <button
                class="tab-button ${this.activeTab === 3 ? 'active' : ''}"
                @click=${() => { this.activeTab = 3; }}
              >
                Body
              </button>
            ` : nothing}
            
            <button
              class="button secondary"
              style="margin-left: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              @click=${() => { this.showSensitive = !this.showSensitive; }}
              title="Mostrar/ocultar valores sensibles"
            >
              ${this.showSensitive ? '🙈' : '👁️'}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="tab-content" style="min-height: 200px;">
          ${this.activeTab === 0 && !this.isFieldHidden('params') ? html`
            <div>
              <h3 class="form-label">Parámetros de Query</h3>
              ${this.renderKeyValueEditor(this.config.params, 'params', 'parámetro')}
              ${this.errors['params'] ? html`<div class="error-message">${this.errors['params']}</div>` : nothing}
            </div>
          ` : nothing}

          ${this.activeTab === 1 && !this.isFieldHidden('headers') ? html`
            <div>
              <h3 class="form-label">Headers</h3>
              ${this.renderKeyValueEditor(this.config.headers, 'headers', 'header')}
              ${this.errors['headers'] ? html`<div class="error-message">${this.errors['headers']}</div>` : nothing}
            </div>
          ` : nothing}

          ${this.activeTab === 2 && !this.isFieldHidden('auth') ? html`
            <div>
              <h3 class="form-label">Autenticación</h3>
              <div class="space-y-4">
                <select
                  class="select"
                  .value=${this.config.auth.type}
                  .disabled=${this.isFieldReadonly('auth')}
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
                    class="input ${this.isFieldReadonly('auth.token') ? 'readonly' : ''}"
                    placeholder="Token"
                    .value=${this.config.auth.token}
                    .readOnly=${this.isFieldReadonly('auth.token')}
                    @input=${(e: Event) => {
                      this.updateConfig({
                        auth: { ...this.config.auth, token: (e.target as HTMLInputElement).value }
                      });
                    }}
                  />
                ` : nothing}

                ${this.config.auth.type === 'basic' ? html`
                  <div class="auth-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <input
                      type="text"
                      class="input ${this.isFieldReadonly('auth.username') ? 'readonly' : ''}"
                      placeholder="Usuario"
                      .value=${this.config.auth.username}
                      .readOnly=${this.isFieldReadonly('auth.username')}
                      @input=${(e: Event) => {
                        this.updateConfig({
                          auth: { ...this.config.auth, username: (e.target as HTMLInputElement).value }
                        });
                      }}
                    />
                    <input
                      type=${this.showSensitive ? 'text' : 'password'}
                      class="input ${this.isFieldReadonly('auth.password') ? 'readonly' : ''}"
                      placeholder="Contraseña"
                      .value=${this.config.auth.password}
                      .readOnly=${this.isFieldReadonly('auth.password')}
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

          ${this.activeTab === 3 && !this.isFieldHidden('body') ? this.renderBodyEditor() : nothing}
        </div>
      </div>
    `;
  }
}