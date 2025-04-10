import { LitElement, html, css } from 'lit';
import { IndexedDBManager, DBObserver, getAllDataFromDatabase } from './idb.js';

export class BlacklistTester extends LitElement {
  static properties = {
    testValue: { type: String },
    testType: { type: String },
    testResults: { type: Array },
    loading: { type: Boolean },
    errorMessage: { type: String }
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
      margin-top: 20px;
    }

    h2 {
      margin-top: 0;
      color: #2c3e50;
    }

    .test-form {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      align-items: flex-end;
    }

    .form-group {
      flex-grow: 1;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    input, select, button {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    input[type="text"] {
      width: 100%;
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

    .test-logs {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      max-height: 300px;
      overflow-y: auto;
    }

    .log-entry {
      margin-bottom: 8px;
      padding: 8px;
      border-radius: 4px;
    }

    .log-allowed {
      background: #e8f5e9;
      border-left: 4px solid #4CAF50;
    }

    .log-blocked {
      background: #ffebee;
      border-left: 4px solid #f44336;
    }

    .timestamp {
      color: #666;
      font-size: 0.85em;
    }

    .simulate-bulk {
      margin-top: 20px;
    }

    .traffic-simulation {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .error {
      color: #f44336;
      margin: 10px 0;
    }
  `;

  constructor() {
    super();
    this.testValue = '';
    this.testType = 'ip';
    this.testResults = [];
    this.loading = false;
    this.errorMessage = '';
    
    // Database configuration
    this.dbConfig = {
      name: 'blacklistDB',
      version: 1,
      store: 'blacklistedItems'
    };
    
    // Initialize database manager
    this.dbObserver = new DBObserver();
    this.dbManager = new IndexedDBManager(this.dbConfig, this.dbObserver);
  }

  async checkIsBlocked(value, type) {
    try {
      // Get all blacklisted items
      const blacklistItems = await this.dbManager.getAllData();
      
      // Filter by type if specified
      const matchingItems = blacklistItems.filter(item => 
        (!type || item.type === type) && 
        item.value === value
      );
      
      if (matchingItems.length === 0) {
        return { 
          blocked: false, 
          reason: 'Not found in blacklist'
        };
      }
      
      // Check if any matching item has an active ban
      for (const item of matchingItems) {
        if (item.banType === 'permanent') {
          return { 
            blocked: true, 
            reason: `Permanently banned: ${item.description || 'No reason provided'}`,
            item: item
          };
        }
        
        if (item.banType === 'temporary' && item.banEndDate) {
          const endDate = new Date(item.banEndDate);
          if (endDate > new Date()) {
            const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            return { 
              blocked: true, 
              reason: `Temporarily banned for ${daysLeft} more day${daysLeft === 1 ? '' : 's'}: ${item.description || 'No reason provided'}`,
              item: item
            };
          }
        }
      }
      
      // If we got here, all bans are expired
      return { 
        blocked: false, 
        reason: 'Ban has expired',
        item: matchingItems[0]
      };
      
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return { 
        blocked: false, 
        reason: `Error checking blacklist: ${error.message}`,
        error: error
      };
    }
  }

  logResult(value, type, checkResult) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0');
    
    this.testResults = [
      {
        timestamp,
        value,
        type,
        blocked: checkResult.blocked,
        reason: checkResult.reason,
        item: checkResult.item
      },
      ...this.testResults
    ];
    
    console.log(`[${timestamp}] Access attempt: ${type}=${value} | Result: ${checkResult.blocked ? 'BLOCKED' : 'ALLOWED'} | Reason: ${checkResult.reason}`);
    
    if (checkResult.item) {
      console.log('Matching blacklist item:', checkResult.item);
    }
  }

  async handleTestAccess(e) {
    e.preventDefault();
    this.loading = true;
    
    try {
      const checkResult = await this.checkIsBlocked(this.testValue, this.testType);
      this.logResult(this.testValue, this.testType, checkResult);
    } catch (error) {
      this.errorMessage = `Error during test: ${error.message}`;
      console.error('Error during test:', error);
    } finally {
      this.loading = false;
    }
  }

  async simulateRandomTraffic() {
    const types = ['ip', 'user', 'domain', 'keyword'];
    
    // Sample data for testing
    const sampleData = {
      ip: ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8', '1.1.1.1', '127.0.0.1'],
      user: ['user123', 'admin', 'john_doe', 'alice', 'bob', 'malicious_user'],
      domain: ['example.com', 'test.org', 'malware.site', 'spam.net', 'google.com', 'github.com'],
      keyword: ['password', 'admin', 'free', 'hack', 'win', 'money']
    };
    
    // Generate some random IPs
    for (let i = 0; i < 5; i++) {
      const ip = `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
      sampleData.ip.push(ip);
    }
    
    // Simulate 10 random access attempts
    for (let i = 0; i < 10; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const value = sampleData[type][Math.floor(Math.random() * sampleData[type].length)];
      
      const checkResult = await this.checkIsBlocked(value, type);
      this.logResult(value, type, checkResult);
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async simulateBulkTraffic() {
    // Get existing blacklisted items to ensure we test some blocked items
    const blacklistedItems = await this.dbManager.getAllData();
    
    // Simulate some allowed traffic
    for (let i = 0; i < 5; i++) {
      const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
      const checkResult = await this.checkIsBlocked(ip, 'ip');
      this.logResult(ip, 'ip', checkResult);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Simulate some blocked traffic using actual blacklisted items
    for (const item of blacklistedItems.slice(0, Math.min(5, blacklistedItems.length))) {
      const checkResult = await this.checkIsBlocked(item.value, item.type);
      this.logResult(item.value, item.type, checkResult);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  clearLogs() {
    this.testResults = [];
  }

  handleValueChange(e) {
    this.testValue = e.target.value;
  }

  handleTypeChange(e) {
    this.testType = e.target.value;
  }

  renderLogs() {
    if (this.testResults.length === 0) {
      return html`<p>No test results yet.</p>`;
    }
    
    return html`
      <div class="test-logs">
        ${this.testResults.map(result => html`
          <div class="log-entry ${result.blocked ? 'log-blocked' : 'log-allowed'}">
            <span class="timestamp">[${result.timestamp}]</span> 
            <strong>${result.type}:</strong> ${result.value} - 
            <strong>${result.blocked ? 'BLOCKED' : 'ALLOWED'}</strong>
            <p>${result.reason}</p>
          </div>
        `)}
      </div>
    `;
  }

  render() {
    return html`
      <div class="container">
        <h2>Blacklist Access Tester</h2>
        
        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : ''}
        
        <form class="test-form" @submit=${this.handleTestAccess}>
          <div class="form-group">
            <label for="test-type">Type:</label>
            <select id="test-type" .value=${this.testType} @change=${this.handleTypeChange}>
              <option value="ip">IP Address</option>
              <option value="user">User ID</option>
              <option value="domain">Domain</option>
              <option value="keyword">Keyword</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="test-value">Test Value:</label>
            <input type="text" id="test-value" .value=${this.testValue} 
                  @input=${this.handleValueChange} placeholder="Enter value to test...">
          </div>
          
          <button type="submit" ?disabled=${this.loading || !this.testValue}>
            ${this.loading ? 'Testing...' : 'Test Access'}
          </button>
        </form>
        
        <div class="traffic-simulation">
          <button @click=${this.simulateRandomTraffic}>Simulate Random Traffic</button>
          <button @click=${this.simulateBulkTraffic}>Simulate Realistic Traffic</button>
          <button @click=${this.clearLogs}>Clear Logs</button>
        </div>
        
        <h3>Test Results</h3>
        ${this.renderLogs()}
      </div>
    `;
  }
}

customElements.define('blacklist-tester', BlacklistTester);