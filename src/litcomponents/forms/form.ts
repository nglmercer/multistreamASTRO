import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import type { Option } from '../Cinput/Types.ts';

export interface FieldConfig {
    type?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    hidden?: boolean;
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
    options?: Option[];
    rows?: number;
    cols?: number;
    title?: string;
    multiple?: boolean;
    [key: string]: any; // Para propiedades adicionales
}

export interface FormAction {
    name: string;
    label: string;
    className?: string;
    type?: 'button' | 'submit';
}

export interface FormChangeEvent {
    fieldName: string;
    value: any;
    formData: Record<string, any>;
}

export class LitFormBuilder extends LitElement {
    @property({ type: Object }) formData: Record<string, any> = {};
    @property({ type: Object }) fieldConfigs: Record<string, FieldConfig> = {};
    @property({ type: Array }) customActions: FormAction[] = [];
    @property({ type: Boolean, reflect: true }) darkmode: boolean = false;
    @property({ type: String }) submitButtonText: string = 'Save';
    @property({ type: String }) cancelButtonText: string = 'Cancel';
    @property({ type: Boolean }) showCancelButton: boolean = false;
    @property({ type: Boolean }) showSubmitButton: boolean = true;
    @property({ type: String }) gridColumns: string = 'repeat(auto-fit, minmax(250px, 1fr))';

    @state() private _initialData: Record<string, any> = {};
    @state() private _currentData: Record<string, any> = {};
    @state() private _fieldValidationStates: Record<string, boolean> = {};

    static styles = css`
        :host {
            display: block;
            font-family: var(--form-font-family, sans-serif);
            padding: var(--form-padding, 15px);
            border: var(--form-border, 1px solid #eee);
            border-radius: var(--form-border-radius, 8px);
            background-color: var(--form-bg-color, #f9f9f9);
            margin-bottom: var(--form-margin-bottom, 15px);
            
            --form-primary-color: #28a745;
            --form-secondary-color: #6c757d;
            --form-danger-color: #dc3545;
            --form-info-color: #007bff;
        }

        :host([darkmode]) {
            background-color: var(--form-bg-color-dark, #333);
            border-color: var(--form-border-color-dark, #555);
            color: var(--form-text-color-dark, #eee);
            
            --form-primary-color: #34ce57;
            --form-secondary-color: #8a939b;
            --form-danger-color: #e74c3c;
            --form-info-color: #3498db;
        }

        .form-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .fields-container {
            display: grid;
            grid-template-columns: var(--form-grid-columns, repeat(auto-fit, minmax(250px, 1fr)));
            gap: var(--form-field-gap, 10px 15px);
            padding: 0.5rem;
            border-bottom: 1px solid var(--form-divider-color, #eee);
        }

        :host([darkmode]) .fields-container {
            border-bottom-color: var(--form-divider-color-dark, #555);
        }

        .field-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .field-wrapper.invalid label {
            color: var(--form-danger-color);
        }

        .field-wrapper.hidden {
            display: none;
        }

        label {
            font-weight: var(--form-label-font-weight, 500);
            font-size: var(--form-label-font-size, 0.9em);
            color: var(--form-label-color, #333);
            text-transform: var(--form-label-transform, capitalize);
            margin: 0;
        }

        :host([darkmode]) label {
            color: var(--form-label-color-dark, #eee);
        }

        c-input {
            margin: 0;
        }

        .form-actions {
            display: flex;
            justify-content: var(--form-actions-justify, flex-end);
            gap: var(--form-actions-gap, 10px);
            flex-wrap: wrap;
        }

        .form-button {
            padding: var(--form-button-padding, 8px 16px);
            cursor: pointer;
            border: 1px solid transparent;
            border-radius: var(--form-button-border-radius, 4px);
            font-size: var(--form-button-font-size, 0.95em);
            font-weight: var(--form-button-font-weight, 500);
            transition: all 0.2s ease;
            background-color: #fff;
            color: #333;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: var(--form-button-min-width, 80px);
        }

        .form-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .form-button:active:not(:disabled) {
            transform: translateY(0);
        }

        .form-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .form-button--primary {
            background-color: var(--form-primary-color);
            color: white;
            border-color: var(--form-primary-color);
        }

        .form-button--secondary {
            background-color: var(--form-secondary-color);
            color: white;
            border-color: var(--form-secondary-color);
        }

        .form-button--danger {
            background-color: var(--form-danger-color);
            color: white;
            border-color: var(--form-danger-color);
        }

        .form-button--info {
            background-color: var(--form-info-color);
            color: white;
            border-color: var(--form-info-color);
        }

        .form-button--outline {
            background-color: transparent;
            color: var(--form-secondary-color);
            border-color: var(--form-secondary-color);
        }

        :host([darkmode]) .form-button {
            background-color: var(--form-button-bg-dark, #555);
            border-color: var(--form-button-border-dark, #777);
            color: var(--form-button-text-dark, #eee);
        }

        :host([darkmode]) .form-button:hover:not(:disabled) {
            filter: brightness(1.1);
        }

        .no-fields-message {
            text-align: center;
            color: var(--form-secondary-color);
            font-style: italic;
            padding: 20px;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .fields-container {
                grid-template-columns: 1fr;
            }
            
            .form-actions {
                flex-direction: column;
            }
            
            .form-button {
                width: 100%;
            }
        }
    `;

