// src/components/database-actions.ts
import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { 
  getAllDataFromDatabase,
  databases,
  importDataToDatabase, 
  type DatabaseConfig, 
  type OperationStatusDetail 
} from '@utils/idb';

/**
 * Clase base para componentes de acciones de base de datos
 */
abstract class DatabaseActionButton extends LitElement {
  /**
   * La clave (key) de la base de datos
   */
  @property({ type: String, attribute: 'db-key' })
  dbKey: string = '';

  /**
   * La configuración de la base de datos (alternativa al dbKey)
   */
  @property({ type: Object, attribute: false })
  databaseConfig: DatabaseConfig | null = null;

  /**
   * Texto del botón (opcional)
   */
  @property({ type: String })
  buttonText: string = '';

  /**
   * Clase CSS adicional para el botón
   */
  @property({ type: String, attribute: 'button-class' })
  buttonClass: string = '';

  /**
   * Si está deshabilitado externamente
   */
  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @state() protected isProcessing = false;
  @state() protected resolvedConfig: DatabaseConfig | null = null;

  /**
   * Inicializa la configuración cuando el componente se conecta
   */
  connectedCallback() {
    super.connectedCallback();
    this._initializeConfig();
  }

  /**
   * Se ejecuta después del primer render
   */
  firstUpdated() {
    this._initializeConfig();
  }

  /**
   * Resuelve la configuración de la base de datos cuando las propiedades cambian
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('dbKey') || changedProperties.has('databaseConfig')) {
      this._initializeConfig();
    }
  }

  /**
   * Inicializa la configuración basada en dbKey o databaseConfig
   */
  private _initializeConfig() {
    let newConfig: DatabaseConfig | null = null;
    
    if (this.dbKey) {
      const config = databases[this.dbKey];
      if (config) {
        newConfig = config;
      } else {
        console.warn(`La clave de base de datos '${this.dbKey}' no fue encontrada.`);
      }
    } else if (this.databaseConfig) {
      newConfig = this.databaseConfig;
    }
    
    // Solo actualizar si hay un cambio real
    if (this.resolvedConfig !== newConfig) {
      this.resolvedConfig = newConfig;
    }
  }

  /**
   * Obtiene la configuración actual (ya sea desde dbKey o databaseConfig)
   */
  protected get currentConfig(): DatabaseConfig | null {
    return this.resolvedConfig;
  }

  /**
   * Verifica si el botón debe estar deshabilitado
   */
  protected get isDisabled(): boolean {
    return !this.currentConfig || this.disabled || this.isProcessing;
  }

