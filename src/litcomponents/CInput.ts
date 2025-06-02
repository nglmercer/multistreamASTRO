import { LitElement, html, css, type PropertyValues,type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { map } from 'lit/directives/map.js';

// Define interfaces for options
interface Option {
    value: string;
    label: string;
}

// Define input types
type InputType = 'text' | 'textarea' | 'select' | 'checkbox' | 'switch' | 'boolean' | 'radio' |
    'number' | 'email' | 'password' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 'string' | 'File' | 'file' | 'color' | 'range';
type InputReturnType = string | boolean | number | string[] | null | undefined | object;

function safeParse(value: InputReturnType): InputReturnType {
    if (value == null || typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
        return value;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        try {
            const fixedJson = trimmed
                .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
                .replace(/:\s*'([^']+)'/g, ': "$1"');
            return JSON.parse(fixedJson);
        } catch (error) {
            console.error("Error al parsear JSON:", error, "Valor recibido:", value);
            return value;
        }
    }
}

// Base interface that all input handlers must implement
interface IInputHandler {
    render(context: InputContext): TemplateResult;
    parseValue(val: string | null | undefined | string[] | boolean | number): string | boolean | number | string[] | null;
    handleChange(evt: Event, context: InputContext): string | boolean | string[] | null;
    handleInput?(evt: Event, context: InputContext): void;
    isValid(context: InputContext): boolean;
    reset(context: InputContext): string | boolean | null | string[] | undefined;
    getSelectedOption?(context: InputContext): string | null;
}

// Context object that contains all the component properties and methods
interface InputContext {
    id?: string;
    name?: string;
    value?: string;
    placeholder?: string;
    disabled: boolean;
    readonly: boolean;
    min?: number;
    max?: number;
    step?: number;
    darkmode: boolean;
    options: Option[];
    required: boolean;
    pattern?: string;
    handleChange?: (evt: Event) => string | boolean | string[] | null;
    multiple: boolean;
    title?: string;
    internalValue?: string | boolean | number | string[] | null;
    shadowRoot?: ShadowRoot | null;
    emitEvent: (name: string, data: unknown) => void;
    parseValueForInternal: (val: string | null | undefined | string[] | boolean | number) => string | boolean | number | string[] | null;
}

// Text-based input handler (text, email, password, etc.)
class TextInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        const inputType = context.value === 'string' ? 'text' : context.value;
        return html`
            <input
                class="input-element"
                type=${inputType}
                id=${ifDefined(context.id)}
                name=${ifDefined(context.name)}
                value=${context.internalValue === null ? '' : String(context.internalValue)}
                placeholder=${ifDefined(context.placeholder)}
                ?disabled=${context.disabled}
                ?readonly=${context.readonly}
                ?required=${context.required}
                min=${context.min}
                max=${context.max}
                step=${context.step}
                title=${ifDefined(context.title)}
                pattern=${ifDefined(context.pattern)}
                @change=${(evt: Event) => this.handleChange(evt, context)}
                @input=${(evt: Event) => this.handleInput?.(evt, context)}
            >
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): string | boolean | number | string[] | null {
        if (val === null || val === undefined) {
            return '';
        }
        return String(val);
    }

    handleChange(evt: Event, context: InputContext): string {
        const inputElement = evt.target as HTMLInputElement;
        return inputElement.value;
    }

    handleInput(evt: Event, context: InputContext): void {
        const inputElement = evt.target as HTMLInputElement;
        if (inputElement.pattern) {
            const allowedPattern = new RegExp(inputElement.pattern, 'g');
            const matches = inputElement.value.match(allowedPattern);
            inputElement.value = matches ? matches.join('') : '';
        }
    }

    isValid(context: InputContext): boolean {
        const inputElement = context.shadowRoot?.querySelector('.input-element') as HTMLInputElement;
        return inputElement ? inputElement.checkValidity() : true;
    }

    reset(context: InputContext): string {
        return '';
    }
}

// Number input handler
class NumberInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        return html`
            <input
                class="input-element"
                type="number"
                id=${ifDefined(context.id)}
                name=${ifDefined(context.name)}
                value=${context.internalValue === null ? '' : String(context.internalValue)}
                placeholder=${ifDefined(context.placeholder)}
                ?disabled=${context.disabled}
                ?readonly=${context.readonly}
                ?required=${context.required}
                min=${context.min}
                max=${context.max}
                step=${context.step}
                title=${ifDefined(context.title)}
                pattern=${ifDefined(context.pattern)}
                @change=${(evt: Event) => this.handleChange(evt, context)}
            >
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): number | null {
        if (val === '' || val === null || val === undefined) {
            return null;
        }
        const num = Number(val);
        return isNaN(num) ? null : num;
    }

    handleChange(evt: Event, context: InputContext): string {
        const inputElement = evt.target as HTMLInputElement;
        return inputElement.value;
    }

    isValid(context: InputContext): boolean {
        const inputElement = context.shadowRoot?.querySelector('.input-element') as HTMLInputElement;
        return inputElement ? inputElement.checkValidity() : true;
    }

    reset(context: InputContext): string {
        return '';
    }
}

