// SimpleWebSocketClient.js
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl =
  import.meta.env.MODE === "development"
    ? "ws://localhost:3000/ws"
    : `${wsProtocol}//${window.location.host}/ws`;

class SimpleWebSocketClient {
    /**
     * @param {string} url La URL del servidor WebSocket (ej. "ws://localhost:3000/ws")
     * @param {object} [options] Opciones para el cliente.
     * @param {function} [options.onOpen] Callback cuando la conexión se abre. Recibe el evento 'open'.
     * @param {function} [options.onMessage] Callback cuando se recibe un mensaje. Recibe el mensaje procesado (JSON parseado si es posible) y el evento 'message' original.
     * @param {function} [options.onClose] Callback cuando la conexión se cierra. Recibe el evento 'close'.
     * @param {function} [options.onError] Callback cuando ocurre un error. Recibe el evento 'error'.
     * @param {boolean} [options.autoReconnect=true] Intentar reconectar automáticamente.
     * @param {number} [options.reconnectInterval=5000] Intervalo en ms para reintentar la conexión.
     * @param {number} [options.maxReconnectAttempts=5] Máximos intentos de reconexión. 0 para infinitos.
     * @param {boolean} [options.debug=false] Habilitar logs de depuración.
     */
    constructor(url, options = {}) {
      this.url = url;
      this.ws = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
  
      // Configuración con valores por defecto
      this.config = {
        onOpen: options.onOpen || function() {},
        onMessage: options.onMessage || function() {},
        onClose: options.onClose || function() {},
        onError: options.onError || function() {},
        autoReconnect: options.autoReconnect !== undefined ? options.autoReconnect : true,
        reconnectInterval: options.reconnectInterval || 5000,
        maxReconnectAttempts: options.maxReconnectAttempts !== undefined ? options.maxReconnectAttempts : 5, // 0 para ilimitado
        debug: options.debug || false,
      };
  
      if (this.config.debug) {
        console.log('[WS Client] SimpleWebSocketClient inicializado con URL:', this.url, 'y opciones:', this.config);
      }
    }
  
    _log(message, ...args) {
      if (this.config.debug) {
        console.log(`[WS Client] ${message}`, ...args);
      }
    }
  
    connect(config) {
      this.config = { ...this.config, ...config };
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this._log('Ya conectado o conectando.');
        return;
      }
  
      this._log('Intentando conectar a:', this.url);
      try {
        this.ws = new WebSocket(this.url);
      } catch (error) {
          this._log('Error al crear instancia de WebSocket:', error);
          this.config.onError(error); // Notificar error al usuario
          if (this.config.autoReconnect) {
              this._handleReconnect();
          }
          return;
      }
  
  
      this.ws.onopen = (event) => {
        this.isConnected = true;
        this.reconnectAttempts = 0; // Resetear intentos al conectar exitosamente
        this._log('Conexión WebSocket abierta.');
        this.config.onOpen(event);
      };
  
      this.ws.onmessage = (event) => {
        let data = event.data;
        try {
          data = JSON.parse(event.data);
          this._log('Mensaje recibido (JSON):', data);
        } catch (e) {
          this._log('Mensaje recibido (texto plano):', event.data);
        }
        this.config.onMessage(data, event);
      };
  
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this._log(`Conexión WebSocket cerrada. Código: ${event.code}, Razón: "${event.reason}", ¿Fue limpia?: ${event.wasClean}`);
        this.config.onClose(event);
        