    constructor() {
        super();
        this._initializeData();
    }

    willUpdate(changedProperties: PropertyValues): void {
        if (changedProperties.has('formData')) {
            this._initializeData();
        }

        if (changedProperties.has('fieldConfigs')) {
            this._validateAllFields();
        }

        if (changedProperties.has('gridColumns')) {
            this.style.setProperty('--form-grid-columns', this.gridColumns);
        }
    }

    private _initializeData(): void {
        try {
            this._initialData = JSON.parse(JSON.stringify(this.formData || {}));
            this._currentData = JSON.parse(JSON.stringify(this.formData || {}));
        } catch (error) {
            console.error('LitFormBuilder: Error copying form data', error);
            this._initialData = {};
            this._currentData = {};
        }
    }

    private _validateAllFields(): void {
        const newValidationStates: Record<string, boolean> = {};
        
        Object.keys(this.fieldConfigs).forEach(fieldName => {
            const cInput = this.shadowRoot?.querySelector(`c-input[name="${fieldName}"]`) as any;
            if (cInput && typeof cInput.isValid === 'function') {
                newValidationStates[fieldName] = cInput.isValid();
            } else {
                newValidationStates[fieldName] = true; // Assume valid if can't validate
            }
        });

        this._fieldValidationStates = newValidationStates;
    }

    private _handleFieldChange = (event: CustomEvent): void => {
        const target = event.target as any;
        const fieldName = target?.getAttribute('name');
        
        if (!fieldName) return;

        const value = event.detail?.value !== undefined ? event.detail.value : 
                     (typeof target.getVal === 'function' ? target.getVal() : target.value);

        // Update current data
        this._currentData = { ...this._currentData, [fieldName]: value };

        // Update field validation state
        if (typeof target.isValid === 'function') {
            this._fieldValidationStates = {
                ...this._fieldValidationStates,
                [fieldName]: target.isValid()
            };
        }

        // Emit field change event
        this.dispatchEvent(new CustomEvent('field-change', {
            detail: {
                fieldName,
                value,
                formData: { ...this._currentData }
            } as FormChangeEvent,
            bubbles: true,
            composed: true
        }));
    };

    private _handleSubmit = (event: Event): void => {
        event.preventDefault();
        
        if (this.validate()) {
            this._initialData = JSON.parse(JSON.stringify(this._currentData));
            
            this._handleCustomAction('submit'); // Trigger custom submit action{
        } else {
            this._focusFirstInvalidField();
        }
    };

