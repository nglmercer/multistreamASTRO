// advancedApi.js - Clase API avanzada similar a Postman

class AdvancedHttp {
    constructor(baseURL = '', defaultHeaders = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = defaultHeaders;
        this.interceptors = {
            request: [],
            response: []
        };
        this.savedRequests = new Map();
    }

    // Agregar interceptores
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    // Construir URL completa
    buildURL(url, params = {}) {
        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        const urlObj = new URL(fullURL);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                urlObj.searchParams.set(key, value);
            }
        });
        
        return urlObj.toString();
    }

    // Procesar headers
    processHeaders(headers = {}) {
        return { ...this.defaultHeaders, ...headers };
    }

    // Procesar body según el tipo
    processBody(data, contentType) {
        if (!data) return null;

        // Si ya es FormData o URLSearchParams, devolverlo tal cual
        if (data instanceof FormData || data instanceof URLSearchParams) {
            return data;
        }

        switch (contentType) {
            case 'application/json':
                return JSON.stringify(data);
            
            case 'application/x-www-form-urlencoded':
                if (typeof data === 'object') {
                    return new URLSearchParams(data);
                }
                return data;
            
            case 'multipart/form-data':
                if (typeof data === 'object') {
                    const formData = new FormData();
                    Object.entries(data).forEach(([key, value]) => {
                        if (value instanceof File || value instanceof Blob) {
                            formData.append(key, value);
                        } else {
                            formData.append(key, String(value));
                        }
                    });
                    return formData;
                }
                return data;
            
            case 'text/plain':
                return String(data);
            
            default:
                return data;
        }
    }

    // Ejecutar interceptores de request
    async applyRequestInterceptors(config) {
        let processedConfig = { ...config };
        
        for (const interceptor of this.interceptors.request) {
            processedConfig = await interceptor(processedConfig);
        }
        
        return processedConfig;
    }

    // Ejecutar interceptores de response
    async applyResponseInterceptors(response) {
        let processedResponse = response;
        
        for (const interceptor of this.interceptors.response) {
            processedResponse = await interceptor(processedResponse);
        }
        
        return processedResponse;
    }

    // Método principal de request
    async request(config) {
        const startTime = Date.now();
        
        try {
            // Aplicar interceptores de request
            const processedConfig = await this.applyRequestInterceptors(config);
            
            const {
                url,
                method = 'GET',
                headers = {},
                params = {},
                data,
                timeout = 30000,
                auth,
                ...otherOptions
            } = processedConfig;

            // Construir URL
            const fullURL = this.buildURL(url, params);
            
            // Procesar headers
            let processedHeaders = this.processHeaders(headers);
            
            // Agregar autenticación
            if (auth) {
                if (auth.type === 'bearer' && auth.token) {
                    processedHeaders['Authorization'] = `Bearer ${auth.token}`;
                } else if (auth.type === 'basic' && auth.username) {
                    const credentials = btoa(`${auth.username}:${auth.password || ''}`);
                    processedHeaders['Authorization'] = `Basic ${credentials}`;
                } else if (auth.type === 'api-key' && auth.key) {
                    if (auth.location === 'header') {
                        processedHeaders[auth.name || 'X-API-Key'] = auth.key;
                    }
                    // Si es query param, ya se habría agregado en params
                }
            }

            // Determinar Content-Type si no se especificó
            const contentType = processedHeaders['Content-Type'] || 
                              processedHeaders['content-type'] || 
                              'application/json';

            // Procesar body
            const processedBody = this.processBody(data, contentType);
            
            // Si usamos FormData, eliminar Content-Type para que el browser lo establezca
            if (processedBody instanceof FormData) {
                delete processedHeaders['Content-Type'];
                delete processedHeaders['content-type'];
            }

            // Configurar fetch options
            const fetchOptions = {
                method: method.toUpperCase(),
                headers: processedHeaders,
                ...otherOptions
            };

            if (processedBody !== null && !['GET', 'HEAD'].includes(method.toUpperCase())) {
                fetchOptions.body = processedBody;
            }

            // Configurar timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            fetchOptions.signal = controller.signal;

            // Realizar petición
            const response = await fetch(fullURL, fetchOptions);
            clearTimeout(timeoutId);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Procesar respuesta
            let responseData;
            const responseContentType = response.headers.get('content-type');
            
            if (responseContentType && responseContentType.includes('application/json')) {
                responseData = await response.json();
            } else if (responseContentType && responseContentType.includes('text/')) {
                responseData = await response.text();
            } else {
                responseData = await response.blob();
            }

            const processedResponseObj = {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                config: processedConfig,
                request: {
                    url: fullURL,
                    method: method.toUpperCase(),
                    headers: processedHeaders,
                    data: processedBody
                },
                responseTime,
                ok: response.ok
            };

            // Aplicar interceptores de response
            const finalResponse = await this.applyResponseInterceptors(processedResponseObj);

            if (!response.ok) {
                const error = new Error(`HTTP Error: ${response.status} ${response.statusText}`);
                error.response = finalResponse;
                throw error;
            }

            return finalResponse;

        } catch (error) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${timeout}ms`);
                timeoutError.code = 'TIMEOUT';
                timeoutError.responseTime = responseTime;
                throw timeoutError;
            }

            error.responseTime = responseTime;
            throw error;
        }
    }

    // Métodos de conveniencia
    get(url, config = {}) {
        return this.request({ method: 'GET', url, ...config });
    }

    post(url, data, config = {}) {
        return this.request({ method: 'POST', url, data, ...config });
    }

    put(url, data, config = {}) {
        return this.request({ method: 'PUT', url, data, ...config });
    }

    patch(url, data, config = {}) {
        return this.request({ method: 'PATCH', url, data, ...config });
    }

    delete(url, config = {}) {
        return this.request({ method: 'DELETE', url, ...config });
    }

    head(url, config = {}) {
        return this.request({ method: 'HEAD', url, ...config });
    }

    options(url, config = {}) {
        return this.request({ method: 'OPTIONS', url, ...config });
    }

    // Guardar y cargar configuraciones de request
    saveRequest(name, config) {
        this.savedRequests.set(name, {
            ...config,
            createdAt: new Date().toISOString()
        });
        
        // Persistir en localStorage si está disponible
        if (typeof localStorage !== 'undefined') {
            const saved = Object.fromEntries(this.savedRequests);
            localStorage.setItem('advancedHttp_savedRequests', JSON.stringify(saved));
        }
        
        return this;
    }

    loadRequest(name) {
        return this.savedRequests.get(name);
    }

    getAllSavedRequests() {
        return Array.from(this.savedRequests.entries()).map(([name, config]) => ({
            name,
            ...config
        }));
    }

    deleteRequest(name) {
        const deleted = this.savedRequests.delete(name);
        
        // Actualizar localStorage
        if (typeof localStorage !== 'undefined') {
            const saved = Object.fromEntries(this.savedRequests);
            localStorage.setItem('advancedHttp_savedRequests', JSON.stringify(saved));
        }
        
        return deleted;
    }

    // Cargar requests guardados desde localStorage
    loadSavedRequests() {
        if (typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem('advancedHttp_savedRequests');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    Object.entries(parsed).forEach(([name, config]) => {
                        this.savedRequests.set(name, config);
                    });
                }
            } catch (error) {
                console.warn('Error loading saved requests:', error);
            }
        }
        return this;
    }

    // Crear una colección de requests
    createCollection(name) {
        return new RequestCollection(name, this);
    }

    // Método para hacer requests en lote
    async batch(requests) {
        const results = await Promise.allSettled(
            requests.map(config => this.request(config))
        );
        
        return results.map((result, index) => ({
            index,
            config: requests[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }

    // Método para hacer requests con retry
    async requestWithRetry(config, maxRetries = 3, retryDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(config);
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    // Calcular delay con backoff exponencial
                    const delay = retryDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
}

// Clase para manejar colecciones de requests
class RequestCollection {
    constructor(name, httpInstance) {
        this.name = name;
        this.http = httpInstance;
        this.requests = new Map();
        this.variables = new Map();
    }

    addRequest(name, config) {
        this.requests.set(name, config);
        return this;
    }

    setVariable(key, value) {
        this.variables.set(key, value);
        return this;
    }

    getVariable(key) {
        return this.variables.get(key);
    }

    // Procesar variables en la configuración
    processVariables(config) {
        const configStr = JSON.stringify(config);
        let processedStr = configStr;
        
        this.variables.forEach((value, key) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processedStr = processedStr.replace(regex, value);
        });
        
        return JSON.parse(processedStr);
    }

    async runRequest(name) {
        const config = this.requests.get(name);
        if (!config) {
            throw new Error(`Request '${name}' not found in collection '${this.name}'`);
        }
        
        const processedConfig = this.processVariables(config);
        return await this.http.request(processedConfig);
    }

    async runAll() {
        const results = [];
        
        for (const [name, config] of this.requests) {
            try {
                const result = await this.runRequest(name);
                results.push({ name, success: true, data: result });
            } catch (error) {
                results.push({ name, success: false, error });
            }
        }
        
        return results;
    }
}

// Clase extendida que reemplaza tu BaseApi
class AdvancedBaseApi extends AdvancedHttp {
    constructor(baseURL = '', options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        super(baseURL, defaultHeaders);
        
        this.options = options;
        this.loadSavedRequests();
        
        // Cargar token y usuario desde localStorage
        this.loadAuthFromStorage();
        
        // Agregar interceptor para autenticación automática
        this.addRequestInterceptor(this.authInterceptor.bind(this));
        
        // Agregar interceptor para logging
        this.addResponseInterceptor(this.loggingInterceptor.bind(this));
    }

    loadAuthFromStorage() {
        if (typeof localStorage !== 'undefined') {
            try {
                const info = localStorage.getItem("info");
                if (info) {
                    const parsed = JSON.parse(info);
                    this.token = parsed.token;
                    this.user = parsed.user;
                } else {
                    this.token = localStorage.getItem("token");
                    const user = localStorage.getItem("user");
                    this.user = user ? JSON.parse(user) : {};
                }
            } catch (error) {
                console.warn('Error loading auth from storage:', error);
                this.token = null;
                this.user = {};
            }
        }
    }

    async authInterceptor(config) {
        // Si no tiene auth configurado y hay token disponible, agregarlo
        if (!config.auth && this.token) {
            config.auth = {
                type: 'bearer',
                token: this.token
            };
        }
        
        return config;
    }

    async loggingInterceptor(response) {
        if (this.options.debug) {
            console.log('API Response:', {
                url: response.request.url,
                method: response.request.method,
                status: response.status,
                responseTime: response.responseTime
            });
        }
        
        return response;
    }

    // Métodos de conveniencia para tu API específica
    async apiGet(endpoint, params = {}, options = {}) {
        return this.get(endpoint, { params, ...options });
    }

    async apiPost(endpoint, data = {}, options = {}) {
        return this.post(endpoint, data, options);
    }

    async apiPut(endpoint, data = {}, options = {}) {
        return this.put(endpoint, data, options);
    }

    async apiDelete(endpoint, options = {}) {
        return this.delete(endpoint, options);
    }

    // Método para subir archivos
    async uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        const config = {
            data: formData,
            headers: {
                // No establecer Content-Type para FormData
            }
        };

        if (onProgress) {
            config.onUploadProgress = onProgress;
        }

        return this.post(endpoint, formData, config);
    }

    // Método para descargar archivos
    async downloadFile(endpoint, filename = null, options = {}) {
        const response = await this.get(endpoint, {
            ...options,
            responseType: 'blob'
        });

        // Crear URL del blob y descargarlo
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return response;
    }

    // Método para requests con paginación
    async getPaginated(endpoint, options = {}) {
        const {
            page = 1,
            limit = 10,
            ...otherOptions
        } = options;

        return this.get(endpoint, {
            params: { page, limit },
            ...otherOptions
        });
    }

    // Método para búsqueda
    async search(endpoint, query, options = {}) {
        return this.get(endpoint, {
            params: { q: query, ...options.params },
            ...options
        });
    }
}

// Ejemplo de uso:
/*
// Inicializar la API
const api = new AdvancedBaseApi('https://api.ejemplo.com', {
    debug: true,
    headers: {
        'X-Custom-Header': 'valor'
    }
});

// Usar métodos básicos
const data = await api.get('/users');
const newUser = await api.post('/users', { name: 'Juan', email: 'juan@email.com' });

// Usar con configuración avanzada
const response = await api.request({
    url: '/users',
    method: 'POST',
    data: { name: 'María' },
    params: { include: 'profile' },
    auth: { type: 'bearer', token: 'mi-token' },
    timeout: 5000
});

// Guardar request para reutilizar
api.saveRequest('createUser', {
    url: '/users',
    method: 'POST',
    data: { name: '{{userName}}', email: '{{userEmail}}' }
});

// Crear colección
const userCollection = api.createCollection('Users API');
userCollection.setVariable('baseUrl', '/api/v1');
userCollection.addRequest('getUsers', { url: '{{baseUrl}}/users' });
userCollection.addRequest('createUser', { 
    url: '{{baseUrl}}/users', 
    method: 'POST',
    data: { name: '{{userName}}' }
});

// Ejecutar colección
userCollection.setVariable('userName', 'Test User');
const results = await userCollection.runAll();
*/

export {
    AdvancedHttp,
    AdvancedBaseApi,
    RequestCollection
};
import React, { useState, useRef } from 'react';
import { Play, Save, Folder, Copy, Trash2, Plus, Minus, Eye, EyeOff } from 'lucide-react';

const AdvancedFetchTool = () => {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [currentRequest, setCurrentRequest] = useState({
    id: Date.now(),
    name: 'Nueva Petición',
    url: '',
    method: 'GET',
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    params: [],
    body: '',
    bodyType: 'json',
    auth: { type: 'none', token: '', username: '', password: '' }
  });
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  const bodyTypes = [
    { value: 'json', label: 'JSON' },
    { value: 'text', label: 'Text' },
    { value: 'form', label: 'Form Data' },
    { value: 'urlencoded', label: 'URL Encoded' }
  ];

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const addKeyValue = (type) => {
    setCurrentRequest(prev => ({
      ...prev,
      [type]: [...prev[type], { key: '', value: '', enabled: true }]
    }));
  };

  const updateKeyValue = (type, index, field, value) => {
    setCurrentRequest(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeKeyValue = (type, index) => {
    setCurrentRequest(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const buildUrl = () => {
    let url = currentRequest.url;
    const enabledParams = currentRequest.params.filter(p => p.enabled && p.key);
    
    if (enabledParams.length > 0) {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      enabledParams.forEach(param => {
        urlObj.searchParams.set(param.key, param.value);
      });
      return urlObj.toString();
    }
    
    return url;
  };

  const buildHeaders = () => {
    const headers = {};
    currentRequest.headers
      .filter(h => h.enabled && h.key)
      .forEach(header => {
        headers[header.key] = header.value;
      });

    // Add auth header if needed
    if (currentRequest.auth.type === 'bearer' && currentRequest.auth.token) {
      headers['Authorization'] = `Bearer ${currentRequest.auth.token}`;
    } else if (currentRequest.auth.type === 'basic' && currentRequest.auth.username) {
      const credentials = btoa(`${currentRequest.auth.username}:${currentRequest.auth.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  };

  const buildBody = () => {
    if (['GET', 'HEAD'].includes(currentRequest.method)) return null;

    switch (currentRequest.bodyType) {
      case 'json':
        try {
          return JSON.stringify(JSON.parse(currentRequest.body || '{}'));
        } catch {
          return currentRequest.body;
        }
      case 'form':
        const formData = new FormData();
        try {
          const parsed = JSON.parse(currentRequest.body || '{}');
          Object.entries(parsed).forEach(([key, value]) => {
            formData.append(key, value);
          });
          return formData;
        } catch {
          return currentRequest.body;
        }
      case 'urlencoded':
        try {
          const parsed = JSON.parse(currentRequest.body || '{}');
          return new URLSearchParams(parsed);
        } catch {
          return currentRequest.body;
        }
      default:
        return currentRequest.body;
    }
  };

  const executeRequest = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const url = buildUrl();
      const headers = buildHeaders();
      const body = buildBody();

      const startTime = Date.now();
      
      const fetchOptions = {
        method: currentRequest.method,
        headers: headers
      };

      if (body !== null) {
        fetchOptions.body = body;
      }

      const res = await fetch(url, fetchOptions);
      const endTime = Date.now();

      let responseData;
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData,
        time: endTime - startTime,
        size: JSON.stringify(responseData).length
      });

    } catch (error) {
      setResponse({
        error: error.message,
        status: 0,
        time: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRequest = () => {
    const savedRequest = { ...currentRequest, id: currentRequest.id || Date.now() };
    setRequests(prev => {
      const existing = prev.findIndex(r => r.id === savedRequest.id);
      if (existing >= 0) {
        return prev.map(r => r.id === savedRequest.id ? savedRequest : r);
      }
      return [...prev, savedRequest];
    });
  };

  const loadRequest = (request) => {
    setCurrentRequest({ ...request });
    setResponse(null);
  };

  const newRequest = () => {
    setCurrentRequest({
      id: Date.now(),
      name: 'Nueva Petición',
      url: '',
      method: 'GET',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: '',
      bodyType: 'json',
      auth: { type: 'none', token: '', username: '', password: '' }
    });
    setResponse(null);
  };

  const KeyValueEditor = ({ items, type, placeholder }) => (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateKeyValue(type, index, 'enabled', e.target.checked)}
            className="w-4 h-4"
          />
          <input
            type="text"
            placeholder="Key"
            value={item.key}
            onChange={(e) => updateKeyValue(type, index, 'key', e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type={showSensitive || !item.key.toLowerCase().includes('auth') ? 'text' : 'password'}
            placeholder="Value"
            value={item.value}
            onChange={(e) => updateKeyValue(type, index, 'value', e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => removeKeyValue(type, index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => addKeyValue(type)}
        className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
      >
        <Plus className="w-4 h-4" />
        Agregar {placeholder}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-screen">
        {/* Sidebar - Requests Collection */}
        <div className="lg:col-span-1 border-r pr-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Colección
            </h2>
            <button
              onClick={newRequest}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => loadRequest(request)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{request.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    request.method === 'GET' ? 'bg-green-100 text-green-800' :
                    request.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.method}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">{request.url}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Request Configuration */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <input
                type="text"
                placeholder="Nombre de la petición"
                value={currentRequest.name}
                onChange={(e) => setCurrentRequest(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveRequest}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <select
                value={currentRequest.method}
                onChange={(e) => setCurrentRequest(prev => ({ ...prev, method: e.target.value }))}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {methods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              
              <input
                type="text"
                placeholder="https://api.ejemplo.com/endpoint"
                value={currentRequest.url}
                onChange={(e) => setCurrentRequest(prev => ({ ...prev, url: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <button
                onClick={executeRequest}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b mb-4">
              <nav className="flex space-x-8">
                {['Parámetros', 'Headers', 'Auth', 'Body'].map((tab, index) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(index)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === index
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <button
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="ml-auto p-1 text-gray-500 hover:text-gray-700"
                  title="Mostrar/ocultar valores sensibles"
                >
                  {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-64">
              {activeTab === 0 && (
                <div>
                  <h3 className="font-medium mb-3">Parámetros de Query</h3>
                  <KeyValueEditor
                    items={currentRequest.params}
                    type="params"
                    placeholder="parámetro"
                  />
                </div>
              )}

              {activeTab === 1 && (
                <div>
                  <h3 className="font-medium mb-3">Headers</h3>
                  <KeyValueEditor
                    items={currentRequest.headers}
                    type="headers"
                    placeholder="header"
                  />
                </div>
              )}

              {activeTab === 2 && (
                <div>
                  <h3 className="font-medium mb-3">Autenticación</h3>
                  <div className="space-y-4">
                    <select
                      value={currentRequest.auth.type}
                      onChange={(e) => setCurrentRequest(prev => ({
                        ...prev,
                        auth: { ...prev.auth, type: e.target.value }
                      }))}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">Sin autenticación</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                    </select>

                    {currentRequest.auth.type === 'bearer' && (
                      <input
                        type={showSensitive ? 'text' : 'password'}
                        placeholder="Token"
                        value={currentRequest.auth.token}
                        onChange={(e) => setCurrentRequest(prev => ({
                          ...prev,
                          auth: { ...prev.auth, token: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}

                    {currentRequest.auth.type === 'basic' && (
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Usuario"
                          value={currentRequest.auth.username}
                          onChange={(e) => setCurrentRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, username: e.target.value }
                          }))}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type={showSensitive ? 'text' : 'password'}
                          placeholder="Contraseña"
                          value={currentRequest.auth.password}
                          onChange={(e) => setCurrentRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth, password: e.target.value }
                          }))}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 3 && !['GET', 'HEAD'].includes(currentRequest.method) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Cuerpo de la petición</h3>
                    <select
                      value={currentRequest.bodyType}
                      onChange={(e) => setCurrentRequest(prev => ({ ...prev, bodyType: e.target.value }))}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {bodyTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    placeholder={currentRequest.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Contenido del cuerpo'}
                    value={currentRequest.body}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full h-48 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Response */}
          {response && (
            <div className="border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Respuesta</h3>
                {response.error ? (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm">
                    Error
                  </span>
                ) : (
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded ${
                      response.status >= 200 && response.status < 300 ? 'bg-green-100 text-green-800' :
                      response.status >= 400 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {response.status} {response.statusText}
                    </span>
                    <span>{response.time}ms</span>
                    <span>{response.size} bytes</span>
                  </div>
                )}
              </div>

              {response.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-mono">{response.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {response.headers && (
                    <div>
                      <h4 className="font-medium mb-2">Headers de respuesta</h4>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <pre className="text-sm">
                          {Object.entries(response.headers).map(([key, value]) => (
                            <div key={key}><strong>{key}:</strong> {value}</div>
                          ))}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-2">Cuerpo de respuesta</h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-auto">
                      <pre className="text-sm">
                        {typeof response.data === 'object' 
                          ? JSON.stringify(response.data, null, 2)
                          : response.data
                        }
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedFetchTool;