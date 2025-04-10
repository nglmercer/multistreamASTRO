import { LitElement, html, css } from 'lit';
import { IndexedDBManager, DBObserver } from './idb.js';
class UserClassifier {
    /**
     * Constructor de la clase UserClassifier.
     * @param {string} classifierName - Un nombre descriptivo para este clasificador (útil para debugging/logging).
     */
    constructor(classifierName) {
      this.classifierName = classifierName;
      this.rules = []; // Inicializa el array de reglas.
    }
  
    /**
     * Agrega una regla de clasificación para un proveedor específico.
     * @param {object} rule - Objeto que define la regla de clasificación.
     *                          Debe tener la siguiente estructura:
     *                          {
     *                              provider: string,  // Nombre del proveedor.
     *                              keys: string[],    // Array de keys a buscar en los datos del usuario.
     *                              conditions: object[], // Array de condiciones (ver documentación de `classifyUser`).
     *                          }
     */
    addRule(rule) {
      if (!rule || typeof rule !== 'object') {
        console.warn(`[${this.classifierName}] addRule: Regla inválida proporcionada. Se ignorará.`);
        return;
      }
  
      if (!rule.provider || typeof rule.provider !== 'string') {
        console.warn(`[${this.classifierName}] addRule: La regla no tiene un 'provider' válido. Se ignorará.`);
        return;
      }
  
      if (!rule.keys || !Array.isArray(rule.keys)) {
        console.warn(`[${this.classifierName}] addRule: La regla no tiene 'keys' válidas. Se ignorará.`);
        return;
      }
  
      if (!rule.conditions || !Array.isArray(rule.conditions)) {
        console.warn(`[${this.classifierName}] addRule: La regla no tiene 'conditions' válidas. Se ignorará.`);
        return;
      }
  
      this.rules.push(rule);
    }
  
    /**
     * Clasifica un usuario basándose en los datos proporcionados y las reglas configuradas.
     * @param {object} userData - Objeto con datos del usuario (proveniente de uno de los proveedores).
     * @param {string} providerName - Nombre del proveedor de datos.
     * @returns {object|null} - Objeto con las propiedades de clasificación (ej. { isModerator: true, isVip: false }).
     *                           Retorna `null` si no se puede clasificar al usuario.
     */
    classifyUser(userData, providerName) {
      if (!userData || typeof userData !== 'object') {
        console.warn(`[${this.classifierName}] classifyUser: Datos de usuario inválidos del proveedor ${providerName}.  Recibido:`, userData);
        return null;
      }
  
      const classifications = {}; // Inicializa un objeto vacío para las clasificaciones.
  
      // Encuentra las reglas correspondientes al proveedor actual
      const providerRules = this.rules.find(rule => rule.provider === providerName);
  
      if (!providerRules) {
        console.warn(`[${this.classifierName}] classifyUser: No se encontraron reglas para el proveedor ${providerName}.`);
        return null;
      }
  
      // Itera sobre las condiciones y aplica las clasificaciones
      for (const condition of providerRules.conditions) {
        if (userData.hasOwnProperty(condition.key) && userData[condition.key] === condition.value) {
          // Define la propiedad en el objeto classifications.  Si ya existe, la sobrescribe.
          classifications[condition.classification] = true;
        }
      }
  
  
      // Verifica si alguna clasificación se estableció (si el objeto no está vacío).
      if (Object.keys(classifications).length > 0) {
        return classifications; // Retorna el objeto de clasificación si al menos una propiedad fue establecida.
      } else {
        return null; // Retorna null si no se pudo clasificar al usuario.
      }
    }
  }
  
