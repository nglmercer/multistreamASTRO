import { LitElement, html, css } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js'; // Para atributos opcionales
import { map } from 'lit/directives/map.js';
import { IndexedDBManager, DBObserver, databases } from './idb.js';
function safeParse(value) {
  try {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      return value;
    }

    if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
      try {
        return JSON.parse(value);
      } catch (error) {
        const fixedJson = value
          .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']+)'/g, ': "$1"');

        return JSON.parse(fixedJson);
      }
    }

    return value;
  } catch (error) {
    console.error("Error al parsear JSON:", error, "Valor recibido:", value);
    return value;
  }
}

export class CDlg extends LitElement {
  static get properties() {
    return {
      title: { type: String, reflect: true },
      description: { type: String, reflect: true },
      theme: { type: String, reflect: true },
      options: { type: Array },
    };
  }

  constructor() {
    super();
    this.title = '';
    this.description = '';
    this.theme = 'light';
    this.options = [];
  }

  static get styles() {
    return css`
      :host {
        --dlg-padding: 1.5rem;
        --dlg-border-radius: 8px;
        --dlg-font-family: system-ui, -apple-system, sans-serif;
        --dlg-title-size: 1.5rem;
        --dlg-title-weight: 600;
        --dlg-desc-size: 1rem;
        --dlg-desc-opacity: 0.8;
        --dlg-desc-max-height: 500px;
        --dlg-button-padding: 0.5rem 1rem;
        --dlg-button-radius: 4px;
        --dlg-button-font-size: 0.875rem;
        --dlg-options-gap: 0.5rem;
        --dlg-slot-margin-top: 1rem;
        --dlg-transition-speed: 0.2s;

        --dlg-text-color: #1a1a1a;
        --dlg-border-color: #e5e5e5;
        --dlg-bg-color: #ffffff;
        --dlg-button-cancel-bg: #e5e5e5;
        --dlg-button-cancel-text: #1a1a1a;
        --dlg-button-cancel-hover-bg: #d9d9d9;

        --dlg-dark-text-color: #ffffff;
        --dlg-dark-border-color: #333333;
        --dlg-dark-bg-color: #2a2a2a;
        --dlg-dark-button-cancel-bg: #444444;
        --dlg-dark-button-cancel-text: #ffffff;
        --dlg-dark-button-cancel-hover-bg: #555555;

        --dlg-button-save-bg: #007bff;
        --dlg-button-save-text: white;
        --dlg-button-save-hover-bg: #0056b3;
        --dlg-button-delete-bg: #dc3545;
        --dlg-button-delete-text: white;
        --dlg-button-delete-hover-bg: #bd2130;

        display: block;
        font-family: var(--dlg-font-family);
      }

      .container {
        padding: var(--dlg-padding);
        border-radius: var(--dlg-border-radius);
        transition: background-color var(--dlg-transition-speed) ease, border-color var(--dlg-transition-speed) ease, color var(--dlg-transition-speed) ease;
        border: 1px solid var(--dlg-border-color);
        background-color: var(--dlg-bg-color);
        color: var(--dlg-text-color);
      }

      .container.dark {
        border-color: var(--dlg-dark-border-color);
        background-color: var(--dlg-dark-bg-color);
        color: var(--dlg-dark-text-color);
      }

      .title {
        font-size: var(--dlg-title-size);
        font-weight: var(--dlg-title-weight);
        margin: 0 0 0.5rem 0;
      }

      .description {
        font-size: var(--dlg-desc-size);
        opacity: var(--dlg-desc-opacity);
        max-height: var(--dlg-desc-max-height);
        overflow-y: auto;
        margin: 0 0 1rem 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .options {
        display: flex;
        gap: var(--dlg-options-gap);
        flex-wrap: wrap;
        margin-top: var(--dlg-padding);
        justify-content: flex-end;
      }

      ::slotted(*) {
        display: block;
        margin-top: var(--dlg-slot-margin-top);
        margin-bottom: var(--dlg-slot-margin-top);
      }

      button {
        padding: var(--dlg-button-padding);
        border-radius: var(--dlg-button-radius);
        border: none;
        cursor: pointer;
        font-size: var(--dlg-button-font-size);
        font-family: inherit;
        transition: background-color var(--dlg-transition-speed) ease, opacity var(--dlg-transition-speed) ease;
        background-color: transparent;
        color: inherit;
        border: 1px solid transparent;
      }

      button:hover {
         opacity: 0.85;
      }

      .save-btn {
        background-color: var(--dlg-button-save-bg);
        color: var(--dlg-button-save-text);
        border-color: var(--dlg-button-save-bg);
      }
      .save-btn:hover {
        background-color: var(--dlg-button-save-hover-bg);
        border-color: var(--dlg-button-save-hover-bg);
        opacity: 1;
      }

      .cancel-btn {
        background-color: var(--dlg-button-cancel-bg);
        color: var(--dlg-button-cancel-text);
        border-color: var(--dlg-button-cancel-bg);
      }
      .cancel-btn:hover {
        background-color: var(--dlg-button-cancel-hover-bg);
        border-color: var(--dlg-button-cancel-hover-bg);
        opacity: 1;
      }
      .container.dark .cancel-btn {
        background-color: var(--dlg-dark-button-cancel-bg);
        color: var(--dlg-dark-button-cancel-text);
        border-color: var(--dlg-dark-button-cancel-bg);
      }
      .container.dark .cancel-btn:hover {
        background-color: var(--dlg-dark-button-cancel-hover-bg);
        border-color: var(--dlg-dark-button-cancel-hover-bg);
      }

      .delete-btn {
        background-color: var(--dlg-button-delete-bg);
        color: var(--dlg-button-delete-text);
        border-color: var(--dlg-button-delete-bg);
      }
      .delete-btn:hover {
        background-color: var(--dlg-button-delete-hover-bg);
        border-color: var(--dlg-button-delete-hover-bg);
        opacity: 1;
      }
    `;
  }

  render() {
    return html`
      <div class="container ${this.theme}">
        <h2 class="title">${this.title}</h2>
        <pre class="description">${this.description}</pre>
        <slot></slot>
        <div class="options">
          ${this.options.map((opt, i) => 
            html`<button 
              @click=${(e) => this._handleOptionClick(e, i)}
              data-index="${i}"
              class="${opt.class || ''}"
              style="${opt.style || ''}"
            >${opt.label}</button>`
          )}
        </div>
      </div>
    `;
  }

  _handleOptionClick(e, index) {
    if (this.options[index]?.callback && typeof this.options[index].callback === 'function') {
      this.options[index].callback(e);
    } else {
      console.warn(`No valid callback found for option index ${index}`);
    }
  }
}

