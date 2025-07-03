import { LitElement, html, css, type TemplateResult, type CSSResultGroup } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { ConfigurableReplacer, type ReplacementConfig, type ReplacementOption } from '@components/replace/ConfigurableReplacer';
import { ObjectTableLit, type EventDetail } from './tables';

// Interfaces para el componente
interface ReplacementItem {
  id: number;
  pattern: string;
  dataKey: string;
  defaultValue: string;
}

interface ReplacerConfigProps {
  replacements?: ReplacementConfig;
  removeBackslashes?: boolean;
  useLocalStorage?: boolean;
  instanceId?: string;
  onReplacementsChange?: (replacements: ReplacementItem[]) => void;
  onRemoveBackslashesChange?: (value: boolean) => void;
  onUseLocalStorageChange?: (value: boolean) => void;
  onInstanceIdChange?: (value: string) => void;
}

@customElement('replacer-config-form')
export class ReplacerConfigForm extends LitElement {
  @property({ type: Array })
  replacements: ReplacementItem[] = [];

  @property({ type: Boolean })
  removeBackslashes: boolean = true;

  @property({ type: Boolean })
  useLocalStorage: boolean = true;

  @property({ type: String })
  instanceId: string = 'default';

  @state()
  private _tableData: ReplacementItem[] = [];

  @state()
  private _tableKeys: string[] = ['pattern', 'dataKey', 'defaultValue'];

