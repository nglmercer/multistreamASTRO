// requestQueue.ts - Gestor de cola de solicitudes con limitación de frecuencia

/**
 * Clase que gestiona una cola de solicitudes con limitación de frecuencia
 * para evitar sobrecargar el servidor con muchas peticiones simultáneas.
 */
class RequestQueue {
    private queue: (() => Promise<void>)[] = [];
    private processing: boolean = false;
    private minTimeBetweenRequests: number; // en milisegundos
    private lastRequestTime: number = 0;
  
    /**
     * @param minTimeBetweenRequests Tiempo mínimo entre solicitudes en milisegundos
     */
    constructor(minTimeBetweenRequests: number = 1000) {
      this.minTimeBetweenRequests = minTimeBetweenRequests;
    }
  
    /**
     * Añade una solicitud a la cola
     * @param request Función que realiza la solicitud y devuelve una promesa
     */
    public enqueue(request: () => Promise<void>): void {
      this.queue.push(request);
      
      if (!this.processing) {
        this.processQueue();
      }
    }
  
    /**
     * Procesa las solicitudes en la cola respetando el tiempo mínimo entre ellas
     */
    private async processQueue(): Promise<void> {
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }
  
      this.processing = true;
      
      // Calcular cuánto tiempo debemos esperar antes de la próxima solicitud
      const now = Date.now();
      const timeToWait = Math.max(0, this.lastRequestTime + this.minTimeBetweenRequests - now);
      
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
  
      try {
        const request = this.queue.shift();
        if (request) {
          this.lastRequestTime = Date.now();
          await request();
        }
      } catch (error) {
        console.error("Error al procesar solicitud en la cola:", error);
      }
  
      // Continuar con la siguiente solicitud
      this.processQueue();
    }
  
    /**
     * Limpia la cola de solicitudes pendientes
     */
    public clear(): void {
      this.queue = [];
    }
  
    /**
     * Devuelve el número de solicitudes pendientes en la cola
     */
    public get pendingCount(): number {
      return this.queue.length;
    }
  }
  const taskQueue = new RequestQueue(1000);
  let updateScheduled = false;
  function scheduleUpdate(callback?: () => void) {
    if (!updateScheduled) {
      updateScheduled = true;
      
      // Esperar un corto período para agrupar múltiples eventos
      setTimeout(() => {
        // Añadir la solicitud de actualización a la cola
        taskQueue.enqueue(async () => {
          if (callback) callback();
          updateScheduled = false;
        });
      }, 300); // Esperar 300ms para ver si llegan más eventos
    }
  }
  export {
    taskQueue,
    scheduleUpdate
  }
  export default RequestQueue;