// Textarea input handler
class TextareaInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        return html`
            <textarea
                class="input-element"
                id=${ifDefined(context.id)}
                name=${ifDefined(context.name)}
                .value=${context.internalValue === null ? '' : String(context.internalValue)}
                placeholder=${ifDefined(context.placeholder)}
                ?disabled=${context.disabled}
                ?readonly=${context.readonly}
                ?required=${context.required}
                title=${ifDefined(context.title)}
                pattern=${ifDefined(context.pattern)}
                @change=${(evt: Event) => this.handleChange(evt, context)}
            ></textarea>
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): string {
        if (val === null || val === undefined) {
            return '';
        }
        return String(val);
    }

    handleChange(evt: Event, context: InputContext): string {
        const inputElement = evt.target as HTMLTextAreaElement;
        return inputElement.value;
    }

    isValid(context: InputContext): boolean {
        const inputElement = context.shadowRoot?.querySelector('.input-element') as HTMLTextAreaElement;
        return inputElement ? inputElement.checkValidity() : true;
    }

    reset(context: InputContext): string {
        return '';
    }
}

// Checkbox/Switch input handler
class CheckboxInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        return html`
            <label class="sw">
                <input
                    class="input-element"
                    type="checkbox"
                    id=${ifDefined(context.id)}
                    name=${ifDefined(context.name)}
                    .checked=${Boolean(context.internalValue)}
                    ?disabled=${context.disabled}
                    ?readonly=${context.readonly}
                    ?required=${context.required}
                    title=${ifDefined(context.title)}
                    @change=${(evt: Event) => this.handleChange(evt, context)}
                >
                <span class="sldr"></span>
            </label>
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): boolean {
        return String(val).toLowerCase() === 'true';
    }

    handleChange(evt: Event, context: InputContext): boolean {
        const inputElement = evt.target as HTMLInputElement;
        return inputElement.checked;
    }

    isValid(context: InputContext): boolean {
        const inputElement = context.shadowRoot?.querySelector('.input-element') as HTMLInputElement;
        return inputElement ? inputElement.checkValidity() : true;
    }

    reset(context: InputContext): boolean {
        return false;
    }
}

