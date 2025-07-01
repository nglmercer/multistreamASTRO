// =================================================================
// IMPORTS Y DECORADORES DE LIT
// =================================================================
import { LitElement, html, css,type PropertyValues,type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { map } from 'lit/directives/map.js';
import { classMap } from 'lit/directives/class-map.js';
import { CInput } from './CInput.js'; // Asegúrate de que la ruta sea correcta

// =================================================================
// TIPOS E INTERFACES PARA FUERTE TIPADO
// =================================================================

/** Representa el objeto de datos que se está editando o mostrando. */
export type DataItem = Record<string, any>;

/** Condición para mostrar un campo condicionalmente. */
export interface FieldCondition {
    field: string;
    value: any | any[];
    negate?: boolean;
}

/** Configuración para un campo individual en el formulario o visualizador. */
export interface FieldConfig {
    label?: string;
    type?: string; // e.g., 'text', 'number', 'select', 'switch'
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    pattern?: string;
    title?: string;
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    cols?: number;
    multiple?: boolean;
    options?: { value: any; label: string }[];
    hidden?: boolean; // Ocultar campo permanentemente
    showIf?: FieldCondition; // Ocultar campo condicionalmente
    trueLabel?: string; // Etiqueta para valor booleano 'true' en modo display
    falseLabel?: string; // Etiqueta para valor booleano 'false' en modo display
}

/** El objeto de configuración completo para el formulario. */
export type FormConfig = Record<string, FieldConfig>;

/** Representa una acción personalizada (botón) en la interfaz. */
export interface CustomAction {
    nm: string;
    lbl: string;
    cls?: string;
}

// =================================================================
// LÓGICA DE UTILIDAD COMPARTIDA
// =================================================================

/**
 * Compara dos valores de forma flexible, manejando booleanos, nulos y strings.
 * @param actual El valor actual del campo.
 * @param expected El valor esperado por la condición.
 * @returns {boolean} `true` si los valores coinciden.
 */
const compareValues = (actual: any, expected: any): boolean => {
    if (typeof expected === 'boolean') {
        const actualBool = !(['false', '0', '', null, undefined].includes(String(actual).toLowerCase()) || !actual);
        return actualBool === expected;
    }
    if (actual === null || actual === undefined) {
        return expected === null || expected === undefined || expected === '';
    }
    return String(actual) === String(expected);
};

/**
 * Determina si un campo debe ser visible basado en su configuración `showIf` y el estado actual del item.
 * @param config La configuración del campo a evaluar.
 * @param currentItem El objeto de datos actual.
 * @returns {boolean} `true` si el campo debe ser visible.
 */
const shouldFieldBeVisible = (config: FieldConfig, currentItem: DataItem): boolean => {
    const condition = config.showIf;
    if (!condition?.field) {
        return true; // Visible si no hay condición válida.
    }

    const triggerValue = currentItem?.[condition.field];
    const { value: requiredValue, negate = false } = condition;

    let matchesCondition: boolean;
    if (Array.isArray(requiredValue)) {
        matchesCondition = requiredValue.some(val => compareValues(triggerValue, val));
    } else {
        matchesCondition = compareValues(triggerValue, requiredValue);
    }

    return negate ? !matchesCondition : matchesCondition;
};

/**
 * Realiza una copia profunda de un objeto usando JSON.stringify/parse.
 * @param obj El objeto a copiar.
 * @returns Una copia profunda del objeto.
 */
const deepCopy = <T>(obj: T): T => {
    try {
        return JSON.parse(JSON.stringify(obj || {}));
    } catch (e) {
        console.error('Error en deepCopy:', e);
        return {} as T;
    }
};

// =================================================================
// COMPONENTE: ObjEditFrm
// =================================================================

class ObjEditFrm extends LitElement {
    static styles = css`
      :host {
          display: block; font-family: sans-serif; padding: 15px;
          border: 1px solid #eee; border-radius: 8px;
          background-color: #f9f9f9; margin-bottom: 15px;
      }
      .ef-cont { display: flex; flex-direction: column; gap: 15px; }
      .flds-cont {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 10px 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;
      }
      .fld-wrp { display: flex; flex-direction: column; gap: 4px; }
      label { font-weight: 500; font-size: 0.9em; color: #333; text-transform: capitalize; }
      c-input { margin: 0; padding: 0; }
      .fld-wrp.inv label { color: #dc3545; }
      .acts { display: flex; justify-content: flex-end; gap: 10px; }
      button {
          padding: 8px 16px; cursor: pointer; border: 1px solid #ccc;
          border-radius: 4px; font-size: 0.95em; transition: all 0.2s;
          background-color: #fff;
      }
      button:hover { filter: brightness(0.95); }
      .sv-btn { background-color: #28a745; color: white; border-color: #28a745; }
      .cncl-btn { background-color: #6c757d; color: white; border-color: #6c757d; }
      :host([darkmode]) { background-color: #333; border-color: #555; }
      :host([darkmode]) label { color: #eee; }
      :host([darkmode]) .flds-cont { border-bottom-color: #555; }
      :host([darkmode]) button { background-color: #555; border-color: #777; color: #eee; }
      :host([darkmode]) c-input { color-scheme: dark; }
      .fld-wrp.hidden { display: none; }
  `;

    @property({ type: Object })
    itm: DataItem = {};

    @property({ type: Object })
    fCfg: FormConfig = {};

    @property({ type: Array })
    cActs: CustomAction[] = [];

    @property({ type: Boolean, reflect: true })
    darkmode = false;

    @state()
    private _iItm: DataItem = {}; // Estado inicial del item

    @state()
    private _cItm: DataItem = {}; // Estado actual/en edición del item

    constructor() {
        super();
        this._cItm = deepCopy(this.itm);
        this._iItm = deepCopy(this.itm);
    }

    willUpdate(changedProperties: PropertyValues<this>) {
        if (changedProperties.has('itm')) {
            const newItemCopy = deepCopy(this.itm);
            console.log("changedProperties",changedProperties,newItemCopy)
            // Evita re-renders si el padre pasa el mismo objeto modificado (bucle de actualización)
            if (JSON.stringify(newItemCopy) !== JSON.stringify(this._cItm)) {
                this._cItm = newItemCopy;
                this._iItm = deepCopy(newItemCopy);
            }
        }
    }

    /** Valida todos los campos visibles y actualiza su estado visual. */
    validate(): boolean {
        let isFormValid = true;
        this.shadowRoot?.querySelectorAll<CInput>('c-input').forEach(field => {
            const wrapper = field.closest('.fld-wrp');
            // No validar campos que están ocultos condicionalmente
            if (wrapper?.classList.contains('hidden')) {
                wrapper?.classList.remove('inv');
                return;
            }

            const isFieldValid = typeof field.isValid === 'function' ? field.isValid() : true;
            wrapper?.classList.toggle('inv', !isFieldValid);
            if (!isFieldValid) {
                isFormValid = false;
            }
        });
        return isFormValid;
    }

    /** Devuelve una copia profunda de los datos actuales del formulario. */
    getData(): DataItem {
        return deepCopy(this._cItm);
    }

    /** Restablece el formulario a su estado inicial. */
    reset() {
        this._cItm = deepCopy(this._iItm);
        // Limpiar todos los indicadores de validación, incluso de los campos que ahora podrían estar ocultos
        this.shadowRoot?.querySelectorAll('.fld-wrp.inv').forEach(wrp => wrp.classList.remove('inv'));
    }

    private _handleInputChange(e: CustomEvent<{ name?: string; value: any }>) {
        if (!e.detail || e.detail.name === undefined) return;

        const { name, value } = e.detail;

        if (this._cItm[name] !== value) {
            this._cItm = { ...this._cItm, [name]: value };
            this.dispatchEvent(new CustomEvent('fld-chg', {
                detail: { name, value },
                bubbles: true,
                composed: true
            }));
        }
        // Al interactuar, quitar el estado de error visual del campo.
        (e.target as HTMLElement).closest('.fld-wrp')?.classList.remove('inv');
    }

    private _handleSubmit(e: Event) {
        e.preventDefault();
        this._handleSave();
    }

    private _handleActionClick(e: MouseEvent) {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
        if (!button)return;

        const action = button.dataset.act;
        switch (action) {
            case 'save':
                // Se maneja con el submit del formulario
                break;
            case 'cancel':
                this.dispatchEvent(new CustomEvent('cancel-edit', { bubbles: true, composed: true }));
                this.reset();
                break;
            default:
                if (action) {
                    this.dispatchEvent(new CustomEvent(action, {
                        detail: this.getData(),
                        bubbles: true,
                        composed: true
                    }));
                }
                break;
        }
    }

    private _handleSave() {
        if (this.validate()) {
            const data = this.getData();
            this._iItm = deepCopy(data); // El estado guardado se convierte en el nuevo estado "inicial"
            this.dispatchEvent(new CustomEvent('save-item', {
                detail: data,
                bubbles: true,
                composed: true
            }));
        } else {
            // Enfocar el primer campo inválido que sea visible
            const firstInvalidField = this.shadowRoot?.querySelector<CInput>('.fld-wrp:not(.hidden).inv c-input');
            firstInvalidField?.focus();
        }
    }

    render(): TemplateResult {
        return html`
            <form class="ef-cont" @submit=${this._handleSubmit} novalidate>
                <div class="flds-cont">
                    ${map(Object.entries(this.fCfg), ([key, config]) => {
                        if (config.hidden) return null; // Respetar `hidden` global

                        const isVisible = shouldFieldBeVisible(config, this._cItm);
                        const wrapperClasses = { 'fld-wrp': true, hidden: !isVisible };
                        const isRequired = !!(config.required && isVisible);
                        const id = `ef-${key}`;
                        
                        return html`
                            <div class=${classMap(wrapperClasses)}>
                                <label for=${id}>${config.label || key}</label>
                                <c-input
                                    id=${id}
                                    name=${key}
                                    .type=${config.type || 'text'}
                                    .value=${this._cItm?.[key]}
                                    placeholder=${ifDefined(config.placeholder)}
                                    ?required=${isRequired}
                                    ?disabled=${config.disabled}
                                    ?readonly=${config.readonly}
                                    .pattern=${ifDefined(config.pattern)}
                                    .title=${ifDefined(config.title)}
                                    .min=${ifDefined(config.min)}
                                    .max=${ifDefined(config.max)}
                                    .step=${ifDefined(config.step)}
                                    .rows=${ifDefined(config.rows)}
                                    .cols=${ifDefined(config.cols)}
                                    ?multiple=${config.multiple}
                                    .options=${config.options}
                                    ?darkmode=${this.darkmode}
                                    @change=${this._handleInputChange}
                                ></c-input>
                            </div>
                        `;
                    })}
                </div>
                <div class="acts" @click=${this._handleActionClick}>
                    <button type="button" class="cncl-btn" data-act="cancel">Cancel</button>
                    <button type="submit" class="sv-btn" data-act="save">Save</button>
                    ${map(this.cActs, act => html`
                        <button type="button" data-act=${act.nm} class=${ifDefined(act.cls)}>${act.lbl}</button>
                    `)}
                </div>
            </form>
        `;
    }
}


// =================================================================
// COMPONENTE: DynObjDisp
// =================================================================

class DynObjDisp extends LitElement {
    static styles = css`
      /* Estilos sin cambios, omitidos por brevedad... */
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
          font-style: italic;
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
      .ed-btn { background-color: #CCE5FF; border-color: #b8daff; color: #004085; }
      .del-btn { background-color: #F8D7DA; color: #721c24; border-color: #f5c6cb; }
      :host([darkmode]) .ed-btn { background-color: #0056b3; border-color: #0056b3; color: white; }
      :host([darkmode]) .del-btn { background-color: #b81c2c; border-color: #b81c2c; color: white; }
    `;

    @property({ type: String })
    mode: 'display' | 'edit' = 'display';

    @property({ type: Object })
    itm: DataItem = {};

    @property({ type: Object })
    fCfg: FormConfig = {};

    @property({ type: String, attribute: 'hdr-key' })
    hdrKey?: string;

    @property({ type: Array })
    cActs: CustomAction[] = [];

    @property({ type: Boolean, reflect: true })
    darkmode = false;

    constructor() {
        super();
        // El botón de eliminar se añade por defecto, se puede quitar con `hideAct`.
        this.addAct('delete', 'Eliminar', 'del-btn');
    }

    /** Añade o reemplaza una acción personalizada. */
    addAct(name: string, label: string, className = '') {
        if (!name || !label) return;
        // Filtra para evitar duplicados por nombre (nm)
        const otherActs = this.cActs.filter(a => a.nm !== name);
        this.cActs = [...otherActs, { nm: name, lbl: label, cls: className }];
    }

    /** Oculta una acción por su nombre. */
    hideAct(name: string) {
        if (!name) return;
        this.cActs = this.cActs.filter(a => a.nm !== name);
    }
    
    private _formatDisplayValue(value: any, config: FieldConfig): string {
        const type = config.type || 'text';
        if (type === 'boolean' || type === 'switch' || type === 'checkbox') {
            return value ? (config.trueLabel || 'Sí') : (config.falseLabel || 'No');
        }
        if (type === 'select' && Array.isArray(config.options)) {
            const option = config.options.find(o => String(o.value) === String(value));
            return option ? option.label : String(value ?? '');
        }
        return String(value ?? ''); // Muestra string vacío para null/undefined
    }

    private _handleDisplayAction(e: MouseEvent) {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
        if (!button)return;

        const action = button.dataset.act;
        const detail = deepCopy(this.itm);

        switch (action) {
            case 'edit':
                this.mode = 'edit';
                break;
            case 'delete':
                this.dispatchEvent(new CustomEvent('del-item', { detail, bubbles: true, composed: true }));
                break;
            default:
                if (action) {
                    this.dispatchEvent(new CustomEvent(action, { detail, bubbles: true, composed: true }));
                }
                break;
        }
    }

    private _handleSave(e: CustomEvent<DataItem>) {
        this.itm = deepCopy(e.detail);
        this.dispatchEvent(new CustomEvent('item-upd', { detail: deepCopy(this.itm), bubbles: true, composed: true }));
        this.mode = 'display';
    }

    private _handleCancel() {
        this.mode = 'display';
    }

    private _renderDisplay(): TemplateResult {
        const headerText = this.hdrKey && this.itm[this.hdrKey] ? this.itm[this.hdrKey] : null;
        return html`
            <div class="d-card">
                ${headerText ? html`<div class="d-hdr">${headerText}</div>` : ''}
                <div class="d-cont">
                    ${map(Object.entries(this.fCfg), ([key, config]) => {
                        const isVisible = shouldFieldBeVisible(config, this.itm);
                        if (config.hidden || key === this.hdrKey || !isVisible) {
                            return null;
                        }
                        return html`
                            <div class="d-prop">
                                <div class="d-prop-lbl">${config.label || key}</div>
                                <div class="d-prop-val" data-type=${config.type || 'text'}>
                                    ${this._formatDisplayValue(this.itm[key], config)}
                                </div>
                            </div>
                        `;
                    })}
                </div>
                <div class="d-acts" @click=${this._handleDisplayAction}>
                    <button type="button" class="ed-btn" data-act="edit">Edit</button>
                    ${map(this.cActs, act => html`
                        <button type="button" data-act=${act.nm} class=${ifDefined(act.cls)}>${act.lbl}</button>
                    `)}
                </div>
            </div>
        `;
    }

    private _renderEdit(): TemplateResult {
        return html`
            <obj-edit-frm
                .fCfg=${this.fCfg}
                .itm=${this.itm}
                ?darkmode=${this.darkmode}
                @save-item=${this._handleSave}
                @cancel-edit=${this._handleCancel}
            ></obj-edit-frm>
        `;
    }

    render(): TemplateResult {
        if (!this.itm || Object.keys(this.fCfg).length === 0) {
            return html`<p>No hay item o configuración para mostrar.</p>`;
        }
        return html`
            <div class="dyn-cont">
                ${this.mode === 'display' ? this._renderDisplay() : this._renderEdit()}
            </div>
        `;
    }
}


// =================================================================
// REGISTRO DE COMPONENTES
// =================================================================

// Suponiendo que tienes una función para registrar los componentes.
// Si no la usas, puedes definir los custom elements directamente.
const registerComponents = (components: Record<string, CustomElementConstructor>) => {
    Object.entries(components).forEach(([name, constructor]) => {
        if (!customElements.get(name)) {
            customElements.define(name, constructor);
        }
    });
};

registerComponents({
    'dyn-obj-disp': DynObjDisp,
    'obj-edit-frm': ObjEditFrm,
});

// Exportaciones para que puedan ser importados en otros módulos.
export {
    DynObjDisp,
    ObjEditFrm,
};