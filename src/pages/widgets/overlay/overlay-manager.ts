// src/components/widgets/overlay/overlay-manager.ts - Archivo principal
import { ConfigParser } from './config-parser';
import { OverlayDisplay } from './overlay-display';
import { ApiManager } from './api-manager';

export function initOverlaySystem(): void {
  const urlConfig = ConfigParser.getOverlayConfigFromUrl();

  if (urlConfig) {
    console.log("Mostrando overlay desde configuración URL:", urlConfig);
    OverlayDisplay.display(urlConfig.actionData, () => {
      console.log("Overlay desde URL finalizado.");
    });
  } else {
    ApiManager.fetchAndDisplayNextOverlay();
  }

  // Exponer función de prueba a la consola
  (window as any).createTestOverlayTask = ApiManager.createTestOverlayTask;
}

// Exportar todas las clases para uso externo si es necesario
export {
  ConfigParser,
  OverlayDisplay,
  ApiManager
};