import {
    InputHandlerFactory,
    FileInputHandler,
    TextInputHandler,
    NumberInputHandler,
    TextareaInputHandler,
    CheckboxInputHandler,
    SelectInputHandler,
    RadioInputHandler
} from './Cinput/inputs.ts'
import type {
    InputType,
    InputReturnType,
    IInputHandler,
    InputContext,
    Option
} from './Cinput/Types.ts';
import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

function safeParse(value: InputReturnType): InputReturnType {
    if (value == null || typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
        return value; // Not JSON-like
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        // Try to fix common "sloppy" JSON issues before giving up
        try {
            // Add quotes around keys: {key: val} -> {"key": val}
            let fixedJson = trimmed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            // Replace single quotes with double quotes for string values: 'val' -> "val"
            fixedJson = fixedJson.replace(/:\s*'([^']*)'/g, ': "$1"');
            // Handle trailing commas in objects and arrays (more complex, basic attempt)
            fixedJson = fixedJson.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(fixedJson);
        } catch (error) {
            console.error("Error al parsear JSON después de intentar corregir:", error, "Valor original:", value);
            return value; // Return original string if all parsing fails
        }
    }
}

export class CInput extends LitElement {
    @property({ type: String, reflect: true }) type: InputType = 'text';
    @property({ type: String, reflect: true }) name?: string;
    @property({ type: String }) value?: string = ''; // Always string for attribute compatibility
    @property({ type: String, reflect: true }) placeholder?: string;
    @property({ type: Boolean, reflect: true }) disabled: boolean = false;
    @property({ type: Boolean, reflect: true }) readonly: boolean = false;
    @property({ type: Number, reflect: true }) min?: number; // For number: min value; for text/textarea: minlength
    @property({ type: Number, reflect: true }) max?: number; // For number: max value; for text/textarea: maxlength
    @property({ type: Number, reflect: true }) step?: number;
    @property({ type: Boolean, reflect: true }) darkmode: boolean = false;
    @property({ type: Array }) options: Option[] = [];
    @property({ type: Boolean, reflect: true }) required: boolean = false;
    @property({ type: String, reflect: true }) pattern?: string; // For text: regex; for file: accept mime types
    @property({ type: Boolean, reflect: true }) multiple: boolean = false; // For select and file

    @state() private _isValid: boolean = true;
    @state() private _internalValue?: InputReturnType;
    @state() private _currentHandler!: IInputHandler; // Will be initialized in constructor/willUpdate

    constructor() {
        super();
        this._updateHandler();
        // Initialize _internalValue from value property
        // This will be handled by willUpdate on first update too
        this._internalValue = this._parseValueForInternal(this.value);
    }

    private _updateHandler() {
        this._currentHandler = InputHandlerFactory.getHandler(this.type);
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
        super.attributeChangedCallback(name, oldVal, newVal);

        if (name === 'type' && newVal !== oldVal) {
            this._updateHandler();
            // When type changes, re-parse current value if handler type changes meaning of value
            this._internalValue = this._parseValueForInternal(this.value);
        }

        if (name === 'options' && newVal !== oldVal && typeof newVal === 'string') {
            try {
                const parsedOptions = safeParse(newVal);
                if (Array.isArray(parsedOptions)) {
                    this.options = parsedOptions.every(opt => typeof opt === 'object' && 'value' in opt && 'label' in opt)
                        ? parsedOptions
                        : [];
                } else {
                    console.warn(`Options attribute for c-input [${this.id || this.name || 'unnamed'}] is not a valid array string. Received:`, newVal);
                    this.options = [];
                }
            } catch (e) {
                console.error(`Error parsing options attribute for c-input [${this.id || this.name || 'unnamed'}]:`, e);
                this.options = [];
            }
        }

        // This ensures that if the `value` attribute is changed externally,
        // `_internalValue` is updated accordingly. `willUpdate` handles property changes.
        if (name === 'value' && newVal !== oldVal) {
             // This path is primarily for direct attribute manipulation in HTML or setAttribute
            this._internalValue = this._parseValueForInternal(newVal);
        }
    }