  // Referencias a los elementos de la tabla
  private _tableRef?: ObjectTableLit;

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      
      /* Variables CSS para temas */
      --primary-color: #007bff;
      --success-color: #28a745;
      --warning-color: #ffc107;
      --info-color: #17a2b8;
      --danger-color: #dc3545;
      --light-color: #f8f9fa;
      --dark-color: #343a40;
      --border-color: #dee2e6;
      --border-radius: 4px;
      --box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      --transition: all 0.2s ease-in-out;
    }

    .config-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .config-section {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      margin-bottom: 20px;
      box-shadow: var(--box-shadow);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
      background: var(--light-color);
      border-radius: var(--border-radius) var(--border-radius) 0 0;
    }

    .section-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--dark-color);
    }

    .action-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .button {
      padding: 8px 16px;
      border: none;
      border-radius: var(--border-radius);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .button:active {
      transform: translateY(0);
    }

    .button-success {
      background-color: var(--success-color);
      color: white;
    }

    .button-success:hover {
      background-color: #218838;
    }

    .button-warning {
      background-color: var(--warning-color);
      color: #212529;
    }

    .button-warning:hover {
      background-color: #e0a800;
    }

    .button-info {
      background-color: var(--info-color);
      color: white;
    }

    .button-info:hover {
      background-color: #138496;
    }

    .button-danger {
      background-color: var(--danger-color);
      color: white;
    }

    .button-danger:hover {
      background-color: #c82333;
    }

    .replacements-container {
      padding: 20px;
    }

    .no-replacements {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
      font-style: italic;
    }

    .table-container {
      margin-top: 20px;
    }

    obj-table {
      width: 100%;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 15px;
      align-items: end;
      padding: 15px;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      margin-bottom: 10px;
      background: #f8f9fa;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-weight: 500;
      margin-bottom: 5px;
      color: var(--dark-color);
      font-size: 0.875rem;
    }

    .form-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      font-size: 0.875rem;
      transition: var(--transition);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .form-input-mono {
      font-family: 'Courier New', Consolas, monospace;
    }

    @media (max-width: 768px) {
      .section-header {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
      }

      .action-buttons {
        justify-content: center;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }
  `;

  constructor() {
    super();
    this._initializeData();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._setupTableEvents();
  }

  private _initializeData(): void {
    this._updateTableData();
  }

  private _setupTableEvents(): void {
    // @ts-ignore
    this.addEventListener('action', this._handleTableAction.bind(this));
  }

  private _handleTableAction(event: CustomEvent<EventDetail>): void {
    const { originalAction, item, index } = event.detail;
    
    switch (originalAction) {
      case 'edit':
        this._editReplacement(item as ReplacementItem, index);
        break;
      case 'delete':
        this._removeReplacement((item as ReplacementItem).id);
        break;
      default:
        console.log(`Acción no manejada: ${originalAction}`, item);
    }
  }

  private _editReplacement(item: ReplacementItem, index: number): void {
    // Aquí podrías abrir un modal de edición o hacer la fila editable
    // Por simplicidad, mostraremos un prompt
    const newPattern = prompt('Nuevo patrón:', item.pattern);
    if (newPattern !== null) {
      const newDataKey = prompt('Nueva clave de datos:', item.dataKey);
      if (newDataKey !== null) {
        const newDefaultValue = prompt('Nuevo valor por defecto:', item.defaultValue);
        if (newDefaultValue !== null) {
          this._updateReplacement(item.id, {
            pattern: newPattern,
            dataKey: newDataKey,
            defaultValue: newDefaultValue
          });
        }
      }
    }
  }

  private _updateTableData(): void {
    this._tableData = [...this.replacements];
    this._updateTable();
  }

  private _updateTable(): void {
    this.requestUpdate();
  }

  private _convertReplacementConfigToItems(config: ReplacementConfig): ReplacementItem[] {
    return Object.entries(config).map(([pattern, options]) => ({
      id: Date.now() + Math.random(),
      pattern,
      dataKey: options.dataKey,
      defaultValue: options.defaultValue
    }));
  }

  private _convertItemsToReplacementConfig(items: ReplacementItem[]): ReplacementConfig {
    const config: ReplacementConfig = {};
    items.forEach(item => {
      if (item.pattern.trim() && item.dataKey.trim()) {
        config[item.pattern] = {
          dataKey: item.dataKey,
          defaultValue: item.defaultValue
        };
      }
    });
    return config;
  }

  private _addReplacement(): void {
    const newReplacement: ReplacementItem = {
      id: Date.now() + Math.random(),
      pattern: "",
      dataKey: "",
      defaultValue: ""
    };
    
    this.replacements = [...this.replacements, newReplacement];
    this._updateTableData();
    this._notifyChange();
  }

  private _removeReplacement(id: number): void {
    this.replacements = this.replacements.filter(r => r.id !== id);
    this._updateTableData();
    this._notifyChange();
  }

  private _updateReplacement(id: number, updates: Partial<Omit<ReplacementItem, 'id'>>): void {
    this.replacements = this.replacements.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    this._updateTableData();
    this._notifyChange();
  }

  private _notifyChange(): void {
    const event = new CustomEvent('replacements-change', {
      detail: { replacements: this.replacements },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _saveConfiguration(): void {
    const config = {
      removeBackslashes: this.removeBackslashes,
      useLocalStorage: this.useLocalStorage,
      replacements: this._convertItemsToReplacementConfig(this.replacements)
    };

    const replacer = new ConfigurableReplacer(config);
    replacer.saveConfig();
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`configReplacer_${this.instanceId}`, JSON.stringify(config));
    }
    
    console.log('Configuración guardada:', config);
    this._showNotification('✅ Configuración guardada exitosamente!');
  }

  private _exportConfig(): void {
    const config = {
      removeBackslashes: this.removeBackslashes,
      useLocalStorage: this.useLocalStorage,
      replacements: this._convertItemsToReplacementConfig(this.replacements),
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `replacer-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this._showNotification('📤 Configuración exportada exitosamente!');
  }

  private _importConfig(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          
          // Actualizar propiedades
          this.instanceId = 'default';
          this.removeBackslashes = config.removeBackslashes ?? true;
          this.useLocalStorage = config.useLocalStorage ?? true;
          
          if (config.replacements) {
            this.replacements = this._convertReplacementConfigToItems(config.replacements);
            this._updateTableData();
          }
          
          this._showNotification('✅ Configuración importada exitosamente!');
          this._notifyChange();
        } catch (error) {
          console.error('Error importing config:', error);
          this._showNotification(`❌ Error al importar configuración: ${(error as Error).message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private _showNotification(message: string): void {
    // Implementación simple de notificación
    // En una aplicación real, podrías usar un sistema de notificaciones más sofisticado
    alert(message);
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);
    
    if (changedProperties.has('replacements')) {
      this._updateTableData();
    }
  }

  render(): TemplateResult {
    return html`
      <div class="config-container">
        <section class="config-section">
          <div class="section-header">
            <h2 class="section-title">Configuración de Reemplazos</h2>
            <div class="action-buttons">
              <button 
                type="button" 
                @click=${this._addReplacement}
                class="button button-success"
              >
                ➕ Agregar Reemplazo
              </button>
              <button 
                type="button" 
                @click=${this._saveConfiguration}
                class="button button-success"
              >
                💾 Guardar Configuración
              </button>
              <button 
                type="button" 
                @click=${this._importConfig}
                class="button button-warning"
              >
                📥 Importar Configuración
              </button>
              <button 
                type="button" 
                @click=${this._exportConfig}
                class="button button-info"
              >
                📤 Exportar Configuración
              </button>
            </div>
          </div>
          
          <div class="replacements-container">
            ${this._tableData.length > 0 
              ? html`
                <div class="table-container">
                  <obj-table
                    .data=${this._tableData}
                    .keys=${this._tableKeys}
                  ></obj-table>
                </div>
              `
              : html`
                <div class="no-replacements">
                  No hay reemplazos configurados. Haz clic en "Agregar Reemplazo" para comenzar.
                </div>
              `
            }
          </div>
        </section>
      </div>
    `;
  }
}

// Exportar tipos para uso externo
export type { ReplacementItem, ReplacerConfigProps };