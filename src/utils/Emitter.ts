type Listener = {
    callback: (data: any) => void;
    once: boolean;
  };
  
  export class Emitter {
    private listeners: Map<string, Listener[]>;
  
    constructor() {
      this.listeners = new Map();
    }
  
    // Registra un listener que se ejecutará cada vez que se emita el evento
    public on(event: string, callback: (data: any) => void): () => void {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      const listeners = this.listeners.get(event);
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
  
    // Emite un evento con los datos proporcionados
    public emit(event: string, data: any): void {
      if (!this.listeners.has(event)) return;
  
      const listeners = this.listeners.get(event);
      if (!listeners) return;
  
      // Ejecutar todos los listeners
      listeners.forEach((listener) => {
        listener.callback(data);
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
  
  export const emitter = new Emitter();
  export default Emitter;