// src/components/widgets/overlay/api-manager.ts
import { taskApi } from 'src/fetch/fetchapi';
import type { ApiTask } from './types';
import { OverlayDisplay } from './overlay-display';

export function verifyandchangeHOST(){
    const searchParams1 = new URLSearchParams(window.location.search);
    console.log("searchParams1", searchParams1);
    const host = searchParams1.get('host');
    return host;
}

export class ApiManager {
  private static intervalId: number | null = null;
  private static readonly CHECK_INTERVAL = 5000; // 5 segundos
  private static isChecking = false;

  static async fetchAndDisplayNextOverlay(): Promise<void> {
    // Evitar múltiples llamadas simultáneas
    if (this.isChecking) {
      console.log("Ya se está verificando tareas, esperando...");
      return;
    }
    const host = verifyandchangeHOST();
    if (host) {
      taskApi.changeHost(host);
      console.log("host cambiado", host);
    }
    this.isChecking = true;
    console.log("Buscando tareas de overlay...");

    try {
      const tasks: ApiTask[] = await taskApi.getTasks("overlay");
      console.log("Tareas de overlay obtenidas:", tasks);

      if (!Array.isArray(tasks)) {
        console.error("La API no devolvió un array de tareas.",tasks);
        OverlayDisplay.showError("Error: Respuesta inesperada de la API.");
        this.startPolling(); // Continuar verificando
        return;
      }

      if (tasks.length > 0) {
        tasks.forEach(task => {
          console.log(task);
          if (task.actionData && typeof task.actionData.check === 'string') {
            try {
              JSON.parse(task.actionData.check);
            } catch (parseError) {
              console.error("Error al parsear actionData.check:", parseError);
            }
          }
        });
      }

      const nextTask = tasks.find(task => !task.completed && task.actionData && task.actionData.check);

      if (nextTask) {
        console.log("Mostrando la siguiente tarea de overlay:", nextTask);
        
        // Detener el polling mientras se muestra el overlay
        this.stopPolling();
        
        await OverlayDisplay.display(nextTask.actionData, async () => {
          console.log(`Overlay para tarea ${nextTask.id} completado.`);
          try {
            await taskApi.completeTask("overlay", nextTask.id, true);
            console.log(`Tarea ${nextTask.id} marcada como completada.`);
            
            // Buscar la siguiente tarea inmediatamente después de completar
            setTimeout(() => {
              this.fetchAndDisplayNextOverlay();
            }, 500); // Pequeña pausa antes de buscar la siguiente
            
          } catch (error) {
            console.error(`Error al marcar la tarea ${nextTask.id} como completada:`, error);
            // En caso de error, reiniciar el polling
            this.startPolling();
          }
        });
      } else {
        console.log("No hay tareas de overlay activas pendientes.");
        // No hay tareas, iniciar polling
        this.startPolling();
      }

    } catch (error) {
      console.error("Error al obtener o procesar tareas de overlay:", error);
      OverlayDisplay.showError("Error al cargar overlays desde la API.");
      // En caso de error, continuar verificando
      this.startPolling();
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Inicia el polling para verificar tareas periódicamente
   */
  private static startPolling(): void {
    // Si ya hay un intervalo corriendo, no crear otro
    if (this.intervalId !== null) {
      console.log("El polling ya está activo");
      return;
    }

    console.log(`Iniciando polling cada ${this.CHECK_INTERVAL}ms`);
    this.intervalId = window.setInterval(() => {
      console.log("Verificando tareas por polling...");
      this.fetchAndDisplayNextOverlay();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Detiene el polling
   */
  private static stopPolling(): void {
    if (this.intervalId !== null) {
      console.log("Deteniendo polling");
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Inicia el sistema de gestión de overlays
   */
  static start(): void {
    console.log("Iniciando ApiManager...");
    this.fetchAndDisplayNextOverlay();
  }

  /**
   * Detiene completamente el sistema
   */
  static stop(): void {
    console.log("Deteniendo ApiManager...");
    this.stopPolling();
    this.isChecking = false;
  }

  /**
   * Reinicia el sistema (útil para debug o reconfiguración)
   */
  static restart(): void {
    console.log("Reiniciando ApiManager...");
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  static async createTestOverlayTask(): Promise<void> {
    const testOverlayData = {
      "overlay": {
        "src": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        "context": "Este es un overlay de prueba desde API",
        "duration": 7,
        "check": true,
        "volumen": 30
      }
    };

    try {
      const result = await taskApi.saveTasks("overlay", testOverlayData);
      console.log("Tarea de overlay de prueba guardada:", result);
      
      // Si no hay polling activo, iniciar inmediatamente
      if (this.intervalId === null && !this.isChecking) {
        this.fetchAndDisplayNextOverlay();
      }
      
    } catch (error) {
      console.error("Error al guardar la tarea de prueba:", error);
    }
  }

  /**
   * Método para cambiar el intervalo de polling
   */
  static setPollingInterval(milliseconds: number): void {
    const wasPolling = this.intervalId !== null;
    this.stopPolling();
    
    // Cambiar el intervalo (requiere reiniciar)
    (this as any).CHECK_INTERVAL = milliseconds;
    
    if (wasPolling) {
      this.startPolling();
    }
  }

  /**
   * Obtiene el estado actual del manager
   */
  static getStatus(): { isPolling: boolean; isChecking: boolean; interval: number } {
    return {
      isPolling: this.intervalId !== null,
      isChecking: this.isChecking,
      interval: this.CHECK_INTERVAL
    };
  }
}