export class BlacklistManager extends LitElement {
  static properties = {
    blacklistItems: { type: Array },
    searchTerm: { type: String },
    editingItem: { type: Object },
    loading: { type: Boolean },
    errorMessage: { type: String },
    activeTab: { type: String }
  };

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
    }

    .container {
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }

    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      margin-right: 5px;
    }

    .tab.active {
      background: #fff;
      border-color: #ddd;
      font-weight: bold;
    }

    .search-bar {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }

    input, select, button {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    input[type="text"] {
      flex-grow: 1;
    }

    button {
      background: #4CAF50;
      color: white;
      border: none;
      cursor: pointer;
      transition: background 0.3s;
    }

    button:hover {
      background: #3e8e41;
    }

    button.delete {
      background: #f44336;
    }

    button.delete:hover {
      background: #d32f2f;
    }

    button.unban {
      background: #2196F3;
    }

    button.unban:hover {
      background: #0b7dda;
    }

    button.modify {
      background: #ff9800;
    }

    button.modify:hover {
      background: #e68a00;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }

    th {
      background-color: #f2f2f2;
      position: sticky;
      top: 0;
    }

    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    tr:hover {
      background-color: #f1f1f1;
    }

    .error {
      color: #f44336;
      margin: 10px 0;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 500px;
      max-width: 90%;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    .button-group {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    .info-tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 5px;
    }

    .tag-permanent {
      background-color: #f44336;
      color: white;
    }

    .tag-temporary {
      background-color: #ff9800;
      color: white;
    }

    .tag-expired {
      background-color: #8bc34a;
      color: white;
    }

    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow: auto;
      max-height: 300px;
      border: 1px solid #ddd;
    }
  `;

  constructor() {
    super();
    this.blacklistItems = [];
    this.searchTerm = '';
    this.editingItem = null;
    this.loading = true;
    this.errorMessage = '';
    this.activeTab = 'all';
    
    // Database configuration
    this.dbConfig = {
      name: 'blacklistDB',
      version: 1,
      store: 'blacklistedItems'
    };
    
    // Create observer for DB events
    this.dbObserver = new DBObserver();
    
    // Initialize database manager
    this.dbManager = new IndexedDBManager(this.dbConfig, this.dbObserver);
    
    // Rules classifier for ban rules
    this.banRulesClassifier = new UserClassifier('BanRulesClassifier');
    
    // Setup default ban rules
    this.setupBanRules();
    
    // Subscribe to database changes
    this.dbObserver.subscribe(this.handleDBChange.bind(this));
  }

  setupBanRules() {
    this.banRulesClassifier.addRule({
      provider: 'blacklist',
      keys: ['type', 'banType', 'banEndDate'],
      conditions: [
        { key: 'banType', value: 'permanent', classification: 'isPermanentBan' },
        { key: 'banType', value: 'temporary', classification: 'isTemporaryBan' }
      ]
    });
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.loadItems();
  }

  async loadItems() {
    this.loading = true;
    try {
      const items = await this.dbManager.getAllData();
      this.blacklistItems = items;
    } catch (error) {
      this.errorMessage = `Error loading data: ${error.message}`;
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  handleDBChange(action, data) {
    console.log(`DB Change: ${action}`, data);
    this.loadItems();
  }

  getFilteredItems() {
    let items = [...this.blacklistItems];
    
    // Apply search term filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      items = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchLower)) ||
        (item.value && item.value.toString().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply tab filter
    if (this.activeTab === 'active') {
      items = items.filter(item => {
        if (item.banType === 'permanent') return true;
        if (item.banType === 'temporary' && item.banEndDate) {
          const endDate = new Date(item.banEndDate);
          return endDate > new Date();
        }
        return false;
      });
    } else if (this.activeTab === 'expired') {
      items = items.filter(item => {
        if (item.banType !== 'temporary') return false;
        if (item.banEndDate) {
          const endDate = new Date(item.banEndDate);
          return endDate <= new Date();
        }
        return false;
      });
    }
    
    return items;
  }

  async handleAddItem() {
    this.editingItem = {
      name: '',
      value: '',
      type: 'ip', // Default type
      description: '',
      banType: 'permanent',
      banStartDate: new Date().toISOString().split('T')[0],
      banEndDate: ''
    };
    this.requestUpdate();
  }

  async handleEditItem(item) {
    this.editingItem = {...item};
    this.requestUpdate();
  }

  async handleSaveItem(e) {
    e.preventDefault();
    
    try {
      await this.dbManager.saveData(this.editingItem);
      this.editingItem = null;
    } catch (error) {
      this.errorMessage = `Error saving item: ${error.message}`;
      console.error('Error saving item:', error);
    }
  }

  async handleDeleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await this.dbManager.deleteData(id);
      } catch (error) {
        this.errorMessage = `Error deleting item: ${error.message}`;
        console.error('Error deleting item:', error);
      }
    }
  }

  handleUnbanItem(item) {
    const updatedItem = {...item};
    if (updatedItem.banType === 'permanent') {
      updatedItem.banType = 'temporary';
      
      // Set end date to current date (immediate unban)
      const today = new Date().toISOString().split('T')[0];
      updatedItem.banEndDate = today;
    } else {
      // If already temporary, just set end date to now
      const today = new Date().toISOString().split('T')[0];
      updatedItem.banEndDate = today;
    }
    
    this.dbManager.updateDataById(item.id, updatedItem);
  }

  handleChangeBanDuration(item, increaseDays) {
    const updatedItem = {...item};
    let endDate;
    
    if (updatedItem.banEndDate) {
      endDate = new Date(updatedItem.banEndDate);
    } else {
      endDate = new Date();
    }
    
    // Increase or decrease by the number of days
    endDate.setDate(endDate.getDate() + increaseDays);
    updatedItem.banEndDate = endDate.toISOString().split('T')[0];
    
    // Ensure it's marked as a temporary ban
    if (updatedItem.banType === 'permanent') {
      updatedItem.banType = 'temporary';
    }
    
    this.dbManager.updateDataById(item.id, updatedItem);
  }

  handleCancelEdit() {
    this.editingItem = null;
  }

  handleSearchChange(e) {
    this.searchTerm = e.target.value;
  }

  handleTabChange(tab) {
    this.activeTab = tab;
  }

  getBanStatus(item) {
    if (item.banType === 'permanent') {
      return html`<span class="info-tag tag-permanent">Permanent</span>`;
    } else if (item.banType === 'temporary') {
      const endDate = new Date(item.banEndDate);
      if (endDate <= new Date()) {
        return html`<span class="info-tag tag-expired">Expired</span>`;
      }
      return html`<span class="info-tag tag-temporary">Until ${item.banEndDate}</span>`;
    }
    return '';
  }

  renderEditModal() {
    if (!this.editingItem) return '';
    
    return html`
      <div class="modal">
        <div class="modal-content">
          <h2>${this.editingItem.id !== undefined ? 'Edit Item' : 'Add New Item'}</h2>
          <form @submit=${this.handleSaveItem}>
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" .value=${this.editingItem.name || ''} 
                @input=${e => this.editingItem.name = e.target.value} required>
            </div>
            
            <div class="form-group">
              <label for="value">Value (IP/Number/ID):</label>
              <input type="text" id="value" .value=${this.editingItem.value || ''} 
                @input=${e => this.editingItem.value = e.target.value} required>
            </div>
            
            <div class="form-group">
              <label for="type">Type:</label>
              <select id="type" .value=${this.editingItem.type || 'ip'} 
                @change=${e => this.editingItem.type = e.target.value}>
                <option value="ip">IP Address</option>
                <option value="user">User ID</option>
                <option value="domain">Domain</option>
                <option value="keyword">Keyword</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="description">Description:</label>
              <textarea id="description" .value=${this.editingItem.description || ''} 
                @input=${e => this.editingItem.description = e.target.value} rows="3"></textarea>
            </div>
            
            <div class="form-group">
              <label for="banType">Ban Type:</label>
              <select id="banType" .value=${this.editingItem.banType || 'permanent'} 
                @change=${e => this.editingItem.banType = e.target.value}>
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="banStartDate">Ban Start Date:</label>
              <input type="date" id="banStartDate" .value=${this.editingItem.banStartDate || ''} 
                @input=${e => this.editingItem.banStartDate = e.target.value} required>
            </div>
            
            ${this.editingItem.banType === 'temporary' ? html`
              <div class="form-group">
                <label for="banEndDate">Ban End Date:</label>
                <input type="date" id="banEndDate" .value=${this.editingItem.banEndDate || ''} 
                  @input=${e => this.editingItem.banEndDate = e.target.value} required>
              </div>
            ` : ''}
            
            <div class="button-group">
              <button type="button" @click=${this.handleCancelEdit}>Cancel</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderTable() {
    const filteredItems = this.getFilteredItems();
    
    return html`
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Value</th>
            <th>Type</th>
            <th>Ban Status</th>
            <th>Details</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredItems.length === 0 ? 
            html`<tr><td colspan="7">No items found</td></tr>` :
            filteredItems.map(item => html`
              <tr>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.value}</td>
                <td>${item.type}</td>
                <td>${this.getBanStatus(item)}</td>
                <td>
                  <button @click=${() => this.handleDetailsView(item)}>View</button>
                </td>
                <td>
                  <button @click=${() => this.handleEditItem(item)}>Edit</button>
                  <button class="delete" @click=${() => this.handleDeleteItem(item.id)}>Delete</button>
                  <button class="unban" @click=${() => this.handleUnbanItem(item)}>Unban</button>
                  <button class="modify" @click=${() => this.handleChangeBanDuration(item, 7)}>+7 Days</button>
                  <button class="modify" @click=${() => this.handleChangeBanDuration(item, -1)}>-1 Day</button>
                </td>
              </tr>
            `)
          }
        </tbody>
      </table>
    `;
  }

  handleDetailsView(item) {
    const itemDetailJson = JSON.stringify(item, null, 2);
    alert(`Item Details:\n\n${itemDetailJson}`);
  }

  render() {
    return html`
      <div class="container">
        <h1>Blacklist Manager</h1>
        
        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : ''}
        
        <div class="tabs">
          <div class="tab ${this.activeTab === 'all' ? 'active' : ''}" 
               @click=${() => this.handleTabChange('all')}>All Items</div>
          <div class="tab ${this.activeTab === 'active' ? 'active' : ''}" 
               @click=${() => this.handleTabChange('active')}>Active Bans</div>
          <div class="tab ${this.activeTab === 'expired' ? 'active' : ''}" 
               @click=${() => this.handleTabChange('expired')}>Expired Bans</div>
        </div>
        
        <div class="search-bar">
          <input type="text" placeholder="Search by name, value or description..." 
                 .value=${this.searchTerm} @input=${this.handleSearchChange}>
          <button @click=${this.handleAddItem}>Add New Item</button>
        </div>
        
        ${this.loading ? 
          html`<p>Loading...</p>` : 
          this.renderTable()}
        
        ${this.renderEditModal()}
      </div>
    `;
  }
}

customElements.define('blacklist-manager', BlacklistManager);