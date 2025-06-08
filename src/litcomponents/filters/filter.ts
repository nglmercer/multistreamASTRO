// types/filter-types.ts
export interface FilterItem {
    id: string;
    value: string | number;
    createdAt: Date;
    type: 'string' | 'number';
  }
  
  export interface FilterConfig {
    id: string;
    title: string;
    storageKey: string;
    type: 'string' | 'number';
    placeholder?: string;
    maxItems?: number;
    allowDuplicates?: boolean;
  }
  
  // components/BaseFilter.ts
  import { LitElement, html, css } from 'lit';
  import { customElement, property, state } from 'lit/decorators.js';
  @customElement('base-filter')
  export class BaseFilter extends LitElement {
    @property({ type: Object }) config!: FilterConfig;
    @property({ type: String }) searchTerm = '';
    @property({ type: Boolean }) readonly = false;
  
    @state() private items: FilterItem[] = [];
    @state() private newItemValue = '';
  
    static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      
      /* Light theme variables (default) */
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border-color: #e2e8f0;
      --accent-color: #3b82f6;
      --accent-hover: #2563eb;
      --error-color: #ef4444;
      --error-hover: #dc2626;
      --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      --radius: 0.5rem;
      --spacing-xs: 0.25rem;
      --spacing-sm: 0.5rem;
      --spacing-md: 1rem;
      --spacing-lg: 1.5rem;
      --spacing-xl: 2rem;
    }
  
    /* Dark theme variables */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --text-primary: #f8fafc;
        --text-secondary: #cbd5e1;
        --text-muted: #64748b;
        --border-color: #334155;
        --accent-color: #60a5fa;
        --accent-hover: #3b82f6;
        --error-color: #f87171;
        --error-hover: #ef4444;
        --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3);
        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.3);
      }
    }
  
    .filter-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: var(--spacing-md);
      box-shadow: var(--shadow);
      transition: all 0.2s ease;
      min-height: 150px;
    }
  
    .filter-container:hover {
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
    }
  
    .filter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-sm);
      border-bottom: 2px solid var(--accent-color);
    }
  
    .filter-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
  
    .filter-badge {
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--accent-color);
      color: var(--bg-primary);
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }
  
    .filter-stats {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
  
    .stat {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }
  
    .add-item-form {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }
  
    .form-input {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }
  
    .form-input:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 10%, transparent);
    }
  
    .form-input::placeholder {
      color: var(--text-muted);
    }
  
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
  
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    .btn-primary {
      background: var(--accent-color);
      color: var(--bg-primary);
    }
  
    .btn-primary:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
  
    .btn-danger {
      background: var(--error-color);
      color: var(--bg-primary);
    }
  
    .btn-danger:hover:not(:disabled) {
      background: var(--error-hover);
    }
  
    .btn-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.75rem;
    }
  
    .items-list {
      min-height: 50px;
      max-height: 300px;
      overflow-y: auto;
    }
  
    /* Custom scrollbar for dark theme */
    @media (prefers-color-scheme: dark) {
      .items-list::-webkit-scrollbar {
        width: 8px;
      }
      
      .items-list::-webkit-scrollbar-track {
        background: var(--bg-secondary);
      }
      
      .items-list::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
      }
      
      .items-list::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
      }
    }
  
    .filter-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      margin-bottom: var(--spacing-xs);
      background: var(--bg-primary);
      transition: all 0.2s ease;
    }
  
    .filter-item:hover {
      border-color: var(--accent-color);
      box-shadow: var(--shadow);
    }
  
    .item-value {
      flex: 1;
      font-size: 0.875rem;
      color: var(--text-primary);
    }
  
    .item-type {
      padding: 2px 8px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 500;
    }
  
    .item-actions {
      display: flex;
      gap: var(--spacing-xs);
    }
  
    .empty-state {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--text-muted);
    }
  
    .empty-icon {
      font-size: 2rem;
      margin-bottom: var(--spacing-md);
    }
  
    .actions-bar {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }
  
    /* Smooth transitions for theme changes */
    * {
      transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
    }
  `;
  
    connectedCallback() {
      super.connectedCallback();
      this.loadFromStorage();
    }
  
    private loadFromStorage() {
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          const parsedData = JSON.parse(stored);
          this.items = parsedData.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          }));
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        this.items = [];
      }
    }
  
    private saveToStorage() {
      try {
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.items));
        this.dispatchEvent(new CustomEvent('filter-updated', {
          detail: { 
            config: this.config, 
            items: this.items.map(item => item.value),
            count: this.items.length 
          },
          bubbles: true
        }));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  
    private get filteredItems(): FilterItem[] {
      if (!this.searchTerm) return this.items;
      
      return this.items.filter(item => 
        item.value.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  
    private addItem() {
      if (!this.newItemValue.trim() || this.readonly) return;
  
      // Validate based on type
      let processedValue: string | number = this.newItemValue.trim();
      
      if (this.config.type === 'number') {
        const numValue = Number(processedValue);
        if (isNaN(numValue)) {
          alert('Please enter a valid number');
          return;
        }
        processedValue = numValue;
      }
  
      // Check for duplicates if not allowed
      if (!this.config.allowDuplicates && this.items.some(item => item.value === processedValue)) {
        alert('This value already exists');
        return;
      }
  
      // Check max items limit
      if (this.config.maxItems && this.items.length >= this.config.maxItems) {
        alert(`Maximum ${this.config.maxItems} items allowed`);
        return;
      }
  
      const newItem: FilterItem = {
        id: crypto.randomUUID(),
        value: processedValue,
        createdAt: new Date(),
        type: this.config.type
      };
  
      this.items = [...this.items, newItem];
      this.saveToStorage();
      this.newItemValue = '';
    }
  
    private removeItem(item: FilterItem) {
      if (this.readonly) return;
      
      this.items = this.items.filter(i => i.id !== item.id);
      this.saveToStorage();
    }
  
    private clearAll() {
      if (this.readonly) return;
      
      if (confirm('Are you sure you want to clear all items?')) {
        this.items = [];
        this.saveToStorage();
      }
    }
  
    private exportData() {
      const data = this.items.map(item => item.value);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.config.id}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  
    private async importData(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
  
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (Array.isArray(data)) {
          const importedItems: FilterItem[] = data.map(value => ({
            id: crypto.randomUUID(),
            value: this.config.type === 'number' ? Number(value) : String(value),
            createdAt: new Date(),
            type: this.config.type
          }));
          
          this.items = [...this.items, ...importedItems];
          this.saveToStorage();
        }
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
      
      input.value = '';
    }
  
    render() {
      const filteredItems = this.filteredItems;
      const inputType = this.config.type === 'number' ? 'number' : 'text';
    
      return html`
        <div class="filter-container">
          <div class="filter-header">
            <h3 class="filter-title">${this.config.title}</h3>
            <span class="filter-badge">${this.config.type}</span>
          </div>
  
          <div class="filter-stats">
            <div class="stat">
              <span>📊</span>
              <span>${this.items.length} items</span>
            </div>
            <div class="stat">
              <span>🔍</span>
              <span>${filteredItems.length} shown</span>
            </div>
            ${this.config.maxItems ? html`
              <div class="stat">
                <span>📏</span>
                <span>${this.items.length}/${this.config.maxItems} limit</span>
              </div>
            ` : ''}
          </div>
  
          ${!this.readonly ? html`
            <div class="add-item-form">
              <input
                class="form-input"
                type="${inputType}"
                placeholder="${this.config.placeholder || `Add new ${this.config.type}...`}"
                .value=${this.newItemValue}
                @input=${(e: Event) => this.newItemValue = (e.target as HTMLInputElement).value}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.addItem()}
              />
              <button class="btn btn-primary" @click=${this.addItem}>
                ➕ Add
              </button>
            </div>
  
            <div class="actions-bar">
              <button class="btn btn-danger btn-sm" @click=${this.clearAll} ?disabled=${this.items.length === 0}>
                🗑️ Clear All
              </button>
              <button class="btn btn-sm" @click=${this.exportData} ?disabled=${this.items.length === 0}>
                📤 Export
              </button>
              <label class="btn btn-sm" style="cursor: pointer;">
                📥 Import
                <input type="file" accept=".json" @change=${this.importData} style="display: none;">
              </label>
            </div>
          ` : ''}
  
          <div class="items-list">
            ${filteredItems.length === 0 ? html`
              <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>${this.searchTerm ? 'No items match your search' : 'No items yet'}</p>
              </div>
            ` : filteredItems.map(item => html`
              <div class="filter-item">
                <span class="item-value">${item.value}</span>
                <span class="item-type">${item.createdAt.toDateString()}</span>
                ${!this.readonly ? html`
                  <div class="item-actions">
                    <button class="btn btn-danger btn-sm" @click=${() => this.removeItem(item)}>
                      ❌
                    </button>
                  </div>
                ` : ''}
              </div>
            `)}
          </div>
        </div>
      `;
    }
  
    // Public methods to access data
    getItems(): (string | number)[] {
      return this.items.map(item => item.value);
    }
  
    getItemsAsStrings(): string[] {
      return this.items.map(item => item.value.toString());
    }
  
    getItemsAsNumbers(): number[] {
      return this.items.map(item => Number(item.value)).filter(num => !isNaN(num));
    }
  
    hasItem(value: string | number): boolean {
      return this.items.some(item => item.value === value);
    }
  
    addItemProgrammatically(value: string | number): boolean {
      const processedValue = this.config.type === 'number' ? Number(value) : String(value);
      
      if (this.config.type === 'number' && isNaN(processedValue as number)) {
        return false;
      }
  
      if (!this.config.allowDuplicates && this.hasItem(processedValue)) {
        return false;
      }
  
      if (this.config.maxItems && this.items.length >= this.config.maxItems) {
        return false;
      }
  
      const newItem: FilterItem = {
        id: crypto.randomUUID(),
        value: processedValue,
        createdAt: new Date(),
        type: this.config.type
      };
  
      this.items = [...this.items, newItem];
      this.saveToStorage();
      return true;
    }
  
    removeItemProgrammatically(value: string | number): boolean {
      const initialLength = this.items.length;
      this.items = this.items.filter(item => item.value !== value);
      
      if (this.items.length !== initialLength) {
        this.saveToStorage();
        return true;
      }
      return false;
    }
  
    clearAllItems(): void {
      this.items = [];
      this.saveToStorage();
    }
  }
  
  // components/UserFilter.ts
  @customElement('user-filter')
  export class UserFilter extends BaseFilter {
    constructor() {
      super();
      this.config = {
        id: 'user-filter',
        title: 'User Filter',
        storageKey: 'blockedUsersKeywords',
        type: 'string',
        placeholder: 'Add username or user ID...',
        allowDuplicates: false
      };
    }
  }
  
  // components/WordFilter.ts
  @customElement('word-filter')
  export class WordFilter extends BaseFilter {
    constructor() {
      super();
      this.config = {
        id: 'word-filter',
        title: 'Word Filter',
        storageKey: 'blockedChatKeywords',
        type: 'string',
        placeholder: 'Add word to filter...',
        allowDuplicates: false
      };
    }
  }
    // components/WordFilter.ts
    @customElement('whitelist-filter')
    export class WhiteList extends BaseFilter {
      constructor() {
        super();
        this.config = {
          id: 'whitelist-filter',
          title: 'whitelist',
          storageKey: 'WhitelistKeywords',
          type: 'string',
          placeholder: 'Add user to Whitelist...',
          allowDuplicates: false
        };
      }
    }