class TopViewersList extends HTMLElement {

  // Define las propiedades/atributos que queremos observar para cambios
  static get observedAttributes() {
      return ['top-count'];
  }

  constructor() {
      super(); // Siempre llama a super() primero en el constructor

      // Estado interno del componente
      this._data = null; // Almacenará el objeto roomUser completo
      this._topCount = 3; // Valor por defecto

      // Crear el Shadow DOM para encapsulación
      this.attachShadow({ mode: 'open' });

      // Renderizar inicialmente (mostrará "Esperando datos...")
      this._render();
  }

  // --- Métodos del Ciclo de Vida ---

  // Se llama cuando el elemento se añade al DOM principal
  connectedCallback() {
      console.log('TopViewersList añadido al DOM.');
      // Podrías hacer alguna inicialización adicional aquí si fuera necesario
  }

  // Se llama cuando un atributo observado cambia
  attributeChangedCallback(name, oldValue, newValue) {
      console.log(`Atributo '${name}' cambiado de '${oldValue}' a '${newValue}'`);
      if (name === 'top-count') {
          const newCount = parseInt(newValue, 10);
          // Validar que sea un número positivo
          if (!isNaN(newCount) && newCount > 0) {
              this._topCount = newCount;
          } else {
              console.warn(`Valor inválido para top-count: '${newValue}'. Se usará el valor anterior: ${this._topCount}`);
              // Opcionalmente, volver al valor por defecto si newValue es inválido
              // this._topCount = 3;
          }
          // Volver a renderizar si ya tenemos datos
          if (this._data) {
              this._render();
          }
      }
  }

  // --- Métodos Públicos ---

  /**
   * Actualiza los datos del componente y dispara un re-renderizado.
   * @param {object} newData - El objeto roomUser con la estructura { topViewers: [], viewerCount: number }.
   */
  updateData(newData) {
      if (!newData || typeof newData !== 'object') {
          console.error('updateData requiere un objeto válido.');
          return;
      }
       // Validaciones básicas de la estructura esperada
      if (!Array.isArray(newData.topViewers)) {
           console.error('La propiedad "topViewers" debe ser un array.');
           this._data = null; // Limpiar datos si son inválidos
           this._render(); // Renderizar estado de error o vacío
           return;
       }

      console.log('Actualizando datos de TopViewersList:', newData);
      this._data = newData;
      this._render(); // Volver a renderizar con los nuevos datos
  }

  // --- Métodos Privados ---

  /**
   * Renderiza el contenido del componente en el Shadow DOM.
   * Se llama internamente cuando cambian los datos o el atributo top-count.
   */
  _render() {
      const shadow = this.shadowRoot;
      if (!shadow) return; // Salir si el shadow root no está disponible

      // Limpiar contenido anterior
      shadow.innerHTML = '';

      // Añadir estilos encapsulados
      const style = document.createElement('style');
      style.textContent = `
          :host {
              display: block; /* Comportamiento por defecto de elementos custom */
              font-family: sans-serif;
              border: 1px solid #ccc;
              padding: 15px;
              border-radius: 8px;
              background-color: #f9f9f9;
              margin: 10px auto;
          }
          h3 {
              margin-top: 0;
              color: #333;
              border-bottom: 1px solid #eee;
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
              border-bottom: 1px solid #eee;
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
              object-fit: cover; /* Para que la imagen no se deforme */
              border: 1px solid #ddd;
          }
          .user-info {
              flex-grow: 1;
              display: flex;
              flex-direction: column; /* Nombre arriba, monedas abajo */
          }
          .nickname {
              font-weight: bold;
              color: #007bff; /* Un color para destacar */
              font-size: 0.95em;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 200px; /* Evita nombres muy largos */
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
      shadow.appendChild(style);

      // Crear el contenedor principal
      const wrapper = document.createElement('div');

      if (this._data && this._data.topViewers && Array.isArray(this._data.topViewers)) {
          const { topViewers, viewerCount } = this._data;

          // Asegurarse de que topViewers es un array antes de usar slice
          const viewersToShow = Array.isArray(topViewers)
              ? topViewers.slice(0, this._topCount)
              : [];

          const title = document.createElement('h3');
          title.textContent = `Top ${viewersToShow.length} Viewers` + (viewerCount ? ` (de ${viewerCount} totales)` : '');
          wrapper.appendChild(title);

          if (viewersToShow.length > 0) {
              const list = document.createElement('ol');
              viewersToShow.forEach((viewerData, index) => {
                  // Validar estructura interna
                  if (!viewerData || !viewerData.user) {
                      console.warn('Elemento inválido en topViewers:', viewerData);
                      return; // Saltar este elemento
                  }

                  const user = viewerData.user;
                  const coinCount = viewerData.coinCount !== undefined ? viewerData.coinCount : 'N/A';

                  const listItem = document.createElement('li');

                  const rankSpan = document.createElement('span');
                  rankSpan.className = 'rank';
                  rankSpan.textContent = `${index + 1}.`;

                  const img = document.createElement('img');
                  img.className = 'profile-pic';
                  // Usar la primera URL de imagen disponible o una por defecto
                  const profilePicUrl = user.profilePictureUrl ||
                                        (Array.isArray(user.userDetails?.profilePictureUrls) && user.userDetails.profilePictureUrls.length > 0
                                         ? user.userDetails.profilePictureUrls[0]
                                         : 'placeholder.png'); // Añade una imagen placeholder si quieres
                  img.src = profilePicUrl;
                  img.alt = `Foto de perfil de ${user.nickname || user.uniqueId}`;

                  const userInfoDiv = document.createElement('div');
                  userInfoDiv.className = 'user-info';

                  const nicknameSpan = document.createElement('span');
                  nicknameSpan.className = 'nickname';
                  nicknameSpan.textContent = user.nickname || user.uniqueId || 'Usuario Desconocido'; // Mostrar uniqueId si no hay nickname
                  nicknameSpan.title = user.nickname || user.uniqueId || 'Usuario Desconocido'; // Tooltip para nombres largos

                  const coinsSpan = document.createElement('span');
                  coinsSpan.className = 'coins';
                  coinsSpan.textContent = `Monedas: ${coinCount}`;

                  userInfoDiv.appendChild(nicknameSpan);
                  userInfoDiv.appendChild(coinsSpan);

                  listItem.appendChild(rankSpan);
                  listItem.appendChild(img);
                  listItem.appendChild(userInfoDiv);

                  list.appendChild(listItem);
              });
              wrapper.appendChild(list);
          } else {
              const noViewers = document.createElement('p');
              noViewers.className = 'no-data';
              noViewers.textContent = 'No hay viewers en el top para mostrar.';
              wrapper.appendChild(noViewers);
          }

      } else {
          // Mensaje cuando no hay datos
          const noData = document.createElement('p');
          noData.className = 'no-data';
          noData.textContent = 'Esperando datos de los viewers...';
          wrapper.appendChild(noData);
      }

      shadow.appendChild(wrapper);
  }
}

// Definir el custom element en el registro del navegador
if (!customElements.get('top-viewers-list')) {
    customElements.define('top-viewers-list', TopViewersList);
}