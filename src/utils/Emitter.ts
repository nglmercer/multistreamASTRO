type Listener = {
  callback: (data: any) => void;
  once: boolean;
};

export class Emitter {
  private listeners: Map<string, Listener[]>;
  private anyListeners: Listener[];
  private maxListeners: number;

  constructor() {
    this.listeners = new Map();
    this.anyListeners = [];
    this.maxListeners = 10;
  }

  // Registra un listener que se ejecutará cada vez que se emita el evento
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event);
    
    // Verificar límite de listeners
    if (listeners && listeners.length >= this.maxListeners) {
      console.warn(`MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${listeners.length + 1} listeners added for event "${event}". Use setMaxListeners() to increase limit.`);
    }

    listeners?.push({ callback, once: false });

    // Devuelve una función para remover el listener
    return () => {
      const currentListeners = this.listeners.get(event);
      if (currentListeners) {
        this.listeners.set(
          event,
          currentListeners.filter((listener) => listener.callback !== callback)
        );
      }
    };
  }

  // Registra un listener que se ejecutará solo una vez
  public once(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event);
    listeners?.push({ callback, once: true });

    // Devuelve una función para remover el listener
    return () => {
      const currentListeners = this.listeners.get(event);
      if (currentListeners) {
        this.listeners.set(
          event,
          currentListeners.filter((listener) => listener.callback !== callback)
        );
      }
    };
  }

  // Registra un listener que se ejecutará para cualquier evento
  public onAny(callback: (event: string, data: any) => void): () => void {
    // Guardamos el callback original para poder referenciarlo después
    const originalCallback = callback;
    const wrappedCallback = (eventAndData: { event: string; data: any }) => {
      originalCallback(eventAndData.event, eventAndData.data);
    };
    
    this.anyListeners.push({ callback: wrappedCallback, once: false });

    // Devuelve una función para remover el listener
    return () => {
      this.anyListeners = this.anyListeners.filter(
        (listener) => listener.callback !== wrappedCallback
      );
    };
  }

  // Registra un listener que se ejecutará una sola vez para cualquier evento
  public onceAny(callback: (event: string, data: any) => void): () => void {
    const originalCallback = callback;
    const wrappedCallback = (eventAndData: { event: string; data: any }) => {
      originalCallback(eventAndData.event, eventAndData.data);
    };
    
    this.anyListeners.push({ callback: wrappedCallback, once: true });

    // Devuelve una función para remover el listener
    return () => {
      this.anyListeners = this.anyListeners.filter(
        (listener) => listener.callback !== wrappedCallback
      );
    };
  }

  // Emite un evento con los datos proporcionados
  public emit(event: string, data: any): boolean {
    let hasListeners = false;

    // Ejecutar listeners específicos del evento
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      if (listeners && listeners.length > 0) {
        hasListeners = true;
        
        // Ejecutar todos los listeners
        listeners.forEach((listener) => {
          try {
            listener.callback(data);
          } catch (error) {
            console.error(`Error in listener for event "${event}":`, error);
          }
        });

        // Filtrar los listeners de tipo "once" después de ejecutarlos
        this.listeners.set(
          event,
          listeners.filter((listener) => !listener.once)
        );

        // Si no quedan listeners, eliminar el evento del Map
        if (this.listeners.get(event)?.length === 0) {
          this.listeners.delete(event);
        }
      }
    }

    // Ejecutar listeners "any"
    if (this.anyListeners.length > 0) {
      hasListeners = true;
      
      this.anyListeners.forEach((listener) => {
        try {
          // Pasar el evento y data como un objeto al callback wrapped
          listener.callback({ event, data });
        } catch (error) {
          console.error(`Error in "any" listener for event "${event}":`, error);
        }
      });

      // Filtrar los listeners "once" de anyListeners
      this.anyListeners = this.anyListeners.filter((listener) => !listener.once);
    }

    return hasListeners;
  }

  // Remueve un listener específico
  public off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      this.listeners.set(
        event,
        listeners.filter((listener) => listener.callback !== callback)
      );
      
      if (this.listeners.get(event)?.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Remueve todos los listeners de un evento específico
  public removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.anyListeners = [];
    }
  }

  // Obtiene la cantidad de listeners para un evento
  public listenerCount(event: string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  // Obtiene todos los nombres de eventos que tienen listeners
  public eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  // Establece el número máximo de listeners por evento
  public setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  // Obtiene el número máximo de listeners por evento
  public getMaxListeners(): number {
    return this.maxListeners;
  }

  // Obtiene los listeners de un evento específico
  public getListeners(event: string): ((data: any) => void)[] {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.map(l => l.callback) : [];
  }

  // Obtiene los listeners "any"
  public getAnyListeners(): ((event: string, data: any) => void)[] {
    // Esto es más complejo debido al wrapping, por ahora retornamos array vacío
    // En una implementación real, necesitarías guardar referencias a los callbacks originales
    return [];
  }

  // Prepend listener (añade al principio de la lista)
  public prependListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event);
    listeners?.unshift({ callback, once: false });

    return () => {
      const currentListeners = this.listeners.get(event);
      if (currentListeners) {
        this.listeners.set(
          event,
          currentListeners.filter((listener) => listener.callback !== callback)
        );
      }
    };
  }

  // Prepend once listener
  public prependOnceListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event);
    listeners?.unshift({ callback, once: true });

    return () => {
      const currentListeners = this.listeners.get(event);
      if (currentListeners) {
        this.listeners.set(
          event,
          currentListeners.filter((listener) => listener.callback !== callback)
        );
      }
    };
  }

  // Método para emitir de forma asíncrona
  public async emitAsync(event: string, data: any): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.emit(event, data);
        resolve(result);
      }, 0);
    });
  }

  // Método para obtener información de depuración
  public debug(): { totalEvents: number; totalListeners: number; anyListeners: number; events: Record<string, number> } {
    const events: Record<string, number> = {};
    let totalListeners = 0;

    this.listeners.forEach((listeners, event) => {
      events[event] = listeners.length;
      totalListeners += listeners.length;
    });

    return {
      totalEvents: this.listeners.size,
      totalListeners,
      anyListeners: this.anyListeners.length,
      events
    };
  }
}

export const emitter = new Emitter();
export default Emitter;