export class DlgCont extends LitElement {
  static get properties() {
    return {
      visible: { type: Boolean, reflect: true },
      required: { type: Boolean, reflect: true }
    };
  }

  constructor() {
    super();
    this.visible = false;
    this.required = false;
  }

  static get styles() {
    return css`
      :host {
        --dlg-overlay-bg: rgba(0, 0, 0, 0.5);
        --dlg-z-index: 1000;
        --dlg-transition-duration: 0.3s;
        --dlg-content-max-height: 90dvh;
        --dlg-content-border-radius: 16px;
        --dlg-content-padding: 8px;
        --dlg-content-bg: inherit;
        --dlg-content-color: inherit;

        display: block;
        background: inherit;
        color: inherit;
      }

      .dlg-ov {
        position: fixed;
        inset: 0;
        background-color: var(--dlg-overlay-bg);

        display: flex;
        align-items: center;
        justify-content: center;

        z-index: var(--dlg-z-index);

        opacity: 0;
        visibility: hidden;

        transition: opacity var(--dlg-transition-duration) ease,
                    visibility var(--dlg-transition-duration) ease;
      }

      .dlg-cnt {
        max-height: var(--dlg-content-max-height);
        overflow-y: auto;

        background: var(--dlg-content-bg);
        color: var(--dlg-content-color);
        border-radius: var(--dlg-content-border-radius);
        padding: var(--dlg-content-padding);

        transform: scale(0.95);
        transition: transform var(--dlg-transition-duration) ease;
        transition-property: transform;
      }

      .dlg-ov.visible {
        opacity: 1;
        visibility: visible;
      }

      .dlg-ov.visible .dlg-cnt {
        transform: scale(1);
      }
    `;
  }

  render() {
    return html`
      <div class="dlg-ov ${this.visible ? 'visible' : ''}" @click="${this._handleOverlayClick}">
        <div class="dlg-cnt">
          <slot></slot>
        </div>
      </div>
    `;
  }

  _handleOverlayClick(e) {
    if (e.target === e.currentTarget && !this.required) {
      console.log("Overlay click event:", e, e.target === e.currentTarget,this.required);
      this.hide();
    }
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }
}



export class CInp extends LitElement {
  static get properties() {
    return {
      type: { type: String, reflect: true },
      id: { type: String, reflect: true },
      name: { type: String, reflect: true },
      // Usamos .value para la propiedad interna, puede ser de cualquier tipo
      value: { type: String }, // El atributo será string, la propiedad puede ser otra cosa
      placeholder: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
      readonly: { type: Boolean, reflect: true },
      darkmode: { type: Boolean, reflect: true },
      // Es mejor manejar options como Array internamente
      options: { type: Array },
      required: { type: Boolean, reflect: true },
      title: { type: String, reflect: true },
      pattern: { type: String, reflect: true },
      _isValid: { type: Boolean, state: true }, // Estado interno para la validez
      _internalValue: { state: true } // Estado interno para manejar el valor real (puede no ser string)
    };
  }

  constructor() {
    super();
    this.type = 'text';
    // Valores por defecto
    this.disabled = false;
    this.readonly = false;
    this.darkmode = false;
    this.options = []; // Inicializar como array vacío
    this.required = false;
    this._isValid = true;
    this.value = ''; // Inicializa value como string vacío
    this._internalValue = ''; // Y el valor interno también
    // id, name, placeholder, title, pattern se inicializan como undefined por defecto
  }

    // Método para manejar cuando el atributo 'options' (string) cambia
    attributeChangedCallback(name, oldVal, newVal) {
        super.attributeChangedCallback(name, oldVal, newVal);
        if (name === 'options' && newVal !== oldVal && typeof newVal === 'string') {
            try {
                this.options = safeParse(newVal); // Parsea el string a Array
            } catch (e) {
                console.error(`Error parsing options attribute for c-inp [${this.id || this.name}]:`, e);
                this.options = []; // Resetea a array vacío en caso de error
            }
        }
        // Actualizar valor interno si 'value' cambia desde el exterior
        if (name === 'value' && newVal !== oldVal) {
             this._internalValue = this._parseValueForInternal(newVal);
        }
    }

   // Hook para actualizar el valor interno cuando la propiedad 'value' cambia
   willUpdate(changedProperties) {
        if (changedProperties.has('value')) {
            this._internalValue = this._parseValueForInternal(this.value);
        }
   }

   _parseValueForInternal(val) {
       if (this.type === 'checkbox' || this.type === 'switch' || this.type === 'boolean') {
           // Convertir 'true'/'false' string a booleano si es necesario
           return String(val).toLowerCase() === 'true';
       }
        if (this.type === 'number') {
           return (val === '' || val === null || val === undefined) ? null : Number(val);
       }
       return val ?? ''; // Devuelve string vacío para null/undefined en otros casos
   }


  static get styles() {
    // Tus estilos (con variables CSS mejoradas para defaults)
    return css`
      :host {
        display: block;
        margin: 0.5rem;
        padding: 0.5rem;
        color-scheme: light dark;
        /* Define variables default aquí para que se puedan sobreescribir */
        --inp-border-color: #ccc;
        --inp-disabled-bg: #f5f5f5;
        --inp-disabled-color: #888;
        --inp-slider-bg: #ccc;
        --inp-slider-knob: white;
      }
      :host([darkmode]) {
         /* Sobreescribe variables para dark mode */
        --inp-border-color: #555;
        --inp-disabled-bg: #222;
        --inp-disabled-color: #666;
        --inp-slider-bg: #555;
        --inp-slider-knob: #888;
      }

      /* Elimina el padding del host para que el contenedor interno lo controle */
      :host { padding: 0; }
      .inp-cont {
        display: flex;
        flex-direction: column;
        padding: 0.5rem; /* Mueve el padding aquí */
      }
       label { /* Estilo para mejor alineación de radios/checkboxes */
           display: inline-flex;
           align-items: center;
           margin-right: 10px;
           cursor: pointer;
       }

      input, textarea, select {
        padding: 0.5rem;
        border: 1px solid var(--inp-border-color); /* Usa la variable */
        border-radius: 4px;
        font-size: 14px;
        background-color: inherit;
        color: inherit;
        box-sizing: border-box; /* Importante para consistencia de tamaño */
        margin: 0; /* Resetea márgenes por defecto */
      }

      textarea { resize: vertical; min-height: 80px; } /* Ajustado min-height */

      input:disabled, textarea:disabled, select:disabled {
        background-color: var(--inp-disabled-bg); /* Usa la variable */
        cursor: not-allowed;
        color: var(--inp-disabled-color); /* Usa la variable */
      }

      .sw { position: relative; display: inline-block; width: 60px; height: 30px; }
      .sw input { opacity: 0; width: 0; height: 0; }
      .sldr { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--inp-slider-bg); transition: .4s; border-radius: 34px; }
      .sldr:before { position: absolute; content: ""; height: 22px; width: 22px; left: 4px; bottom: 4px; background-color: var(--inp-slider-knob); transition: .4s; border-radius: 50%; }
      input:checked + .sldr { background-color: #2196F3; }
      input:checked + .sldr:before { transform: translateX(28px); }

      input:focus, textarea:focus, select:focus {
        outline: none;
        border-color: #2196F3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
      }

      /* Aplica estilo inválido directamente al host o a un contenedor */
      :host([invalid]) .input-element {
         border-color: red !important; /* Usa !important con cuidado, o aumenta especificidad */
         box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2) !important;
      }
      /* Opcional: estilo para el host inválido */
       :host([invalid]) {
          /* Puedes añadir un borde al propio host si quieres */
          /* outline: 1px solid red; */
       }
    `;
  }

