/**
 * @abstract
 * @class BaseDisplayComponent
 * @description Clase base abstracta para componentes que muestran listas de objetos (datos).
 *              Maneja datos internos, claves y acciones personalizadas.
 *              Las subclases DEBEN implementar getStyles() y render().
 */
class BaseDisplayComponent extends HTMLElement {
    constructor() {
        super();

        // Datos internos comunes
        this._data = [];
        this._keys = [];
        this._customActions = []; // { name: string, label: string, className: string }
        this._needsRender = true; // Flag para indicar si necesita renderizar al conectar

        // Shadow DOM
        this.attachShadow({ mode: 'open' });

        // Estilos (a ser definidos por subclases)
        const style = document.createElement('style');
        // getStyles será llamado por la subclase, pero lo preparamos aquí
        this._styleElement = style;

        // Contenedor principal (a ser poblado por subclases)
        this._container = document.createElement('div');
        this._container.classList.add('display-container'); // Clase genérica

        // Añadir al Shadow DOM (estilos se añadirán después de getStyles)
        this.shadowRoot.appendChild(this._styleElement);
        this.shadowRoot.appendChild(this._container);

        // Manejador de eventos común (delegación)
        this._container.addEventListener('click', this._handleActionClick.bind(this));
    }

    // --- MÉTODOS ABSTRACTOS (a implementar por subclases) ---

    /**
     * @abstract
     * Debe devolver los estilos CSS específicos para la subclase.
     * @returns {string} Los estilos CSS.
     */
    getStyles() {
        // Las subclases deben sobrescribir esto.
        // Se llama explícitamente en el constructor de la subclase o en connectedCallback.
        console.warn(`${this.constructor.name} should implement getStyles()`);
        return ':host { display: block; border: 1px dashed red; padding: 10px; margin-bottom: 10px; } /* Default fallback styles */';
    }

    /**
     * @abstract
     * Debe renderizar el contenido del componente basado en _data, _keys y _customActions.
     */
    render() {
        throw new Error(`${this.constructor.name} must implement render()`);
    }

    // --- MÉTODOS PÚBLICOS COMUNES ---

    /**
     * Establece los datos y las claves, y renderiza si está conectado.
     * @param {Array<Object>} data - Array de objetos a mostrar.
     * @param {Array<string>} keys - Array de strings con las claves a mostrar y su orden.
     */
    setData(data = [], keys = []) {
        if (!Array.isArray(data) || !Array.isArray(keys)) {
            console.error(`${this.constructor.name}: data y keys deben ser arrays.`);
            this._data = [];
            this._keys = [];
        } else {
            // Copia profunda para evitar mutaciones externas inesperadas
            try {
                this._data = JSON.parse(JSON.stringify(data));
            } catch (e) {
                console.error(`${this.constructor.name}: Error deep copying data`, e);
                this._data = []; // Reset on error
            }
            this._keys = [...keys];
        }
        this._needsRender = true; // Marcar que necesita renderizar
        if (this.isConnected) { // Renderizar solo si ya está conectado al DOM
            this.render();
            this._needsRender = false;
        }
    }

    /**
     * Añade un nuevo item (objeto) a los datos existentes y re-renderiza si está conectado.
     * @param {Object} item - El objeto a añadir.
     */
    addItem(item) {
        if (item && typeof item === 'object') {
            try {
                // Copia profunda del item
                this._data.push(JSON.parse(JSON.stringify(item)));
                this._needsRender = true;
                if (this.isConnected) {
                    this.render();
                    this._needsRender = false;
                }
            } catch (e) {
                 console.error(`${this.constructor.name}: Error deep copying item to add`, e);
            }
        } else {
            console.error(`${this.constructor.name}: El item a añadir debe ser un objeto.`, item);
        }
    }

    /**
     * Define una acción personalizada que se mostrará como un botón.
     * @param {string} actionName - Identificador único (usado en dataset.action y nombre del evento).
     * @param {string} buttonLabel - Texto del botón.
     * @param {string} [cssClass=''] - Clase(s) CSS opcional(es) para el botón.
     */
    addAction(actionName, buttonLabel, cssClass = '') {
        if (typeof actionName !== 'string' || !actionName) {
            console.error(`${this.constructor.name}: actionName debe ser un string no vacío.`);
            return;
        }
        if (typeof buttonLabel !== 'string') {
            console.error(`${this.constructor.name}: buttonLabel debe ser un string.`);
            return;
        }
        // Permitir redefinir acciones si es necesario (eliminar la comprobación de existencia)
        // if (this._customActions.some(action => action.name === actionName)) {
        //     console.warn(`${this.constructor.name}: La acción "${actionName}" ya ha sido añadida.`);
        //     return;
        // }
        // Eliminar acción existente si se redefine
        this._customActions = this._customActions.filter(action => action.name !== actionName);
        this._customActions.push({
            name: actionName,
            label: buttonLabel,
            className: cssClass || ''
        });
        // Opcional: Re-renderizar si ya hay datos y está conectado
        this._needsRender = true;
        if (this._data.length > 0 && this.isConnected) {
             this.render();
             this._needsRender = false;
        }
    }

    // --- MANEJADOR DE EVENTOS INTERNO COMÚN ---

    /**
     * Maneja los clicks dentro del contenedor principal (delegación de eventos).
     * Busca botones con `data-action` y dispara eventos personalizados.
     * @param {Event} event - El objeto del evento click.
     */
    _handleActionClick(event) {
        const clickedElement = event.target.closest('button[data-action]'); // Busca el botón más cercano

        if (clickedElement) {
            const action = clickedElement.dataset.action;
            // Encontrar el elemento que contiene los datos del item (depende de la implementación de render)
            // Asumimos que la subclase añade una referencia _dataItem o data-item-index al elemento contenedor de la acción o a un ancestro cercano.
            const itemContainer = clickedElement.closest('[data-item-index]'); // Estrategia 1: Buscar índice
            let itemData = null;
            let itemIndex = -1;

            if (itemContainer && itemContainer.dataset.itemIndex !== undefined) {
                 const index = parseInt(itemContainer.dataset.itemIndex, 10);
                 if (!isNaN(index) && index >= 0 && index < this._data.length) {
                    itemIndex = index;
                    itemData = this._data[index]; // Obtener el item original de _data
                 }
            } else {
                 // Estrategia 2: Buscar _dataItem adjunto (menos común con delegación pura)
                 const actionsContainer = clickedElement.closest('.card-actions, .actions-cell, .item-actions'); // Adaptar selectores
                 if (actionsContainer && actionsContainer._dataItem) { // Si la subclase adjunta el objeto directamente
                     itemData = actionsContainer._dataItem;
                     // Podríamos intentar encontrar el índice si es necesario
                     itemIndex = this._data.findIndex(d => d === itemData); // ¡Ojo! Comparación por referencia
                 }
            }


            if (itemData) {
                // Determinar el nombre del evento
                let eventName;
                if (action === 'edit') {
                    eventName = 'edit-item';
                } else if (action === 'delete') {
                    eventName = 'delete-item';
                } else {
                    eventName = action; // Usar el nombre de la acción personalizada
                }

                // Emitir el evento apropiado con una copia profunda de los datos y el índice
                try {
                    this.dispatchEvent(new CustomEvent(eventName, {
                        detail: {
                            item: JSON.parse(JSON.stringify(itemData)), // Enviar copia profunda del item
                            index: itemIndex // Enviar el índice original
                        },
                        bubbles: true,
                        composed: true
                    }));
                } catch (e) {
                     console.error(`${this.constructor.name}: Error dispatching event "${eventName}"`, e);
                }

            } else {
                console.warn(`${this.constructor.name}: Botón de acción "${action}" clickeado, pero no se pudo encontrar el data item asociado.`);
            }
        }
    }

    // --- CICLO DE VIDA COMÚN ---

    connectedCallback() {
        // Aplicar estilos definidos por la subclase si no se hizo ya
        if (!this._styleElement.textContent) {
             this._styleElement.textContent = this.getStyles();
        }

        // Asegurarse de que el contenedor está en el shadow DOM
        if (!this.shadowRoot.contains(this._container)) {
            this.shadowRoot.appendChild(this._container);
        }
        // Renderizar si es necesario (si setData se llamó antes de conectar o si no se ha renderizado)
        if (this._needsRender) {
             this.render();
             this._needsRender = false; // Marcar como renderizado
        }
    }

    disconnectedCallback() {
        // Limpieza si es necesaria (la delegación de eventos en _container se limpia sola al quitar el nodo)
        // Podríamos querer limpiar _data o listeners si hubiera externos
    }

    // --- Métodos auxiliares comunes (opcional) ---

    /**
     * Crea un botón de acción estándar o personalizado.
     * @param {object} actionDef - Definición de la acción { name, label, className }
     * @param {number} itemIndex - Índice del item asociado (para data-item-index)
     * @returns {HTMLButtonElement} El elemento botón creado.
     */
    _createActionButton(actionDef, itemIndex) {
        const button = document.createElement('button');
        button.textContent = actionDef.label;
        button.dataset.action = actionDef.name;
        if (actionDef.className) {
            // Asegurarse de que className es un string antes de split
            const classes = String(actionDef.className).split(' ').filter(Boolean);
            if (classes.length > 0) {
                 button.classList.add(...classes);
            }
        }
        // Añadir clase específica si es 'edit' o 'delete' para estilos comunes
        if (actionDef.name === 'edit') button.classList.add('edit-btn');
        if (actionDef.name === 'delete') button.classList.add('delete-btn');

        // El itemIndex se asocia al contenedor del item en el método render de la subclase.
        // Ejemplo: itemElement.dataset.itemIndex = itemIndex;

        return button;
    }
}


// ==========================================================================
//    ObjectTable - Implementación usando BaseDisplayComponent
// ==========================================================================

/**
 * @element object-table
 * @description Muestra una lista de objetos en una tabla HTML.
 * @extends BaseDisplayComponent
 *
 * @fires edit-item - Cuando se hace click en el botón 'Editar'. Detail: { item: object, index: number }.
 * @fires delete-item - Cuando se hace click en el botón 'Eliminar'. Detail: { item: object, index: number }.
 * @fires {CustomEvent} [custom-action-name] - Cuando se hace click en un botón de acción personalizado. Detail: { item: object, index: number }.
 */
class ObjectTable extends BaseDisplayComponent {

    constructor() {
        super(); // Llama al constructor de BaseDisplayComponent
        // Aplicar estilos en el constructor o connectedCallback
        this._styleElement.textContent = this.getStyles();
    }