        // Solo reconectar si no fue un cierre intencional (ej. por llamar a .close())
        // y si autoReconnect está habilitado.
        // Un código de cierre 1000 (Normal Closure) o 1005 (No Status Rcvd, pero a menudo después de un close() del cliente)
        // podrían indicar un cierre intencional o no requerir reconexión.
        // Sin embargo, es más simple reconectar a menos que wasClean sea true y el código sea 1000.
        // Si el servidor cierra la conexión, event.wasClean podría ser false.
        if (this.config.autoReconnect && event.code !== 1000) { // No reconectar en cierre normal explícito
          this._handleReconnect();
        } else {
           this.ws = null; // Limpiar la instancia si no se reconecta
        }
      };
  
      this.ws.onerror = (event) => {
        this._log('Error en WebSocket:', event);
        this.config.onError(event);
        // onClose se llamará después de un error que cierre la conexión,
        // así que la lógica de reconexión se manejará allí.
      };
    }
  
    _handleReconnect() {
      if (this.config.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        this._log(`Máximo de ${this.config.maxReconnectAttempts} intentos de reconexión alcanzado. Deteniendo.`);
        this.ws = null; // Limpiar instancia si no se reconecta más
        return;
      }
  
      this.reconnectAttempts++;
      this._log(`Intentando reconectar en ${this.config.reconnectInterval / 1000}s... (Intento ${this.reconnectAttempts})`);
      
      // Asegurarse de limpiar la instancia anterior antes de reintentar
      if (this.ws) {
          // Remover listeners para evitar múltiples handlers en la instancia antigua si sobrevive de alguna forma
          this.ws.onopen = null;
          this.ws.onmessage = null;
          this.ws.onclose = null;
          this.ws.onerror = null;
          // Forzar cierre si no está cerrado ya, aunque onclose debería haberlo limpiado.
          if (this.ws.readyState !== WebSocket.CLOSED) {
              this.ws.close();
          }
          this.ws = null;
      }
  
  
      setTimeout(() => {
        this.connect();
      }, this.config.reconnectInterval);
    }
  
    /**
     * Envía datos al servidor WebSocket.
     * @param {string|object} data Los datos a enviar. Si es un objeto, se convertirá a JSON.
     */
    send(data) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this._log('No se puede enviar mensaje: WebSocket no conectado o no abierto.');
        // Opcional: encolar mensajes para enviar cuando se reconecte
        return false;
      }
  
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.ws.send(message);
        this._log('Mensaje enviado:', message);
        return true;
      } catch (error) {
        this._log('Error al enviar mensaje:', error);
        this.config.onError(error); // Podría ser un error de serialización JSON
        return false;
      }
    }
  
    /**
     * Cierra la conexión WebSocket.
     * @param {number} [code=1000] Código de cierre opcional.
     * @param {string} [reason] Razón de cierre opcional.
     */
    close(code = 1000, reason = 'Cierre manual por cliente') {
      if (!this.ws) {
        this._log('No hay conexión WebSocket para cerrar.');
        return;
      }
      this._log(`Cerrando conexión WebSocket con código ${code} y razón "${reason}"`);
      this.config.autoReconnect = false; // Deshabilitar reconexión en cierre manual
      this.ws.close(code, reason);
      // El evento 'onclose' se encargará de poner this.isConnected = false y this.ws = null
    }
  
    /**
     * Verifica si el WebSocket está actualmente conectado y abierto.
     * @returns {boolean}
     */
    isOpen() {
      return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
  }
const wsClient = new SimpleWebSocketClient(wsUrl);
export default wsClient;
  // Ejemplo de uso (puedes poner esto en tu archivo HTML dentro de <script> o en otro JS):
  /*
  document.addEventListener('DOMContentLoaded', () => {
    const wsUrl = 'ws://localhost:3000/ws';
    const client = new SimpleWebSocketClient(wsUrl, {
      debug: true,
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      onOpen: (event) => {
        console.log('CALLBACK: Conexión establecida!', event);
        client.send({ type: 'greeting', message: 'Hola desde el cliente!' });
      },
      onMessage: (data, event) => {
        console.log('CALLBACK: Mensaje recibido del servidor:', data);
        // Manejar el mensaje, por ejemplo, actualizar la UI
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
          const p = document.createElement('p');
          p.textContent = `Servidor: ${typeof data === 'object' ? JSON.stringify(data) : data}`;
          messagesDiv.appendChild(p);
        }
      },
      onClose: (event) => {
        console.warn('CALLBACK: Conexión cerrada.', event.code, event.reason);
      },
      onError: (error) => {
        console.error('CALLBACK: Error de WebSocket:', error);
      }
    });
  
    client.connect(); // Iniciar la conexión
  
    // Para interactuar desde la consola del navegador:
    window.wsClient = client; 
    // Luego puedes usar:
    // window.wsClient.send("Hola servidor!");
    // window.wsClient.send({ comando: "status" });
    // window.wsClient.close();
    // window.wsClient.connect(); // para reconectar manualmente si autoReconnect está off o falló
  
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    if (sendButton && messageInput) {
      sendButton.addEventListener('click', () => {
        const message = messageInput.value;
        if (message) {
          client.send(message);
          messageInput.value = '';
        }
      });
    }
  });
  */
  
  // Si estás usando módulos ES6, puedes exportarla:
  // export default SimpleWebSocketClient;