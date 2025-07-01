import { LitElement, html, css, nothing, type CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap, type ClassInfo } from 'lit/directives/class-map.js';

interface Action {
  name: string;
  label: string;
  className?: string;
}

interface ActionDetail {
  originalAction: string;
  item: any;
  index: number;
}

abstract class BaseLitElement extends LitElement {
  @property({ type: Array })
  data: any[] = [];

  @property({ type: Array })
  keys: string[] = [];

  @property({ type: Array })
  actions: Action[] = [];

  @property({ type: Boolean, reflect: true, attribute: 'darkmode' })
  darkMode = false;

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      --text-color-primary: #212529;
      --text-color-secondary: #6c757d;
      --text-color-muted: #868e96;
      --text-color-link: #007bff;
      --text-color-success: #198754;
      --text-color-danger: #dc3545;
      --text-color-info-on-light: #004085;
      --text-color-danger-on-light: #721c24;
      --text-color-light: #f8f9fa;
      --bg-color-primary: #ffffff;
      --bg-color-secondary: #f8f9fa;
      --bg-color-tertiary: #e9ecef;
      --bg-color-table-header: #f2f2f2;
      --bg-color-table-even-row: #f9f9f9;
      --bg-color-button: #ffffff;
      --bg-color-button-hover-brightness: 0.95;
      --bg-color-button-alt: #f0f0f0;
      --bg-color-button-alt-hover: #e0e0e0;
      --bg-color-edit: #e7f3ff;
      --bg-color-delete: #f8d7da;
      --border-color-primary: #dee2e6;
      --border-color-secondary: #ced4da;
      --border-color-table: #ddd;
      --border-color-edit: #b8daff;
      --border-color-delete: #f5c6cb;
      --shadow-color-soft: rgba(0, 0, 0, 0.08);
      --shadow-color-medium: rgba(0, 0, 0, 0.12);
      --transition-speed: 0.2s;
      --transition-ease: ease-out;
    }

    :host([darkmode]) {
      --text-color-primary: #e9ecef;
      --text-color-secondary: #adb5bd;
      --text-color-muted: #868e96;
      --text-color-link: #64b5f6;
      --text-color-success: #81c784;
      --text-color-danger: #ef9a9a;
      --text-color-info-on-light: #ffffff;
      --text-color-danger-on-light: #ffffff;
      --text-color-light: #e9ecef;
      --bg-color-primary: #212529;
      --bg-color-secondary: #343a40;
      --bg-color-tertiary: #495057;
      --bg-color-table-header: #343a40;
      --bg-color-table-even-row: #2c3034;
      --bg-color-button: #495057;
      --bg-color-button-hover-brightness: 1.1;
      --bg-color-button-alt: #5a6268;
      --bg-color-button-alt-hover: #6c757d;
      --bg-color-edit: #0056b3;
      --bg-color-delete: #c82333;
      --border-color-primary: #495057;
      --border-color-secondary: #6c757d;
      --border-color-table: #454d55;
      --border-color-edit: #004085;
      --border-color-delete: #a71d2a;
      --shadow-color-soft: rgba(255, 255, 255, 0.05);
      --shadow-color-medium: rgba(255, 255, 255, 0.08);
    }

    .ctr {
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
      color: var(--text-color-primary);
      transition: filter var(--transition-speed) var(--transition-ease), background-color var(--transition-speed) var(--transition-ease);
    }
    button:hover {
      filter: brightness(var(--bg-color-button-hover-brightness));
    }
    .edit-btn {
      background-color: var(--bg-color-edit);
      border-color: var(--border-color-edit);
      color: var(--text-color-info-on-light);
    }
    .delete-btn {
      background-color: var(--bg-color-delete);
      color: var(--text-color-danger-on-light);
      border-color: var(--border-color-delete);
    }
  `;

  setData(data: any[] = [], keys: string[] = []): void {
    if (!Array.isArray(data) || !Array.isArray(keys)) {
      console.error(`${this.constructor.name}: data & keys must be arrays.`);
      this.data = [];
      this.keys = [];
      return;
    }
    try {
      this.data = JSON.parse(JSON.stringify(data));
    } catch (e) {
      console.error(`${this.constructor.name}: Error copying data`, e);
      this.data = [];
    }
    this.keys = [...keys];
  }

  addItem(item: object): void {
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

  addAction(name: string, label: string, className = ''): void {
    if (typeof name !== 'string' || !name || typeof label !== 'string') {
      console.error(`${this.constructor.name}: Invalid action (name, label).`);
      return;
    }
    this.actions = [
      ...this.actions.filter(a => a.name !== name),
      { name, label, className: className || '' }
    ];
  }

  protected _emitEv(actionName: string, index: number): void {
    if (index < 0 || index >= this.data.length) {
      console.warn(`${this.constructor.name}: Invalid index ${index} for action ${actionName}`);
      return;
    }
    const item = this.data[index];
    const detail: ActionDetail = {
      originalAction: actionName,
      item: JSON.parse(JSON.stringify(item)),
      index: index
    };
    try {
      this.dispatchEvent(new CustomEvent('internal-action', {
        detail,
        bubbles: true,
        composed: true
      }));
    } catch (e) {
      console.error(`${this.constructor.name}: Error dispatching event internal-action`, e);
    }
  }

  protected _renderActionButtons(index: number) {
    let acts = [...this.actions];
    if (this.data.length > 0 || this.keys.length > 0) {
      if (!acts.some(a => a.name === 'edit')) {
        acts.unshift({ name: 'edit', label: 'Editar', className: 'edit-btn' });
      }
      if (!acts.some(a => a.name === 'delete')) {
        acts.push({ name: 'delete', label: 'Eliminar', className: 'delete-btn' });
      }
    }
    return acts.map(act => html`
      <button
        class="${act.className || ''} ${act.name === 'edit' ? 'edit-btn' : ''} ${act.name === 'delete' ? 'delete-btn' : ''}"
        @click=${() => this._emitEv(act.name, index)}>
        ${act.label}
      </button>
    `);
  }

  abstract render(): unknown;
}

@customElement('object-table-lit')
export class ObjectTableLit extends BaseLitElement {
    static styles: CSSResultGroup[] = [
    BaseLitElement.styles,
    css`
      :host {
        border: 1px solid var(--border-color-primary);
        border-radius: 5px;
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
        color: var(--text-color-primary);
      }
      td.wrap { white-space: normal; }
      th {
        background-color: var(--bg-color-table-header);
        font-weight: 600;
        text-transform: capitalize;
        position: sticky;
        top: 0;
        z-index: 1;
        color: var(--text-color-primary);
      }
      tr:nth-child(even) {
        background-color: var(--bg-color-table-even-row);
      }
      tr:hover {
        background-color: var(--bg-color-tertiary);
      }
      .acts-cell {
        width: 1%;
        text-align: center;
        padding: 4px 8px;
      }
      .acts-cell button { margin: 2px; }
    `
  ];

  render() {
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
              <tr data-idx=${idx}>
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

@customElement('object-cards-lit')
export class ObjectCardsLit extends BaseLitElement {
  @property({ type: String, reflect: true })
  layout: 'flex' | 'grid' = 'flex';

  @property({ type: Number, attribute: 'per-row', reflect: true })
  perRow = 3;

  @property({ type: String, attribute: 'hdr-key', reflect: true })
  hdrKey: string | null = null;

  static styles = [
    BaseLitElement.styles,
    css`
      :host { --per-row: 3; }
      .ctr { display: flex; flex-wrap: wrap; gap: 16px; }
      .ctr.grid { display: grid; grid-template-columns: repeat(var(--per-row, 3), 1fr); }
      .card {
        background-color: var(--bg-color-secondary);
        border: 1px solid var(--border-color-primary);
        border-radius: 8px;
        box-shadow: 0 1px 4px var(--shadow-color-soft);
        overflow: hidden;
        transition: transform var(--transition-speed) var(--transition-ease), box-shadow var(--transition-speed) var(--transition-ease);
        display: flex;
        flex-direction: column;
      }
      .ctr:not(.grid) .card { flex: 1 1 calc(33.333% - 11px); min-width: 250px; }
      .card:hover {
        transform: translateY(-3px);
        box-shadow: 0 3px 10px var(--shadow-color-medium);
      }
      .card-hdr {
        background-color: var(--bg-color-tertiary);
        padding: 10px 15px;
        font-weight: 600;
        border-bottom: 1px solid var(--border-color-primary);
        font-size: 1.05em;
        color: var(--text-color-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card-cnt { padding: 15px; flex-grow: 1; }
      .card-prop { margin-bottom: 10px; display: flex; flex-direction: column; gap: 2px; }
      .card-prop:last-child { margin-bottom: 0; }
      .prop-lbl {
        font-weight: 500;
        color: var(--text-color-muted);
        font-size: 0.8em;
        text-transform: capitalize;
      }
      .prop-val {
        word-break: break-word;
        font-size: 0.95em;
        color: var(--text-color-primary);
      }
      .prop-val.bool-t { font-style: italic; color: var(--text-color-success); }
      .prop-val.bool-f { font-style: italic; color: var(--text-color-secondary); }
      .card-acts {
        padding: 10px 15px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        background-color: var(--bg-color-tertiary);
        border-top: 1px solid var(--border-color-primary);
        margin-top: auto;
      }
      .card-acts button { padding: 6px 12px; }
      @media (max-width: 992px) { .ctr:not(.grid) .card { flex-basis: calc(50% - 8px); } :host { --per-row: 2; } }
      @media (max-width: 576px) { .ctr:not(.grid) .card { flex-basis: 100%; } :host { --per-row: 1; } }
    `
  ];

  updated(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has('perRow')) {
      this.style.setProperty('--per-row', String(this.perRow || 3));
    }
  }

  render() {
    if (!this.data?.length) return html`<div class="ctr no-data">No hay datos.</div>`;
    if (!this.keys?.length) return html`<div class="ctr no-data">No hay claves.</div>`;

    const ctrClasses: ClassInfo = { ctr: true, grid: this.layout === 'grid' };

    return html`
      <div class=${classMap(ctrClasses)}>
        ${this.data.map((item, idx) => html`
          <div class="card" data-idx=${idx}>
            ${this.hdrKey && item[this.hdrKey] !== undefined ? html`
              <div class="card-hdr">${item[this.hdrKey]}</div>
            ` : nothing}
            <div class="card-cnt">
              ${this.keys.map(k => {
                if (k === this.hdrKey) return nothing;
                const val = item[k];
                let dVal = (val !== undefined && val !== null) ? String(val) : '';
                let valCls = 'prop-val';
                if (typeof val === 'boolean') {
                  dVal = val ? 'Sí' : 'No';
                  valCls += val ? ' bool-t' : ' bool-f';
                }
                return html`
                  <div class="card-prop">
                    <div class="prop-lbl">${k}</div>
                    <div class="${valCls}">${dVal}</div>
                  </div>
                `;
              })}
            </div>
            <div class="card-acts">
              ${this._renderActionButtons(idx)}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

@customElement('object-flex-list-lit')
export class ObjectFlexListLit extends BaseLitElement {
  @property({ type: String, attribute: 'f-dir', reflect: true })
  fDir: 'row' | 'column' | 'row-reverse' | 'column-reverse' = 'row';

  @property({ type: String, attribute: 'f-wrap', reflect: true })
  fWrap: 'nowrap' | 'wrap' | 'wrap-reverse' = 'wrap';

  @property({ type: String, attribute: 'j-cont', reflect: true })
  jCont = 'flex-start';

  @property({ type: String, attribute: 'a-items', reflect: true })
  aItems = 'stretch';

  static styles = [
    BaseLitElement.styles,
    css`
      .ctr { display: flex; gap: 10px; }
      .flex-item {
        border: 1px solid var(--border-color-secondary);
        border-radius: 4px;
        padding: 12px;
        background-color: var(--bg-color-secondary);
        flex: 1 1 220px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: 0 1px 2px var(--shadow-color-soft);
        transition: box-shadow var(--transition-speed);
      }
      .flex-item:hover {
        box-shadow: 0 2px 5px var(--shadow-color-medium);
      }
      .item-cnt { flex-grow: 1; display: flex; flex-direction: column; gap: 5px; }
      .item-prop { font-size: 0.9em; display: flex; gap: 5px; line-height: 1.4; }
      .prop-lbl {
        font-weight: 500;
        color: var(--text-color-primary);
        text-transform: capitalize;
        white-space: nowrap;
      }
      .prop-lbl::after { content: ":"; margin-left: 2px; }
      .prop-val {
        color: var(--text-color-secondary);
        word-break: break-word;
      }
      .prop-val.bool-t { font-style: italic; color: var(--text-color-success); }
      .prop-val.bool-f { font-style: italic; color: var(--text-color-danger); }
      .item-acts {
        display: flex;
        justify-content: flex-end;
        gap: 5px;
        margin-top: auto;
        border-top: 1px solid var(--border-color-primary);
        padding-top: 10px;
      }
      .item-acts button {
        padding: 4px 8px;
        background-color: var(--bg-color-button-alt);
        color: var(--text-color-primary);
        border-color: var(--border-color-secondary);
      }
      .item-acts button:hover {
        background-color: var(--bg-color-button-alt-hover);
        filter: none;
      }
    `
  ];

  render() {
    if (!this.data?.length) return html`<div class="ctr no-data">No hay datos.</div>`;
    if (!this.keys?.length) return html`<div class="ctr no-data">No hay claves.</div>`;

    const flexSt = `flex-direction:${this.fDir};flex-wrap:${this.fWrap};justify-content:${this.jCont};align-items:${this.aItems};`;

    return html`
      <div class="ctr" style="${flexSt}">
        ${this.data.map((item, idx) => html`
          <div class="flex-item" data-idx=${idx}>
            <div class="item-cnt">
              ${this.keys.map(k => {
                const val = item[k];
                let dVal = (val !== undefined && val !== null) ? String(val) : '';
                let valCls = 'prop-val';
                if (typeof val === 'boolean') {
                  dVal = val ? 'Sí' : 'No';
                  valCls += val ? ' bool-t' : ' bool-f';
                }
                return html`
                  <div class="item-prop">
                    <span class="prop-lbl">${k}</span>
                    <span class="${valCls}">${dVal}</span>
                  </div>
                `;
              })}
            </div>
            <div class="item-acts">
              ${this._renderActionButtons(idx)}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

interface ComponentOptions {
  layout?: 'flex' | 'grid';
  cardsPerRow?: number;
  headerKey?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: string;
  alignItems?: string;
}

interface ComponentConfig {
  type: 'table' | 'cards' | 'flex';
  title: string;
  keys: string[];
  data: any[];
  actions: Action[];
  options: ComponentOptions;
}

interface NewComponentConfig {
  displayType?: 'table' | 'cards' | 'flex';
  title?: string;
  keys: string[];
  initialData?: any[];
  actions?: Action[];
  displayOptions?: ComponentOptions;
}

@customElement('grid-manager-lit')
export class GridManagerLit extends LitElement {
  @state()
  private comps: Record<string, ComponentConfig> = {};

  @property({ type: Boolean })
  darkMode = false;

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
  }

  static styles = css`
    :host {
      display: block;
    }
    .mgr-ctr {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .comp-wrap {
      border: 1px solid var(--border-color-primary);
      border-radius: 6px;
      background-color: var(--bg-color-primary);
      box-shadow: 0 1px 3px var(--shadow-color-soft);
      color: var(--text-color-primary);
    }
    :host([darkmode]) .comp-wrap {
      border: 1px solid var(--border-color-primary);
      background-color: var(--bg-color-primary);
      color: var(--text-color-primary);
    }
    .comp-title {
      margin: 0 0 10px 0;
      font-size: 1.2em;
      color: var(--text-color-primary);
      font-weight: 600;
      border-bottom: 1px solid var(--border-color-secondary);
      padding-bottom: 5px;
    }
    .error {
      color: var(--text-color-danger, red);
      border: 1px solid var(--border-color-danger, red);
      padding: 10px;
      background-color: var(--bg-color-delete, #ffebeb);
      border-radius: 4px;
    }
    :host([darkmode]) .error {
      color: var(--text-color-danger, #ff8a8a);
      border: 1px solid var(--border-color-danger, #a71d2a);
      background-color: var(--bg-color-delete, #c82333);
    }
  `;

  addComp(id: string, cfg: NewComponentConfig): ComponentConfig | null {
    if (!id || typeof id !== 'string' || !cfg.keys || !Array.isArray(cfg.keys)) {
      console.error('GM: ID & cfg.keys required.');
      return null;
    }
    if (this.comps[id]) {
      console.warn(`GM: Comp ID "${id}" exists.`);
      return this.comps[id];
    }
    const newConfig: ComponentConfig = {
      type: (cfg.displayType || 'cards').toLowerCase() as 'cards' | 'table' | 'flex',
      title: cfg.title || '',
      keys: [...cfg.keys],
      data: Array.isArray(cfg.initialData) ? JSON.parse(JSON.stringify(cfg.initialData)) : [],
      actions: Array.isArray(cfg.actions) ? cfg.actions.filter(a => a.name && a.label) : [],
      options: { ...(cfg.displayOptions || {}) }
    };

    this.comps = { ...this.comps, [id]: newConfig };
    return newConfig;
  }

  getCompCfg(id: string): ComponentConfig | null {
    return this.comps?.[id] || null;
  }

  getCompEl(id: string): BaseLitElement | null {
    return this.shadowRoot?.querySelector(`.comp-wrap[data-comp-id="${id}"] > :not(h3)`) as BaseLitElement | null;
  }

  remComp(id: string): boolean {
    if (!this.comps?.[id]) {
      console.warn(`GM: Comp ID "${id}" not found.`);
      return false;
    }
    const { [id]: _, ...rest } = this.comps;
    this.comps = rest;
    console.log(`GM: Comp "${id}" removed.`);
    return true;
  }

  clearAll(): void {
    this.comps = {};
    console.log('GM: All comps removed.');
  }

  setCompData(id: string, data?: any[], keys?: string[]): void {
    const compCfg = this.comps?.[id];
    if (!compCfg) {
      console.warn(`GM: Comp ID "${id}" not found for setData.`);
      return;
    }
    let newData = compCfg.data;
    let newKeys = keys ?? compCfg.keys;

    if (data !== undefined) {
      try {
        newData = Array.isArray(data) ? JSON.parse(JSON.stringify(data)) : [];
        if (!Array.isArray(data)) console.warn(`GM: setData for "${id}" received non-array.`);
      } catch (e) {
        console.error(`GM: Error copying data for ${id}`, e);
        newData = [];
      }
    }
    this.comps = { ...this.comps, [id]: { ...compCfg, data: newData, keys: newKeys } };
  }

  private _handleBubbledEvent(e: CustomEvent<ActionDetail>): void {
    const wrap = (e.target as HTMLElement).closest('.comp-wrap[data-comp-id]');
    const compId = wrap?.getAttribute('data-comp-id');
    if (!compId || !this.comps?.[compId]) {
      if (wrap) console.warn(`GM: Event ${e.type} from unknown compId ${compId}`);
      return;
    }
    if (e.type !== 'internal-action' || !e.detail?.originalAction) {
      console.warn(`GM: Unexpected event caught or missing detail: ${e.type}`, e.detail);
      return;
    }
    const { detail } = e;
    const originalAction = detail.originalAction;
    console.log(`GM: Action "${originalAction}" from "${compId}". Idx: ${detail.index}`, detail.item);

    this.dispatchEvent(new CustomEvent('comp-action', {
      detail: {
        compId: compId,
        action: originalAction,
        item: detail.item,
        index: detail.index
      },
      bubbles: true,
      composed: true
    }));
  }

  private _renderManagedComp(id: string, cfg: ComponentConfig) {
    const commonProps = {
      '.data': cfg.data,
      '.keys': cfg.keys,
      '.actions': cfg.actions,
      '.darkMode': this.darkMode
    };

    let compTpl;
    switch (cfg.type) {
      case 'table':
        compTpl = customElements.get('object-table-lit') ? html`
          <object-table-lit
            .data=${cfg.data}
            .keys=${cfg.keys}
            .actions=${cfg.actions}
            .darkMode=${this.darkMode}
          ></object-table-lit>`
          : html`<div class="error">Error: object-table-lit no está definido.</div>`;
        break;
      case 'flex':
        compTpl = customElements.get('object-flex-list-lit') ? html`
          <object-flex-list-lit
            .data=${cfg.data}
            .keys=${cfg.keys}
            .actions=${cfg.actions}
            .darkMode=${this.darkMode}
            .fDir=${cfg.options.flexDirection}
            .fWrap=${cfg.options.flexWrap}
            .jCont=${cfg.options.justifyContent}
            .aItems=${cfg.options.alignItems}
          ></object-flex-list-lit>`
          : html`<div class="error">Error: object-flex-list-lit no está definido.</div>`;
        break;
      case 'cards':
      default:
        compTpl = customElements.get('object-cards-lit') ? html`
          <object-cards-lit
            .data=${cfg.data}
            .keys=${cfg.keys}
            .actions=${cfg.actions}
            .darkMode=${this.darkMode}
            .layout=${cfg.options.layout}
            .perRow=${cfg.options.cardsPerRow}
            .hdrKey=${cfg.options.headerKey}
          ></object-cards-lit>`
          : html`<div class="error">Error: object-cards-lit no está definido.</div>`;
        if (cfg.type !== 'cards') {
          console.warn(`GM: Tipo "${cfg.type}" desconocido para ${id}. Usando 'cards'.`);
        }
        break;
    }

    return html`
      <div class="comp-wrap" data-comp-id=${id} ?darkmode=${this.darkMode}>
        ${cfg.title ? html`<h3 class="comp-title">${cfg.title}</h3>` : nothing}
        ${compTpl}
      </div>`;
  }

  render() {
    if (this.darkMode) {
      this.setAttribute('darkmode', '');
    } else {
      this.removeAttribute('darkmode');
    }
    return html`
      <div class="mgr-ctr" @internal-action=${this._handleBubbledEvent}>
        ${Object.entries(this.comps || {}).map(([id, cfg]) => this._renderManagedComp(id, cfg))}
      </div>`;
  }
}

export function registerComponents(components: Record<string, CustomElementConstructor>) {
  const registered: string[] = [];
  const skipped: string[] = [];

  for (const [tagName, componentClass] of Object.entries(components)) {
    if (!customElements.get(tagName)) {
      try {
        customElements.define(tagName, componentClass);
        registered.push(tagName);
      } catch (error) {
        console.error(`❌ Error registrando ${tagName}:`, error);
      }
    } else {
      skipped.push(tagName);
    }
  }

  console.log(`✅ Registrados ${registered.length} componentes:`, registered);
  if (skipped.length > 0) {
    console.log(`⚠️ Omitidos ${skipped.length} ya registrados:`, skipped);
  }

  return { registered, skipped };
}

registerComponents({
  'grid-manager-lit': GridManagerLit,
  'object-table-lit': ObjectTableLit,
  'object-cards-lit': ObjectCardsLit,
  'object-flex-list-lit': ObjectFlexListLit
});

// export { GridManagerLit, ObjectTableLit, ObjectCardsLit, ObjectFlexListLit };