// Select input handler
class SelectInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        return html`
            <select
                class="input-element"
                id=${ifDefined(context.id)}
                name=${ifDefined(context.name)}
                .value=${!context.multiple ? (context.internalValue === null ? '' : String(context.internalValue)) : undefined}
                ?disabled=${context.disabled}
                ?readonly=${context.readonly}
                ?required=${context.required}
                title=${ifDefined(context.title)}
                @change=${context.handleChange}
                ?multiple=${context.multiple}
            >
                ${map(context.options, (opt) => {
                    const isSelected = context.multiple
                        ? Array.isArray(context.internalValue) && context.internalValue.includes(String(opt.value))
                        : String(opt.value) == String(context.internalValue ?? '');

                    return html`
                        <option value=${opt.value} ?selected=${isSelected}>
                            ${opt.label}
                        </option>
                    `;
                })}
            </select>
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): string | string[] {
        if (val === null || val === undefined) {
            return '';
        }

        // This will be handled by the main component based on multiple property
        return String(val);
    }

    handleChange(evt: Event, context: InputContext): string | string[] {
        const selectElement = evt.target as HTMLSelectElement;
        if (context.multiple) {
            return Array.from(selectElement.selectedOptions).map(option => option.value);
        }
        return selectElement.value;
    }

    isValid(context: InputContext): boolean {
        const inputElement = context.shadowRoot?.querySelector('.input-element') as HTMLSelectElement;
        return inputElement ? inputElement.checkValidity() : true;
    }

    reset(context: InputContext): string | string[] {
        return context.multiple ? [] : '';
    }

    getSelectedOption(context: InputContext): string | null {
        const select = context.shadowRoot?.querySelector('.input-element') as HTMLSelectElement;
        return select ? select.value : null;
    }
}


// Radio input handler
class RadioInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        return html`
            ${map(context.options, (opt) => html`
                <label>
                    <input 
                        type="radio"
                        id=${`${context.id || context.name}_${opt.value}`}
                        name=${ifDefined(context.name)}
                        value=${opt.value}
                        .checked=${opt.value == context.internalValue}
                        ?disabled=${context.disabled}
                        ?readonly=${context.readonly}
                        ?required=${context.required}
                        title=${ifDefined(context.title)}
                        @change=${(evt: Event) => this.handleChange(evt, context)}
                    >
                    ${opt.label}
                </label>
            `)}
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): string | null {
        if (val === null || val === undefined) {
            return null;
        }
        return String(val);
    }

    handleChange(evt: Event, context: InputContext): string | null {
        const checkedRadio = context.shadowRoot?.querySelector(`input[name="${context.name}"]:checked`) as HTMLInputElement;
        return checkedRadio ? checkedRadio.value : null;
    }

    isValid(context: InputContext): boolean {
        if (context.required) {
            const checkedRadio = context.shadowRoot?.querySelector(`input[name="${context.name}"]:checked`);
            return checkedRadio !== null;
        }
        return true;
    }

    reset(context: InputContext): null {
        const radioInputs = context.shadowRoot?.querySelectorAll(`input[name="${context.name}"]`);
        radioInputs?.forEach(r => (r as HTMLInputElement).checked = false);
        return null;
    }
}

// File input handler
class FileInputHandler implements IInputHandler {
    render(context: InputContext): TemplateResult {
        return html`
            <input
                class="input-element"
                id=${ifDefined(context.id)}
                type="file"
                name=${ifDefined(context.name)}
                placeholder=${ifDefined(context.placeholder)}
                ?disabled=${context.disabled}
                ?readonly=${context.readonly}
                ?required=${context.required}
                title=${ifDefined(context.title)}
                pattern=${ifDefined(context.pattern)}
                @change=${(evt: Event) => this.handleChange(evt, context)}
            >
        `;
    }

    parseValue(val: string | null | undefined | string[] | boolean | number): string {
        if (val === null || val === undefined) {
            return '';
        }
        return String(val);
    }

    handleChange(evt: Event, context: InputContext): string {
        const inputElement = evt.target as HTMLInputElement;
        return inputElement.value;
    }

    isValid(context: InputContext): boolean {
        const inputElement = context.shadowRoot?.querySelector('.input-element') as HTMLInputElement;
        return inputElement ? inputElement.checkValidity() : true;
    }

    reset(context: InputContext): string {
        return '';
    }
}

// Factory class to create input handlers
class InputHandlerFactory {
    private static handlers: Map<string, IInputHandler> = new Map();

