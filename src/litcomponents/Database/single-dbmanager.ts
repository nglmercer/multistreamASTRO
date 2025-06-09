// src/components/single-database-manager.ts
import { LitElement, html, css,type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { databases, type DatabaseConfig, type OperationStatusDetail } from '@utils/idb';

// Reutilizamos el componente de acciones que ya creamos. ¡No hay que reinventar nada!
import './database-actions.js';

@customElement('single-dbmanager')
export class SingleDatabaseManager extends LitElement {
  /**
   * La clave (key) de la base de datos a gestionar.
   * Se debe pasar como atributo, ej: <single-database-manager db-key="commentEventsDB"></single-database-manager>
   */
  @property({ type: String, attribute: 'db-key' })
  dbKey: string = '';

  @state()
  private databaseConfig: DatabaseConfig | null = null;

  // Mantenemos la lógica para mostrar mensajes de estado
  @state() private statusMessage = '';
  @state() private statusType: 'success' | 'error' = 'success';
  @state() private isStatusVisible = false;

  // Usamos los mismos estilos que el manager original para consistencia
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
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

  /**
   * El ciclo de vida `updated` se ejecuta cuando las propiedades cambian.
   * Lo usamos para establecer la configuración de la base de datos cuando `dbKey` se inicializa.
   */
  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('dbKey') && this.dbKey) {
      const config = databases[this.dbKey];
      if (config) {
        this.databaseConfig = config;
      } else {
        console.warn(`La clave de base de datos '${this.dbKey}' no fue encontrada.`);
        this.databaseConfig = null;
      }
    }
  }

  render() {
    // Si la configuración aún no está lista o es inválida, muestra un mensaje.
    if (!this.databaseConfig) {
      return html`
        <div class="container">
          <p>Error: La clave de base de datos "${this.dbKey}" no es válida o no ha sido proporcionada.</p>
        </div>
      `;
    }

    return html`
        <!-- El título ahora es específico para la DB gestionada -->
        <h2>Gestor para: ${this.databaseConfig.name}</h2>
        
        
        <!-- Usamos directamente el componente de acciones, pasándole la config -->
        <database-actions
        .databaseConfig="${this.databaseConfig}"
        @operation-status="${this._handleOperationStatus}"
        ></database-actions>
        <div 
          class="status-message status-${this.statusType} ${this.isStatusVisible ? 'visible' : ''}"
        >
          ${this.statusMessage}
        </div>
    `;
  }
  
  private _handleOperationStatus(e: CustomEvent<OperationStatusDetail>) {
    const { message, type } = e.detail;
    this.statusMessage = message;
    this.statusType = type;
    this.isStatusVisible = true;

    setTimeout(() => {
      this.isStatusVisible = false;
    }, 5000);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'single-dbmanager': SingleDatabaseManager;
  }
}