    private _handleCancel = (): void => {
        this.reset();
        this.dispatchEvent(new CustomEvent('cancel', {
            detail: null,
            bubbles: true,
            composed: true
        }));
    };

    private _handleCustomAction = (actionName: string): void => {
        this.dispatchEvent(new CustomEvent(`action`, {
            detail: { ...this._currentData, action: actionName },
            bubbles: true,
            composed: true
        }));
    };

    private _focusFirstInvalidField(): void {
        const firstInvalidField = this.shadowRoot?.querySelector('.field-wrapper.invalid c-input') as any;
        if (firstInvalidField && typeof firstInvalidField.focus === 'function') {
            firstInvalidField.focus();
        }
    }

    private _getFieldValue(fieldName: string): any {
        return this._currentData[fieldName];
    }

    private _renderField(fieldName: string, config: FieldConfig): TemplateResult {
        const value = this._getFieldValue(fieldName);
        const isValid = this._fieldValidationStates[fieldName] !== false;
        const inputId = `form-field-${fieldName}`;

        const fieldClasses = {
            'field-wrapper': true,
            'invalid': !isValid,
            'hidden': config.hidden === true
        };

        return html`
            <div class=${classMap(fieldClasses)}>
                <label for=${inputId}>
                    ${config.label || fieldName}
                    ${config.required ? html`<span style="color: var(--form-danger-color);"> *</span>` : ''}
                </label>
                <c-input
                    id=${inputId}
                    name=${fieldName}
                    type=${config.type || 'text'}
                    .value=${value != null ? String(value) : ''}
                    placeholder=${config.placeholder || ''}
                    ?required=${config.required}
                    ?disabled=${config.disabled}
                    ?readonly=${config.readonly}
                    ?multiple=${config.multiple}
                    ?darkmode=${this.darkmode}
                    min=${config.min}
                    max=${config.max}
                    step=${config.step}
                    pattern=${config.pattern || ''}
                    title=${config.title || ''}
                    .options=${config.options || []}
                    @change=${this._handleFieldChange}
                ></c-input>
            </div>
        `;
    }

    private _renderActions(): TemplateResult {
        return html`
            <div class="form-actions">
                ${this.showCancelButton ? html`
                    <button 
                        type="button" 
                        class="form-button form-button--outline"
                        @click=${this._handleCancel}
                    >
                        ${this.cancelButtonText}
                    </button>
                ` : ''}

                ${repeat(this.customActions, (action) => action.name, (action) => html`
                    <button
                        type="button"
                        class="form-button ${action.className || ''}"
                        @click=${() => this._handleCustomAction(action.name)}
                    >
                        ${action.label}
                    </button>
                `)}

                ${this.showSubmitButton ? html`
                    <button 
                        type="submit" 
                        class="form-button form-button--primary"
                    >
                        ${this.submitButtonText}
                    </button>
                ` : ''}
            </div>
        `;
    }

    render(): TemplateResult {
        const hasFields = Object.keys(this.fieldConfigs).length > 0;

        return html`
            <form class="form-container" @submit=${this._handleSubmit} novalidate>
                <div class="fields-container">
                    ${hasFields ? 
                        repeat(
                            Object.entries(this.fieldConfigs), 
                            ([fieldName]) => fieldName,
                            ([fieldName, config]) => this._renderField(fieldName, config)
                        ) : 
                        html`<div class="no-fields-message">No fields configured</div>`
                    }
                </div>
                ${this._renderActions()}
            </form>
        `;
    }

    // Public API Methods

    /**
     * Sets the form configuration
     */
    public setConfig(data: Record<string, any> = {}, fieldConfigs: Record<string, FieldConfig> = {}): void {
        this.formData = data;
        this.fieldConfigs = fieldConfigs;
    }

    /**
     * Updates form data without changing field configurations
     */
    public setData(data: Record<string, any> = {}): void {
        this.formData = data;
    }