    getStyles() {
        // Estilos específicos para la tabla
        return /*css*/ `
            /* Estilos base del host y contenedor genérico */
            :host {
                display: block;
                font-family: sans-serif;
                border: 1px solid #ccc;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px; /* Añadido para separación */
            }
            .display-container { /* El contenedor creado en la clase base */
                 /* Estilos específicos si son necesarios para el contenedor de la tabla */
                 overflow-x: auto; /* Permitir scroll horizontal si la tabla es muy ancha */
            }
            .no-data { /* Estilo para cuando no hay datos */
                padding: 15px;
                text-align: center;
                color: #666;
            }

            /* Estilos de la tabla */
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 0.95em; /* Tamaño de fuente base */
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px 10px; /* Ajuste de padding */
                text-align: left;
                vertical-align: middle; /* Alinear verticalmente */
                white-space: nowrap; /* Evitar que el texto se rompa por defecto */
            }
            /* Permitir que algunas celdas rompan línea si es necesario */
            td.wrap {
                 white-space: normal;
            }

            th {
                background-color: #f2f2f2; /* Fondo ligero para cabecera */
                font-weight: 600; /* Un poco más de peso */
                text-transform: capitalize;
                position: sticky; /* Cabecera fija si el contenedor tiene overflow */
                top: 0;
                z-index: 1;
            }
            tr:nth-child(even) { /* Rayado ligero para filas pares */
                 background-color: #f9f9f9;
            }
            tr:hover {
                 background-color: #e9e9e9; /* Resaltado al pasar el ratón */
            }

            /* Estilos de los botones de acción */
            button {
                padding: 5px 10px;
                margin-right: 5px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                font-size: 0.9em; /* Tamaño de fuente ligeramente menor */
                transition: filter 0.2s, background-color 0.2s, border-color 0.2s; /* Transición suave */
                background-color: #fff; /* Fondo blanco por defecto */
            }
            button:last-child {
                margin-right: 0; /* Sin margen derecho en el último botón */
            }
            button:hover {
                filter: brightness(0.9); /* Oscurecer ligeramente */
            }
            button.edit-btn {
                background-color: #e7f3ff; /* Azul muy claro */
                border-color: #b8daff;
                color: #004085;
            }
            button.edit-btn:hover {
                 background-color: #d0e8ff;
            }
            button.delete-btn {
                background-color: #f8d7da; /* Rojo claro */
                color: #721c24;
                border-color: #f5c6cb;
            }
             button.delete-btn:hover {
                 background-color: #f1c1c5;
             }
            /* Puedes añadir aquí estilos para clases de botones personalizados */
            /* button.mi-clase-personalizada { ... } */

            .actions-cell {
                white-space: nowrap; /* Evita que los botones se separen */
                width: 1%; /* Mínimo ancho necesario */
                text-align: center; /* Centrar botones */
                padding: 4px 8px; /* Menos padding para acciones */
            }
        `;
    }

    render() {
        // Limpiar contenedor (_container es heredado de BaseDisplayComponent)
        this._container.innerHTML = '';

        if (!this._data || this._data.length === 0) {
            const noDataEl = document.createElement('div');
            noDataEl.classList.add('no-data');
            noDataEl.textContent = 'No hay datos para mostrar.';
            this._container.appendChild(noDataEl);
            return;
        }
        if (!this._keys || this._keys.length === 0) {
             const noDataEl = document.createElement('div');
            noDataEl.classList.add('no-data');
            noDataEl.textContent = 'No se han definido claves (keys) para mostrar.';
            this._container.appendChild(noDataEl);
            return;
        }


        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // --- Crear Cabecera (thead) ---
        const headerRow = document.createElement('tr');
        this._keys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });
        // Añadir cabecera para acciones (asumimos que siempre hay al menos edit/delete)
        const thActions = document.createElement('th');
        thActions.textContent = 'Acciones';
        thActions.classList.add('actions-cell');
        headerRow.appendChild(thActions);
        thead.appendChild(headerRow);

        // --- Crear Cuerpo (tbody) ---
        this._data.forEach((item, index) => {
            const tr = document.createElement('tr');
            // Guardar índice para que _handleActionClick pueda encontrar el item
            tr.dataset.itemIndex = index;

            // Celdas de datos
            this._keys.forEach(key => {
                const td = document.createElement('td');
                // Formateo básico (podría expandirse)
                const value = item[key];
                if (typeof value === 'boolean') {
                    td.textContent = value ? 'Sí' : 'No';
                    td.style.textAlign = 'center'; // Centrar booleanos
                } else {
                    td.textContent = (value !== undefined && value !== null) ? String(value) : ''; // Convertir a string
                }
                // Añadir clase 'wrap' si el contenido es potencialmente largo (ej. descripción)
                if (typeof value === 'string' && value.length > 50) { // Umbral de ejemplo
                     td.classList.add('wrap');
                }
                tr.appendChild(td);
            });

            // Celda de acciones
            const tdActions = document.createElement('td');
            tdActions.classList.add('actions-cell');

            // Definir acciones estándar si no fueron añadidas explícitamente
            const actionsToRender = [...this._customActions];
            if (!actionsToRender.some(a => a.name === 'edit')) {
                actionsToRender.unshift({ name: 'edit', label: 'Editar', className: 'edit-btn' });
            }
             if (!actionsToRender.some(a => a.name === 'delete')) {
                actionsToRender.push({ name: 'delete', label: 'Eliminar', className: 'delete-btn' });
            }

            actionsToRender.forEach(actionDef => {
                tdActions.appendChild(this._createActionButton(actionDef, index));
            });

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        this._container.appendChild(table);
    }
}

// Definir el custom element
if (!customElements.get('object-table')) {
    customElements.define('object-table', ObjectTable);
}


// ==========================================================================
//    ObjectCards - Implementación usando BaseDisplayComponent
// ==========================================================================

/**
 * @element object-cards
 * @description Muestra una lista de objetos como tarjetas (cards) usando Flexbox o Grid.
 * @extends BaseDisplayComponent
 *
 * @attribute {'flex'|'grid'} [layout=flex] - Define el layout ('flex' o 'grid').
 * @attribute {number} [cards-per-row=3] - Número de tarjetas por fila si layout es 'grid'.
 * @attribute {string} [header-key] - La clave del objeto a usar como cabecera de la tarjeta.
 *
 * @fires edit-item - Cuando se hace click en el botón 'Editar'. Detail: { item: object, index: number }.
 * @fires delete-item - Cuando se hace click en el botón 'Eliminar'. Detail: { item: object, index: number }.
 * @fires {CustomEvent} [custom-action-name] - Cuando se hace click en un botón de acción personalizado. Detail: { item: object, index: number }.
 */
class ObjectCards extends BaseDisplayComponent {

    // Observar atributos específicos de ObjectCards
    static get observedAttributes() {
        return ['layout', 'cards-per-row', 'header-key'];
    }

    constructor() {
        super(); // Llama al constructor de BaseDisplayComponent

        // Propiedades específicas de ObjectCards con valores por defecto
        this._cardLayout = 'flex';
        this._cardsPerRow = 3;
        this._headerKeyField = null;

        // Aplicar estilos
        this._styleElement.textContent = this.getStyles();
        // Aplicar configuración inicial basada en atributos existentes
        this._updateFromAttributes();
        this._updateContainerLayout();
    }

    // Leer atributos iniciales
    _updateFromAttributes() {
        this._cardLayout = this.getAttribute('layout') || 'flex';
        this._cardsPerRow = parseInt(this.getAttribute('cards-per-row') || '3', 10);
        this._headerKeyField = this.getAttribute('header-key');
    }


    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        let needsRender = false;
        switch (name) {
            case 'layout':
                this._cardLayout = newValue || 'flex';
                this._updateContainerLayout();
                break;
            case 'cards-per-row':
                this._cardsPerRow = parseInt(newValue || '3', 10);
                this._updateContainerLayout();
                break;
            case 'header-key':
                this._headerKeyField = newValue;
                needsRender = true; // Necesita re-renderizar para mostrar/ocultar cabeceras
                break;
        }