  render() {
    // El form ya no es necesario para la validación directa del input,
    // pero lo mantenemos por si se quiere usar el evento submit.
    // Añadimos el atributo 'invalid' al host basado en _isValid
    this.toggleAttribute('invalid', !this._isValid);

    return html`
      <form class="val-form" @submit="${this._handleSubmit}" novalidate>
        <div class="inp-cont">
          ${this._renderInput()}
        </div>
        <!-- Botón submit oculto si quieres habilitar submit con Enter -->
         <button type="submit" style="display: none;"></button>
      </form>
    `;
  }

  _renderInput() {
    // Usa ifDefined para atributos opcionales como pattern y title
    // Usa .value=${this._internalValue} para binding de propiedad (más robusto)
    // Usa ?checked para booleanos
    // Añade clase 'input-element' para targetear el estilo inválido
    const commonInputClass = 'input-element';

    switch (this.type) {
      case 'textarea':
        return html`<textarea
          class=${commonInputClass}
          id=${ifDefined(this.id)}
          name=${ifDefined(this.name)}
          .value=${this._internalValue ?? ''}
          placeholder=${ifDefined(this.placeholder)}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          title=${ifDefined(this.title)}
          pattern=${ifDefined(this.pattern)}
          @input=${this._handleInputChange}
          @change=${this._handleInputChange}
        ></textarea>`;

      case 'checkbox':
      case 'switch':
      case 'boolean':
        return html`
          <label class="sw">
            <input
              class=${commonInputClass}
              type="checkbox"
              id=${ifDefined(this.id)}
              name=${ifDefined(this.name)}
              .checked=${Boolean(this._internalValue)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              title=${ifDefined(this.title)}
              @change=${this._handleInputChange}
            >
            <span class="sldr"></span>
          </label>`;

      case 'select':
        return html`
          <select
            class=${commonInputClass}
            id=${ifDefined(this.id)}
            name=${ifDefined(this.name)}
            .value=${this._internalValue ?? ''}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            title=${ifDefined(this.title)}
            @change=${this._handleInputChange}
          >
            ${this.options.map(opt => html`
              <option
                value=${opt.value}
                ?selected=${opt.value == this._internalValue}
              >${opt.label}</option>
            `)}
          </select>`;

      case 'radio':
         // Los radios individuales no necesitan la clase 'input-element'
         // La validación (required) se aplica al grupo por el name
         // El estado inválido se manejaría en el host
        return html`
          ${this.options.map(opt => html`
            <label>
              <input type="radio"
                id=${`${this.id || this.name}_${opt.value}`}
                name=${ifDefined(this.name)}
                value=${opt.value}
                .checked=${opt.value == this._internalValue}
                ?disabled=${this.disabled}
                ?readonly=${this.readonly}
                ?required=${this.required}
                title=${ifDefined(this.title)}
                @change=${this._handleInputChange}
              >
              ${opt.label}
            </label>
          `)}
        `;

      default: // text, email, number, password, etc.
        return html`
          <input
            class=${commonInputClass}
            type=${this.type === 'string' ? 'text' : this.type}
            id=${ifDefined(this.id)}
            name=${ifDefined(this.name)}
            .value=${this._internalValue ?? ''}
            placeholder=${ifDefined(this.placeholder)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            title=${ifDefined(this.title)}
            pattern=${ifDefined(this.pattern)}
            @input=${this._handleInputChange}
            @change=${this._handleInputChange}
          >`;
    }
  }

  // --- Métodos Principales ---

  _handleInputChange(evt) {
    const inputElement = evt.target;
    let newValue;

    if (this.type === 'radio') {
        // Para radio, el valor ya está en el evento si está marcado
        const checkedRadio = this.shadowRoot.querySelector(`input[name="${this.name}"]:checked`);
        newValue = checkedRadio ? checkedRadio.value : null;
    } else if (inputElement.type === 'checkbox') {
        newValue = inputElement.checked;
    } else {
        newValue = inputElement.value;
    }

    // Actualiza el valor interno primero
    this._internalValue = this._parseValueForInternal(newValue);
    // Actualiza la propiedad pública 'value' (como string para el atributo)
    this.value = (newValue === null || newValue === undefined) ? '' : String(newValue);


    this.dispatchEvent(new CustomEvent('change', {
      detail: { id: this.id, name: this.name, value: this._internalValue }, // Envía el valor interno (potencialmente tipado)
      bubbles: true,
      composed: true
    }));

    // Valida DESPUÉS de actualizar el valor
    this.isValid();
  }

  _handleSubmit(e) {
    e.preventDefault();
    // Vuelve a validar en el submit por si acaso
    if (this.isValid()) {
      this.dispatchEvent(new CustomEvent('form-submit', {
        detail: { id: this.id, name: this.name, value: this.getVal() },
        bubbles: true,
        composed: true
      }));
    } else {
        // Opcional: Forzar reporte de validación nativo si se quiere
         const input = this._getInternalInputElement();
         input?.reportValidity();
    }
  }

  /** Obtiene el elemento de input interno principal */
  _getInternalInputElement() {
      // Para radio, no hay un único input "principal"
      if (this.type === 'radio') return null;
      return this.shadowRoot.querySelector('.input-element'); // Usa la clase común
  }

  /** Devuelve el valor actual (potencialmente tipado) */
  getVal() {
    // Devuelve el valor interno que ya está parseado
    return this._internalValue;
  }