    /**
     * Adds a custom action button
     */
    public addAction(name: string, label: string, className: string = ''): void {
        if (!name || !label) {
            console.error('LitFormBuilder: Action name and label are required');
            return;
        }

        const existingIndex = this.customActions.findIndex(action => action.name === name);
        const newAction: FormAction = { name, label, className, type: 'button' };

        if (existingIndex >= 0) {
            this.customActions = [
                ...this.customActions.slice(0, existingIndex),
                newAction,
                ...this.customActions.slice(existingIndex + 1)
            ];
        } else {
            this.customActions = [...this.customActions, newAction];
        }
    }

    /**
     * Removes a custom action
     */
    public removeAction(name: string): void {
        this.customActions = this.customActions.filter(action => action.name !== name);
    }

    /**
     * Validates all form fields
     */
    public validate(): boolean {
        let isFormValid = true;
        const newValidationStates: Record<string, boolean> = {};

        Object.keys(this.fieldConfigs).forEach(fieldName => {
            const cInput = this.shadowRoot?.querySelector(`c-input[name="${fieldName}"]`) as any;
            let fieldIsValid = true;

            if (cInput && typeof cInput.isValid === 'function') {
                fieldIsValid = cInput.isValid();
            }

            newValidationStates[fieldName] = fieldIsValid;
            if (!fieldIsValid) {
                isFormValid = false;
            }
        });

        this._fieldValidationStates = newValidationStates;
        return isFormValid;
    }

    /**
     * Gets current form data
     */
    public getCurrentData(): Record<string, any> {
        const currentData = { ...this._currentData };
        
        // Ensure we have the latest values from c-input elements
        Object.keys(this.fieldConfigs).forEach(fieldName => {
            const cInput = this.shadowRoot?.querySelector(`c-input[name="${fieldName}"]`) as any;
            if (cInput && typeof cInput.getVal === 'function') {
                currentData[fieldName] = cInput.getVal();
            }
        });

        return currentData;
    }

    /**
     * Resets form to initial values
     */
    public reset(): void {
        this._currentData = JSON.parse(JSON.stringify(this._initialData));
        
        // Update c-input elements
        Object.keys(this.fieldConfigs).forEach(fieldName => {
            const cInput = this.shadowRoot?.querySelector(`c-input[name="${fieldName}"]`) as any;
            if (cInput && typeof cInput.setVal === 'function') {
                cInput.setVal(this._initialData[fieldName]);
            }
        });

        // Clear validation states
        this._fieldValidationStates = {};
    }

    /**
     * Sets field options for select/radio inputs
     */
    public setFieldOptions(fieldName: string, options: Option[]): void {
        if (!this.fieldConfigs[fieldName]) {
            console.warn(`LitFormBuilder: Field "${fieldName}" not found in configuration`);
            return;
        }

        this.fieldConfigs = {
            ...this.fieldConfigs,
            [fieldName]: {
                ...this.fieldConfigs[fieldName],
                options: options
            }
        };
    }

    /**
     * Sets a field value programmatically
     */
    public setFieldValue(fieldName: string, value: any): void {
        this._currentData = { ...this._currentData, [fieldName]: value };
        
        const cInput = this.shadowRoot?.querySelector(`c-input[name="${fieldName}"]`) as any;
        if (cInput && typeof cInput.setVal === 'function') {
            cInput.setVal(value);
        }
    }

    /**
     * Gets a specific field value
     */
    public getFieldValue(fieldName: string): any {
        const cInput = this.shadowRoot?.querySelector(`c-input[name="${fieldName}"]`) as any;
        if (cInput && typeof cInput.getVal === 'function') {
            return cInput.getVal();
        }
        return this._currentData[fieldName];
    }
}

// Register the custom element
if (!customElements.get('form-builder')) {
    customElements.define('form-builder', LitFormBuilder);
}