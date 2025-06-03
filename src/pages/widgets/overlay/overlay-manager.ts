// src/components/widgets/overlay/overlay-manager.ts
import { taskApi } from 'src/fetch/fetchapi'; // Ajusta esta ruta si es diferente

interface OverlayItem {
  src: string;
  context: string;
  duration: number; // en segundos
  check: boolean;
  volumen?: number; // 0-100
}

interface ApiTask {
  id: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  overlay: OverlayItem;
}

interface UrlOverlayConfig {
  overlay: OverlayItem;
}

const FADE_DURATION_MS = 500;
let currentVideoElement: HTMLVideoElement | null = null; // Para manejar el video activo

function getOverlayConfigFromUrl(): UrlOverlayConfig | null {
  const urlParams = new URLSearchParams(window.location.search);
  const configParam = urlParams.get('config');

  if (configParam) {
    try {
      const decodedConfig = decodeURIComponent(configParam);
      const parsedConfig: UrlOverlayConfig = JSON.parse(decodedConfig);

      if (parsedConfig && parsedConfig.overlay &&
          typeof parsedConfig.overlay.src === 'string' &&
          typeof parsedConfig.overlay.context === 'string' &&
          typeof parsedConfig.overlay.duration === 'number' &&
          typeof parsedConfig.overlay.check === 'boolean') {
        return parsedConfig;
      } else {
        console.error("Estructura del objeto 'overlay' (desde URL) inválida:", parsedConfig);
        return null;
      }
    } catch (error) {
      console.error("Error al parsear el objeto de configuración desde la URL:", error);
      return null;
    }
  }
  return null;
}

function displayOverlay(item: OverlayItem, onDisplayComplete: () => void) {
  if (!item.check) {
    console.log("Overlay 'check' es false. No se mostrará.");
    onDisplayComplete();
    return;
  }

  const overlayContainer = document.getElementById('overlay-container') as HTMLDivElement;
  const mediaWrapper = document.getElementById('media-wrapper') as HTMLDivElement;
  const contextTextElement = document.getElementById('context-text') as HTMLDivElement;

  if (!overlayContainer || !mediaWrapper || !contextTextElement) {
    console.error("No se encontraron los elementos del DOM necesarios.");
    onDisplayComplete();
    return;
  }

  // Detener y limpiar video anterior si existe
  if (currentVideoElement) {
    currentVideoElement.pause();
    currentVideoElement.removeAttribute('src'); // Ayuda a detener la carga y liberar recursos
    currentVideoElement.load(); // Resetea el elemento
    currentVideoElement = null;
  }
  mediaWrapper.innerHTML = ''; // Limpiar contenido previo del wrapper
  contextTextElement.textContent = item.context;

  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(item.src);
  const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(item.src);

  if (isVideo) {
    const video = document.createElement('video');
    video.src = item.src;
    video.autoplay = true;
    video.loop = false;
    video.muted = typeof item.volumen === 'number' && item.volumen === 0;
    video.volume = (typeof item.volumen === 'number' ? item.volumen : 50) / 100;
    mediaWrapper.appendChild(video);
    currentVideoElement = video; // Guardar referencia al video actual
    video.play().catch(e => console.warn("Reproducción automática de video bloqueada:", e));
  } else if (isImage) {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.context;
    mediaWrapper.appendChild(img);
  } else if (item.src) {
    console.warn(`Fuente desconocida o no soportada: ${item.src}. Mostrando solo texto.`);
  }

  overlayContainer.style.display = 'flex';
  overlayContainer.classList.add('fade-in');
  overlayContainer.classList.remove('fade-out');
  if (!item.duration || item.duration <= 0) {
      item.duration = 3;
  }
    setTimeout(() => {
      if (currentVideoElement) { // Si el overlay actual era un video, pausarlo
        currentVideoElement.pause();
      }
      overlayContainer.classList.remove('fade-in');
      overlayContainer.classList.add('fade-out');
      setTimeout(() => {
        overlayContainer.style.display = 'none';
        // Opcional: Limpiar explícitamente el mediaWrapper si es necesario,
        // aunque la próxima llamada a displayOverlay lo hará.
        // if (currentVideoElement) { // Ya no es el current, se limpia al inicio de la siguiente
        //    mediaWrapper.innerHTML = '';
        //    currentVideoElement = null;
        // }
        onDisplayComplete();
      }, FADE_DURATION_MS);
    }, item.duration * 1000);
}

