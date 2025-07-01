      
import { LitElement, html, css, type PropertyValues, type TemplateResult, CSSResult, type CSSResultGroup } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

// Interfaces para tipado
interface ActionItem {
    name: string;
    label: string;
    className?: string;
}

interface EventDetail {
    originalAction: string;
    item: Record<string, any>;
    index: number;
}

interface MenuEventDetail {
    item: Record<string, any>;
    idx: number;
    type: string;
}

// Clase base abstracta
abstract class BaseLitElement extends LitElement {
    @property({ type: Array })
    data: Record<string, any>[] = [];

    @property({ type: Array })
    keys: string[] = [];

    @property({ type: Array })
    actions: ActionItem[] = [];

    @property({ type: Boolean, reflect: true, attribute: 'darkmode' })
    darkMode: boolean = false;

    protected _hiddenActions: Set<string> = new Set();

    constructor() {
        super();
    }

    // Método para cambiar el modo
    toggleDarkMode(): void {
        this.darkMode = !this.darkMode;
    }

    // ESTILOS ACTUALIZADOS con Variables CSS
    static styles: CSSResultGroup = css`
        :host {
            display: block;

            /* --- Paleta de Colores (Modo Claro por defecto) --- */
            --text-color-primary: #212529;
            --text-color-secondary: #6c757d;
            --text-color-muted: #868e96;
            --text-color-link: #007bff;
            --text-color-success: #198754;
            --text-color-danger: #dc3545;
            --text-color-info-on-light: #004085; /* Texto azul sobre fondo claro */
            --text-color-danger-on-light: #721c24; /* Texto rojo oscuro sobre fondo claro */
            --text-color-light: #f8f9fa; /* Texto claro sobre fondo oscuro */

            --bg-color-primary: #ffffff;
            --bg-color-secondary: #f8f9fa; /* Fondos sutilmente diferentes */
            --bg-color-tertiary: #e9ecef; /* Hover, etc. */
            --bg-color-table-header: #f2f2f2;
            --bg-color-table-even-row: #f9f9f9;
            --bg-color-button: #ffffff;
            --bg-color-button-hover-brightness: 0.95;
            --bg-color-button-alt: #f0f0f0;
            --bg-color-button-alt-hover: #e0e0e0;
            --bg-color-edit: #e7f3ff; /* Fondo azul claro */
            --bg-color-delete: #f8d7da; /* Fondo rojo claro */

            --border-color-primary: #dee2e6; /* Bordes principales */
            --border-color-secondary: #ced4da; /* Bordes secundarios, botones */
            --border-color-table: #ddd; /* Bordes tabla */
            --border-color-edit: #b8daff; /* Borde azul */
            --border-color-delete: #f5c6cb; /* Borde rojo */

            --shadow-color-soft: rgba(0, 0, 0, 0.08);
            --shadow-color-medium: rgba(0, 0, 0, 0.12);

            /* Transiciones comunes */
            --transition-speed: 0.2s;
            --transition-ease: ease-out;
        }

        /* --- Paleta de Colores (Modo Oscuro) --- */
        :host([darkmode]) {
            --text-color-primary: #e9ecef; /* Texto principal claro */
            --text-color-secondary: #adb5bd; /* Texto secundario grisáceo */
            --text-color-muted: #868e96;
            --text-color-link: #64b5f6; /* Azul más brillante */
            --text-color-success: #81c784; /* Verde más brillante */
            --text-color-danger: #ef9a9a; /* Rojo más brillante */
            --text-color-info-on-light: #ffffff; /* Texto blanco sobre fondo azul */
            --text-color-danger-on-light: #ffffff; /* Texto blanco sobre fondo rojo */
            --text-color-light: #e9ecef; /* Igual que el primario */

            --bg-color-primary: #212529; /* Fondo principal oscuro */
            --bg-color-secondary: #343a40; /* Fondo secundario oscuro */
            --bg-color-tertiary: #495057; /* Hover oscuro */
            --bg-color-table-header: #343a40;
            --bg-color-table-even-row: #2c3034;
            --bg-color-button: #495057; /* Botones más oscuros */
            --bg-color-button-hover-brightness: 1.1; /* Aclarar al hacer hover */
            --bg-color-button-alt: #5a6268;
            --bg-color-button-alt-hover: #6c757d;
            --bg-color-edit: #0056b3; /* Fondo azul más oscuro */
            --bg-color-delete: #c82333; /* Fondo rojo más oscuro */

            --border-color-primary: #495057; /* Bordes gris oscuro */
            --border-color-secondary: #6c757d;
            --border-color-table: #454d55;
            --border-color-edit: #004085;
            --border-color-delete: #a71d2a;

            --shadow-color-soft: rgba(255, 255, 255, 0.05);
            --shadow-color-medium: rgba(255, 255, 255, 0.08);
        }

        /* Estilos base que usan las variables */
        .ctr { /* Contenedor base */
            background-color: var(--bg-color-primary);
            color: var(--text-color-primary);
        }
        .no-data {
            padding: 15px;
            text-align: center;
            color: var(--text-color-secondary);
            background-color: var(--bg-color-secondary);
            border-radius: 4px;
        }
        button {
            cursor: pointer;
            margin: 0 4px;
            padding: 4px 8px;
            border: 1px solid var(--border-color-secondary);
            border-radius: 3px;
            font-size: 0.9em;
            background-color: var(--bg-color-button);
            color: var(--text-color-primary); /* Color de texto para botones normales */
            transition: filter var(--transition-speed) var(--transition-ease), background-color var(--transition-speed) var(--transition-ease);
        }
        button:hover {
            /* Usamos filter brightness para modo claro/oscuro, podría ser cambio directo de color */
            filter: brightness(var(--bg-color-button-hover-brightness));
        }
        .edit-btn {
            background-color: var(--bg-color-edit);
            border-color: var(--border-color-edit);
            color: var(--text-color-info-on-light); /* Texto específico para este fondo */
        }
        .delete-btn {
            background-color: var(--bg-color-delete);
            color: var(--text-color-danger-on-light); /* Texto específico para este fondo */
            border-color: var(--border-color-delete);
        }
    `;