        if (needsRender && this.isConnected) {
            this.render();
        }
    }

    _updateContainerLayout() {
        if (!this._container) return; // Asegurarse de que el contenedor existe
        this._container.classList.toggle('grid-layout', this._cardLayout === 'grid');
        // Usar style.setProperty es más robusto que acceder a style directamente
        this._container.style.setProperty('--cards-per-row', String(this._cardsPerRow));
    }

    getStyles() {
        // Estilos específicos para las tarjetas
        return /*css*/ `
            :host {
                display: block;
                font-family: sans-serif;
                margin-bottom: 15px;
            }

            .display-container { /* El contenedor de la clase base */
                display: flex; /* Por defecto usa flex */
                flex-wrap: wrap;
                gap: 16px;
                /* Variable CSS para controlar columnas en grid */
                --cards-per-row: 3; /* Valor por defecto */
            }

            .display-container.grid-layout {
                display: grid;
                grid-template-columns: repeat(var(--cards-per-row), 1fr);
                gap: 16px;
            }

             .no-data { /* Estilo para cuando no hay datos */
                padding: 20px;
                text-align: center;
                color: #666;
                width: 100%;
                background: #f9f9f9;
                border-radius: 8px;
                /* Ocupa todo el ancho en flex o grid */
                flex-basis: 100%;
                grid-column: 1 / -1;
            }

            .card {
                background-color: #fff;
                border: 1px solid #eee; /* Borde más sutil */
                border-radius: 8px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08); /* Sombra más suave */
                overflow: hidden;
                transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                display: flex;
                flex-direction: column;
                /* El tamaño se controla por el contenedor flex/grid */
            }

            /* En layout flex, definir un tamaño base */
            .display-container:not(.grid-layout) .card {
                 flex: 1 1 calc(33.333% - 11px); /* Base 3 por fila (ajustar calc si gap cambia) */
                 min-width: 250px; /* Ancho mínimo antes de envolver */
            }


            .card:hover {
                transform: translateY(-3px);
                box-shadow: 0 3px 10px rgba(0,0,0,0.12);
            }

            .card-header {
                background-color: #f8f9fa; /* Color de fondo ligeramente diferente */
                padding: 10px 15px; /* Ajuste de padding */
                font-weight: 600; /* Más peso */
                border-bottom: 1px solid #eee;
                font-size: 1.05em; /* Ligeramente más grande */
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .card-content {
                padding: 15px;
                flex-grow: 1; /* Permite que el contenido crezca */
            }

            .card-property {
                margin-bottom: 10px; /* Más espacio entre propiedades */
                display: flex;
                flex-direction: column;
                gap: 2px; /* Espacio entre label y value */
            }
             .card-property:last-child {
                 margin-bottom: 0;
             }

            .property-label {
                font-weight: 500;
                color: #555; /* Color de label */
                font-size: 0.8em; /* Tamaño de label */
                text-transform: capitalize;
            }

            .property-value {
                word-break: break-word;
                font-size: 0.95em; /* Tamaño del valor */
                color: #222; /* Color del valor */
            }
             /* Formato especial para booleanos */
             .property-value[data-type="boolean"] {
                 font-style: italic;
                 color: #007bff; /* Azul para 'Sí' */
             }
             .property-value[data-type="boolean"].false {
                 color: #6c757d; /* Gris para 'No' */
             }


            .card-actions {
                padding: 10px 15px;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                background-color: #f8f9fa;
                border-top: 1px solid #eee;
                margin-top: auto; /* Empuja las acciones hacia abajo */
            }

            /* Estilos de botones (pueden heredar o ser específicos) */
            .card-actions button {
                padding: 6px 12px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 0.9em;
                transition: all 0.2s;
                background-color: #fff;
            }
            .card-actions button:hover {
                filter: brightness(0.95);
            }
            .card-actions button.edit-btn {
                background-color: #e7f3ff;
                border-color: #b8daff;
                color: #004085;
            }
             .card-actions button.edit-btn:hover {
                 background-color: #d0e8ff;
            }
            .card-actions button.delete-btn {
                background-color: #f8d7da;
                color: #721c24;
                border-color: #f5c6cb;
            }
             .card-actions button.delete-btn:hover {
                 background-color: #f1c1c5;
             }

            /* Responsive (Ajustes para layout flex y grid) */
            @media (max-width: 992px) {
                 .display-container:not(.grid-layout) .card {
                     flex-basis: calc(50% - 8px); /* 2 por fila (ajustar calc) */
                 }
                 /* Podríamos definir --cards-per-row aquí si quisiéramos cambiarlo */
                 /* :host { --cards-per-row: 2; } */
            }

            @media (max-width: 576px) {
                 .display-container:not(.grid-layout) .card {
                     flex-basis: 100%; /* 1 por fila */
                 }
                 /* :host { --cards-per-row: 1; } */
            }
        `;
    }

    render() {
        // Limpiar contenedor
        this._container.innerHTML = '';
        // Asegurar que las clases y variables de layout están aplicadas
        this._updateContainerLayout();

        if (!this._data || this._data.length === 0) {
            const noDataEl = document.createElement('div');
            noDataEl.classList.add('no-data');
            noDataEl.textContent = 'No hay datos para mostrar.';
            this._container.appendChild(noDataEl);
            return;
        }
         if (!this._keys || this._keys.length === 0) {
             const noDataEl = document.createElement('div');
            noDataEl.classList.add('no-data');
            noDataEl.textContent = 'No se han definido claves (keys) para mostrar.';
            this._container.appendChild(noDataEl);
            return;
        }

        // Crear cards
        this._data.forEach((item, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            // Asociar índice para el manejador de eventos
            card.dataset.itemIndex = index;

            // Header (opcional)
            const headerKey = this._headerKeyField || this.getAttribute('header-key');
            if (headerKey && item[headerKey] !== undefined && item[headerKey] !== null) {
                const cardHeader = document.createElement('div');
                cardHeader.classList.add('card-header');
                cardHeader.textContent = String(item[headerKey]);
                card.appendChild(cardHeader);
            }

            // Contenido
            const cardContent = document.createElement('div');
            cardContent.classList.add('card-content');

            this._keys.forEach(key => {
                if (key === headerKey) return; // No repetir la clave del header

                const propertyContainer = document.createElement('div');
                propertyContainer.classList.add('card-property');

                const label = document.createElement('div');
                label.classList.add('property-label');
                label.textContent = key;

                const valueEl = document.createElement('div');
                valueEl.classList.add('property-value');
                const value = item[key];

                if (typeof value === 'boolean') {
                    valueEl.textContent = value ? 'Sí' : 'No';
                    valueEl.dataset.type = 'boolean'; // Para estilos CSS
                    valueEl.classList.toggle('false', !value);
                } else {
                    valueEl.textContent = (value !== undefined && value !== null) ? String(value) : '';
                }

                propertyContainer.appendChild(label);
                propertyContainer.appendChild(valueEl);
                cardContent.appendChild(propertyContainer);
            });
            card.appendChild(cardContent);

            // Acciones
            // Definir acciones estándar si no fueron añadidas explícitamente
            const actionsToRender = [...this._customActions];
            if (!actionsToRender.some(a => a.name === 'edit')) {
                actionsToRender.unshift({ name: 'edit', label: 'Editar', className: 'edit-btn' });
            }
             if (!actionsToRender.some(a => a.name === 'delete')) {
                actionsToRender.push({ name: 'delete', label: 'Eliminar', className: 'delete-btn' });
            }

            if (actionsToRender.length > 0) {
                const actionsContainer = document.createElement('div');
                actionsContainer.classList.add('card-actions');
                // actionsContainer._dataItem = item; // Alternativa a data-item-index

                actionsToRender.forEach(actionDef => {
                    actionsContainer.appendChild(this._createActionButton(actionDef, index));
                });

                card.appendChild(actionsContainer);
            }

            this._container.appendChild(card);
        });
    }
}

// Definir el custom element
if (!customElements.get('object-cards')) {
    customElements.define('object-cards', ObjectCards);
}

// Alias opcional para compatibilidad
if (!customElements.get('object-grid')) {
    customElements.define('object-grid', class ObjectGrid extends ObjectCards {});
}


// ==========================================================================
//    ObjectFlexList - NUEVO Componente usando BaseDisplayComponent con Flex
// ==========================================================================

/**
 * @element object-flex-list
 * @description Muestra una lista de objetos usando un layout Flexbox simple.
 * @extends BaseDisplayComponent
 *
 * @attribute {'row'|'column'|'row-reverse'|'column-reverse'} [flex-direction=row] - Dirección del flex container.
 * @attribute {'wrap'|'nowrap'|'wrap-reverse'} [flex-wrap=wrap] - Control de envoltura.
 * @attribute {'flex-start'|'flex-end'|'center'|'space-between'|'space-around'|'space-evenly'} [justify-content=flex-start] - Alineación horizontal.
 * @attribute {'stretch'|'flex-start'|'flex-end'|'center'|'baseline'} [align-items=stretch] - Alineación vertical.
 *
 * @fires edit-item - Cuando se hace click en el botón 'Editar'. Detail: { item: object, index: number }.
 * @fires delete-item - Cuando se hace click en el botón 'Eliminar'. Detail: { item: object, index: number }.
 * @fires {CustomEvent} [custom-action-name] - Cuando se hace click en un botón de acción personalizado. Detail: { item: object, index: number }.
 */
class ObjectFlexList extends BaseDisplayComponent {

    static get observedAttributes() {
        // Observar atributos de estilo flexbox
        return ['flex-direction', 'flex-wrap', 'justify-content', 'align-items'];
    }

    constructor() {
        super();
        // Aplicar estilos
        this._styleElement.textContent = this.getStyles();
        // Aplicar configuración inicial basada en atributos
        this._updateContainerLayout();
    }

     attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        // Actualizar estilo del contenedor cuando cambie un atributo observado
        this._updateContainerLayout();
        // Re-renderizar si cambia un atributo que afecta el layout visualmente
        if (this.isConnected) {
            this.render();
        }
     }

     _updateContainerLayout() {
        if (!this._container) return;
        // Leer atributos y aplicar estilos correspondientes
        this._container.style.flexDirection = this.getAttribute('flex-direction') || 'row';
        this._container.style.flexWrap = this.getAttribute('flex-wrap') || 'wrap';
        this._container.style.justifyContent = this.getAttribute('justify-content') || 'flex-start';
        this._container.style.alignItems = this.getAttribute('align-items') || 'stretch';
     }

    getStyles() {
        return /*css*/`
            :host {
                display: block;
                font-family: sans-serif;
                margin-bottom: 15px;
            }
            .display-container {
                display: flex;
                gap: 10px; /* Espacio entre items */
                /* Otros estilos flex son controlados por atributos */
            }
             .no-data {
                padding: 15px;
                text-align: center;
                color: #666;
                width: 100%;
                flex-basis: 100%; /* Ocupa todo el ancho en flex */
            }

            .flex-item {
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 12px; /* Más padding */
                background-color: #fff;
                /* Flex item sizing (ejemplo: crecer/encoger) */
                flex: 1 1 220px; /* Crece, encoge, base de 220px */
                display: flex;
                flex-direction: column; /* Organiza contenido interno verticalmente */
                gap: 8px; /* Espacio interno */
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: box-shadow 0.2s;
            }
            .flex-item:hover {
                 box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }

            .item-content {
                 flex-grow: 1; /* El contenido ocupa el espacio disponible */
                 display: flex;
                 flex-direction: column;
                 gap: 5px; /* Espacio entre propiedades */
            }

            .item-property {
                font-size: 0.9em;
                display: flex; /* Label y value en línea por defecto */
                gap: 5px;
                line-height: 1.4;
            }
            .property-label {
                font-weight: 500;
                color: #333;
                text-transform: capitalize;
                /* margin-right: 5px; */ /* Reemplazado por gap */
                white-space: nowrap; /* Evitar que el label se rompa */
            }
            .property-value {
                color: #555;
                word-break: break-word; /* Permitir que valores largos se rompan */
            }
             /* Formato booleano */
             .property-value[data-type="boolean"] { font-style: italic; }
             .property-value[data-type="boolean"].true { color: #28a745; } /* Verde */
             .property-value[data-type="boolean"].false { color: #dc3545; } /* Rojo */


            .item-actions {
                display: flex;
                justify-content: flex-end;
                gap: 5px;
                margin-top: auto; /* Empujar acciones hacia abajo */
                border-top: 1px solid #eee; /* Separador opcional */
                padding-top: 10px; /* Espacio sobre los botones */
            }

            /* Estilos de botones (pueden ser los mismos que en otros componentes) */
            .item-actions button {
                padding: 4px 8px;
                font-size: 0.85em;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                background-color: #f0f0f0;
                transition: filter 0.2s, background-color 0.2s;
            }
            .item-actions button:hover {
                filter: brightness(0.9);
                background-color: #e0e0e0;
            }
            .item-actions button.edit-btn { background-color: #e7f3ff; border-color: #b8daff; color: #004085; }
            .item-actions button.edit-btn:hover { background-color: #d0e8ff; }
            .item-actions button.delete-btn { background-color: #f8d7da; color: #721c24; border-color: #f5c6cb; }
            .item-actions button.delete-btn:hover { background-color: #f1c1c5; }
        `;
    }

    render() {
        this._container.innerHTML = '';
        this._updateContainerLayout(); // Asegurar estilos flex

        if (!this._data || this._data.length === 0) {
            const noDataEl = document.createElement('div');
            noDataEl.classList.add('no-data');
            noDataEl.textContent = 'No hay datos para mostrar.';
            this._container.appendChild(noDataEl);
            return;
        }
         if (!this._keys || this._keys.length === 0) {
             const noDataEl = document.createElement('div');
            noDataEl.classList.add('no-data');
            noDataEl.textContent = 'No se han definido claves (keys) para mostrar.';
            this._container.appendChild(noDataEl);
            return;
        }

        this._data.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('flex-item');
            itemElement.dataset.itemIndex = index; // Para el manejador de eventos

            // Contenido del item
            const contentElement = document.createElement('div');
            contentElement.classList.add('item-content');
            this._keys.forEach(key => {
                const propElement = document.createElement('div');
                propElement.classList.add('item-property');

                const labelSpan = document.createElement('span');
                labelSpan.classList.add('property-label');
                labelSpan.textContent = `${key}:`;

                const valueSpan = document.createElement('span');
                valueSpan.classList.add('property-value');
                const value = item[key];

                if (typeof value === 'boolean') {
                    valueSpan.textContent = value ? 'Sí' : 'No';
                    valueSpan.dataset.type = 'boolean';
                    valueSpan.classList.toggle('true', value);
                    valueSpan.classList.toggle('false', !value);
                } else {
                    valueSpan.textContent = (value !== undefined && value !== null) ? String(value) : '';
                }


                propElement.appendChild(labelSpan);
                propElement.appendChild(valueSpan);
                contentElement.appendChild(propElement);
            });
            itemElement.appendChild(contentElement);

            // Acciones del item
            // Definir acciones estándar si no fueron añadidas explícitamente
            const actionsToRender = [...this._customActions];
            if (!actionsToRender.some(a => a.name === 'edit')) {
                actionsToRender.unshift({ name: 'edit', label: 'Editar', className: 'edit-btn' });
            }
             if (!actionsToRender.some(a => a.name === 'delete')) {
                actionsToRender.push({ name: 'delete', label: 'Eliminar', className: 'delete-btn' });
            }

            if (actionsToRender.length > 0) {
                const actionsElement = document.createElement('div');
                actionsElement.classList.add('item-actions');
                // actionsElement._dataItem = item; // Alternativa a data-item-index

                actionsToRender.forEach(actionDef => {
                    actionsElement.appendChild(this._createActionButton(actionDef, index));
                });
                itemElement.appendChild(actionsElement);
            }

            this._container.appendChild(itemElement);
        });
    }
}

