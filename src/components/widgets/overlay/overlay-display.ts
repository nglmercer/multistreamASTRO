// src/components/widgets/overlay/overlay-display.ts
import type { OverlayItem, AnimationType } from './types';
import { AnimationController } from './animation-controller';
import { MediaHandler } from './media-handler';
import { DOMManager } from './dom-manager';
import { ConfigParser } from './config-parser';

export class OverlayDisplay {
  static async display(item: OverlayItem, onDisplayComplete: () => void): Promise<void> {
    if (!item.check) {
      console.log("Overlay 'check' es false. No se mostrará.");
      onDisplayComplete();
      return;
    }

    const elements = DOMManager.getOverlayElements();
    if (!elements.isValid) {
      console.error("No se encontraron los elementos del DOM necesarios.");
      onDisplayComplete();
      return;
    }

    const { overlayContainer, mediaWrapper, contextTextElement } = elements;
    const animationType = ConfigParser.getAnimationFromUrl();

    // Limpiar contenido previo
    DOMManager.clearMediaWrapper(mediaWrapper);
    DOMManager.setContextText(contextTextElement, item.context);

    // Crear elemento de media si existe
    const mediaElement = MediaHandler.createMediaElement(item, animationType);
    if (mediaElement) {
      mediaWrapper.appendChild(mediaElement);
    }

    // Mostrar container y animar entrada
    DOMManager.showOverlayContainer(overlayContainer);
    
    try {
      await AnimationController.animateIn(overlayContainer, animationType);
      
      // Configurar duración del overlay
      const duration = item.duration && item.duration > 0 ? item.duration : 3;
      
      setTimeout(async () => {
        MediaHandler.pauseCurrentVideo();
        
        try {
          await AnimationController.animateOut(overlayContainer);
          DOMManager.hideOverlayContainer(overlayContainer);
          onDisplayComplete();
        } catch (error) {
          console.error("Error durante animación de salida:", error);
          DOMManager.hideOverlayContainer(overlayContainer);
          onDisplayComplete();
        }
      }, duration * 1000);
      
    } catch (error) {
      console.error("Error durante animación de entrada:", error);
      DOMManager.hideOverlayContainer(overlayContainer);
      onDisplayComplete();
    }
  }

  static showError(message: string, durationMs: number = 5000): void {
    const elements = DOMManager.getOverlayElements();
    if (!elements.isValid) return;

    const { overlayContainer, mediaWrapper, contextTextElement } = elements;

    MediaHandler.pauseCurrentVideo();
    DOMManager.clearMediaWrapper(mediaWrapper);
    DOMManager.showOverlayContainer(overlayContainer);
    DOMManager.setContextText(contextTextElement, message);

    // Aplicar animación de error (simple fade)
    AnimationController.animateIn(overlayContainer, 'fadeIn');

    if (durationMs > 0) {
      setTimeout(async () => {
        try {
          await AnimationController.animateOut(overlayContainer);
          DOMManager.hideOverlayContainer(overlayContainer);
        } catch (error) {
          console.error("Error durante animación de error:", error);
          DOMManager.hideOverlayContainer(overlayContainer);
        }
      }, durationMs - 500 > 0 ? durationMs - 500 : 0);
    }
  }
}