    setData(d: Record<string, any>[] = [], k: string[] = []): void {
        if (!Array.isArray(d) || !Array.isArray(k)) {
            console.error(`${this.constructor.name}: data & keys must be arrays.`);
            this.data = [];
            this.keys = [];
            return;
        }
        try {
            this.data = JSON.parse(JSON.stringify(d));
        } catch (e) {
            console.error(`${this.constructor.name}: Error copying data`, e);
            this.data = [];
        }
        this.keys = [...k];
    }

    addItem(item: Record<string, any>): void {
        if (!item || typeof item !== 'object') {
            console.error(`${this.constructor.name}: item must be an object.`, item);
            return;
        }
        try {
            this.data = [...this.data, JSON.parse(JSON.stringify(item))];
        } catch (e) {
            console.error(`${this.constructor.name}: Error copying item`, e);
        }
    }

    addAction(nm: string, lbl: string, cls: string = ''): void {
        if (typeof nm !== 'string' || !nm || typeof lbl !== 'string') {
            console.error(`${this.constructor.name}: Invalid action (nm, lbl).`);
            return;
        }
        this.actions = [
            ...this.actions.filter(a => a.name !== nm),
            { name: nm, label: lbl, className: cls || '' }
        ];
    }

    protected _emitEv(actNm: string, idx: number): void {
        if (idx < 0 || idx >= this.data.length) {
            console.warn(`${this.constructor.name}: Invalid index ${idx} for action ${actNm}`);
            return;
        }
        const item = this.data[idx];
        const detail: EventDetail = {
            originalAction: actNm,
            item: JSON.parse(JSON.stringify(item)),
            index: idx
        };
        try {
            this._dispatchEv('internal-action', detail);
            this._dispatchEv('action', detail);
        } catch (e) {
            console.error(`${this.constructor.name}: Error dispatching event internal-action`, e);
        }
    }

    protected _dispatchEv(name: string, detail: any): void {
        this.dispatchEvent(new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true
        }));
    }

    protected _renderActionButtons(idx: number): TemplateResult[] {
        let acts = [...this.actions];
        if (this.data.length > 0 || this.keys.length > 0) {
            if (!this._isActionHidden('edit') && !acts.some(a => a.name === 'edit'))
                acts.unshift({ name: 'edit', label: 'Editar', className: 'edit-btn' });
            if (!this._isActionHidden('delete') && !acts.some(a => a.name === 'delete'))
                acts.push({ name: 'delete', label: 'Eliminar', className: 'delete-btn' });
        }
        return acts.map(act => html`
            <button
                class="${act.className || ''} ${act.name === 'edit' ? 'edit-btn' : ''} ${act.name === 'delete' ? 'delete-btn' : ''}"
                @click=${() => this._emitEv(act.name, idx)}>
                ${act.label}
            </button>
        `);
    }

    protected _isActionHidden(actionName: string): boolean {
        return this._hiddenActions.has(actionName);
    }

    hideAction(actionName: string): void {
        if (typeof actionName !== 'string') {
            console.error(`${this.constructor.name}: actionName must be a string.`);
            return;
        }
        this._hiddenActions.add(actionName);
        this.actions = this.actions.filter(a => a.name !== actionName);
        this.requestUpdate();
    }

    showAction(actionName: string, label: string, className: string = ''): void {
        if (typeof actionName !== 'string' || typeof label !== 'string') {
            console.error(`${this.constructor.name}: actionName and label must be strings.`);
            return;
        }
        this._hiddenActions.delete(actionName);
        this.addAction(actionName, label, className);
        this.requestUpdate();
    }

    abstract render(): TemplateResult;
}