if (!customElements.get('object-flex-list')) {
    customElements.define('object-flex-list', ObjectFlexList);
}


// ==========================================================================
//    GridManager - Actualizado para usar los nuevos componentes
// ==========================================================================
class GridManager extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Almacén para las referencias a los componentes creados
        this._managedComponents = {}; // { id: { element, wrapper, config } }
        this._eventListeners = {}; // Para rastrear listeners de acciones personalizadas

        // Estilos básicos para el manager
        const style = document.createElement('style');
        style.textContent = /*css*/`
            :host {
                display: block;
                padding: 10px;
            }
            .manager-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .component-wrapper { /* Contenedor para título + componente */
                 border: 1px solid #e0e0e0;
                 border-radius: 6px;
                 padding: 15px;
                 background-color: #fdfdfd;
                 box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .component-title {
                margin: 0 0 10px 0; /* Más espacio debajo del título */
                font-size: 1.2em; /* Título más grande */
                color: #333;
                font-weight: 600;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
        `;

        // Contenedor donde se añadirán los componentes gestionados
        this._container = document.createElement('div');
        this._container.classList.add('manager-container');

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this._container);

        // Bind del manejador de eventos
        this._handleComponentEvent = this._handleComponentEvent.bind(this);
    }

     // Escuchar eventos personalizados específicos en el contenedor
     connectedCallback() {
        this._container.addEventListener('edit-item', this._handleComponentEvent);
        this._container.addEventListener('delete-item', this._handleComponentEvent);
        // Añadir listeners para acciones personalizadas existentes al conectar
        Object.keys(this._eventListeners).forEach(actionName => {
             if (!['edit-item', 'delete-item'].includes(actionName)) {
                 this._container.addEventListener(actionName, this._handleComponentEvent);
             }
        });
        console.log('GridManager conectado.');
    }

    disconnectedCallback() {
        this._container.removeEventListener('edit-item', this._handleComponentEvent);
        this._container.removeEventListener('delete-item', this._handleComponentEvent);
        // Limpiar listeners de acciones personalizadas
         Object.keys(this._eventListeners).forEach(actionName => {
             if (!['edit-item', 'delete-item'].includes(actionName)) {
                 this._container.removeEventListener(actionName, this._handleComponentEvent);
             }
        });
        this._managedComponents = {}; // Limpiar referencias
        this._eventListeners = {};
        console.log('GridManager desconectado.');
    }


    /**
     * Añade un nuevo componente de display (table, cards, flex-list) gestionado.
     * @param {string} id - Identificador único para este componente.
     * @param {object} config - Configuración.
     * @param {Array<string>} config.keys - Claves a mostrar.
     * @param {Array<object>} [config.initialData=[]] - Datos iniciales.
     * @param {Array<{name: string, label: string, className?: string}>} [config.actions=[]] - Acciones personalizadas (además de edit/delete).
     * @param {string} [config.title=''] - Título opcional sobre el componente.
     * @param {'cards'|'table'|'flex'} [config.displayType='cards'] - Tipo de componente.
     * @param {object} [config.displayOptions={}] - Opciones específicas del tipo (e.g., { layout: 'grid', headerKey: 'name' }).
     * @returns {BaseDisplayComponent|null} La instancia del componente creado o null si hay error.
     */
    addComponent(id, config = {}) {
        if (!id || typeof id !== 'string') {
            console.error('GridManager: Se requiere un ID (string) para añadir un componente.');
            return null;
        }
        if (this._managedComponents[id]) {
            console.warn(`GridManager: Ya existe un componente con el ID "${id}".`);
            return this._managedComponents[id].element;
        }
        if (!config.keys || !Array.isArray(config.keys)) {
             console.error(`GridManager: La configuración para "${id}" debe incluir un array 'keys'.`);
            return null;
        }

        const {
            keys,
            initialData = [],
            actions = [],
            title = '',
            displayType = 'cards',
            displayOptions = {}
        } = config;

        // Determinar etiqueta del componente
        let componentTag;
        switch (displayType.toLowerCase()) {
            case 'table': componentTag = 'object-table'; break;
            case 'flex': componentTag = 'object-flex-list'; break;
            case 'cards':
            default: componentTag = 'object-cards'; break;
        }

         if (!customElements.get(componentTag)) {
             console.error(`GridManager: El componente <${componentTag}> no está definido.`);
             return null;
         }

        // Crear wrapper
        const componentWrapper = document.createElement('div');
        componentWrapper.classList.add('component-wrapper');
        componentWrapper.dataset.componentId = id; // Asociar ID

        if (title) {
            const componentTitle = document.createElement('h3');
            componentTitle.classList.add('component-title');
            componentTitle.textContent = title;
            componentWrapper.appendChild(componentTitle);
        }

        // Crear instancia del componente
        const newComponent = document.createElement(componentTag);
        newComponent.id = `managed-${id}`; // ID único en el DOM

        // Configurar acciones (edit/delete son implícitos en los componentes ahora)
        if (Array.isArray(actions)) {
            actions.forEach(action => {
                if (action.name && action.label && !['edit', 'delete'].includes(action.name)) { // No añadir edit/delete explícitamente
                    newComponent.addAction(action.name, action.label, action.className || '');
                    // Añadir listener para esta acción personalizada si no existe ya
                    if (!this._eventListeners[action.name]) {
                         this._container.addEventListener(action.name, this._handleComponentEvent);
                         this._eventListeners[action.name] = true; // Marcar que el listener existe
                    }
                } else if (action.name && action.label) {
                     // console.log(`GridManager: Acción estándar '${action.name}' será manejada por el componente.`);
                } else {
                     console.warn(`GridManager: Acción inválida para "${id}":`, action);
                }
            });
        }

        // Aplicar opciones específicas como atributos
        for (const [optionKey, optionValue] of Object.entries(displayOptions)) {
             const attributeName = optionKey.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
             if (typeof optionValue === 'boolean') {
                 if (optionValue) newComponent.setAttribute(attributeName, '');
                 else newComponent.removeAttribute(attributeName);
             } else if (optionValue !== null && optionValue !== undefined) {
                 newComponent.setAttribute(attributeName, String(optionValue));
             }
        }

        // Establecer datos y claves (usando el método de la clase base)
        // Importante: Llamar a setData DESPUÉS de configurar acciones y atributos
        newComponent.setData(initialData, keys);

        // Añadir al DOM dentro del wrapper
        componentWrapper.appendChild(newComponent);
        this._container.appendChild(componentWrapper);

        // Guardar referencia
        this._managedComponents[id] = {
            element: newComponent,
            wrapper: componentWrapper,
            config: config // Guardar la configuración original completa
        };

        console.log(`GridManager: Componente "${id}" (${componentTag}) añadido.`);
        return newComponent;
    }

    /**
     * Obtiene la instancia de un componente gestionado por su ID.
     * @param {string} id - El ID del componente.
     * @returns {BaseDisplayComponent|null} La instancia del componente o null si no se encuentra.
     */
    getComponent(id) {
        return this._managedComponents[id] ? this._managedComponents[id].element : null;
    }

     /**
     * Obtiene la configuración original de un componente gestionado por su ID.
     * @param {string} id - El ID del componente.
     * @returns {object|null} La configuración o null si no se encuentra.
     */
    getComponentConfig(id) {
        return this._managedComponents[id] ? this._managedComponents[id].config : null;
    }

    /**
     * Elimina un componente gestionado del manager y del DOM.
     * @param {string} id - El ID del componente a eliminar.
     * @returns {boolean} True si se eliminó, false si no se encontró.
     */
    removeComponent(id) {
        const componentInfo = this._managedComponents[id];
        if (componentInfo && componentInfo.wrapper) {
            // Quitar listeners específicos si se añadieron dinámicamente
            // (No es estrictamente necesario si se limpian en disconnectedCallback)
            componentInfo.wrapper.remove();
            delete this._managedComponents[id];
            console.log(`GridManager: Componente "${id}" eliminado.`);
            // Opcional: quitar listeners de acciones personalizadas si ya no hay componentes que las usen
            this._cleanupEventListeners();
            return true;
        }
        console.warn(`GridManager: No se encontró un componente con el ID "${id}" para eliminar.`);
        return false;
    }

    /**
     * Elimina todos los componentes gestionados.
     */
    clearAllComponents() {
        // Es más eficiente limpiar el contenedor directamente
        this._container.innerHTML = '';
        // Limpiar referencias y listeners
        this._managedComponents = {};
        Object.keys(this._eventListeners).forEach(actionName => {
             if (!['edit-item', 'delete-item'].includes(actionName)) {
                 this._container.removeEventListener(actionName, this._handleComponentEvent);
             }
        });
        this._eventListeners = {};
        console.log('GridManager: Todos los componentes eliminados.');
    }

    // Limpia listeners de acciones personalizadas que ya no son usadas por ningún componente
    _cleanupEventListeners() {
        const activeCustomActions = new Set();
        Object.values(this._managedComponents).forEach(info => {
            info.element._customActions.forEach(action => {
                if (!['edit', 'delete'].includes(action.name)) {
                    activeCustomActions.add(action.name);
                }
            });
        });

        Object.keys(this._eventListeners).forEach(actionName => {
            if (!['edit-item', 'delete-item'].includes(actionName) && !activeCustomActions.has(actionName)) {
                this._container.removeEventListener(actionName, this._handleComponentEvent);
                delete this._eventListeners[actionName];
            }
        });
    }


    // --- MANEJO CENTRALIZADO DE EVENTOS ---

    /**
     * Manejador genérico para eventos que burbujean desde los componentes hijos.
     * @param {CustomEvent} event - El evento disparado ('edit-item', 'delete-item', 'custom-action', etc.).
     */
    _handleComponentEvent(event) {
        const sourceComponentElement = event.target; // El componente que disparó el evento
        const eventDetail = event.detail;    // El objeto { item, index }
        const eventType = event.type;     // 'edit-item', 'delete-item', 'mi-accion', etc.

        // Encontrar el ID del componente que originó el evento
        const wrapper = sourceComponentElement.closest('.component-wrapper');
        const componentId = wrapper ? wrapper.dataset.componentId : 'unknown';

        if (componentId === 'unknown') {
             console.warn('GridManager: Evento recibido pero no se pudo determinar el componentId.', event);
             return; // No procesar si no sabemos de qué componente viene
        }
        if (!eventDetail || eventDetail.item === undefined || eventDetail.index === undefined) {
             console.warn(`GridManager: Evento "${eventType}" recibido de "${componentId}" sin detail esperado ({item, index}).`, event);
             return;
        }


        console.log(`GridManager: Evento "${eventType}" recibido del componente "${componentId}". Índice: ${eventDetail.index}, Datos:`, eventDetail.item);

        // AQUÍ: Lógica centralizada opcional
        // Ejemplo: Si el manager maneja la eliminación
        // if (eventType === 'delete-item') {
        //     const component = this.getComponent(componentId);
        //     if (component) {
        //         // 1. Actualizar fuente de datos externa (fuera del manager)
        //         // ... tu lógica para quitar el item de la fuente de datos ...
        //
        //         // 2. Actualizar el componente visualmente (asumiendo que la fuente externa ya está actualizada)
        //         // const newData = ... obtener datos actualizados de la fuente externa ...
        //         // const config = this.getComponentConfig(componentId);
        //         // component.setData(newData, config.keys);
        //         console.log(`GridManager: Simulación de eliminación para item ${eventDetail.index} en ${componentId}`);
        //     }
        // }

        // Re-emitir el evento desde el manager, añadiendo el ID del componente.
        // Usamos un nombre de evento genérico 'component-action' para simplificar.
        this.dispatchEvent(new CustomEvent('component-action', {
            detail: {
                componentId: componentId,
                action: eventType, // El nombre original del evento (e.g., 'edit-item')
                item: eventDetail.item,    // La data (ya es copia profunda)
                index: eventDetail.index,  // El índice original
                sourceElement: sourceComponentElement // Referencia al elemento origen
            },
            bubbles: true, // Puede seguir burbujeando si es necesario
            composed: true
        }));
    }
}

