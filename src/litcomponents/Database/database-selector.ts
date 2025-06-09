// src/components/database-selector.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type DatabaseConfig, databases } from '@utils/idb';

@customElement('database-selector')
export class DatabaseSelector extends LitElement {
  /**
   * Un objeto que contiene todas las configuraciones de bases de datos disponibles.
   * La clave es el identificador y el valor es el objeto DatabaseConfig.
   */
  @property({ type: Object })
  databases: Record<string, DatabaseConfig> = {};

  /**
   * La clave de la base de datos actualmente seleccionada.
   * Se puede usar para pre-seleccionar un valor.
   */
  @property({ type: String })
  selectedKey: string = '';

  static styles = css`
    /* Estilos para el selector, puedes copiarlos de tu componente original */
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
    select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      background-color: white;
    }
  `;

  render() {
    return html`
      <div class="form-group">
        <label for="database-select">Base de datos:</label>
        <select 
          id="database-select" 
          @change="${this._handleSelectionChange}"
          .value="${this.selectedKey}"
        >
          <option value="">Selecciona una base de datos</option>
          ${Object.entries(this.databases).map(([key, config]) => 
            html`<option value="${key}">${config.name}</option>`
          )}
        </select>
      </div>
    `;
  }

  private _handleSelectionChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const selectedKey = target.value;
    const selectedConfig = this.databases[selectedKey] || null;

    // Emitir un evento personalizado con el objeto de configuración completo.
    // Esto permite al componente padre recibir el objeto directamente.
    this.dispatchEvent(new CustomEvent('database-selected', {
      detail: {
        key: selectedKey,
        config: selectedConfig,
      },
      bubbles: true,
      composed: true,
    }));
  }
}