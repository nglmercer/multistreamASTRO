import { LitElement, html, css } from 'lit';

// Definición de las páginas con nombres y números asociados
const pages = {
    0: { name: "Home", slot: "page-0" },
    1: { name: "Search", slot: "page-1" },
    2: { name: "Recommended", slot: "page-2" },
    3: { name: "History", slot: "page-3" },
    4: { name: "Favorites", slot: "page-4" },
    5: { name: "Settings", slot: "page-5" },
};
class BaseMainContent extends LitElement {
    // Propiedad estática para la configuración, definida por la fábrica.
    static pages = {}; // Valor por defecto

    static properties = {
        _activePage: { state: true }
    };

    constructor() {
        super();
        const constructorPages = this.constructor.pages;
        const defaultPageConfig = constructorPages[0]; // Página inicial por defecto (índice 0)
        if (defaultPageConfig) {
            this._activePage = defaultPageConfig.slot;
        } else {
            console.warn(`Default page (index 0) not found in pages config for ${this.tagName}. Using 'default-slot'.`);
            this._activePage = 'default-slot'; // Fallback
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._setupPageChangeListener();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._removePageChangeListener();
    }

    _setupPageChangeListener() {
        const constructorPages = this.constructor.pages;

        this._pageChangeHandler = (event) => {
            // Detiene la propagación para que solo esta instancia reaccione si el evento se despacha directamente en ella.
            event.stopPropagation();

            const pageNumber = event.detail.pageNumber;
            const pageConfig = constructorPages[pageNumber]; // Usa la config específica

            if (pageConfig) {
                this._activePage = pageConfig.slot;
                 console.log(`[${this.tagName}] Page changed to: ${pageNumber} -> ${this._activePage}`);
            } else {
                console.error(`[${this.tagName}] Page number ${pageNumber} does not exist in pages config.`);
            }
        };
        // *** CAMBIO CLAVE: Escuchar en la propia instancia (this) ***
        this.addEventListener('page-changed', this._pageChangeHandler);
         console.log(`[${this.tagName}] Event listener 'page-changed' added to instance.`);
    }

    _removePageChangeListener() {
        if (this._pageChangeHandler) {
            // *** CAMBIO CLAVE: Eliminar de la propia instancia (this) ***
            this.removeEventListener('page-changed', this._pageChangeHandler);
            console.log(`[${this.tagName}] Event listener 'page-changed' removed from instance.`);
        }
    }

    static styles = css`
        main {
            min-height: 100px; /* Altura mínima para visualización */
            width: 100%;
        }
        .container {
            padding: 0.5rem;
        }
        .debug-info {
            font-size: 0.8em;
            color: gray;
            padding: 0.5rem 1.5rem;
            border-bottom: 1px solid lightgray;
            background-color: #eee;
            display: none;
        }
    `;

    render() {
        const constructorPages = this.constructor.pages;
        // Encuentra el nombre de la página actual para mostrarlo (opcional, útil para debug)
        const currentPageName = Object.values(constructorPages).find(p => p.slot === this._activePage)?.name || 'Unknown';

        return html`
            <main>
                <div class="debug-info">
                    Element: <strong>${this.tagName}</strong> | Active Slot: <code>${this._activePage}</code> (${currentPageName})
                </div>
                <div class="container">
                    <!-- Renderiza el slot correspondiente a la página activa -->
                    <slot name="${this._activePage}"></slot>
                    <!-- Slot por defecto si _activePage no coincide o no hay contenido -->
                    <slot name="default-slot"></slot>
                </div>
            </main>
        `;
    }
}

// --- Función Fábrica ---
function createConfigurableMainContent(elementName, pagesConfig) {
    // Define una clase específica que hereda de BaseMainContent
    class SpecificMainContent extends BaseMainContent {
        // Establece la propiedad estática 'pages' para esta clase específica
        static pages = pagesConfig;
    }

    // Registra el nuevo elemento personalizado si no está ya definido
    if (!customElements.get(elementName)) {
        customElements.define(elementName, SpecificMainContent);
        console.log(`Defined custom element: <${elementName}>`);
    } else {
         console.warn(`Custom element <${elementName}> already defined.`);
    }
}

// --- Definición de Configuraciones Específicas ---
const pagesConfigA = pages;

const pagesConfigB = {
    0: { name: "infoPlayer", slot: "page-info" },
    1: { name: "videoPlayer", slot: "page-video" },
};

// --- Creación y Registro de los Elementos Personalizados ---
createConfigurableMainContent('main-content', pagesConfigA);
createConfigurableMainContent('set-content', pagesConfigB);