  /** Verifica la validez del input interno */
  isValid() {
    let valid = true; // Asume válido por defecto
    const inputElement = this._getInternalInputElement();

    if (inputElement) {
        // Usa la validación nativa del propio input
        valid = inputElement.checkValidity();
    } else if (this.type === 'radio' && this.required) {
        // Validación especial para radio buttons requeridos
        const checkedRadio = this.shadowRoot.querySelector(`input[name="${this.name}"]:checked`);
        valid = checkedRadio !== null; // Es válido si alguno está seleccionado
    }
    // Podrías añadir validaciones personalizadas aquí si fuera necesario

    // Actualiza el estado interno (esto disparará el cambio de clase en render)
    this._isValid = valid;

    // console.log(`isValid [${this.id || this.name}]: ${valid}`); // Descomenta para debug
    return valid;
  }


  /** Establece el valor del input */
  setVal(val) {
      this._internalValue = this._parseValueForInternal(val);
      this.value = (val === null || val === undefined) ? '' : String(val);
      // La actualización del input visual ocurrirá en el siguiente ciclo de render
      // porque _internalValue cambió.
      this.requestUpdate(); // Asegura que se repinte si es necesario
      // Valida después de un pequeño delay para asegurar que el DOM se actualizó
      setTimeout(() => this.isValid(), 0);
  }

  /** Resetea el input a su valor por defecto (vacío o false) */
  reset() {
    let defaultVal = '';
     if (this.type === 'checkbox' || this.type === 'switch' || this.type === 'boolean') {
         defaultVal = false;
     } else if (this.type === 'radio') {
          // Desmarcar todos los radios del grupo
         const radioInputs = this.shadowRoot.querySelectorAll(`input[name="${this.name}"]`);
         radioInputs.forEach(r => r.checked = false);
          defaultVal = null; // El valor efectivo es null si ninguno está marcado
     }
    this.setVal(defaultVal);
  }

  /** Establece las opciones para select/radio (espera un Array) */
  setOpts(opts) {
    if (['select', 'radio'].includes(this.type)) {
      this.options = Array.isArray(opts) ? opts : []; // Asegura que sea un array
    }
  }

  /** Obtiene el valor seleccionado en un select */
  getSelOpt() {
    if (this.type === 'select') {
      const select = this._getInternalInputElement();
      return select ? select.value : null;
    }
    return null;
  }
}


customElements.define('c-dlg', CDlg);
customElements.define('dlg-cont', DlgCont);
customElements.define('c-inp', CInp);

// Asume que safeParse está disponible globalmente o importado
// function safeParse(v) { ... }


class ObjEditFrm extends LitElement {
    static styles = css`
        /* Tus estilos (sin cambios) */
        :host {
            display: block;
            font-family: sans-serif;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 8px;
            background-color: #f9f9f9;
            margin-bottom: 15px;
        }
        .ef-cont { display: flex; flex-direction: column; gap: 15px; }
        .flds-cont {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .fld-wrp { display: flex; flex-direction: column; gap: 4px; }
        label { font-weight: 500; font-size: 0.9em; color: #333; text-transform: capitalize; }
        c-inp { margin: 0; padding: 0; }
        .fld-wrp.inv label { color: #dc3545; }
        .acts { display: flex; justify-content: flex-end; gap: 10px; }
        button {
            padding: 8px 16px; cursor: pointer; border: 1px solid #ccc;
            border-radius: 4px; font-size: 0.95em; transition: all 0.2s;
            background-color: #fff;
        }
        button:hover { filter: brightness(0.95); }
        .sv-btn { background-color: #28a745; color: white; border-color: #28a745; }
        .sv-btn:hover { background-color: #218838; border-color: #1e7e34; }
        .cncl-btn { background-color: #6c757d; color: white; border-color: #6c757d; }
        .cncl-btn:hover { background-color: #5a6268; border-color: #545b62; }
        :host([darkmode]) { background-color: #333; border-color: #555; }
        :host([darkmode]) label { color: #eee; }
        :host([darkmode]) .flds-cont { border-bottom-color: #555; }
        :host([darkmode]) button { background-color: #555; border-color: #777; color: #eee; }
        :host([darkmode]) button:hover { filter: brightness(1.1); }
        :host([darkmode]) c-inp { color-scheme: dark; }
    `;

    static properties = {
        // Propiedad PÚBLICA para recibir el item del padre
        itm: { type: Object },
        fCfg: { type: Object },
        cActs: { type: Array },
        darkmode: { type: Boolean, reflect: true },
        // Estado interno para manejo y reseteo
        _iItm: { state: true }, // Estado inicial (para reset)
        _cItm: { state: true }, // Estado actual editable
    };

    constructor() {
        super();
        this.itm = {}; // Inicializa la propiedad pública
        this._iItm = {};
        this._cItm = {};
        this.fCfg = {};
        this.cActs = [];
        this.darkmode = false;
    }

    // --- NUEVO: Lifecycle Hook para reaccionar a cambios en `itm` ---
    willUpdate(changedProperties) {
        // Si la propiedad 'itm' (pasada desde el padre) ha cambiado...
        if (changedProperties.has('itm')) {
            // ...actualiza los estados internos _cItm y _iItm.
            const newItemCopy = this._deepCopy(this.itm);
            this._cItm = newItemCopy;
            // Establece _iItm también para que reset funcione correctamente
            // con los datos actuales pasados al entrar en modo edición.
            this._iItm = this._deepCopy(newItemCopy);
             // console.log('ObjEditFrm: willUpdate detected itm change, _cItm updated:', this._cItm);
        }
    }
    // ---------------------------------------------------------------

    _deepCopy(o) {
        try { return JSON.parse(JSON.stringify(o || {})); }
        catch (e) { console.error('Err deep copy', e); return {}; }
    }

    // setConfig y setItem ahora son menos necesarios si se usa la propiedad `itm`
    // pero pueden mantenerse como API alternativa si se desea.
    setConfig(itm = {}, cfg = {}) {
        this.itm = this._deepCopy(itm); // Actualiza la propiedad pública
        // willUpdate se encargará de actualizar _cItm y _iItm
        this.fCfg = cfg || {};
        this.requestUpdate(); // Asegura re-render si se llama externamente
    }

    setItem(itm = {}) {
        this.itm = this._deepCopy(itm); // Actualiza la propiedad pública
        // willUpdate se encargará de actualizar _cItm y _iItm
        this.requestUpdate(); // Asegura re-render si se llama externamente
    }


    addAct(nm, lbl, cls = '') {
        if (!nm || typeof nm !== 'string' || typeof lbl !== 'string') return;
        // Asegura inmutabilidad al actualizar el array
        this.cActs = [...this.cActs.filter(a => a.nm !== nm), { nm, lbl, cls }];
    }