if (!customElements.get('grid-manager')) {
    customElements.define('grid-manager', GridManager);
}


// ==========================================================================
//    ObjectEditForm - Sin cambios, no hereda de BaseDisplayComponent
// ==========================================================================
/**
 * @element object-edit-form
 * @description A web component that renders an editable form for a single JavaScript object,
 *              using c-inp components for individual fields.
 *
 * @attr {Boolean} darkmode - Applies dark mode styling to internal c-inp elements.
 *
 * @prop {Object} item - The JavaScript object to be edited. Use `setItem()` method.
 * @prop {Object} fieldConfigs - Configuration object describing how each field should be rendered. Use `setConfig()` method.
 *
 * @fires save-item - Dispatched when the 'Save' button is clicked and the form is valid. Detail contains the current form data.
 * @fires cancel-edit - Dispatched when the 'Cancel' button is clicked. Detail is null.
 * @fires {CustomEvent} [custom-action-name] - Dispatched when a custom action button is clicked. Detail contains the current form data.
 * @fires field-change - Dispatched whenever a c-inp field's value changes. Detail contains { name: string, value: any }.
 *
 * @method setConfig (item = {}, fieldConfigs = {}) - Sets the data object and the field configurations.
 * @method setItem (item = {}) - Updates the data object being edited without changing configurations.
 * @method addAction (actionName, buttonLabel, cssClass = '') - Adds a custom button to the form's actions.
 * @method validate() - Checks if all fields in the form are valid according to their configurations. Returns boolean.
 * @method getCurrentData() - Returns an object with the current values from all form fields.
 * @method reset() - Resets all form fields to their initial values when setConfig/setItem was called.
 */
class ObjectEditForm extends HTMLElement {

    constructor() {
        super();

        // Internal state
        this._initialItem = {}; // Store the initially set item for reset functionality
        this._currentItem = {}; // Store the current state of the item being edited
        this._fieldConfigs = {}; // { fieldName: { type: 'text', label: '...', required: true, ... }, ... }
        this._customActions = [];

        // Shadow DOM
        this.attachShadow({ mode: 'open' });

        // Styles
        const style = document.createElement('style');
        style.textContent = this.getStyles();

        // Form structure
        this._formContainer = document.createElement('form');
        this._formContainer.classList.add('edit-form-container');
        this._formContainer.setAttribute('novalidate', ''); // Disable native validation bubbles initially

        this._fieldsContainer = document.createElement('div');
        this._fieldsContainer.classList.add('fields-container');

        this._actionsContainer = document.createElement('div');
        this._actionsContainer.classList.add('form-actions');

        this._formContainer.appendChild(this._fieldsContainer);
        this._formContainer.appendChild(this._actionsContainer);

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this._formContainer);