async function fetchAndDisplayNextOverlay() {
  console.log("Buscando tareas de overlay...");
  try {
    const tasks: ApiTask[] = await taskApi.getTasks("overlay");
    console.log("Tareas de overlay obtenidas:", tasks);

    if (!Array.isArray(tasks)) {
      console.error("La API no devolvió un array de tareas.");
      showErrorInOverlay("Error: Respuesta inesperada de la API.");
      return;
    }

    const nextTask = tasks.find(task => !task.completed && task.overlay && task.overlay.check);

    if (nextTask) {
      console.log("Mostrando la siguiente tarea de overlay:", nextTask);
      displayOverlay(nextTask.overlay, async () => {
        console.log(`Overlay para tarea ${nextTask.id} completado.`);
        try {
          await taskApi.completeTask("overlay", nextTask.id, true);
          console.log(`Tarea ${nextTask.id} marcada como completada.`);
          // Opcional: buscar la siguiente tarea inmediatamente
        fetchAndDisplayNextOverlay(); 
        } catch (error) {
          console.error(`Error al marcar la tarea ${nextTask.id} como completada:`, error);
        }
      });
    } else {
      console.log("No hay tareas de overlay activas pendientes.");
      // showErrorInOverlay("No hay overlays pendientes.", 3000);
    }
  } catch (error) {
    console.error("Error al obtener o procesar tareas de overlay:", error);
    showErrorInOverlay("Error al cargar overlays desde la API.");
  }
}

async function createTestOverlayTask() {
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
    fetchAndDisplayNextOverlay(); // Mostrarla inmediatamente
  } catch (error) {
    console.error("Error al guardar la tarea de prueba:", error);
  }
}

function showErrorInOverlay(message: string, durationMs: number = 5000) {
  const overlayContainer = document.getElementById('overlay-container') as HTMLDivElement;
  const mediaWrapper = document.getElementById('media-wrapper') as HTMLDivElement;
  const contextTextElement = document.getElementById('context-text') as HTMLDivElement;

  if (overlayContainer && contextTextElement && mediaWrapper) {
    if (currentVideoElement) { // Detener video si se muestra error
        currentVideoElement.pause();
    }
    mediaWrapper.innerHTML = '';
    overlayContainer.style.display = 'flex';
    overlayContainer.classList.add('fade-in');
    overlayContainer.classList.remove('fade-out');
    contextTextElement.textContent = message;
    if (durationMs > 0) {
      setTimeout(() => {
        overlayContainer.classList.remove('fade-in');
        overlayContainer.classList.add('fade-out');
        setTimeout(() => {
          overlayContainer.style.display = 'none';
        }, FADE_DURATION_MS);
      }, durationMs - FADE_DURATION_MS > 0 ? durationMs - FADE_DURATION_MS : 0); // Ajustar para que la duración total sea durationMs
    }
  }
}

// Función de inicialización que se exportará
export function initOverlaySystem() {
  const urlConfig = getOverlayConfigFromUrl();

  if (urlConfig) {
    console.log("Mostrando overlay desde configuración URL:", urlConfig);
    displayOverlay(urlConfig.overlay, () => {
      console.log("Overlay desde URL finalizado.");
    });
  } else {
    fetchAndDisplayNextOverlay();
  }

  // Exponer función de prueba a la consola
  (window as any).createTestOverlayTask = createTestOverlayTask;
}