    validate() {
        let ok = true;
        this.shadowRoot.querySelectorAll('c-inp').forEach(f => {
            const wrp = f.closest('.fld-wrp');
            let fOk = true;
            if (typeof f.isValid === 'function') {
                fOk = f.isValid();
            } else {
                // Fallback si c-inp no tiene isValid
                const iInp = f.shadowRoot?.querySelector('input, select, textarea');
                if (iInp?.checkValidity) {
                    fOk = iInp.checkValidity();
                } else {
                    console.warn(`Cannot validate field ${f.name}`);
                }
            }
            wrp?.classList.toggle('inv', !fOk);
            if (!fOk) ok = false;
        });
        return ok;
    }

    // getData ahora puede leer directamente de _cItm, es más simple
    getData() {
        // Devuelve una copia del estado actual interno
        return this._deepCopy(this._cItm);
    }

    reset() {
        // Resetea _cItm al estado guardado en _iItm
        this._cItm = this._deepCopy(this._iItm);
        // Es importante forzar un re-render para que los inputs reflejen el reseteo
        this.requestUpdate();
         // Opcional: Limpiar visualmente errores de validación al resetear
         this.shadowRoot.querySelectorAll('.fld-wrp.inv').forEach(wrp => wrp.classList.remove('inv'));
    }

    _hInpChg(e) {
        if (e.target.tagName !== 'C-INP') return;
        let n, v;
        // Prioriza el detalle del evento si está bien formado
        if (e.detail?.name !== undefined) {
            ({ name: n, value: v } = e.detail);
        } else {
            // Fallback si el evento no tiene detail esperado
            n = e.target.name;
            if (n && typeof e.target.getVal === 'function') {
                 v = e.target.getVal();
            } else if (n) {
                 // Último recurso: leer valor de checkbox si es el caso
                 if(e.target.type === 'checkbox' || e.target.type === 'switch' || e.target.type === 'boolean') {
                    v = e.target.checked;
                 } else {
                     v = e.target.value; // O el atributo value
                 }
                 console.warn(`ObjEditFrm: Using fallback value retrieval for ${n}`);
            }
        }

        if (n !== undefined) {
            // Actualiza el estado _cItm de forma inmutable
            this._cItm = { ...this._cItm, [n]: v };
             // console.log('ObjEditFrm: _cItm updated by input change:', this._cItm);

            // Limpia el error de validación visual del wrapper al cambiar
            e.target.closest('.fld-wrp')?.classList.remove('inv');

            // Despacha el evento de cambio de campo
            this.dispatchEvent(new CustomEvent('fld-chg', { detail: { n, v } }));
        }
    }


    _hSub(e) {
        e.preventDefault();
        this._hSave();
    }

    _hActClk(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;

        if (act === 'save') {
            // El evento submit se encarga de llamar a _hSave
        } else if (act === 'cancel') {
            this.dispatchEvent(new CustomEvent('cancel-edit'));
            // El reset ahora funciona correctamente con _iItm
            this.reset();
        } else {
            // Para acciones personalizadas, enviar los datos actuales
            this.dispatchEvent(new CustomEvent(act, { detail: this.getData() }));
        }
    }

    _hSave() {
        if (this.validate()) {
            const currentData = this.getData(); // Obtiene los datos actuales de _cItm
            // Actualiza _iItm para que un futuro reset refleje el estado guardado
            this._iItm = this._deepCopy(currentData);
            // Despacha el evento con los datos guardados
            this.dispatchEvent(new CustomEvent('save-item', { detail: currentData }));
        } else {
             console.warn('ObjEditFrm: Validation failed.');
            // Intenta enfocar el primer campo inválido
            const fInv = this.shadowRoot.querySelector('.fld-wrp.inv c-inp');
            if (fInv) {
                try {
                    if (typeof fInv.focus === 'function') {
                        fInv.focus();
                    } else {
                        fInv.shadowRoot?.querySelector('input, select, textarea')?.focus();
                    }
                } catch (err) { console.warn('Cant focus inv fld', err); }
            }
        }
    }

    render() {
        // Render ahora lee de _cItm, que se actualiza via willUpdate
        // console.log('ObjEditFrm rendering with _cItm:', this._cItm);
        return html`
            <form class="ef-cont" @submit=${this._hSub} novalidate>
                <div class="flds-cont">
                    ${map(Object.entries(this.fCfg || {}), ([k, c]) => {
                        if (c.hidden) return '';
                        const id = `ef-${k}-${Date.now()}`;
                        // *** LEER EL VALOR DE _cItm ***
                        const val = this._cItm?.[k];
                        const isBool = c.type === 'checkbox' || c.type === 'switch' || c.type === 'boolean';

                        // Determina el valor a pasar a c-inp.value
                        // c-inp debe ser capaz de manejar el tipo correcto (boolean, number, string)
                        let valueToPass = val;
                        // Si c-inp.value espera estrictamente un string (excepto para booleanos?)
                        // podríamos necesitar convertirlo, pero idealmente c-inp maneja tipos.
                        // if (!isBool && val !== null && val !== undefined) {
                        //    valueToPass = String(val);
                        // } else if (isBool) {
                        //    valueToPass = Boolean(val); // Asegura que sea booleano
                        // }

                        return html`
                            <div class="fld-wrp">
                                <label for=${id}>${c.label || k}</label>
                                <c-inp
                                    id=${id}
                                    name=${k}
                                    type=${c.type || 'text'}
                                    .value=${valueToPass} /* Pasa el valor directamente */
                                    placeholder=${ifDefined(c.placeholder)}
                                    ?required=${c.required}
                                    ?disabled=${c.disabled}
                                    ?readonly=${c.readonly}
                                    pattern=${ifDefined(c.pattern)}
                                    title=${ifDefined(c.title)}
                                    min=${ifDefined(c.min)}
                                    max=${ifDefined(c.max)}
                                    step=${ifDefined(c.step)}
                                    rows=${ifDefined(c.rows)}
                                    cols=${ifDefined(c.cols)}
                                    .options=${(c.type === 'select' || c.type === 'radio') && Array.isArray(c.options) ? c.options : undefined}
                                    ?darkmode=${this.darkmode}
                                    @change=${this._hInpChg}
                                ></c-inp>
                            </div>
                        `;
                    })}
                </div>
                <div class="acts" @click=${this._hActClk}>
                    <button type="button" class="cncl-btn" data-act="cancel">Cancel</button>
                    <button type="submit" class="sv-btn" data-act="save">Save</button>
                    ${map(this.cActs || [], act => html`
                        <button type="button" data-act=${act.nm} class=${ifDefined(act.cls)}>${act.lbl}</button>
                    `)}
                </div>
            </form>
        `;
    }
}
customElements.define('obj-edit-frm', ObjEditFrm);