// ================================================
// Componente ObjectTableLit (Actualizado para TypeScript)
// ================================================
@customElement('obj-table')
class ObjectTableLit extends BaseLitElement {
    @property({ type: Boolean, reflect: true, attribute: 'darkmode' })
    darkMode: boolean = false;

    static styles: CSSResultGroup[] = [
        BaseLitElement.styles,
        css`
            :host {
                border: 1px solid var(--border-color-primary);
                border-radius: 5px;
                /* El fondo y color principal ya vienen de BaseLitElement :host */
            }
            .ctr { overflow-x: auto; }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.95em;
            }
            th, td {
                border: 1px solid var(--border-color-table);
                padding: 8px 10px;
                text-align: left;
                vertical-align: middle;
                white-space: nowrap;
                color: var(--text-color-primary); /* Hereda color de texto */
            }
            td.wrap { white-space: normal; }
            th {
                background-color: var(--bg-color-table-header);
                font-weight: 600;
                text-transform: capitalize;
                position: sticky;
                top: 0;
                z-index: 1;
                color: var(--text-color-primary); /* Color para cabeceras */
            }
            tr:nth-child(even) {
                background-color: var(--bg-color-table-even-row);
            }
            tr:hover {
                background-color: var(--bg-color-tertiary); /* Usamos el color de hover genérico */
            }
            .acts-cell {
                width: 1%;
                text-align: center;
                padding: 4px 8px;
            }
            .acts-cell button { margin: 2px; }
        `
    ];

    private _handleDoubleClick(event: MouseEvent): void {
        this._handleClick(event, "dblclick");
    }

    private _handleClick(event: MouseEvent, type: string): void {
        event.preventDefault(); // Evitar el menú contextual del navegador en click derecho

        const idx = this.verifyRow(event);
        if (idx === undefined) return;
        
        const item = this.data[idx];
        if (!item) return; // Si no hay item, no hacemos nada
        
        this._dispatchEv('row-activated', item);
        const menuDetail: MenuEventDetail = { item, idx, type };
        this._dispatchEv('menu', menuDetail); // Disparar el evento de menú con el item y su índice
    }

    private _handleMenuClick(event: MouseEvent): void {
        this._handleClick(event, "contextmenu");
    }

    private verifyRow(e: MouseEvent): number | undefined {
        const row = e.currentTarget as HTMLElement;
        const idx = parseInt(row.dataset.idx || '', 10);

        if (isNaN(idx) || idx < 0 || idx >= this.data.length) {
            console.warn(`${this.constructor.name}: Invalid index ${idx} from row.`);
            return undefined;
        }
        return idx;
    }

    render(): TemplateResult {
        if (!this.data?.length) return html`<div class="no-data">No hay datos.</div>`;
        if (!this.keys?.length) return html`<div class="no-data">No hay claves.</div>`;

        return html`
            <div class="ctr">
                <table>
                    <thead>
                        <tr>
                            ${this.keys.map(k => html`<th>${k}</th>`)}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                    ${this.data.map((item, idx) => html`
                        <tr
                            data-idx=${idx}
                            @dblclick=${this._handleDoubleClick}  
                            @contextmenu=${this._handleMenuClick} 
                        >
                            ${this.keys.map(k => {
                                const val = item[k];
                                let dVal = (val !== undefined && val !== null) ? String(val) : '';
                                if (typeof val === 'boolean') dVal = val ? 'Sí' : 'No';
                                return html`<td class="${(typeof val === 'string' && val.length > 50) ? 'wrap' : ''}">${dVal}</td>`;
                            })}
                            <td class="acts-cell">
                                ${this._renderActionButtons(idx)}
                            </td>
                        </tr>
                    `)}
                    </tbody>
                </table>
            </div>
        `;
    }
}
export { 
    ObjectTableLit,
    type ActionItem,
    type EventDetail,
    type MenuEventDetail,
    BaseLitElement
};