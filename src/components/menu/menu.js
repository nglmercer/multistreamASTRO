class CustomPopup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open', delegatesFocus: true });
        this._options = [];
        this.container = document.createElement('div');
        this.lastFocusedElement = null;
        
        this.container.style.cssText = `
            position: fixed;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            background-color: inherit;
            display: none;
            z-index: 1000;
            color-scheme: light dark;
            font-family: inherit;
            justify-content: center;
            align-items: stretch;
            flex-direction: column;
            min-width: inherit;
            width: 100%;
            max-width: 200px;
            border-radius: 4px;
            overflow: hidden;
        `;
    
        const style = document.createElement('style');
        style.textContent = `
            .material-symbols-rounded {
                font-family: inherit;
                font-size: 24px;
                margin-right: 10px;
            }
            .popup-option {
                cursor: pointer;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                user-select: none;
            }
            .popup-option:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            .default-font {
                font-family: Arial, sans-serif;
            }
            @media (prefers-color-scheme: dark) {
                .popup-option:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
            }
        `;
    
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this.container);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    // Getter y setter para las opciones
    get options() {
        return this._options;
    }

    set options(newOptions) {
        this._options = newOptions;
        this.render();
    }

    // Método para agregar una única opción
    addOption(html, callback) {
        this._options.push({
            html,
            callback: (event) => {
                callback(event);
                this.hide();
            }
        });
        this.render();
        return this._options.length - 1; // Retorna el índice de la opción agregada
    }

    // Método para establecer múltiples opciones de una vez
    setOptions(options) {
        this._options = options.map(option => ({
            html: option.html,
            callback: (event) => {
                option.callback(event);
                this.hide();
            }
        }));
        this.render();
    }

    // Método para limpiar todas las opciones
    clearOptions() {
        this._options = [];
        this.render();
    }

    // Método para remover una opción específica por índice
    removeOption(index) {
        if (index >= 0 && index < this._options.length) {
            this._options.splice(index, 1);
            this.render();
            return true;
        }
        return false;
    }

    render() {
        this.container.innerHTML = '';
        this._options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'popup-option';
            optionElement.innerHTML = option.html;
            optionElement.addEventListener('click', option.callback);
            this.container.appendChild(optionElement);
        });
    }

    connectedCallback() {
        this.render();
    }

    handleClickOutside(event) {
        const path = event.composedPath();
        if (!path.includes(this.container) && !path.includes(this.lastFocusedElement)) {
            this.hide();
        }
    }
    
    show(x, y) {
        this.container.style.display = 'flex';
        if (x !== undefined && y !== undefined) {
            this.moveTo(x, y);
        }
        document.addEventListener('click', this.handleClickOutside);
    }
    
    hide() {
        this.container.style.display = 'none';
        document.removeEventListener('click', this.handleClickOutside);
    }
    
    moveTo(x, y) {
        const rect = this.container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
    
        if (x + rect.width > viewportWidth) {
            x = viewportWidth - rect.width - 10;
        }
        if (y + rect.height > viewportHeight) {
            y = viewportHeight - rect.height - 10;
        }
        this.container.style.left = `${Math.max(0, x)}px`;
        this.container.style.top = `${Math.max(0, y)}px`;
    }
    
    showAtElement(element) {
        const rect = element.getBoundingClientRect();
        this.show(rect.left, rect.bottom);
        this.lastFocusedElement = element;
    }
    
    disconnectedCallback() {
        document.removeEventListener('click', this.handleClickOutside);
    }
}

// Registrar el componente
if (!customElements.get('custom-popup')) {
    customElements.define('custom-popup', CustomPopup);
}