// --- DynObjDisp (SIN CAMBIOS, ya pasaba .itm correctamente) ---
// (El código de DynObjDisp de la respuesta anterior es correcto
// y no necesita cambios para que esta corrección funcione)
class DynObjDisp extends LitElement {
    // ... (Código completo de DynObjDisp sin cambios) ...
    static styles = css`
        /* Estilos (sin cambios) */
        :host { display: block; font-family: sans-serif; margin-bottom: 15px; }
        .dyn-cont { position: relative; }
        .d-card {
            background-color: #fff; border: 1px solid #eee; border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08); overflow: hidden;
            display: flex; flex-direction: column; transition: box-shadow 0.2s;
        }
        :host([darkmode]) .d-card { background-color: #333; border-color: #555; color: #eee; }
        .d-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        :host([darkmode]) .d-card:hover { box-shadow: 0 2px 8px rgba(255,255,255,0.1); }
        .d-hdr {
            background-color: #f5f5f5; padding: 12px 16px; font-weight: bold;
            border-bottom: 1px solid #eee; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
        }
        :host([darkmode]) .d-hdr { background-color: #444; border-bottom-color: #555; }
        .d-cont {
            padding: 16px; flex-grow: 1; display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px 15px;
        }
        .d-prop { margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px; }
        .d-prop-lbl {
            font-weight: 500; color: #666; font-size: 0.8em;
            text-transform: capitalize; margin-bottom: 2px;
        }
        :host([darkmode]) .d-prop-lbl { color: #bbb; }
        .d-prop-val { word-break: break-word; font-size: 0.95em; }
        .d-prop-val[data-type="boolean"], .d-prop-val[data-type="switch"], .d-prop-val[data-type="checkbox"] {
            font-style: italic; color: #333;
        }
        :host([darkmode]) .d-prop-val[data-type="boolean"], :host([darkmode]) .d-prop-val[data-type="switch"], :host([darkmode]) .d-prop-val[data-type="checkbox"] {
             color: #ddd;
        }
        .d-acts {
            padding: 10px 16px; display: flex; justify-content: flex-end;
            gap: 8px; background-color: #fafafa; border-top: 1px solid #eee;
        }
        :host([darkmode]) .d-acts { background-color: #3a3a3a; border-top-color: #555; }
        .d-acts button {
            padding: 6px 12px; cursor: pointer; border: 1px solid #ccc;
            border-radius: 4px; font-size: 0.9em; transition: all 0.2s;
            background-color: #fff;
        }
        .d-acts button:hover { filter: brightness(0.95); }
        :host([darkmode]) .d-acts button { background-color: #555; border-color: #777; color: #eee; }
        :host([darkmode]) .d-acts button:hover { filter: brightness(1.1); }
        .ed-btn { background-color: #CCE5FF; border-color: #b8daff; color: #004085; }
        .del-btn { background-color: #F8D7DA; color: #721c24; border-color: #f5c6cb; }
        :host([darkmode]) .ed-btn { background-color: #0056b3; border-color: #0056b3; color: white; }
        :host([darkmode]) .del-btn { background-color: #b81c2c; border-color: #b81c2c; color: white; }
        obj-edit-frm { display: block; }
    `;

    static properties = {
        mode: { type: String }, // display | edit
        itm: { type: Object },
        fCfg: { type: Object },
        hdrKey: { type: String, attribute: 'hdr-key', reflect: true },
        cActs: { type: Array }, // display mode actions
        darkmode: { type: Boolean, reflect: true },
    };

    constructor() {
        super();
        this.mode = 'display';
        this.itm = {};
        this.fCfg = {};
        this.cActs = [];
        this.darkmode = false;
    }

    _deepCopy(o) {
        try { return JSON.parse(JSON.stringify(o || {})); }
        catch (e) { console.error('Err deep copy', e); return {}; }
    }

    setConfig(i = {}, f = {}) {
        this.itm = this._deepCopy(i);
        this.fCfg = f || {};
        this.mode = 'display';
    }

    setItem(i = {}) {
        this.itm = this._deepCopy(i);
         // Si ya está en modo edición, forza un re-render para pasar el nuevo item
         if (this.mode === 'edit') {
            this.requestUpdate();
        }
    }

    addAct(nm, lbl, cls = '') {
        if (!nm || typeof nm !== 'string' || typeof lbl !== 'string') return;
        this.cActs = [...this.cActs.filter(a => a.nm !== nm), { nm, lbl, cls }];
    }

    _formatVal(v, c) {
        const typ = c.type || 'text';
        if (typ === 'boolean' || typ === 'switch' || typ === 'checkbox') {
            return Boolean(v) ? (c.trueLabel || 'Yes') : (c.falseLabel || 'No');
        } else if (typ === 'select' && Array.isArray(c.options)) {
            const opt = c.options.find(o => String(o.value) === String(v));
            return opt ? opt.label : (v ?? '');
        }
        return (v === undefined || v === null) ? '' : String(v);
    }

    _hDispActClk(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const detail = this._deepCopy(this.itm); // Send copy

        if (act === 'edit') {
            this.mode = 'edit'; // Cambia el modo, Lit re-renderizará
        } else if (act === 'delete') {
            this.dispatchEvent(new CustomEvent('del-item', { detail }));
        } else {
            this.dispatchEvent(new CustomEvent(act, { detail }));
        }
    }

    _hSave(e) {
        this.itm = this._deepCopy(e.detail); // Update internal item from saved data
        this.dispatchEvent(new CustomEvent('item-upd', { detail: this._deepCopy(this.itm) }));
        this.mode = 'display'; // Cambia modo, Lit re-renderizará
    }

    _hCancel() {
        this.mode = 'display'; // Cambia modo, Lit re-renderizará
    }

    _renderDisp() {
        const hdr = this.hdrKey && this.itm[this.hdrKey] !== undefined ? this.itm[this.hdrKey] : null;
        return html`
            <div class="d-card">
                ${hdr !== null ? html`<div class="d-hdr">${hdr}</div>` : ''}
                <div class="d-cont">
                    ${map(Object.entries(this.fCfg || {}), ([k, c]) => {
                        if (c.hidden || k === this.hdrKey) return '';
                        return html`
                            <div class="d-prop">
                                <div class="d-prop-lbl">${c.label || k}</div>
                                <div class="d-prop-val" data-type=${c.type || 'text'}>${this._formatVal(this.itm[k], c)}</div>
                            </div>
                        `;
                    })}
                </div>
                <div class="d-acts" @click=${this._hDispActClk}>
                     <button type="button" class="ed-btn" data-act="edit">Edit</button>
                     <button type="button" class="del-btn" data-act="delete">Delete</button>
                     ${map(this.cActs || [], act => html`
                        <button type="button" data-act=${act.nm} class=${ifDefined(act.cls)}>${act.lbl}</button>
                     `)}
                </div>
            </div>
        `;
    }

