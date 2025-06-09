// src/components/database-manager.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { databases, type DatabaseConfig, type OperationStatusDetail } from '@utils/idb';

// Importar los nuevos componentes
import './database-selector.js';
import './database-actions.js';

@customElement('database-manager')
export class DatabaseManager extends LitElement {
  /**
   * Almacena el objeto de configuración de la base de datos seleccionada.
   * Se pasa como propiedad al componente de acciones.
   */
  @state()
  private selectedDbConfig: DatabaseConfig | null = null;

  // Estado para el mensaje de notificación
  @state() private statusMessage = '';
  @state() private statusType: 'success' | 'error' = 'success';
  @state() private isStatusVisible = false;

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .status-message {
      padding: 10px;
      border-radius: 4px;
      margin: 20px 0;
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      visibility: hidden;
    }
    .status-message.visible {
      opacity: 1;
      transform: translateY(0);
      visibility: visible;
    }
    .status-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  `;

  render() {
    return html`
      <div class="container">
        <h2>Gestor de Bases de Datos</h2>
        
        <div 
          class="status-message status-${this.statusType} ${this.isStatusVisible ? 'visible' : ''}"
        >
          ${this.statusMessage}
        </div>

        <database-selector
          .databases="${databases}"
          @database-selected="${this._handleDatabaseSelected}"
        ></database-selector>

        <database-actions
          .databaseConfig="${this.selectedDbConfig}"
          @operation-status="${this._handleOperationStatus}"
        ></database-actions>
      </div>
    `;
  }

  private _handleDatabaseSelected(e: CustomEvent) {
    // Recibe el evento del selector y actualiza el estado.
    // Esto provocará un re-render y pasará la nueva config a database-actions.
    this.selectedDbConfig = e.detail.config;
  }

  private _handleOperationStatus(e: CustomEvent<OperationStatusDetail>) {
    // Recibe el estado de la operación desde database-actions y lo muestra.
    const { message, type } = e.detail;
    this.statusMessage = message;
    this.statusType = type;
    this.isStatusVisible = true;

    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      this.isStatusVisible = false;
    }, 5000);
  }
}