    willUpdate(changedProperties: PropertyValues): void {
        if (changedProperties.has('type')) {
            this._updateHandler();
            // Re-evaluate internalValue with new handler if type changed meaning of value
            this._internalValue = this._parseValueForInternal(this.value);
        }

        if (changedProperties.has('value')) {
            // This handles programmatic changes to this.value
            const newPublicValue = changedProperties.get('value');
            // Only update _internalValue if the public `value` string representation
            // is different from what _internalValue would stringify to.
            // This avoids loops if _handleInputChange sets this.value.
            let currentInternalAsString: string;
            if (Array.isArray(this._internalValue)) {
                currentInternalAsString = JSON.stringify(this._internalValue);
            } else if (this._internalValue instanceof File || this._internalValue instanceof FileList) {
                 // For File/FileList, direct comparison of `this.value` (string) is tricky.
                 // The change usually comes from user interaction, not setting `this.value` to a file string.
                 // So, if `this.value` changes, we trust it and parse.
                 currentInternalAsString = this.value ?? ''; // Placeholder, file comparison is complex
            }
            else {
                currentInternalAsString = (this._internalValue === null || this._internalValue === undefined) ? '' : String(this._internalValue);
            }

            if (newPublicValue !== currentInternalAsString) {
                 this._internalValue = this._parseValueForInternal(this.value);
            }
        }
        
        if (changedProperties.has('options') && typeof this.options === 'string') {
             // If options are set as a string property (e.g. from framework bindings not handling arrays well)
            try {
                const parsedOptions = safeParse(this.options as any);
                 if (Array.isArray(parsedOptions)) {
                    this.options = parsedOptions.every(opt => typeof opt === 'object' && 'value' in opt && 'label' in opt)
                        ? parsedOptions
                        : [];
                } else {
                     this.options = [];
                }
            } catch(e) {
                this.options = [];
            }
        }

        if (changedProperties.has('multiple')) {
            const oldMultiple = changedProperties.get('multiple') as boolean;
            // If multiple changes, re-parse internal value
            if (this.multiple !== oldMultiple) {
                this._internalValue = this._parseValueForInternal(this.value);
            }
        }
    }

    private _parseValueForInternal(val: InputReturnType): InputReturnType {
        if (!this._currentHandler) {
            // Handler not ready, return raw or best guess (string)
            return (val === null || val === undefined) ? null : String(val);
        }
        if (this.type === 'select' && this._currentHandler instanceof SelectInputHandler) {
            return this._currentHandler.parseValue(val, this.multiple);
        }
        return this._currentHandler.parseValue(val);
    }

    private _createContext(): InputContext {
        return {
            id: this.id,
            name: this.name,
            value: this.value, // The string property value
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
            internalValue: this._internalValue, // The typed internal value
            shadowRoot: this.shadowRoot,
            emitEvent: (name, data) => this.EmitEvent(name, data),
            handleInputChange: (evt) => this._handleInputChange(evt),
            parseValueForInternal: (v) => this._parseValueForInternal(v),
            type: this.type // Pass type to context for handler logic if needed
        };
    }