    _renderEdit() {
         // console.log('DynObjDisp rendering edit form with item:', this.itm);
        return html`
            <obj-edit-frm
                .fCfg=${this.fCfg}
                .itm=${this.itm} /* Pasa el item directamente (willUpdate en ObjEditFrm lo copiará) */
                .cActs=${[]}
                ?darkmode=${this.darkmode}
                @save-item=${this._hSave}
                @cancel-edit=${this._hCancel}
            ></obj-edit-frm>
        `;
    }

    render() {
        if (!this.itm || !this.fCfg || Object.keys(this.fCfg).length === 0) {
            return html`<p>No item/config.</p>`;
        }
        return html`
            <div class="dyn-cont">
                ${this.mode === 'display' ? this._renderDisp() : this._renderEdit()}
            </div>
        `;
    }
}
customElements.define('dyn-obj-disp', DynObjDisp);

class BanManager extends LitElement {
  static styles = css`
      :host { display: block; padding: 1em; }
      .toolbar { margin-bottom: 1em; display: flex; align-items: center; gap: 1em; flex-wrap: wrap; }
      .filter-btns button { margin-right: 0.5em; }
      .filter-btns button[active] { font-weight: bold; background-color: #e0e0e0; }
      table { width: 100%; border-collapse: collapse; margin-top: 1em; }
      th, td { border: 1px solid #ccc; padding: 0.6em; text-align: left; }
      th { background-color: #f4f4f4; }
      td.actions button { margin-left: 0.5em; cursor: pointer; padding: 0.2em 0.5em; font-size: 0.9em;}
      .status-active { color: red; font-weight: bold; }
      .status-expired { color: green; }
      .add-btn { background-color: #007bff; color: white; border: none; padding: 0.6em 1em; border-radius: 4px;}
      .modal-content { padding: 1em; background: white; border-radius: 8px; min-width: 450px; max-width: 90vw; }
      /* Estilos para obj-edit-frm dentro del modal si es necesario */
       dlg-cont obj-edit-frm { border: none; padding: 0; background: transparent; }
  `;

  static properties = {
      _allBans: { state: true },      // Todos los baneos de IDB
      _filteredBans: { state: true }, // Baneos mostrados según filtro
      _filter: { state: true },       // 'all', 'active', 'expired'
      _showAddModal: { state: true }, // Visibilidad del modal de añadir/editar
      _editItem: { state: true },    // Item a editar (null para añadir)
      _isLoading: { state: true },    // Estado de carga
  };

  constructor() {
      super();
      this._allBans = [];
      this._filteredBans = [];
      this._filter = 'active'; // Mostrar activos por defecto
      this._showAddModal = false;
      this._editItem = null;
      this._isLoading = true;

      // Configura el observer y el manager de IDB
      this.dbObserver = new DBObserver();
      this.idbManager = new IndexedDBManager(databases.banDB, this.dbObserver);

      // Define la configuración del formulario de baneos
      this.banFormConfig = {
          type: { label: 'Tipo', type: 'select', required: true, options: [
              { value: 'user', label: 'Usuario (ID)' },
              { value: 'ip', label: 'Dirección IP' },
              { value: 'domain', label: 'Dominio' },
              { value: 'keyword', label: 'Palabra Clave' }
          ]},
          value: { label: 'Valor', type: 'text', required: true, placeholder: 'ID Usuario, IP, Dominio...' },
          banType: { label: 'Tipo Baneo', type: 'select', required: true, options: [
              { value: 'temporary', label: 'Temporal' },
              { value: 'permanent', label: 'Permanente' }
          ]},
          // Campos específicos para baneo temporal (se mostrarán condicionalmente o se manejarán en lógica)
          durationValue: { label: 'Duración', type: 'number', min: 1 },
          durationUnit: { label: 'Unidad', type: 'select', options: [
               { value: 'seconds', label: 'Segundos' },
               { value: 'minutes', label: 'Minutos' },
               { value: 'hours', label: 'Horas' },
               { value: 'days', label: 'Días' }
           ]},
          reason: { label: 'Motivo', type: 'textarea', required: false, placeholder: 'Motivo del baneo...' }
          // banStartDate y banEndDate se calculan al guardar
      };

      // Bind de la función del observer
      this._handleDbUpdate = this._handleDbUpdate.bind(this);
  }

  connectedCallback() {
      super.connectedCallback();
      this.dbObserver.subscribe(this._handleDbUpdate);
      this._loadBans();
  }

  disconnectedCallback() {
      super.disconnectedCallback();
      this.dbObserver.unsubscribe(this._handleDbUpdate);
  }

  _handleDbUpdate(action, data) {
      console.log('DB Update Received:', action, data);
      // Recargar los datos para reflejar el cambio
      this._loadBans();
  }

  async _loadBans() {
      this._isLoading = true;
      try {
          this._allBans = await this.idbManager.getAllData();
          this._applyFilter(); // Aplicar filtro actual a los nuevos datos
      } catch (error) {
          console.error("Error loading bans:", error);
          this._allBans = [];
          this._filteredBans = [];
          // Podrías mostrar un mensaje de error al usuario aquí
      } finally {
          this._isLoading = false;
      }
  }

  _isBanActive(ban) {
      if (!ban) return false;
      if (ban.banType === 'permanent') return true;
      if (ban.banType === 'temporary' && ban.banEndDate) {
          try { return new Date(ban.banEndDate) > new Date(); }
          catch(e) { return false; }
      }
      return false;
  }

  _applyFilter() {
      const now = new Date();
      if (this._filter === 'all') {
          this._filteredBans = [...this._allBans];
      } else if (this._filter === 'active') {
          this._filteredBans = this._allBans.filter(ban => this._isBanActive(ban));
      } else if (this._filter === 'expired') {
          this._filteredBans = this._allBans.filter(ban => !this._isBanActive(ban));
      }
      // console.log(`Filter applied: ${this._filter}, Count: ${this._filteredBans.length}`);
  }

  _handleFilterChange(newFilter) {
      if (this._filter !== newFilter) {
          this._filter = newFilter;
          this._applyFilter();
      }
  }