        // Event listeners
        this._handleActionClick = this._handleActionClick.bind(this);
        this._handleInputChange = this._handleInputChange.bind(this);
        this._handleSubmit = this._handleSubmit.bind(this); // Handle form submission attempt
    }

    getStyles() {
        // Reuse some styles and add form-specific ones
        return /*css*/`
            :host {
                display: block;
                font-family: sans-serif;
                padding: 15px;
                border: 1px solid #eee;
                border-radius: 8px;
                background-color: #f9f9f9;
                margin-bottom: 15px;
            }

            .edit-form-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .fields-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive grid */
                gap: 10px 15px; /* Row and column gap */
                padding-bottom: 15px; /* Space before actions */
                border-bottom: 1px solid #eee;
            }

            /* Style wrapper for label + c-inp */
            .field-wrapper {
                display: flex;
                flex-direction: column;
                gap: 4px; /* Space between label and input */
            }

            label {
                font-weight: 500;
                font-size: 0.9em;
                color: #333;
                text-transform: capitalize;
            }

            /* Target c-inp specifically if needed */
            c-inp {
                 margin: 0; /* Override default margin if c-inp has one */
                 padding: 0; /* Override default padding if c-inp has one */
            }

             /* Add styles for invalid state feedback */
            .field-wrapper.invalid label {
                color: #dc3545; /* Red label */
            }
            /* c-inp itself should handle internal invalid state visuals */


            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }

            /* Basic button styling (can be refined) */
             button {
                padding: 8px 16px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 0.95em;
                transition: background-color 0.2s, border-color 0.2s, color 0.2s;
                background-color: #fff;
            }

            button:hover {
                filter: brightness(0.95);
            }

            .save-btn {
                background-color: #28a745; /* Green */
                color: white;
                border-color: #28a745;
            }
             .save-btn:hover {
                 background-color: #218838;
                 border-color: #1e7e34;
             }


            .cancel-btn {
                background-color: #6c757d; /* Gray */
                color: white;
                border-color: #6c757d;
            }
            .cancel-btn:hover {
                background-color: #5a6268;
                border-color: #545b62;
            }

            /* Style for custom buttons (example) */
            button.my-custom-class {
                background-color: #007bff;
                color: white;
                border-color: #007bff;
            }
            button.my-custom-class:hover {
                 background-color: #0056b3;
                 border-color: #0056b3;
             }

             /* Dark Mode propagation */
            :host([darkmode]) {
                 background-color: #333;
                 border-color: #555;
             }
            :host([darkmode]) label {
                 color: #eee;
             }
            :host([darkmode]) .fields-container {
                 border-bottom-color: #555;
             }
             :host([darkmode]) button {
                background-color: #555;
                border-color: #777;
                color: #eee;
             }
             :host([darkmode]) button:hover {
                 filter: brightness(1.1);
             }
             /* Ensure c-inp receives darkmode */
             :host([darkmode]) c-inp {
                 color-scheme: dark; /* Hint for c-inp */
             }
        `;
    }

    // --- PUBLIC API ---

    /**
     * Sets the data object to edit and the configuration for its fields.
     * @param {Object} item - The object containing the data to edit.
     * @param {Object} fieldConfigs - An object where keys match item properties.
     *                                Values are configuration objects for c-inp.
     *                                e.g., { name: { label: 'Full Name', type: 'text', required: true },
     *                                        age: { label: 'Age', type: 'number', min: 0 },
     *                                        status: { label: 'Status', type: 'select', options: [{label:'Active', value: 'active'}, ...]} }
     */
    setConfig(item = {}, fieldConfigs = {}) {
        // Deep copy to prevent modifying the original object directly
        // and to allow resetting
        try {
            this._initialItem = JSON.parse(JSON.stringify(item || {}));
            this._currentItem = JSON.parse(JSON.stringify(item || {}));
        } catch (e) {
             console.error('ObjectEditForm: Error deep copying item in setConfig', e);
             this._initialItem = {};
             this._currentItem = {};
        }
        this._fieldConfigs = fieldConfigs || {};
        if (this.isConnected) {
            this.render();
        } else {
            // Defer render until connected
        }
    }

    /**
     * Updates the item being edited without changing the field configurations.
     * Useful after a save or for external updates.
     * @param {Object} item - The new data object.
     */
    setItem(item = {}) {
         try {
            this._initialItem = JSON.parse(JSON.stringify(item || {}));
            this._currentItem = JSON.parse(JSON.stringify(item || {}));
        } catch (e) {
             console.error('ObjectEditForm: Error deep copying item in setItem', e);
             // Decide how to handle error, maybe keep old state?
             return;
        }
        // Don't re-render the whole structure, just update field values if connected
        if (this.isConnected) {
            this._updateFieldValues();
        }
    }


    /**
     * Adds a custom action button to the form.
     * @param {string} actionName - The name of the action (will be event name).
     * @param {string} buttonLabel - The text displayed on the button.
     * @param {string} [cssClass=''] - Optional CSS class(es) to add to the button.
     */
    addAction(actionName, buttonLabel, cssClass = '') {
        if (typeof actionName !== 'string' || !actionName) {
            console.error('ObjectEditForm: actionName must be a non-empty string.');
            return;
        }
        if (typeof buttonLabel !== 'string') {
            console.error('ObjectEditForm: buttonLabel must be a string.');
            return;
        }
        // Allow redefinition
        this._customActions = this._customActions.filter(action => action.name !== actionName);
        this._customActions.push({ name: actionName, label: buttonLabel, className: cssClass });
        if (this.isConnected) {
            this._renderActions(); // Re-render only the actions part
        }
    }

    /**
     * Validates all c-inp fields in the form.
     * @returns {boolean} True if all fields are valid, false otherwise.
     */
    validate() {
        let isFormValid = true;
        const fields = this.shadowRoot.querySelectorAll('c-inp');
        fields.forEach(field => {
            const fieldWrapper = field.closest('.field-wrapper');
            let fieldIsValid = true;
            // Check if c-inp has an isValid method
            if (typeof field.isValid === 'function') {
                fieldIsValid = field.isValid();
            } else {
                // Fallback to native checkValidity if c-inp doesn't expose isValid
                const internalInput = field.shadowRoot?.querySelector('input, select, textarea');
                if (internalInput && typeof internalInput.checkValidity === 'function') {
                    fieldIsValid = internalInput.checkValidity();
                } else {
                    console.warn(`ObjectEditForm: Cannot validate field "${field.getAttribute('name')}". No isValid() or checkValidity() found.`);
                }
            }

            if (!fieldIsValid) {
                isFormValid = false;
                // Add visual cue to the wrapper
                if(fieldWrapper) fieldWrapper.classList.add('invalid');
                 console.warn(`Field "${field.getAttribute('name')}" is invalid.`);
            } else {
                 if(fieldWrapper) fieldWrapper.classList.remove('invalid');
            }
        });
        return isFormValid;
    }

     /**
     * Gathers the current values from all c-inp fields.
     * @returns {Object} An object representing the current state of the form data.
     */
    getCurrentData() {
        const formData = { ...this._currentItem }; // Start with the current internal state
        const fields = this.shadowRoot.querySelectorAll('c-inp');
        fields.forEach(field => {
            const name = field.getAttribute('name');
            if (name) {
                // Check if c-inp has a getVal method
                if (typeof field.getVal === 'function') {
                    formData[name] = field.getVal();
                } else {
                    // Fallback to getting value from internal element if possible
                    const internalInput = field.shadowRoot?.querySelector('input, select, textarea');
                    if (internalInput) {
                         formData[name] = internalInput.type === 'checkbox' ? internalInput.checked : internalInput.value;
                    } else {
                         console.warn(`ObjectEditForm: Cannot get value for field "${name}". No getVal() or internal input found.`);
                         // Optionally try reading the 'value' attribute as a last resort
                         // formData[name] = field.getAttribute('value');
                    }
                }
            }
        });
        return formData;
    }

    /**
     * Resets all form fields to the values they had when setConfig or setItem was last called.
     */
    reset() {
        // Use setItem to reset internal state and update fields
        this.setItem(this._initialItem);
    }

    // --- RENDER LOGIC ---

    render() {
        this._renderFields();
        this._renderActions();
    }

    _renderFields() {
        this._fieldsContainer.innerHTML = ''; // Clear previous fields

        if (!this._currentItem || !this._fieldConfigs || Object.keys(this._fieldConfigs).length === 0) {
            this._fieldsContainer.textContent = 'No fields configured.';
            return;
        }

        const darkMode = this.hasAttribute('darkmode');

        for (const key in this._fieldConfigs) {
            if (Object.hasOwnProperty.call(this._fieldConfigs, key)) {
                const config = this._fieldConfigs[key];
                // Skip if config is explicitly marked as hidden
                if (config.hidden) continue;

                const currentValue = this._currentItem?.[key]; // Use optional chaining

                // Create wrapper for label and input
                const fieldWrapper = document.createElement('div');
                fieldWrapper.classList.add('field-wrapper');

                // Create Label
                const label = document.createElement('label');
                const inputId = `edit-form-${key}-${Date.now()}`; // Unique enough ID
                label.setAttribute('for', inputId);
                label.textContent = config.label || key; // Use label from config or key name
                fieldWrapper.appendChild(label);

                // Create c-inp element
                const inputField = document.createElement('c-inp');
                inputField.setAttribute('id', inputId);
                inputField.setAttribute('name', key);
                inputField.setAttribute('type', config.type || 'text');

                // Set initial value attribute (c-inp should handle this internally)
                if (currentValue !== undefined && currentValue !== null) {
                    // For boolean types, c-inp's setVal should handle it, but setting attribute might help initial render
                    if (config.type === 'checkbox' || config.type === 'switch' || config.type === 'boolean') {
                        if (Boolean(currentValue)) {
                            inputField.setAttribute('checked', ''); // Standard attribute for checked
                            inputField.setAttribute('value', 'true'); // Common practice
                        } else {
                             inputField.setAttribute('value', 'false');
                        }
                    } else {
                        inputField.setAttribute('value', String(currentValue)); // Ensure value is string for attribute
                    }
                }


                // Pass through common c-inp attributes from config
                if (config.placeholder) inputField.setAttribute('placeholder', config.placeholder);
                if (config.required) inputField.setAttribute('required', '');
                if (config.disabled) inputField.setAttribute('disabled', '');
                if (config.readonly) inputField.setAttribute('readonly', '');
                if (config.pattern) inputField.setAttribute('pattern', config.pattern);
                if (config.title) inputField.setAttribute('title', config.title); // For validation message hint
                if (config.options && Array.isArray(config.options)) {
                    // Pass options via attribute (requires c-inp to parse JSON)
                    try {
                        inputField.setAttribute('options', JSON.stringify(config.options));
                    } catch (e) {
                        console.error(`ObjectEditForm: Failed to stringify options for field "${key}"`, e);
                    }
                }
                 if (config.min !== undefined) inputField.setAttribute('min', config.min);
                 if (config.max !== undefined) inputField.setAttribute('max', config.max);
                 if (config.step !== undefined) inputField.setAttribute('step', config.step);
                 if (config.rows !== undefined) inputField.setAttribute('rows', config.rows); // For textarea type
                 if (config.cols !== undefined) inputField.setAttribute('cols', config.cols); // For textarea type


                // Propagate darkmode
                if (darkMode) {
                    inputField.setAttribute('darkmode', '');
                }

                fieldWrapper.appendChild(inputField);
                this._fieldsContainer.appendChild(fieldWrapper);

                // Ensure boolean value is correctly set after appending using setVal if available
                 if (config.type === 'checkbox' || config.type === 'switch' || config.type === 'boolean') {
                     // Use requestAnimationFrame or Promise.resolve() to wait for potential internal rendering
                     Promise.resolve().then(() => {
                         if (typeof inputField.setVal === 'function') {
                             try {
                                inputField.setVal(Boolean(currentValue));
                             } catch (e) {
                                 console.error(`ObjectEditForm: Error setting initial value for boolean field "${key}" using setVal`, e);
                             }
                         } else {
                              // Fallback if setVal doesn't exist (might rely on attribute only)
                         }
                     });
                 }
            }
        }
    }

    _renderActions() {
        this._actionsContainer.innerHTML = ''; // Clear previous actions

        // Cancel Button
        const cancelButton = document.createElement('button');
        cancelButton.type = "button"; // Prevent default form submission
        cancelButton.textContent = 'Cancel';
        cancelButton.classList.add('cancel-btn');
        cancelButton.dataset.action = 'cancel';
        this._actionsContainer.appendChild(cancelButton);

        // Save Button (must be type submit OR we trigger validation manually)
        const saveButton = document.createElement('button');
        saveButton.type = "submit"; // Use form submission to potentially trigger validation easily
        saveButton.textContent = 'Save';
        saveButton.classList.add('save-btn');
        saveButton.dataset.action = 'save'; // Still useful for our click handler
        this._actionsContainer.appendChild(saveButton);

        // Custom Actions
        this._customActions.forEach(action => {
            const customButton = document.createElement('button');
            customButton.type = "button"; // Usually custom actions shouldn't submit the form
            customButton.textContent = action.label;
            customButton.dataset.action = action.name;
            if (action.className) {
                customButton.classList.add(...action.className.split(' ').filter(Boolean));
            }
            this._actionsContainer.appendChild(customButton);
        });
    }

    /**
     * Updates the value attribute/property of existing c-inp elements.
     */
    _updateFieldValues() {
        const fields = this.shadowRoot.querySelectorAll('c-inp');
        fields.forEach(field => {
            const name = field.getAttribute('name');
            if (name && Object.hasOwnProperty.call(this._currentItem, name)) {
                const newValue = this._currentItem[name];
                 if (typeof field.setVal === 'function') {
                     try {
                        field.setVal(newValue); // Use c-inp's setter method
                     } catch (e) {
                         console.error(`ObjectEditForm: Error setting value for field "${name}" using setVal`, e);
                     }
                 } else {
                      // Fallback: try setting attribute (might not work for all types)
                      if (field.type === 'checkbox' || field.type === 'switch' || field.type === 'boolean') {
                           if (Boolean(newValue)) field.setAttribute('checked', '');
                           else field.removeAttribute('checked');
                           field.setAttribute('value', Boolean(newValue) ? 'true' : 'false');
                      } else {
                           field.setAttribute('value', String(newValue));
                      }
                      console.warn(`ObjectEditForm: Field "${name}" has no setVal method, attempting attribute update.`);
                 }
            } else if (name) {
                 // Reset if key no longer exists in currentItem
                 if (typeof field.setVal === 'function') {
                     try { field.setVal(null); } catch (e) { /* ignore */ }
                 } else {
                      field.removeAttribute('value');
                      field.removeAttribute('checked');
                 }
            }
             // Clear potential validation error styling on reset/update
             const fieldWrapper = field.closest('.field-wrapper');
             if(fieldWrapper) fieldWrapper.classList.remove('invalid');
        });
    }


    // --- EVENT HANDLERS ---

    _handleInputChange(event) {
        // Listen to 'change' or 'input' events bubbling from c-inp
        // Assuming c-inp dispatches a 'change' event with detail { name, value }
        if (event.target.tagName === 'C-INP' && event.detail && event.detail.name !== undefined) {
            const { name, value } = event.detail;
            // Update internal current state immediately
            this._currentItem[name] = value;

             // Remove validation error style on change
             const fieldWrapper = event.target.closest('.field-wrapper');
             if(fieldWrapper) fieldWrapper.classList.remove('invalid');


            // Dispatch an event indicating a field changed
            this.dispatchEvent(new CustomEvent('field-change', {
                detail: { name, value },
                bubbles: true,
                composed: true
            }));

        } else if (event.target.tagName === 'C-INP') {
             // Fallback if event.detail is not structured as expected
             const name = event.target.getAttribute('name');
             if (name) {
                 let value;
                 try {
                     if (typeof event.target.getVal === 'function') {
                        value = event.target.getVal();
                     } else {
                         // Fallback value retrieval
                         const internalInput = event.target.shadowRoot?.querySelector('input, select, textarea');
                         if (internalInput) {
                             value = internalInput.type === 'checkbox' ? internalInput.checked : internalInput.value;
                         }
                     }

                    if (value !== undefined) {
                        this._currentItem[name] = value;
                        const fieldWrapper = event.target.closest('.field-wrapper');
                        if(fieldWrapper) fieldWrapper.classList.remove('invalid');
                        this.dispatchEvent(new CustomEvent('field-change', {
                            detail: { name, value },
                            bubbles: true,
                            composed: true
                        }));
                    }
                 } catch (e) {
                     console.error(`ObjectEditForm: Could not get value from c-inp field "${name}" on change event.`, e);
                 }
             }
        }
    }

     _handleSubmit(event) {
        event.preventDefault(); // Prevent actual form submission
        console.log("Form submit intercepted");
        this._handleSaveAction(); // Call the save logic
     }

    _handleActionClick(event) {
        const clickedElement = event.target;
        if (clickedElement.tagName === 'BUTTON' && clickedElement.dataset.action) {
            const action = clickedElement.dataset.action;

            if (action === 'save') {
                 // Submit event handles save, so click handler only acts as fallback if needed
                 // This might be redundant if button is always type="submit"
                 // if (event.type === 'click') { this._handleSaveAction(); }
            } else if (action === 'cancel') {
                 this.dispatchEvent(new CustomEvent('cancel-edit', {
                    detail: null, // No data needed for cancel
                    bubbles: true,
                    composed: true
                }));
                 this.reset(); // Optionally reset the form on cancel
            } else {
                // Custom Action
                const currentData = this.getCurrentData(); // Get current data for custom actions
                this.dispatchEvent(new CustomEvent(action, {
                    detail: currentData,
                    bubbles: true,
                    composed: true
                }));
            }
        }
    }

    _handleSaveAction() {
         console.log("Handling save action...");
         if (this.validate()) {
            console.log("Form is valid. Dispatching save-item.");
            const currentData = this.getCurrentData();
            // Update initial state on successful save, so reset goes to the saved state
            try {
                this._initialItem = JSON.parse(JSON.stringify(currentData));
            } catch(e) {
                 console.error('ObjectEditForm: Error updating initialItem after save', e);
            }

            this.dispatchEvent(new CustomEvent('save-item', {
                detail: currentData,
                bubbles: true,
                composed: true
            }));
        } else {
            console.warn('ObjectEditForm: Validation failed. Save prevented.');
            // Optionally focus the first invalid field
            const firstInvalid = this.shadowRoot.querySelector('.field-wrapper.invalid c-inp');
            if (firstInvalid) {
                 try {
                    // Check if focus method exists
                    if (typeof firstInvalid.focus === 'function') {
                        firstInvalid.focus();
                    } else {
                         // Try focusing internal input as fallback
                         const internalInput = firstInvalid.shadowRoot?.querySelector('input, select, textarea');
                         internalInput?.focus();
                    }
                 } catch(e) {
                     console.warn('ObjectEditForm: Could not focus first invalid field.', e);
                 }
            }
        }
    }


    // --- LIFECYCLE CALLBACKS ---

    connectedCallback() {
        // Add listeners
        this._actionsContainer.addEventListener('click', this._handleActionClick);
        // Listen for changes bubbling up from c-inp components
        this._formContainer.addEventListener('change', this._handleInputChange);
         // Listen for the form submission attempt
        this._formContainer.addEventListener('submit', this._handleSubmit);


        // Initial render if data/config were set before connection
        if (this._fieldsContainer.innerHTML === '' && Object.keys(this._fieldConfigs).length > 0) {
            this.render();
        } else if (this._actionsContainer.innerHTML === '') {
             this._renderActions(); // Ensure actions are rendered even if no fields
        }

        // Propagate initial dark mode setting to c-inp elements if needed
        if (this.hasAttribute('darkmode')) {
            this.shadowRoot.querySelectorAll('c-inp').forEach(inp => inp.setAttribute('darkmode', ''));
        }
    }

    disconnectedCallback() {
        // Remove listeners
        this._actionsContainer.removeEventListener('click', this._handleActionClick);
        this._formContainer.removeEventListener('change', this._handleInputChange);
        this._formContainer.removeEventListener('submit', this._handleSubmit);
    }

    static get observedAttributes() {
        return ['darkmode']; // Observe darkmode attribute
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'darkmode' && oldValue !== newValue) {
            const isDarkMode = newValue !== null;
            // Update internal c-inp elements
            this.shadowRoot.querySelectorAll('c-inp').forEach(inp => {
                if (isDarkMode) {
                    inp.setAttribute('darkmode', '');
                } else {
                    inp.removeAttribute('darkmode');
                }
            });
             // Optionally re-render actions if styles depend heavily on darkmode attribute
             // this._renderActions();
        }
    }
}

