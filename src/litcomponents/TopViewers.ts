import { LitElement, html, css,type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// Interfaces para el tipado
interface User {
  nickname?: string;
  uniqueId?: string;
  profilePictureUrl?: string;
  profilePicture?: {
    urls: string[];
  };
  userDetails?: {
    profilePictureUrls?: string[];
  };
}

interface ViewerData {
  user: User;
  coinCount?: number;
}

interface RoomUserData {
  topViewers: ViewerData[];
  viewerCount?: number;
}

@customElement('top-viewers-list')
export class TopViewersList extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
      border-radius: 8px;
      margin: 10px auto;
    }

    h3 {
      margin-top: 0;
      padding-bottom: 5px;
    }

    ol {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      display: flex;
      align-items: center;
      padding: 8px 0;
    }

    li:last-child {
      border-bottom: none;
    }

    .rank {
      font-weight: bold;
      margin-right: 10px;
      min-width: 20px;
      text-align: right;
      color: #555;
    }

    .profile-pic {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 10px;
      object-fit: cover;
      border: 1px solid #ddd;
    }

    .user-info {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }

    .nickname {
      font-weight: bold;
      color: #007bff;
      font-size: 0.95em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .coins {
      font-size: 0.85em;
      color: #666;
    }

    .no-data {
      color: #888;
      font-style: italic;
    }
  `;
  @property({ type: Number, attribute: 'top-count' })
  topCount: number = 3;

  @state()
  private _data: RoomUserData | null = null;

  // Ciclo de vida - cuando se conecta al DOM
  connectedCallback(): void {
    super.connectedCallback();
    console.log('TopViewersList añadido al DOM.');
  }

  // Detectar cambios en propiedades
  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('topCount')) {
      console.log(`top-count cambiado a: ${this.topCount}`);
      
      // Validar que sea un número positivo
      if (isNaN(this.topCount) || this.topCount <= 0) {
        console.warn(`Valor inválido para top-count: '${this.topCount}'. Se usará el valor por defecto: 3`);
        this.topCount = 3;
      }
    }
  }

  /**
   * Método público para actualizar los datos del componente
   * @param newData - El objeto roomUser con la estructura { topViewers: [], viewerCount: number }
   */
  updateData(newData: RoomUserData | null): void {
    if (!newData || typeof newData !== 'object') {
      console.error('updateData requiere un objeto válido.');
      this._data = null;
      this.requestUpdate(); // Forzar re-renderizado
      return;
    }

    // Validaciones básicas de la estructura esperada
    if (!Array.isArray(newData.topViewers)) {
      console.error('La propiedad "topViewers" debe ser un array.');
      this._data = null;
      this.requestUpdate(); // Forzar re-renderizado
      return;
    }

    this._data = newData;
    this.requestUpdate(); // Forzar re-renderizado
  }

  // Método de renderizado principal
  render() {
    if (!this._data || !this._data.topViewers || !Array.isArray(this._data.topViewers)) {
      return html`
        <p class="no-data">Esperando datos de los viewers...</p>
      `;
    }

    const { topViewers, viewerCount } = this._data;
    const viewersToShow = topViewers.slice(0, this.topCount);

    return html`
      <h3>
        Top ${viewersToShow.length} Viewers
        ${viewerCount ? html` (de ${viewerCount} totales)` : ''}
      </h3>
      
      ${viewersToShow.length > 0
        ? html`
            <ol>
              ${viewersToShow.map((viewerData, index) => this.renderViewerItem(viewerData, index))}
            </ol>
          `
        : html`<p class="no-data">No hay viewers en el top para mostrar.</p>`
      }
    `;
  }

  // Método auxiliar para renderizar cada item de viewer
  private renderViewerItem(viewerData: ViewerData, index: number) {
    // Validar estructura interna
    if (!viewerData || !viewerData.user) {
      console.warn('Elemento inválido en topViewers:', viewerData);
      return html``; // Retornar template vacío
    }

    const user = viewerData.user;
    const coinCount = viewerData.coinCount !== undefined ? viewerData.coinCount : 'N/A';
    
    // Determinar la URL de la imagen de perfil
    const profilePicUrl = getProfilePictureUrl(user);

    const displayName = user.nickname || user.uniqueId || 'Usuario Desconocido';

    return html`
      <li>
        <span class="rank">${index + 1}.</span>
        <img
          class="profile-pic"
          src="${profilePicUrl}"
          alt="Foto de perfil de ${displayName}"
        />
        <div class="user-info">
          <span class="nickname" title="${displayName}">
            ${displayName}
          </span>
          <span class="coins">Monedas: ${coinCount}</span>
        </div>
      </li>
    `;
  }
}
function getProfilePictureUrl(user: User): string {
  if (user.profilePictureUrl) {
    return user.profilePictureUrl;
  }
  if (user.userDetails && Array.isArray(user.userDetails.profilePictureUrls) && user.userDetails.profilePictureUrls.length > 0) {
    return user.userDetails.profilePictureUrls[0];
  }
  if (user.profilePicture && Array.isArray(user.profilePicture.urls) && user.profilePicture.urls.length > 0) {
    return user.profilePicture.urls[0];
  }
  return '/favicon.svg'; // Valor por defecto si no hay imagen
}
// El registro del componente se hace automáticamente con el decorador @customElement
declare global {
  interface HTMLElementTagNameMap {
    'top-viewers-list': TopViewersList;
  }
}