    static {
        // Initialize handlers in static block to avoid type inference issues
        this.handlers.set('text', new TextInputHandler());
        this.handlers.set('string', new TextInputHandler());
        this.handlers.set('email', new TextInputHandler());
        this.handlers.set('password', new TextInputHandler());
        this.handlers.set('tel', new TextInputHandler());
        this.handlers.set('url', new TextInputHandler());
        this.handlers.set('date', new TextInputHandler());
        this.handlers.set('time', new TextInputHandler());
        this.handlers.set('datetime-local', new TextInputHandler());
        this.handlers.set('color', new TextInputHandler());
        this.handlers.set('range', new TextInputHandler());
        this.handlers.set('number', new NumberInputHandler());
        this.handlers.set('textarea', new TextareaInputHandler());
        this.handlers.set('checkbox', new CheckboxInputHandler());
        this.handlers.set('switch', new CheckboxInputHandler());
        this.handlers.set('boolean', new CheckboxInputHandler());
        this.handlers.set('select', new SelectInputHandler());
        this.handlers.set('radio', new RadioInputHandler());
        this.handlers.set('file', new FileInputHandler());
        this.handlers.set('File', new FileInputHandler());
    }

    static getHandler(type: InputType): IInputHandler {
        const handler = this.handlers.get(type);
        if (!handler) {
            console.warn(`Handler for input type '${type}' not found, using text handler`);
            return this.handlers.get('text')!;
        }
        return handler;
    }

    // Allows adding custom handlers
    static registerHandler(type: string, handler: IInputHandler): void {
        this.handlers.set(type, handler);
    }
}

export class CInput extends LitElement {
    // Properties with decorators
    @property({ type: String, reflect: true }) type: InputType = 'text';
    @property({ type: String, reflect: true }) name?: string;
    @property({ type: String }) value?: string = '';
    @property({ type: String, reflect: true }) placeholder?: string;
    @property({ type: Boolean, reflect: true }) disabled: boolean = false;
    @property({ type: Boolean, reflect: true }) readonly: boolean = false;
    @property({ type: Number, reflect: true }) min?: number;
    @property({ type: Number, reflect: true }) max?: number;
    @property({ type: Number, reflect: true }) step?: number;
    @property({ type: Boolean, reflect: true }) darkmode: boolean = false;
    @property({ type: Array }) options: Option[] = [];
    @property({ type: Boolean, reflect: true }) required: boolean = false;
    @property({ type: String, reflect: true }) pattern?: string;
    @property({ type: Boolean, reflect: true }) multiple: boolean = false;

    // Internal state properties
    @state() private _isValid: boolean = true;
    @state() private _internalValue?: string | boolean | number | string[] | null;
    @state() private _currentHandler?: IInputHandler;

    constructor() {
        super();
        this._currentHandler = InputHandlerFactory.getHandler(this.type);
    }

    // Handle attribute changes
    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
        super.attributeChangedCallback(name, oldVal, newVal);

        if (name === 'type' && newVal !== oldVal) {
            this._currentHandler = InputHandlerFactory.getHandler(newVal as InputType);
        }

        if (name === 'options' && newVal !== oldVal && typeof newVal === 'string') {
            try {
                const arrayOptions = safeParse(newVal);
                if (!Array.isArray(arrayOptions)) {
                    console.warn(`Options attribute for c-inp [${this.id || this.name}] is not an array`);
                }
                this.options = Array.isArray(arrayOptions) ? arrayOptions : [];
            } catch (e) {
                console.error(`Error parsing options attribute for c-inp [${this.id || this.name}]:`, e);
                this.options = [];
            }
        }