// Define the custom element
if (!customElements.get('object-edit-form')) {
    customElements.define('object-edit-form', ObjectEditForm);
}


// ==========================================================================
//    DynamicObjectDisplay - Sin cambios, no hereda de BaseDisplayComponent
// ==========================================================================
/**
 * @element dynamic-object-display
 * @description A component that displays a single object and allows switching
 *              to an edit mode using object-edit-form.
 *
 * @attr {Boolean} darkmode - Applies dark mode styling.
 * @attr {String} header-key - The key in the item object to use as the display header.
 *
 * @prop {Object} item - The JavaScript object to display/edit. Use `setConfig()` or `setItem()`.
 * @prop {Object} fieldConfigs - Configuration for displaying/editing fields. Use `setConfig()`.
 *
 * @fires item-updated - Dispatched after a successful save in edit mode. Detail contains the updated item.
 * @fires delete-item - Dispatched when the 'Delete' button (in display mode) is clicked. Detail contains the item.
 * @fires {CustomEvent} [custom-action-name] - Dispatched when a custom action button (in display mode) is clicked. Detail contains the item.
 *
 * @method setConfig (item = {}, fieldConfigs = {}) - Sets the data object and field configurations, resets mode to 'display'.
 * @method setItem (item = {}) - Updates the data object while preserving the current mode and configurations.
 * @method addAction (actionName, buttonLabel, cssClass = '') - Adds a custom button ONLY to the display mode actions.
 */
class DynamicObjectDisplay extends HTMLElement {

    constructor() {
        super();

        // Internal State
        this._mode = 'display'; // 'display' or 'edit'
        this._currentItem = {};
        this._fieldConfigs = {};
        this._headerKey = null;
        this._customActions = []; // Actions for display mode

        // Shadow DOM
        this.attachShadow({ mode: 'open' });

        // Style
        const style = document.createElement('style');
        style.textContent = this.getStyles();

        // Main Container (will hold either display or edit view)
        this._container = document.createElement('div');
        this._container.classList.add('dynamic-container');

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this._container);

