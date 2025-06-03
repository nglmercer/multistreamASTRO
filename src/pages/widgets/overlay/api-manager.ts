// src/components/widgets/overlay/api-manager.ts
import { taskApi } from 'src/fetch/fetchapi';
import type { ApiTask } from './types';
import { OverlayDisplay } from './overlay-display';

export class ApiManager {
  static async fetchAndDisplayNextOverlay(): Promise<void> {
    console.log("Buscando tareas de overlay...");
    try {
      const tasks: ApiTask[] = await taskApi.getTasks("overlay");
      console.log("Tareas de overlay obtenidas:", tasks);

      if (!Array.isArray(tasks)) {
        console.error("La API no devolvió un array de tareas.");
        OverlayDisplay.showError("Error: Respuesta inesperada de la API.");
        return;
      }

      if (tasks.length > 0) {
        tasks.forEach(task => {
          console.log(task);
          if (task.actionData && typeof task.actionData.check === 'string') {
            JSON.parse(task.actionData.check);
          }
        });
      }

      const nextTask = tasks.find(task => !task.completed && task.actionData && task.actionData.check);
      
      if (nextTask) {
        console.log("Mostrando la siguiente tarea de overlay:", nextTask);
        await OverlayDisplay.display(nextTask.actionData, async () => {
          console.log(`Overlay para tarea ${nextTask.id} completado.`);
          try {
            await taskApi.completeTask("overlay", nextTask.id, true);
            console.log(`Tarea ${nextTask.id} marcada como completada.`);
            // Buscar la siguiente tarea inmediatamente
            this.fetchAndDisplayNextOverlay();
          } catch (error) {
            console.error(`Error al marcar la tarea ${nextTask.id} como completada:`, error);
          }
        });
      } else {
        console.log("No hay tareas de overlay activas pendientes.", nextTask);
      }
    } catch (error) {
      console.error("Error al obtener o procesar tareas de overlay:", error);
      OverlayDisplay.showError("Error al cargar overlays desde la API.");
    }
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
      this.fetchAndDisplayNextOverlay();
    } catch (error) {
      console.error("Error al guardar la tarea de prueba:", error);
    }
  }
}