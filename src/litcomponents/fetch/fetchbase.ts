// types.ts - Definiciones de tipos base
import type { KeyValue,RequestConfig, FieldConstraint, RequestTemplate, BodyTemplate, AuthConfig,FetchResult } from './types';
// base-http-component.ts - Componente base abstracto
import { LitElement, css, CSSResult,html, nothing } from 'lit';
import { property, state,customElement } from 'lit/decorators.js';
// http-request-config.ts - Componente de configuración extendido
import { classMap } from 'lit-html/directives/class-map.js';
export abstract class BaseHttpComponent extends LitElement {
  // Estilos base compartidos
  static get baseStyles(): CSSResult {
    return css`
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
        --warning: #d97706;
        --shadow: rgba(0, 0, 0, 0.1);
        --shadow-focus: rgba(59, 130, 246, 0.1);
        --input-bg: #ffffff;
        --disabled-bg: #f9fafb;
        --disabled-text: #9ca3af;
      }

      /* Dark theme automático */
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
          --warning: #fbbf24;
          --shadow: rgba(0, 0, 0, 0.3);
          --shadow-focus: rgba(96, 165, 250, 0.2);
          --input-bg: #1f2937;
          --disabled-bg: #374151;
          --disabled-text: #6b7280;
        }
      }

      /* Override manual para temas */
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
        --warning: #fbbf24;
        --shadow: rgba(0, 0, 0, 0.3);
        --shadow-focus: rgba(96, 165, 250, 0.2);
        --input-bg: #1f2937;
        --disabled-bg: #374151;
        --disabled-text: #6b7280;
      }

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
        --warning: #d97706;
        --shadow: rgba(0, 0, 0, 0.1);
        --shadow-focus: rgba(59, 130, 246, 0.1);
        --input-bg: #ffffff;
        --disabled-bg: #f9fafb;
        --disabled-text: #9ca3af;
      }

      /* Componentes base */
      .panel {
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

      .input.readonly {
        background: var(--bg-secondary);
        border-style: dashed;
        cursor: default;
      }

      .input.error {
        border-color: var(--danger);
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
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

      .form-group {
        margin-bottom: 1rem;
      }

      .form-label {
        display: block;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
      }

      .form-label.required::after {
        content: " *";
        color: var(--danger);
      }

      .error-message {
        color: var(--danger);
        font-size: 0.75rem;
        margin-top: 0.25rem;
      }

      .button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
      }

      .button.primary {
        background: var(--accent-primary);
        color: white;
      }

      .button.primary:hover {
        background: var(--accent-hover);
      }

      .button.secondary {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .button.secondary:hover {
        background: var(--bg-tertiary);
      }

      .button.danger {
        background: var(--danger);
        color: white;
      }

      .button.danger:hover {
        background: #b91c1c;
      }

      .button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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

      .textarea {
        width: 100%;
        min-height: 150px;
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

      .textarea.readonly {
        background: var(--bg-secondary);
        border-style: dashed;
        cursor: default;
      }

      @media (max-width: 768px) {
        .panel {
          padding: 1rem;
        }
        
        .tab-nav {
          gap: 1rem;
          flex-wrap: wrap;
        }
      }
    `;
  }

  @property({ type: String, reflect: true })
  theme: 'auto' | 'light' | 'dark' = 'auto';

  @property({ type: Object })
  template?: RequestTemplate;

  @state()
  public config: RequestConfig = this.getDefaultConfig();

  @state()
  protected errors: Record<string, string> = {};

  protected methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  
  protected bodyTypes = [
    { value: 'json', label: 'JSON' },
    { value: 'text', label: 'Text' },
    { value: 'form', label: 'Form Data' },
    { value: 'urlencoded', label: 'URL Encoded' }
  ];