  /**
   * Emite un evento de estado de operación
   */
  protected _emitStatus(detail: OperationStatusDetail) {
    this.dispatchEvent(new CustomEvent('operation-status', {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Texto por defecto del botón (debe ser implementado por las subclases)
   */
  protected abstract get defaultButtonText(): string;

  /**
   * Clase CSS por defecto del botón (debe ser implementado por las subclases)
   */
  protected abstract get defaultButtonClass(): string;

  /**
   * Obtiene el texto del botón actual
   */
  protected get currentButtonText(): string {
    return this.buttonText || this.defaultButtonText;
  }

  /**
   * Obtiene la clase CSS del botón actual
   */
  protected get currentButtonClass(): string {
    return this.buttonClass || this.defaultButtonClass;
  }

  static styles = css`
    :host {
      display: inline-block;
      font-family: system-ui, -apple-system, sans-serif;
      color-scheme: light dark;
      
      /* Custom Properties - Light Theme (default) */
      --bg-primary: #ffffff;
      --bg-secondary: #fafafa;
      --bg-tertiary: #f8f9fa;
      --border-color: #e0e0e0;
      --border-input: #ccc;
      --text-primary: #333;
      --text-secondary: #555;
      --text-muted: #666;
      --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      
      /* Button Colors */
      --btn-primary: #007bff;
      --btn-primary-hover: #0056b3;
      --btn-success: #28a745;
      --btn-success-hover: #1e7e34;
      --btn-secondary: #6c757d;
      --btn-secondary-hover: #545b62;
      --btn-danger: #dc3545;
      --btn-danger-hover: #c82333;
    }

    /* Dark Theme */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #333333;
        --border-color: #404040;
        --border-input: #555;
        --text-primary: #e0e0e0;
        --text-secondary: #b0b0b0;
        --text-muted: #888;
        --shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
    }

    :host([disabled]) {
      pointer-events: none;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
      min-width: 120px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      font-weight: 500;
    }

    .btn-primary { 
      background: var(--btn-primary); 
      color: white; 
    }
    .btn-primary:hover:not(:disabled) { 
      background: var(--btn-primary-hover); 
    }

    .btn-success { 
      background: var(--btn-success); 
      color: white; 
    }
    .btn-success:hover:not(:disabled) { 
      background: var(--btn-success-hover); 
    }

    .btn-secondary { 
      background: var(--btn-secondary); 
      color: white; 
    }
    .btn-secondary:hover:not(:disabled) { 
      background: var(--btn-secondary-hover); 
    }

    .btn-danger { 
      background: var(--btn-danger); 
      color: white; 
    }
    .btn-danger:hover:not(:disabled) { 
      background: var(--btn-danger-hover); 
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    button:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
    }

    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .dialog-content {
      padding: 20px;
      background: var(--bg-primary);
      color: var(--text-primary);
      border-radius: 8px;
      min-width: 400px;
      max-width: 90vw;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
    }

    .dialog-content h4 {
      margin-top: 0;
      color: var(--text-primary);
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    input[type="file"] {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-input);
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      background: var(--bg-primary);
      color: var(--text-primary);
      transition: border-color 0.3s ease, background-color 0.3s ease;
    }

    input[type="file"]:focus {
      outline: none;
      border-color: var(--btn-primary);
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .button-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .file-info {
      background: var(--bg-tertiary);
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      font-size: 12px;
      color: var(--text-muted);
      border: 1px solid var(--border-color);
    }

    .hidden-input {
      display: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      button {
        min-width: auto;
        width: 100%;
      }
      
      .dialog-content {
        min-width: auto;
        width: 95vw;
        margin: 10px;
      }
      
      .button-group {
        flex-direction: column;
      }
    }

    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
}

@customElement('export-button')
export class ExportButton extends DatabaseActionButton {
  protected get defaultButtonText(): string {
    return 'Exportar';
  }

  protected get defaultButtonClass(): string {
    return 'btn-primary';
  }

  render() {
    return html`
      <button 
        class="${this.currentButtonClass}" 
        ?disabled="${this.isDisabled}"
        @click="${this._handleExport}" 
      >
        ${this.isProcessing ? html`<span class="loading"></span>Exportando...` : this.currentButtonText}
      </button>
    `;
  }

  private async _handleExport() {
    const currentConfig = this.currentConfig;
    if (!currentConfig || this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Emitir evento de inicio
    this.dispatchEvent(new CustomEvent('export-start', {
      detail: { databaseConfig: currentConfig },
      bubbles: true,
      composed: true
    }));
    
    try {
      const data = await getAllDataFromDatabase(currentConfig);
      
      const exportData = {
        database: currentConfig,
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        data: data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentConfig.name}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this._emitStatus({ 
        message: 'Base de datos exportada correctamente.', 
        type: 'success', 
        operation: 'export', 
        recordCount: data.length 
      });

      // Emitir evento de éxito
      this.dispatchEvent(new CustomEvent('export-success', {
        detail: { 
          databaseConfig: currentConfig,
          recordCount: data.length,
          exportData 
        },
        bubbles: true,
        composed: true
      }));

    } catch (error) {
      console.error('Error exportando base de datos:', error);
      this._emitStatus({ 
        message: 'Error al exportar la base de datos.', 
        type: 'error', 
        operation: 'export' 
      });

      // Emitir evento de error
      this.dispatchEvent(new CustomEvent('export-error', {
        detail: { 
          databaseConfig: currentConfig,
          error 
        },
        bubbles: true,
        composed: true
      }));

    } finally {
      this.isProcessing = false;
      
      // Emitir evento de finalización
      this.dispatchEvent(new CustomEvent('export-complete', {
        detail: { databaseConfig: currentConfig },
        bubbles: true,
        composed: true
      }));
    }
  }
}

@customElement('import-button')
export class ImportButton extends DatabaseActionButton {
  /**
   * Si mostrar el diálogo de confirmación (por defecto true)
   */
  @property({ type: Boolean, attribute: 'show-dialog' })
  showDialog: boolean = true;

  /**
   * Título personalizado para el diálogo
   */
  @property({ type: String, attribute: 'dialog-title' })
  dialogTitle: string = '';

  /**
   * Mensaje de advertencia personalizado
   */
  @property({ type: String, attribute: 'warning-message' })
  warningMessage: string = 'Esta acción reemplazará todos los datos existentes.';

  @state() private showImportDialog = false;
  @state() private importFile: File | null = null;

  protected get defaultButtonText(): string {
    return 'Importar';
  }

  protected get defaultButtonClass(): string {
    return 'btn-success';
  }

  render() {
    // Evitar renderizado si no hay configuración válida
    if (!this.currentConfig) {
      return html`<button disabled>Configuración no disponible</button>`;
    }

    const dialogTitle = this.dialogTitle || `Importar a ${this.currentConfig.name}`;

    return html`
      <button 
        class="${this.currentButtonClass}" 
        ?disabled="${this.isDisabled}"
        @click="${this._handleClick}" 
      >
        ${this.isProcessing ? html`<span class="loading"></span>Importando...` : this.currentButtonText}
      </button>

      ${this.showDialog && this.showImportDialog ? html`
        <dialog-container ?visible="${this.showImportDialog}" @close="${this._hideImportDialog}">
          <div class="dialog-content">
            <h4>${dialogTitle}</h4>
            <p><strong>Advertencia:</strong> ${this.warningMessage}</p>
            
            <div class="form-group">
              <label for="import-file">Seleccionar archivo JSON:</label>
              <input 
                type="file" 
                id="import-file"
                accept=".json"
                @change="${this._handleFileChange}"
              />
              ${this.importFile ? html`
                <div class="file-info">
                  <strong>Archivo:</strong> ${this.importFile.name}<br>
                  <strong>Tamaño:</strong> ${(this.importFile.size / 1024).toFixed(2)} KB
                </div>
              ` : ''}
            </div>

            <div class="button-group">
              <button 
                class="btn-success"
                @click="${this._handleImport}"
                ?disabled="${!this.importFile || this.isProcessing}"
              >
                ${this.isProcessing ? html`<span class="loading"></span>Importando...` : 'Confirmar Importación'}
              </button>
              <button 
                class="btn-secondary"
                @click="${this._hideImportDialog}"
                ?disabled="${this.isProcessing}"
              >
                Cancelar
              </button>
            </div>
          </div>
        </dialog-container>
      ` : ''}

      ${!this.showDialog ? html`
        <input 
          type="file" 
          class="hidden-input"
          accept=".json"
          @change="${this._handleDirectFileChange}"
        />
      ` : ''}
    `;
  }

  private _handleClick() {
    if (this.showDialog) {
      this._showImportDialog();
    } else {
      // Modo directo: abrir selector de archivos
      const fileInput = this.shadowRoot?.querySelector('.hidden-input') as HTMLInputElement;
      fileInput?.click();
    }
  }

  private async _handleImport() {
    const currentConfig = this.currentConfig;
    if (!this.importFile || !currentConfig || this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Emitir evento de inicio
    this.dispatchEvent(new CustomEvent('import-start', {
      detail: { 
        databaseConfig: currentConfig,
        file: this.importFile 
      },
      bubbles: true,
      composed: true
    }));
    
    try {
      const fileContent = await this.importFile.text();
      const importData = JSON.parse(fileContent);

      if (!importData.data || !Array.isArray(importData.data)) {
        throw new Error('Formato de archivo inválido. Se esperaba una propiedad "data" con un array.');
      }

      await importDataToDatabase(currentConfig, importData.data);
      
      this._emitStatus({
        message: `Base de datos importada. ${importData.data.length} registros procesados.`,
        type: 'success',
        operation: 'import',
        recordCount: importData.data.length
      });

      // Emitir evento de éxito
      this.dispatchEvent(new CustomEvent('import-success', {
        detail: { 
          databaseConfig: currentConfig,
          recordCount: importData.data.length,
          importData: importData.data
        },
        bubbles: true,
        composed: true
      }));

      this._hideImportDialog();
      
    } catch (error) {
      console.error('Error importando base de datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verifique el formato del archivo.';
      this._emitStatus({ 
        message: `Error al importar: ${errorMessage}`, 
        type: 'error', 
        operation: 'import' 
      });

      // Emitir evento de error
      this.dispatchEvent(new CustomEvent('import-error', {
        detail: { 
          databaseConfig: currentConfig,
          error,
          file: this.importFile
        },
        bubbles: true,
        composed: true
      }));

    } finally {
      this.isProcessing = false;
      
      // Emitir evento de finalización
      this.dispatchEvent(new CustomEvent('import-complete', {
        detail: { databaseConfig: currentConfig },
        bubbles: true,
        composed: true
      }));
    }
  }

  private _handleDirectFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.importFile = file;
      this._handleImport();
    }
  }
  
  private _showImportDialog() {
    this.showImportDialog = true;
    this.importFile = null; // Reset file on dialog open
  }

  private _hideImportDialog() {
    this.showImportDialog = false;
    this.importFile = null;
  }

  private _handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.importFile = target.files?.[0] || null;
  }
}
@customElement('database-actions')
export class DatabaseActions extends LitElement {
  /**
   * La configuración de la base de datos sobre la que se realizarán las acciones.
   * Si es null, los controles estarán deshabilitados.
   */
  @property({ type: Object, attribute: false })
  databaseConfig: DatabaseConfig | null = null;

  @state() private isExporting = false;
  @state() private isImporting = false;
  @state() private showImportDialog = false;
  @state() private importFile: File | null = null;

  static styles = css`
    :host {
        display: block;
        font-family: system-ui, -apple-system, sans-serif;
        color-scheme: light dark;
        
        /* Custom Properties - Light Theme (default) */
        --bg-primary: #ffffff;
        --bg-secondary: #fafafa;
        --bg-tertiary: #f8f9fa;
        --border-color: #e0e0e0;
        --border-input: #ccc;
        --text-primary: #333;
        --text-secondary: #555;
        --text-muted: #666;
        --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        
        /* Button Colors */
        --btn-primary: #007bff;
        --btn-primary-hover: #0056b3;
        --btn-success: #28a745;
        --btn-success-hover: #1e7e34;
        --btn-secondary: #6c757d;
        --btn-secondary-hover: #545b62;
    }

    /* Dark Theme */
    @media (prefers-color-scheme: dark) {
        :host {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #333333;
        --border-color: #404040;
        --border-input: #555;
        --text-primary: #e0e0e0;
        --text-secondary: #b0b0b0;
        --text-muted: #888;
        --shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
    }

    /* Force Light Theme Override */
    :host([theme="light"]) {
        color-scheme: light;
        --bg-primary: #ffffff;
        --bg-secondary: #fafafa;
        --bg-tertiary: #f8f9fa;
        --border-color: #e0e0e0;
        --border-input: #ccc;
        --text-primary: #333;
        --text-secondary: #555;
        --text-muted: #666;
        --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Force Dark Theme Override */
    :host([theme="dark"]) {
        color-scheme: dark;
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #333333;
        --border-color: #404040;
        --border-input: #555;
        --text-primary: #e0e0e0;
        --text-secondary: #b0b0b0;
        --text-muted: #888;
        --shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .section {
        margin-bottom: 30px;
        padding: 20px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        box-shadow: var(--shadow);
        transition: background-color 0.3s ease, border-color 0.3s ease;
    }

    .section h3 {
        margin-top: 0;
        color: var(--text-primary);
    }

    .form-group {
        margin-bottom: 20px;
    }

    label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--text-secondary);
    }

    input[type="file"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border-input);
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
        background: var(--bg-primary);
        color: var(--text-primary);
        transition: border-color 0.3s ease, background-color 0.3s ease;
    }

    input[type="file"]:focus {
        outline: none;
        border-color: var(--btn-primary);
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .button-group {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }

    button {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
        min-width: 120px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
    }

    .btn-primary { 
        background: var(--btn-primary); 
        color: white; 
    }
    .btn-primary:hover:not(:disabled) { 
        background: var(--btn-primary-hover); 
    }

    .btn-success { 
        background: var(--btn-success); 
        color: white; 
    }
    .btn-success:hover:not(:disabled) { 
        background: var(--btn-success-hover); 
    }

    .btn-secondary { 
        background: var(--btn-secondary); 
        color: white; 
    }
    .btn-secondary:hover:not(:disabled) { 
        background: var(--btn-secondary-hover); 
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
    }

    .loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .dialog-content {
        padding: 20px;
        background: var(--bg-primary);
        color: var(--text-primary);
        border-radius: 8px;
        min-width: 400px;
        max-width: 90vw;
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow);
    }

    .dialog-content h4 {
        margin-top: 0;
        color: var(--text-primary);
    }

    .file-info {
        background: var(--bg-tertiary);
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
        font-size: 12px;
        color: var(--text-muted);
        border: 1px solid var(--border-color);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .section {
        margin-bottom: 20px;
        padding: 15px;
        }
        
        .button-group {
        flex-direction: column;
        }
        
        button {
        min-width: auto;
        width: 100%;
        }
        
        .dialog-content {
        min-width: auto;
        width: 95vw;
        margin: 10px;
        }
    }

    /* High Contrast Mode Support */
    @media (prefers-contrast: high) {
        :host {
        --border-color: currentColor;
        --border-input: currentColor;
        }
        
        .section {
        border-width: 2px;
        }
        
        button {
        border: 2px solid transparent;
        }
        
        button:focus {
        border-color: currentColor;
        }
    }

    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
        * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        }
    }
    `;

  render() {
    const isDisabled = !this.databaseConfig;

    return html`
      <div class="section">
        <h3>Exportar ${this.databaseConfig?.name || 'Base de Datos'}</h3>
        <p>Exporta todos los datos de la base de datos seleccionada a un archivo JSON.</p>
        <div class="button-group">
          <button class="btn-primary" @click="${this._handleExport}" ?disabled="${isDisabled || this.isExporting}">
            ${this.isExporting ? html`<span class="loading"></span>Exportando...` : 'Exportar'}
          </button>
        </div>
      </div>

      <div class="section">
        <h3>Importar a ${this.databaseConfig?.name || 'Base de Datos'}</h3>
        <p>Importa datos desde un archivo JSON. Esto reemplazará todos los datos existentes.</p>
        <div class="button-group">
          <button class="btn-success" @click="${this._showImportDialog}" ?disabled="${isDisabled || this.isImporting}">
            Importar
          </button>
        </div>
      </div>

      <dialog-container ?visible="${this.showImportDialog}" @close="${this._hideImportDialog}">
        <div class="dialog-content">
            <h4>Importar a ${this.databaseConfig?.name}</h4>
            <p><strong>Advertencia:</strong> Esta acción cambiara todos los elementos anteriors.</p>
            
            <div class="form-group">
              <label for="import-file">Seleccionar archivo JSON:</label>
              <input 
                type="file" 
                id="import-file"
                accept=".json"
                @change="${this._handleFileChange}"
              />
              ${this.importFile ? html`
                <div class="file-info">
                  <strong>Archivo:</strong> ${this.importFile.name}<br>
                  <strong>Tamaño:</strong> ${(this.importFile.size / 1024).toFixed(2)} KB
                </div>
              ` : ''}
            </div>

            <div class="button-group">
              <button 
                class="btn-success"
                @click="${this._handleImport}"
                ?disabled="${!this.importFile || this.isImporting}"
              >
                ${this.isImporting ? html`<span class="loading"></span>Importando...` : 'Confirmar Importación'}
              </button>
              <button 
                class="btn-secondary"
                @click="${this._hideImportDialog}"
                ?disabled="${this.isImporting}"
              >
                Cancelar
              </button>
            </div>
          </div>
      </dialog-container>
    `;
  }
  
  private _emitStatus(detail: OperationStatusDetail) {
    this.dispatchEvent(new CustomEvent('operation-status', {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  private async _handleExport() {
    if (!this.databaseConfig) return;
    this.isExporting = true;
    
    try {
      const data = await getAllDataFromDatabase(this.databaseConfig);
      
      const exportData = {
        database: this.databaseConfig,
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        data: data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.databaseConfig.name}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this._emitStatus({ 
        message: 'Base de datos exportada correctamente.', 
        type: 'success', 
        operation: 'export', 
        recordCount: data.length 
      });
    } catch (error) {
      console.error('Error exportando base de datos:', error);
      this._emitStatus({ message: 'Error al exportar la base de datos.', type: 'error', operation: 'export' });
    } finally {
      this.isExporting = false;
    }
  }

  private async _handleImport() {
    if (!this.importFile || !this.databaseConfig) return;
    this.isImporting = true;
    
    try {
      const fileContent = await this.importFile.text();
      const importData = JSON.parse(fileContent);

      if (!importData.data || !Array.isArray(importData.data)) {
        throw new Error('Formato de archivo inválido. Se esperaba una propiedad "data" con un array.');
      }

      await importDataToDatabase(this.databaseConfig, importData.data);
      
      this._emitStatus({
        message: `Base de datos importada. ${importData.data.length} registros procesados.`,
        type: 'success',
        operation: 'import',
        recordCount: importData.data.length
      });
      this._hideImportDialog();
    } catch (error) {
      console.error('Error importando base de datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verifique el formato del archivo.';
      this._emitStatus({ message: `Error al importar: ${errorMessage}`, type: 'error', operation: 'import' });
    } finally {
      this.isImporting = false;
    }
  }
  
  private _showImportDialog() {
    this.showImportDialog = true;
    this.importFile = null; // Reset file on dialog open
  }

  private _hideImportDialog() {
    this.showImportDialog = false;
    this.importFile = null;
  }

  private _handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.importFile = target.files?.[0] || null;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'import-button': ImportButton;
    'export-button': ExportButton;
    'database-actions': DatabaseActions;
  }
}