    static styles = css`
        :host {
            display: block; /* Or inline-block depending on desired layout */
            margin-block-start: 0.5rem;
            margin-block-end: 0.5rem;
            color-scheme: light dark; /* Basic dark mode support */
            --inp-text-color: inherit;
            --inp-bg-color: inherit;
            --inp-border-color: #ccc; /* Softer default border */
            --inp-focus-border-color: #2196F3;
            --inp-focus-shadow-color: rgba(33, 150, 243, 0.3);
            --inp-disabled-bg: #f0f0f0;
            --inp-disabled-color: #999;
            --inp-disabled-border-color: #ddd;
            --inp-readonly-bg: #f8f8f8;
            --inp-error-border-color: red;
            --inp-error-shadow-color: rgba(255, 0, 0, 0.2);
            --inp-slider-bg: #ccc;
            --inp-slider-knob: white;
            --inp-slider-active-bg: #2196F3;
            --inp-padding: 0.5em 0.75em; /* Consistent padding */
            --inp-border-radius: 4px;
            --inp-font-size: 1rem;
            font-size: var(--inp-font-size);
        }
        
        :host([darkmode]) {
            --inp-border-color: #555;
            --inp-focus-border-color: #4dabf7; /* Lighter blue for dark mode */
            --inp-focus-shadow-color: rgba(77, 171, 247, 0.3);
            --inp-disabled-bg: #2a2a2a;
            --inp-disabled-color: #777;
            --inp-disabled-border-color: #444;
            --inp-readonly-bg: #222;
            --inp-slider-bg: #555;
            --inp-slider-knob: #ccc;
            --inp-slider-active-bg: #4dabf7;
        }

        .inp-cont {
            display: flex; /* For potential future label/input alignment */
            flex-direction: column; /* Default stacking */
        }
        
        /* General input styling */
        input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), 
        textarea, 
        select {
            padding: var(--inp-padding);
            border: 1px solid var(--inp-border-color);
            border-radius: var(--inp-border-radius);
            font-size: inherit; /* Inherit from host */
            background-color: var(--inp-bg-color);
            color: var(--inp-text-color);
            box-sizing: border-box;
            width: 100%; /* Make them take full width of container by default */
            margin: 0;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        option { /* For select dropdown */
            color: initial; /* Reset for system appearance */
            background-color: initial;
        }
        
        textarea { 
            resize: vertical; 
            min-height: 80px;
            line-height: 1.5;
        }

        /* States: Disabled and Readonly */
        input:disabled, textarea:disabled, select:disabled,
        input[readonly], textarea[readonly], select[readonly] /* Readonly often styled like disabled */
         {
            background-color: var(--inp-disabled-bg);
            color: var(--inp-disabled-color);
            border-color: var(--inp-disabled-border-color);
            cursor: not-allowed;
        }
        input[readonly], textarea[readonly] {
             background-color: var(--inp-readonly-bg);
             cursor: default; /* Readonly is not "not-allowed" but "no-drop" can be too strong */
        }
        :host([readonly]) select { /* Custom styling for readonly select if needed */
             pointer-events: none; /* Simulate readonly for select */
        }

        /* Focus state */
        input:not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly]):focus,
        textarea:not([disabled]):not([readonly]):focus,
        select:not([disabled]):not([readonly]):focus {
            outline: none;
            border-color: var(--inp-focus-border-color);
            box-shadow: 0 0 0 3px var(--inp-focus-shadow-color);
        }

        /* Invalid state */
        :host([invalid]) .input-element:not([type="checkbox"]):not([type="radio"]) {
            border-color: var(--inp-error-border-color) !important;
            box-shadow: 0 0 0 3px var(--inp-error-shadow-color) !important;
        }
        :host([invalid]) .radio-group,
        :host([invalid]) .sw,
        :host([invalid]) .cb-label {
            outline: 2px solid var(--inp-error-border-color); /* Visual cue for group/label types */
            outline-offset: 2px;
        }

        /* Checkbox / Switch / Radio specific styling */
        .cb-label, .radio-label {
            display: inline-flex;
            align-items: center;
            margin-right: 1em; /* Spacing between multiple radios/checkboxes */
            cursor: pointer;
            position: relative; /* For custom styling if needed */
        }
        .cb-label input[type="checkbox"], .radio-label input[type="radio"] {
             margin-right: 0.5em;
        }
        .label-text {
            user-select: none;
        }

        /* Switch Styles */
        .sw { position: relative; display: inline-block; width: 50px; height: 26px; cursor:pointer; }
        .sw input { opacity: 0; width: 0; height: 0; }
        .sldr { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--inp-slider-bg); transition: .3s; border-radius: 26px; }
        .sldr:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: var(--inp-slider-knob); transition: .3s; border-radius: 50%; }
        
        input:checked + .sldr { background-color: var(--inp-slider-active-bg); }
        input:checked + .sldr:before { transform: translateX(24px); }
        
        /* Focus visible for accessibility on switch/checkbox/radio */
        input[type="checkbox"]:focus-visible, 
        input[type="radio"]:focus-visible {
             outline: 2px solid var(--inp-focus-border-color);
             outline-offset: 2px;
        }
        input[type="checkbox"]:focus-visible + .sldr { /* For switch */
            box-shadow: 0 0 0 3px var(--inp-focus-shadow-color);
        }
        
        /* Select multiple styling */
        select[multiple] {
            min-height: 100px; /* Or adjust as needed */
        }
        select option:checked { /* More subtle highlighting for selected options */
            /* background-color: var(--inp-focus-border-color); */
            /* color: white; */
        }
        .radio-group {
            display: flex;
            flex-direction: column; /* or 'row' if preferred */
            gap: 0.5em;
        }
        :host([type="radio"]) .inp-cont, 
        :host([type="checkbox"]) .inp-cont, 
        :host([type="switch"]) .inp-cont {
             padding: 0; /* Remove padding for wrapper of these types */
        }
    `;