  protected getDefaultConfig(): RequestConfig {
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

  // Métodos de utilidad compartidos
  protected isFieldConstrained(fieldName: string): boolean {
    return this.template?.constraints[fieldName] !== undefined;
  }

  protected getFieldConstraint(fieldName: string): FieldConstraint | undefined {
    return this.template?.constraints[fieldName];
  }

  protected isFieldReadonly(fieldName: string): boolean {
    const constraint = this.getFieldConstraint(fieldName);
    return constraint?.type === 'readonly';
  }

  protected isFieldHidden(fieldName: string): boolean {
    const constraint = this.getFieldConstraint(fieldName);
    return constraint?.type === 'hidden';
  }

  protected isFieldRequired(fieldName: string): boolean {
    const constraint = this.getFieldConstraint(fieldName);
    return constraint?.type === 'required';
  }

  protected getFieldOptions(fieldName: string): string[] | undefined {
    const constraint = this.getFieldConstraint(fieldName);
    return constraint?.options;
  }

  protected validateField(fieldName: string, value: any): string | null {
    const constraint = this.getFieldConstraint(fieldName);
    if (!constraint) return null;

    if (constraint.type === 'required' && (!value || value.toString().trim() === '')) {
      return constraint.message || `${fieldName} es requerido`;
    }

    if (constraint.validator && !constraint.validator(value)) {
      return constraint.message || `${fieldName} no es válido`;
    }

    if (constraint.options && !constraint.options.includes(value)) {
      return constraint.message || `${fieldName} debe ser uno de: ${constraint.options.join(', ')}`;
    }

    return null;
  }

  protected updateConfig(updates: Partial<RequestConfig>) {
    this.config = { ...this.config, ...updates };
    this.validateAllFields();
    this.emitChange();
    this.requestUpdate();
  }

  protected validateAllFields(): void {
    this.errors = {};
    
    // Validar campos básicos
    Object.keys(this.template?.constraints || {}).forEach(fieldName => {
      const value = this.getFieldValue(fieldName);
      const error = this.validateField(fieldName, value);
      if (error) {
        this.errors[fieldName] = error;
      }
    });

    // Validar body template si existe
    if (this.template?.bodyTemplate && this.config.body) {
      this.validateBodyTemplate();
    }
  }

  protected getFieldValue(fieldName: string): any {
    // Obtener valor del campo desde config
    const parts = fieldName.split('.');
    let value: any = this.config;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  protected validateBodyTemplate(): void {
    try {
      const bodyData = JSON.parse(this.config.body);
      const template = this.template!.bodyTemplate!;
      
      template.editableFields.forEach(fieldPath => {
        const value = this.getNestedValue(bodyData, fieldPath);
        const fieldType = template.fieldTypes[fieldPath];
        const validator = template.validators?.[fieldPath];
        
        if (validator && !validator(value)) {
          this.errors[`body.${fieldPath}`] = `Campo ${fieldPath} no es válido`;
        }
        
        if (!this.validateFieldType(value, fieldType, fieldPath)) {
          this.errors[`body.${fieldPath}`] = `Campo ${fieldPath} debe ser de tipo ${fieldType}`;
        }
      });
    } catch (e) {
      this.errors['body'] = 'JSON no válido';
    }
  }

  protected validateFieldType(value: any, expectedType: string, fieldPath: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        if (!Array.isArray(value)) return false;
        // Validar tipo de elementos del array si está definido
        const arrayItemType = this.template?.bodyTemplate?.arrayItemTypes?.[fieldPath];
        if (arrayItemType) {
          return value.every(item => this.validateFieldType(item, arrayItemType, ''));
        }
        return true;
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  protected setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  protected emitChange() {
    this.dispatchEvent(new CustomEvent('config-change', {
      detail: { ...this.config },
      bubbles: true
    }));
  }

  // Métodos abstractos que deben implementar las clases hijas
  abstract getConfig(): RequestConfig;
  abstract setConfig(config: RequestConfig): void;
  abstract validate(): { isValid: boolean; errors: string[] };
  abstract reset(): void;

  // Método para ejecutar fetch (implementación base)
  protected async executeFetch(): Promise<FetchResult> {
    const startTime = Date.now();
    
    try {
      // Construir URL con parámetros
      const url = new URL(this.config.url);
      this.config.params
        .filter(p => p.enabled && p.key)
        .forEach(p => url.searchParams.append(p.key, p.value));

      // Construir headers
      const headers: Record<string, string> = {};
      this.config.headers
        .filter(h => h.enabled && h.key)
        .forEach(h => headers[h.key] = h.value);

      // Agregar auth header si está configurado
      if (this.config.auth.type === 'bearer' && this.config.auth.token) {
        headers['Authorization'] = `Bearer ${this.config.auth.token}`;
      } else if (this.config.auth.type === 'basic' && this.config.auth.username) {
        const credentials = btoa(`${this.config.auth.username}:${this.config.auth.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Preparar opciones de fetch
      const options: RequestInit = {
        method: this.config.method,
        headers
      };

      // Agregar body si no es GET/HEAD
      if (!['GET', 'HEAD'].includes(this.config.method) && this.config.body) {
        options.body = this.config.body;
      }

      // Ejecutar fetch
      const response = await fetch(url.toString(), options);
      const duration = Date.now() - startTime;

      // Procesar respuesta
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        duration
      };
    }
  }
}
