import { LitElement, html, css,type PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface Referer {
  address: string;
  family: string;
  port: number;
  size: number;
}
export interface HealthItem {
  name: string;
  host: string;
  port: number;
  fqdn: string;
  status?: 'operational' | 'warning' | 'error' | 'restarting' | 'offline';
  referer?: Referer;
}

export type SystemStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

@customElement('system-health')
export class SystemHealthComponent extends LitElement {
  @property({ type: Array })
  healthItems: HealthItem[] = [];

  @property({ type: String })
  title: string = 'System Health';

  @state()
  private _systemStatus: SystemStatus = 'healthy';

  static styles = css`
    :host {
      display: block;
    }

    .health-card {
      background-color: var(--color-dark-900, #1a1a1a);
      border: 1px solid var(--color-gray-800, #374151);
      border-radius: var(--border-radius-xl, 12px);
      padding: var(--space-6, 24px);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-6, 24px);
    }

    h2 {
      font-size: var(--font-size-xl, 20px);
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #ffffff);
    }

    .health-status {
      padding: var(--space-1, 4px) var(--space-3, 12px);
      border-radius: var(--border-radius-full, 50px);
      font-size: var(--font-size-sm, 14px);
      font-weight: 500;
      text-transform: capitalize;
    }

    .health-status.healthy {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-green-500, #22c55e);
    }

    .health-status.warning {
      background-color: rgba(251, 191, 36, 0.1);
      color: var(--color-yellow-500, #eab308);
    }

    .health-status.critical {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--color-red-500, #ef4444);
    }

    .health-status.unknown {
      background-color: rgba(156, 163, 175, 0.1);
      color: var(--color-gray-400, #9ca3af);
    }

    .health-items {
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 16px);
    }

    .health-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3, 12px);
      background-color: var(--color-dark-800, #2d2d2d);
      border-radius: var(--border-radius-lg, 8px);
      transition: background-color 0.2s ease;
    }

    .health-item:hover {
      background-color: var(--color-dark-700, #404040);
    }

    .health-info {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
    }

    .service-details {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
    }

    .service-name {
      color: var(--color-text-primary, #ffffff);
      font-weight: 500;
    }

    .service-meta {
      font-size: var(--font-size-xs, 12px);
      color: var(--color-gray-100,rgb(206, 206, 206));
    }

    .status-icon {
      font-size: 20px;
      font-variation-settings: 'FILL' 1;
    }

    .status-icon.operational {
      color: var(--color-green-500, #22c55e);
    }

    .status-icon.warning {
      color: var(--color-yellow-500, #eab308);
    }

    .status-icon.error {
      color: var(--color-red-500, #ef4444);
    }

    .status-icon.restarting {
      color: var(--color-blue-500, #3b82f6);
      animation: spin 1s linear infinite;
    }

    .status-icon.offline {
      color: var(--color-gray-400, #9ca3af);
    }

    .status-text {
      font-size: var(--font-size-sm, 14px);
      color: var(--color-gray-400, #9ca3af);
      text-transform: capitalize;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--space-8, 32px);
      color: var(--color-gray-500, #6b7280);
    }

    .material-symbols-rounded {
      font-size: 48px;
      font-family: 'Material Symbols Outlined';
      opacity: 0.5;
    }
    
  `;

  protected updated(changedProperties: PropertyValueMap<any>) {
    super.updated(changedProperties);
    
    if (changedProperties.has('healthItems')) {
      this._updateSystemStatus();
    }
  }

  private _updateSystemStatus(): void {
    if (!this.healthItems.length) {
      this._systemStatus = 'unknown';
      return;
    }

    const statuses = this.healthItems.map(item => item.status || 'operational');
    
    if (statuses.some(status => status === 'error' || status === 'offline')) {
      this._systemStatus = 'critical';
    } else if (statuses.some(status => status === 'warning' || status === 'restarting')) {
      this._systemStatus = 'warning';
    } else if (statuses.every(status => status === 'operational')) {
      this._systemStatus = 'healthy';
    } else {
      this._systemStatus = 'unknown';
    }
  }

  private _getStatusIcon(status: string = 'operational'): string {
    const iconMap: Record<string, string> = {
      operational: 'check_circle',
      warning: 'warning',
      error: 'error',
      restarting: 'refresh',
      offline: 'cancel'
    };
    return iconMap[status] || 'help';
  }

  private _getStatusText(status: string = 'operational'): string {
    const textMap: Record<string, string> = {
      operational: 'Operational',
      warning: 'Warning',
      error: 'Error',
      restarting: 'Restarting',
      offline: 'Offline'
    };
    return textMap[status] || 'Unknown';
  }

  render() {
    return html`
      <div class="health-card">
        <div class="card-header">
          <h2>${this.title}</h2>
          <span class="health-status ${this._systemStatus}">
            ${this._systemStatus}
          </span>
        </div>

        <div class="health-items">
          ${this.healthItems.length === 0
            ? html`
                <div class="empty-state">
                  <span class="material-symbols-rounded">monitor_heart</span>
                  <p>No services configured</p>
                </div>
              `
            : this.healthItems.map(item => html`
                <div class="health-item">
                  <div class="health-info">
                    <span class="material-symbols-rounded status-icon ${item.status || 'operational'}">
                      ${this._getStatusIcon(item.status)}
                    </span>
                    <div class="service-details">
                      <span class="service-name">${item.name}</span>
                      <span class="service-meta">
                      ${item.referer ? 
                      `${item.referer.address}:${item.referer.port}` :
                      `${item.host}:${item.port}`}
                      </span>
                    </div>
                  </div>
                  <span class="status-text">
                    ${this._getStatusText(item.status)}
                  </span>
                </div>
              `)
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'system-health': SystemHealthComponent;
  }
}