    render() {
        this.toggleAttribute('invalid', !this._isValid);
        // Pass the type to the host for specific styling if needed
        // this.setAttribute('type', this.type); // This is already handled by reflect: true

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

    public _handleInputChange(evt: Event) {
        if (!this._currentHandler) return;

        const context = this._createContext(); // Create context once
        const newValueTyped = this._currentHandler.handleChange(evt, context);

        this._internalValue = newValueTyped; // Update internal state with typed value

        // Update the public 'value' property (string representation for attribute)
        if (newValueTyped instanceof File) {
            this.value = newValueTyped.name; // For single file, use name
        } else if (newValueTyped instanceof FileList) {
            this.value = Array.from(newValueTyped).map(f => f.name).join(', '); // For multiple files
        } else if (Array.isArray(newValueTyped)) {
            this.value = JSON.stringify(newValueTyped); // For select multiple
        } else if (newValueTyped === null || newValueTyped === undefined) {
            this.value = '';
        } else {
            this.value = String(newValueTyped);
        }
        
        // The change to this.value will trigger willUpdate if its value actually changed.
        // No explicit requestUpdate is typically needed here because properties _internalValue (state)
        // and value (property) are changing, which Lit tracks.

        this.EmitEvent('change', {
            id: this.id,
            name: this.name,
            value: this._internalValue, // Emit the typed internal value
            nativeEvent: evt // Pass native event if needed by consumers
        });

        this.isValid(); // Validate after updating the value, this will update _isValid state
    }

    private _handleSubmit(e: Event) {
        e.preventDefault();
        if (this.isValid()) {
            this.EmitEvent('form-submit', { id: this.id, name: this.name, value: this.getVal() });
        } else {
            // Optionally, focus the first invalid field or provide more specific feedback
            const inputElement = this._getInternalInputElement();
            if (inputElement && this._hasReportValidity(inputElement)) {
                inputElement.reportValidity();
            }
            // For radio groups, focusing the group or first radio might be better
        }
    }

    // Type guard to check if element has reportValidity method
    private _hasReportValidity(element: HTMLElement): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
        return 'reportValidity' in element && typeof (element as any).reportValidity === 'function';
    }

    private _getInternalInputElement(): HTMLElement | null {
        // For radios, there isn't a single ".input-element" but a group
        if (this.type === 'radio') {
            return this.shadowRoot?.querySelector('.radio-group input:first-of-type') as HTMLInputElement | null;
        }
        return this.shadowRoot?.querySelector('.input-element') as HTMLElement | null;
    }

    /** Returns the current value (potentially typed) */
    getVal(): InputReturnType {
        return this._internalValue;
    }

    /** Verifies input validity and updates the `invalid` attribute. */
    isValid(): boolean {
        if (!this._currentHandler) {
            this._isValid = true;
            return true;
        }
        const context = this._createContext();
        const valid = this._currentHandler.isValid(context);
        this._isValid = valid; // This is a @state property, so it will trigger a re-render
        return valid;
    }

    /** Sets the input value programmatically. */
    setVal(val: InputReturnType): void {
        this._internalValue = this._parseValueForInternal(val);

        // Update the public 'value' property string representation
        if (this._internalValue instanceof File) {
            this.value = this._internalValue.name;
        } else if (this._internalValue instanceof FileList) {
            this.value = Array.from(this._internalValue).map(f => f.name).join(', ');
        } else if (Array.isArray(this._internalValue)) {
            this.value = JSON.stringify(this._internalValue);
        } else if (this._internalValue === null || this._internalValue === undefined) {
            this.value = '';
        } else {
            this.value = String(this._internalValue);
        }
        // Request update because _internalValue (state) and value (property) have changed.
        // Lit should handle this automatically. If not, uncomment:
        // this.requestUpdate();

        // Defer validation to allow DOM to update
        // Wait for the update cycle to complete before validating
        this.updateComplete.then(() => {
            this.isValid();
            this.EmitEvent('change', { // Emit change event after programmatic setVal
                id: this.id,
                name: this.name,
                value: this._internalValue,
                programmatic: true
            });
        });
    }

    /** Resets the input to its default value (empty, false, or handler-defined). */
    reset(): void {
        if (!this._currentHandler) return;
        const context = this._createContext();
        const defaultValue = this._currentHandler.reset(context);
        this.setVal(defaultValue); // setVal will handle updates and event emission
    }

    /** Sets options for select/radio inputs. */
    setOpts(opts: Option[]): void {
        if (['select', 'radio'].includes(this.type.toLowerCase())) {
            this.options = Array.isArray(opts) ? opts : [];
            // If options change, current value might become invalid or need reassessment
            this.setVal(this._parseValueForInternal(this.value)); // Re-evaluate value with new options
        } else {
            console.warn(`setOpts is only applicable to 'select' or 'radio' types. Current type: ${this.type}`);
        }
    }

    /** Gets the display label of the selected option in a single select. */
    getSelOptLabel(): string | null {
        if (this.type === 'select' && this._currentHandler?.getSelectedOption) {
            return this._currentHandler.getSelectedOption(this._createContext());
        }
        return null;
    }
    
    focus() {
        const el = this._getInternalInputElement();
        if (el && typeof el.focus === 'function') {
            el.focus();
        }
    }

    static registerInputHandler(type: string, handler: IInputHandler): void {
        InputHandlerFactory.registerHandler(type, handler);
    }
}

if (!customElements.get('c-input')) {
    customElements.define('c-input', CInput);
}