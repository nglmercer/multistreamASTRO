class Emitter {
    constructor() {
        this.listeners = new Map();
    }

    // Registra un listener que se ejecutará cada vez que se emita el evento
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push({ callback, once: false });
        // Devuelve una función para remover el listener
        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                this.listeners.set(event, listeners.filter(
                    listener => listener.callback !== callback
                ));
            }
        };
    }

    // Registra un listener que se ejecutará solo una vez
    once(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push({ callback, once: true });
        // Devuelve una función para remover el listener
        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                this.listeners.set(event, listeners.filter(
                    listener => listener.callback !== callback
                ));
            }
        };
    }

    // Emite un evento con los datos proporcionados
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const listeners = this.listeners.get(event);
        if (!listeners) return;

        // Ejecutar todos los listeners
        listeners.forEach(listener => {
            listener.callback(data);
        });

        // Filtrar los listeners de tipo "once" después de ejecutarlos
        this.listeners.set(event, listeners.filter(
            listener => !listener.once
        ));

        // Si no quedan listeners, eliminar el evento del Map
        if (this.listeners.get(event).length === 0) {
            this.listeners.delete(event);
        }
    }
}
export default Emitter;