        if (name === 'value' && newVal !== oldVal) {
            this._internalValue = this._parseValueForInternal(newVal);
        }
    }

    // Update lifecycle hook
    willUpdate(changedProperties: PropertyValues): void {
        if (changedProperties.has('type')) {
            this._currentHandler = InputHandlerFactory.getHandler(this.type);
        }

        if (changedProperties.has('value')) {
            this._internalValue = this._parseValueForInternal(this.value);
        }

        if (changedProperties.has('multiple')) {
            const oldMultiple = changedProperties.get('multiple') as boolean;

            if (this.multiple && !oldMultiple && !Array.isArray(this._internalValue)) {
                this._internalValue = (this._internalValue !== null && this._internalValue !== undefined && this._internalValue !== '')
                    ? [String(this._internalValue)]
                    : [];
            } else if (!this.multiple && oldMultiple && Array.isArray(this._internalValue)) {
                this._internalValue = this._internalValue.length > 0 ? this._internalValue[0] : '';
            }
        }
    }

    // Parse value for internal storage based on input type
    private _parseValueForInternal(val: string | null | undefined | string[] | boolean | number): string | boolean | number | string[] | null {
        if (!this._currentHandler) {
            return val as any;
        }

        if (this.multiple && this.type === 'select') {
            if (Array.isArray(val)) {
                return val.map(String);
            }

            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) ? parsed.map(String) : [];
                } catch (e) {
                    return val ? [String(val)] : [];
                }
            }

            return [];
        }

        return this._currentHandler.parseValue(val);
    }

    // Create context object for handlers
    private _createContext(): InputContext {
        return {
            id: this.id,
            name: this.name,
            value: this.value,
            placeholder: this.placeholder,
            disabled: this.disabled,
            readonly: this.readonly,
            min: this.min,
            max: this.max,
            step: this.step,
            darkmode: this.darkmode,
            options: this.options,
            required: this.required,
            pattern: this.pattern,
            multiple: this.multiple,
            title: this.title,
            internalValue: this._internalValue,
            shadowRoot: this.shadowRoot,
            emitEvent: (name: string, data: unknown) => this.EmitEvent(name, data),
            parseValueForInternal: (val) => this._parseValueForInternal(val)
        };
    }

    // CSS styles (same as before)
    static styles = css`
        :host {
            display: block;
            margin: 0.5rem;
            padding: 0;
            color-scheme: light dark;
            --inp-border-color: rgba(99, 99, 99, 0.5);
            --inp-disabled-bg: #f5f5f5;
            --inp-disabled-color: #888;
            --inp-slider-bg: #ccc;
            --inp-slider-knob: white;
            --padding: 0.5rem;
            --border: 1px solid var(--inp-border-color);
        }
        
        :host([darkmode]) {
            --inp-border-color: #555;
            --inp-disabled-bg: #222;
            --inp-disabled-color: #666;
            --inp-slider-bg: #555;
            --inp-slider-knob: #888;
        }

        .inp-cont {
            display: flex;
            flex-direction: column;
            padding: var(--padding);
        }
        
        label {
            display: inline-flex;
            align-items: center;
            margin-right: 10px;
            cursor: pointer;
        }

        input, textarea, select {
            padding: 0.5rem;
            border: var(--border);
            border-radius: 4px;
            font-size: 14px;
            background-color: inherit;
            color: inherit;
            box-sizing: border-box;
            margin: 0;
        }
        
        option {
            color: slategray;
            background-color: #fff;
            text-indent: 0;
        }
        
        textarea { 
            resize: vertical; 
            min-height: 80px;
        }

        input:disabled, textarea:disabled, select:disabled {
            background-color: var(--inp-disabled-bg);
            cursor: not-allowed;
            color: var(--inp-disabled-color);
            border: 1px solid var(--inp-disabled-color);
        }
        
        input:read-only, textarea:read-only {
            background-color: var(--inp-disabled-bg);
            cursor: no-drop;
            color: var(--inp-disabled-color);
        }

        .sw { position: relative; display: inline-block; width: 60px; height: 30px; }
        .sw input { opacity: 0; width: 0; height: 0; }
        .sldr { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--inp-slider-bg); transition: .4s; border-radius: 34px; }
        .sldr:before { position: absolute; content: ""; height: 22px; width: 22px; left: 4px; bottom: 4px; background-color: var(--inp-slider-knob); transition: .4s; border-radius: 50%; }
        input:checked + .sldr { background-color: #2196F3; }
        input:checked + .sldr:before { transform: translateX(28px); }
        input:focus + .sldr {
            border: 1px solid #2196F3;
        }
        
        input:not(:read-only):focus,
        textarea:not(:read-only):focus,
        select:focus {
            outline: none;
            border-color: #2196F3;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
            cursor: auto;
        }
        
        input:focus,
        textarea:focus,
        select:focus {
            outline: none;
        }
        
        select option:checked {
            background-color: rgb(0, 171, 255);
            color: white;
            font-weight: bold;
        }
        
        :host([invalid]) .input-element {
            border-color: red !important;
            box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2) !important;
        }
    `;

    // Render method
    render() {
        this.toggleAttribute('invalid', !this._isValid);

        return html`
            <form class="val-form" @submit="${this._handleSubmit}" novalidate>
                <div class="inp-cont">
                    ${this._currentHandler?.render(this._createContext())}
                </div>
                <button type="submit" style="display: none;"></button>
            </form>
        `;
    }

    public EmitEvent(name: string, data: unknown) {
        this.dispatchEvent(new CustomEvent(name, {
            detail: data,
            bubbles: true,
            composed: true
        }));
    }

    // Event handlers
    private _handleInputChange(evt: Event) {
        if (!this._currentHandler) return;

        const context = this._createContext();
        const newValue = this._currentHandler.handleChange(evt, context);

        // Update internal value first
        this._internalValue = this._parseValueForInternal(newValue);
        // Update public 'value' property (as string for attribute)
        this.value = (newValue === null || newValue === undefined) ? '' : String(newValue);

        this.EmitEvent('change', { 
            id: this.id, 
            name: this.name, 
            value: this._internalValue, 
            target: evt.target 
        });

        // Validate after updating the value
        this.isValid();
    }

    private _handleSubmit(e: Event) {
        e.preventDefault();

        if (this.isValid()) {
            this.EmitEvent('form-submit', { id: this.id, name: this.name, value: this.getVal() });
        } else {
            const input = this._getInternalInputElement();
            input?.reportValidity();
        }
    }

    // Get internal input element
    private _getInternalInputElement(): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
        if (this.type === 'radio') return null;
        return this.shadowRoot?.querySelector('.input-element') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    }

    // Public methods
    /** Returns the current value (potentially typed) */
    getVal(): string | boolean | number | string[] | null | undefined {
        return this._internalValue || this.value;
    }

    /** Verifies input validity */
    isValid(): boolean {
        if (!this._currentHandler) {
            this._isValid = true;
            return true;
        }

        const context = this._createContext();
        const valid = this._currentHandler.isValid(context);
        this._isValid = valid;
        return valid;
    }

    /** Sets the input value */
    setVal(val: string | boolean | number | string[] | null): void {
        this._internalValue = this._parseValueForInternal(val);
        this.value = (val === null || val === undefined) ? '' : String(val);
        this.requestUpdate();
        setTimeout(() => this.isValid(), 0);
        this.EmitEvent('change', this.getVal());
    }

    /** Resets the input to its default value (empty or false) */
    reset(): void {
        if (!this._currentHandler) return;

        const context = this._createContext();
        const defaultVal = this._currentHandler.reset(context);
        this.setVal(defaultVal || '');
    }

    /** Sets options for select/radio inputs */
    setOpts(opts: Option[]): void {
        if (['select', 'radio'].includes(this.type)) {
            this.options = Array.isArray(opts) ? opts : [];
        }
    }

    /** Gets the selected option in a select */
    getSelOpt(): string | null {
        if (!this._currentHandler || !('getSelectedOption' in this._currentHandler)) {
            return null;
        }

        const context = this._createContext();
        return this._currentHandler.getSelectedOption!(context);
    }

    // Static method to register custom handlers
    static registerInputHandler(type: string, handler: IInputHandler): void {
        InputHandlerFactory.registerHandler(type, handler);
    }
}

// Register the custom element
if (!customElements.get('c-input')) {
    customElements.define('c-input', CInput);
}