        // Bind methods
        this._handleDisplayActionClick = this._handleDisplayActionClick.bind(this);
        this._handleSave = this._handleSave.bind(this);
        this._handleCancel = this._handleCancel.bind(this);
        this._handleExternalFieldChange = this._handleExternalFieldChange.bind(this); // Handle form field changes
    }

    static get observedAttributes() {
        // Observe attributes that affect rendering directly
        return ['darkmode', 'header-key'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            let needsRender = false;
            if (name === 'header-key') {
                this._headerKey = newValue;
                needsRender = true; // Header change requires re-render
            }
            if (name === 'darkmode') {
                 // Dark mode might only require CSS update, but re-render is safer if structure depends on it
                 needsRender = true;
            }

            // Re-render if connected and needed
            if (needsRender && this.isConnected) {
                this.render();
            }
        }
    }

    getStyles() {
        // Combine styles for the container and the display mode (mimicking ObjectCards card)
        // Include styles for :host([darkmode])
        return /*css*/`
            :host {
                display: block;
                font-family: sans-serif;
                margin-bottom: 15px;
                /* Ensure container takes up space */
            }

            .dynamic-container {
                 /* Basic container doesn't need much styling itself */
                 position: relative; /* Context for potential absolute elements if needed */
            }

            /* --- Display Mode Styles (mimic ObjectCards card) --- */
            .display-card {
                background-color: #fff;
                border: 1px solid #eee;
                border-radius: 8px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transition: box-shadow 0.2s;
            }
            :host([darkmode]) .display-card {
                background-color: #333;
                border-color: #555;
                color: #eee;
            }

            .display-card:hover {
                 box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            }
            :host([darkmode]) .display-card:hover {
                 box-shadow: 0 2px 8px rgba(255,255,255,0.1);
            }


            .display-header {
                background-color: #f5f5f5;
                padding: 12px 16px;
                font-weight: bold;
                border-bottom: 1px solid #eee;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            :host([darkmode]) .display-header {
                background-color: #444;
                border-bottom-color: #555;
            }

            .display-content {
                padding: 16px;
                flex-grow: 1;
                 /* Simple grid for properties */
                 display: grid;
                 grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                 gap: 10px 15px;
            }


            .display-property {
                margin-bottom: 8px;
                display: flex;
                flex-direction: column; /* Stack label and value */
                gap: 2px;
            }

            .display-property-label {
                font-weight: 500;
                color: #666;
                font-size: 0.8em;
                text-transform: capitalize;
                margin-bottom: 2px;
            }
             :host([darkmode]) .display-property-label {
                 color: #bbb;
             }

            .display-property-value {
                word-break: break-word;
                font-size: 0.95em;
            }
             /* Display boolean/switch values nicely */
             .display-property-value[data-type="boolean"],
             .display-property-value[data-type="switch"],
             .display-property-value[data-type="checkbox"] {
                 font-style: italic;
                 color: #333;
             }
             :host([darkmode]) .display-property-value[data-type="boolean"],
             :host([darkmode]) .display-property-value[data-type="switch"],
             :host([darkmode]) .display-property-value[data-type="checkbox"] {
                  color: #ddd;
             }


            .display-actions {
                padding: 10px 16px;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                background-color: #fafafa;
                border-top: 1px solid #eee;
            }
            :host([darkmode]) .display-actions {
                background-color: #3a3a3a;
                border-top-color: #555;
            }


            /* --- Button Styles (can be shared or specific) --- */
            .display-actions button { /* Basic button style */
                padding: 6px 12px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 0.9em;
                transition: all 0.2s;
                background-color: #fff;
            }
            .display-actions button:hover { filter: brightness(0.95); }
            :host([darkmode]) .display-actions button {
                 background-color: #555;
                 border-color: #777;
                 color: #eee;
            }
             :host([darkmode]) .display-actions button:hover {
                 filter: brightness(1.1);
             }


            /* Specific button styles */
            .edit-btn { background-color: #CCE5FF; border-color: #b8daff; color: #004085; }
            .delete-btn { background-color: #F8D7DA; color: #721c24; border-color: #f5c6cb; }
             :host([darkmode]) .edit-btn { background-color: #0056b3; border-color: #0056b3; color: white; }
             :host([darkmode]) .delete-btn { background-color: #b81c2c; border-color: #b81c2c; color: white; }

            /* --- Edit Mode Styles --- */
            /* object-edit-form should have its own styles, but we might need positioning */
            object-edit-form {
                display: block; /* Ensure it takes space */
            }
        `;
    }

    // --- PUBLIC API ---

    /**
     * Sets the data, config, and resets mode to display.
     */
    setConfig(item = {}, fieldConfigs = {}) {
        // Deep copy to prevent external modification issues
        try {
            this._currentItem = JSON.parse(JSON.stringify(item || {}));
        } catch(e) {
             console.error('DynamicObjectDisplay: Error deep copying item in setConfig', e);
             this._currentItem = {};
        }
        this._fieldConfigs = fieldConfigs || {};
        this._mode = 'display'; // Always reset to display on new config
        this._headerKey = this.getAttribute('header-key'); // Ensure header key is synced
        if (this.isConnected) {
            this.render();
        }
    }

    /**
     * Updates the item data, preserving current mode. Useful for external updates.
     */
    setItem(item = {}) {
         try {
             this._currentItem = JSON.parse(JSON.stringify(item || {}));
         } catch(e) {
             console.error('DynamicObjectDisplay: Error deep copying item in setItem', e);
             return; // Keep old item on error
         }
         // Re-render the current mode with the new data if connected
         if (this.isConnected) {
             this.render();
         }
    }

    /**
     * Adds a custom action button shown ONLY in display mode.
     */
    addAction(actionName, buttonLabel, cssClass = '') {
        // Basic validation
        if (typeof actionName !== 'string' || !actionName || typeof buttonLabel !== 'string') {
             console.error('DynamicObjectDisplay: Invalid arguments for addAction.');
             return;
        }
         // Allow redefinition
         this._customActions = this._customActions.filter(a => a.name !== actionName);
         this._customActions.push({ name: actionName, label: buttonLabel, className: cssClass });
         // If currently in display mode and connected, re-render to show the new button
         if (this._mode === 'display' && this.isConnected) {
             this.render();
         }
    }

    // --- RENDER LOGIC ---

    render() {
        // Clear previous content
        this._container.innerHTML = '';
        // Remove old listeners if any were attached directly to children
        // (Event delegation is generally preferred)

        if (!this._currentItem || Object.keys(this._currentItem).length === 0 || !this._fieldConfigs || Object.keys(this._fieldConfigs).length === 0) {
             this._container.textContent = 'No item or configuration provided.';
             return;
        }

        // Apply dark mode to container if needed (relying on :host selector mostly)
        // this._container.classList.toggle('darkmode', this.hasAttribute('darkmode'));


        if (this._mode === 'display') {
            this._renderDisplayView();
        } else if (this._mode === 'edit') {
            this._renderEditView();
        }
    }

    _renderDisplayView() {
        const card = document.createElement('div');
        card.classList.add('display-card');

        // 1. Header (Optional)
        const effectiveHeaderKey = this._headerKey || this.getAttribute('header-key');
        if (effectiveHeaderKey && this._currentItem[effectiveHeaderKey] !== undefined) {
            const header = document.createElement('div');
            header.classList.add('display-header');
            header.textContent = String(this._currentItem[effectiveHeaderKey]);
            card.appendChild(header);
        }

        // 2. Content (Properties based on fieldConfigs)
        const content = document.createElement('div');
        content.classList.add('display-content');

        for (const key in this._fieldConfigs) {
             // Don't show the header key again in the main content if it was used in the header
            if (key === effectiveHeaderKey) continue;
            // Skip hidden fields
            if (this._fieldConfigs[key]?.hidden) continue;


            if (Object.hasOwnProperty.call(this._fieldConfigs, key)) {
                const config = this._fieldConfigs[key];
                const value = this._currentItem[key];

                const propContainer = document.createElement('div');
                propContainer.classList.add('display-property');

                const label = document.createElement('div');
                label.classList.add('display-property-label');
                label.textContent = config.label || key; // Use config label or key
                propContainer.appendChild(label);

                const valueEl = document.createElement('div');
                valueEl.classList.add('display-property-value');

                 // Basic formatting for different types
                 const displayType = config.type || 'text';
                 valueEl.dataset.type = displayType; // Add type for styling hooks

                 if (displayType === 'boolean' || displayType === 'switch' || displayType === 'checkbox') {
                    valueEl.textContent = Boolean(value) ? (config.trueLabel || 'Yes') : (config.falseLabel || 'No');
                 } else if (displayType === 'select' && config.options && Array.isArray(config.options)) {
                     const selectedOption = config.options.find(opt => String(opt.value) === String(value)); // Compare as strings
                     valueEl.textContent = selectedOption ? selectedOption.label : (value ?? ''); // Show label if found, else raw value
                 } else if (value === undefined || value === null) {
                    valueEl.textContent = ''; // Empty string for null/undefined
                 } else {
                    valueEl.textContent = String(value);
                 }


                propContainer.appendChild(valueEl);
                content.appendChild(propContainer);
            }
        }
        card.appendChild(content);

        // 3. Actions
        const actions = document.createElement('div');
        actions.classList.add('display-actions');
        actions.addEventListener('click', this._handleDisplayActionClick); // Use event delegation

        // Standard Actions (Edit/Delete) - Consider making these configurable
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.dataset.action = 'edit';
        actions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.dataset.action = 'delete';
        actions.appendChild(deleteButton);

        // Custom Actions
        this._customActions.forEach(actionDef => {
            const customButton = document.createElement('button');
            customButton.textContent = actionDef.label;
            customButton.dataset.action = actionDef.name;
             if (actionDef.className) {
                customButton.classList.add(...actionDef.className.split(' ').filter(Boolean));
            }
            actions.appendChild(customButton);
        });

        card.appendChild(actions);

        this._container.appendChild(card);
    }

    _renderEditView() {
        if (!customElements.get('object-edit-form')) {
            this._container.textContent = 'Error: object-edit-form component not defined.';
            console.error('DynamicObjectDisplay: Cannot render edit view, object-edit-form is not defined.');
            return;
        }

        const editor = document.createElement('object-edit-form');

        // Propagate dark mode
        if (this.hasAttribute('darkmode')) {
            editor.setAttribute('darkmode', '');
        } else {
            editor.removeAttribute('darkmode');
        }

        // Set data and configuration for the editor
        // Pass a copy to prevent the editor from directly modifying our internal _currentItem until save
        try {
            editor.setConfig(JSON.parse(JSON.stringify(this._currentItem)), this._fieldConfigs);
        } catch (e) {
             console.error('DynamicObjectDisplay: Error setting config on object-edit-form', e);
             this._container.textContent = 'Error initializing editor.';
             return;
        }


        // Add event listeners for save and cancel
        editor.addEventListener('save-item', this._handleSave);
        editor.addEventListener('cancel-edit', this._handleCancel);
        // Listen for field changes within the form if needed for complex logic
        editor.addEventListener('field-change', this._handleExternalFieldChange);

        this._container.appendChild(editor);
    }

    // --- EVENT HANDLERS ---

    _handleDisplayActionClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;

        if (action === 'edit') {
            this._switchToEdit();
        } else if (action === 'delete') {
            // Dispatch delete event with the current item data (copy)
            try {
                this.dispatchEvent(new CustomEvent('delete-item', {
                    detail: JSON.parse(JSON.stringify(this._currentItem)), // Send a copy
                    bubbles: true,
                    composed: true
                }));
            } catch (e) {
                 console.error('DynamicObjectDisplay: Error dispatching delete-item event', e);
            }
        } else {
            // Custom action from display mode
             try {
                this.dispatchEvent(new CustomEvent(action, {
                    detail: JSON.parse(JSON.stringify(this._currentItem)), // Send a copy
                    bubbles: true,
                    composed: true
                }));
            } catch (e) {
                 console.error(`DynamicObjectDisplay: Error dispatching custom action "${action}" event`, e);
            }
        }
    }

    _switchToEdit() {
        this._mode = 'edit';
        this.render();
    }

    _switchToDisplay() {
        this._mode = 'display';
        this.render();
    }

    _handleSave(event) {
        console.log('DynamicObjectDisplay received save-item:', event.detail);
        // Update the internal current item with the data from the editor (already a copy from editor)
        try {
            this._currentItem = JSON.parse(JSON.stringify(event.detail));

            // Dispatch an event indicating the item was updated
            this.dispatchEvent(new CustomEvent('item-updated', {
                detail: JSON.parse(JSON.stringify(this._currentItem)), // Send a fresh copy
                bubbles: true,
                composed: true
            }));

            // Switch back to display mode
            this._switchToDisplay();
        } catch (e) {
             console.error('DynamicObjectDisplay: Error processing save-item event', e);
             // Optionally stay in edit mode or show an error
        }
    }

    _handleCancel(event) {
        console.log('DynamicObjectDisplay received cancel-edit');
        // Simply switch back to display mode without updating _currentItem
        this._switchToDisplay();
    }

     _handleExternalFieldChange(event) {
         // Optional: React to field changes within the editor *before* saving
         // console.log('Field changed in editor:', event.detail.name, event.detail.value);
     }


    // --- LIFECYCLE ---

    connectedCallback() {
        // Render initial state if config/item were set before connection
        if (this._container.innerHTML === '' && Object.keys(this._fieldConfigs).length > 0) {
            this.render();
        }
    }

    disconnectedCallback() {
        // Clean up listeners if they weren't managed by event delegation
        // or attached to children that are removed in render()
        // In this setup, render() clears the container, implicitly removing
        // listeners attached to the editor form. Display mode uses delegation.
    }
}

// Define the custom element
if (!customElements.get('dynamic-object-display')) {
    customElements.define('dynamic-object-display', DynamicObjectDisplay);
}