  _openAddModal(itemToEdit = null) {
      this._editItem = itemToEdit ? { ...itemToEdit } : null; // Clona el item si es edición
      // Pre-rellenar duración si es edición temporal
      if (this._editItem && this._editItem.banType === 'temporary' && this._editItem.banEndDate && this._editItem.banStartDate) {
           const durationMs = new Date(this._editItem.banEndDate).getTime() - new Date(this._editItem.banStartDate).getTime();
           // Convertir ms a la unidad más grande posible para el form (simplificado)
           const days = durationMs / (1000 * 60 * 60 * 24);
           if (days >= 1 && days % 1 === 0) {
               this._editItem.durationValue = days;
               this._editItem.durationUnit = 'days';
           } else {
                const hours = durationMs / (1000 * 60 * 60);
                 if (hours >= 1 && hours % 1 === 0) {
                     this._editItem.durationValue = hours;
                     this._editItem.durationUnit = 'hours';
                 } else {
                      const minutes = durationMs / (1000 * 60);
                       if (minutes >= 1 && minutes % 1 === 0) {
                          this._editItem.durationValue = minutes;
                          this._editItem.durationUnit = 'minutes';
                       } else {
                            this._editItem.durationValue = Math.round(durationMs / 1000);
                            this._editItem.durationUnit = 'seconds';
                       }
                 }
           }

      }
      this._showAddModal = true;
  }

  _closeAddModal() {
      this._showAddModal = false;
      this._editItem = null; // Limpiar item en edición
  }

  _calculateEndDate(startDate, value, unit) {
      if (!value || !unit) return null;
      const date = new Date(startDate);
      const numValue = Number(value);
      if (isNaN(numValue)) return null;

      switch (unit) {
          case 'seconds': date.setSeconds(date.getSeconds() + numValue); break;
          case 'minutes': date.setMinutes(date.getMinutes() + numValue); break;
          case 'hours': date.setHours(date.getHours() + numValue); break;
          case 'days': date.setDate(date.getDate() + numValue); break;
          default: return null;
      }
      return date.toISOString();
  }

  async _handleSaveBan(e) {
      const formData = e.detail;
      const banData = {
          id: this._editItem ? this._editItem.id : -1, // Usa ID existente o -1 para nuevo
          type: formData.type,
          value: formData.value,
          banType: formData.banType,
          reason: formData.reason || '',
          banStartDate: this._editItem?.banStartDate || new Date().toISOString(), // Mantener fecha inicio si se edita, o nueva si se añade
          banEndDate: null,
      };

      if (banData.banType === 'temporary') {
          if (!formData.durationValue || !formData.durationUnit) {
               alert("Por favor, especifica la duración y unidad para baneos temporales.");
               return; // Evita guardar si falta duración
          }
          banData.banEndDate = this._calculateEndDate(
              banData.banStartDate,
              formData.durationValue,
              formData.durationUnit
          );
           if (!banData.banEndDate) {
               alert("Error calculando la fecha de fin del baneo.");
               return;
           }
      } else {
           // Asegurarse que campos de duración no se guarden para baneo permanente
           delete formData.durationValue;
           delete formData.durationUnit;
      }
      // console.log("Saving ban data:", banData);

      this._isLoading = true; // Mostrar indicador de carga
      try {
          await this.idbManager.saveData(banData);
          // El observer se encargará de llamar a _loadBans para actualizar la UI
          this._closeAddModal();
      } catch (error) {
          console.error("Error saving ban:", error);
          alert(`Error al guardar el baneo: ${error.message}`);
      } finally {
          this._isLoading = false; // Ocultar indicador
      }
  }

   async _handleDeleteClick(banId) {
       const banToDelete = this._allBans.find(b => b.id === banId);
      if (banToDelete && confirm(`¿Seguro que quieres eliminar el baneo para ${banToDelete.type}: ${banToDelete.value}?`)) {
          this._isLoading = true;
          try {
              await this.idbManager.deleteData(banId);
              // El observer actualizará la lista
          } catch (error) {
               console.error("Error deleting ban:", error);
               alert(`Error al eliminar el baneo: ${error.message}`);
          } finally {
               this._isLoading = false;
          }
      }
  }

  _formatDate(dateString) {
      if (!dateString) return 'N/A';
      try {
          return new Date(dateString).toLocaleString();
      } catch (e) {
          return 'Fecha inválida';
      }
  }

  _renderTable() {
      if (this._isLoading) return html`<p>Cargando baneos...</p>`;
      if (!this._filteredBans || this._filteredBans.length === 0) {
          return html`<p>No hay baneos para mostrar con el filtro actual.</p>`;
      }

      return html`
          <table>
              <thead>
                  <tr>
                      <th>ID</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Razón</th>
                      <th>Tipo Baneo</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                  </tr>
              </thead>
              <tbody>
                  ${map(this._filteredBans, (ban) => {
                      const isActive = this._isBanActive(ban);
                      return html`
                          <tr>
                              <td>${ban.id}</td>
                              <td>${ban.type}</td>
                              <td>${ban.value}</td>
                              <td>${ban.reason || '-'}</td>
                              <td>${ban.banType}</td>
                              <td>${this._formatDate(ban.banStartDate)}</td>
                              <td>${ban.banType === 'temporary' ? this._formatDate(ban.banEndDate) : 'Permanente'}</td>
                              <td class=${isActive ? 'status-active' : 'status-expired'}>
                                  ${isActive ? 'Activo' : 'Expirado/Inactivo'}
                              </td>
                              <td class="actions">
                                   <button @click=${() => this._openAddModal(ban)} title="Editar">✏️</button>
                                  <button @click=${() => this._handleDeleteClick(ban.id)} title="Eliminar">🗑️</button>
                              </td>
                          </tr>
                      `;
                  })}
              </tbody>
          </table>
      `;
  }

  _renderAddModal() {
      return html`
          <dlg-cont ?visible=${this._showAddModal} @close-request=${this._closeAddModal}>
               <div class="modal-content">
                  <h2>${this._editItem ? 'Editar Baneo' : 'Añadir Nuevo Baneo'}</h2>
                  <obj-edit-frm
                      .fCfg=${this.banFormConfig}
                      .itm=${this._editItem || { banType: 'temporary', durationUnit: 'days' }} /* Datos iniciales o para editar */
                      @save-item=${this._handleSaveBan}
                      @cancel-edit=${this._closeAddModal}
                  >
                      <!-- Los botones Save/Cancel vienen de obj-edit-frm -->
                  </obj-edit-frm>
               </div>
          </dlg-cont>
      `;
  }

  render() {
      return html`
          <h2>Gestión de Baneos</h2>
          <div class="toolbar">
              <div class="filter-btns">
                  <span>Filtrar:</span>
                  <button ?active=${this._filter === 'active'} @click=${() => this._handleFilterChange('active')}>Activos</button>
                  <button ?active=${this._filter === 'expired'} @click=${() => this._handleFilterChange('expired')}>Expirados</button>
                  <button ?active=${this._filter === 'all'} @click=${() => this._handleFilterChange('all')}>Todos</button>
              </div>
              <button class="add-btn" @click=${() => this._openAddModal()}>Añadir Baneo</button>
          </div>

          ${this._renderTable()}
          ${this._renderAddModal()}
      `;
  }
}

customElements.define('ban-manager', BanManager);