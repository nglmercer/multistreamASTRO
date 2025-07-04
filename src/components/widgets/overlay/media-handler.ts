// src/components/widgets/overlay/media-handler.ts
import type { OverlayItem } from './types';
import { AnimationController } from './animation-controller';
import { verifyandchangeHOST } from './api-manager';
export class MediaHandler {
  private static currentVideoElement: HTMLVideoElement | null = null;

  static createMediaElement(item: OverlayItem, animationType: string): HTMLElement | null {
    this.cleanupCurrentVideo();

    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(item.src);
    const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(item.src);

    if (isVideo) {
      return this.createVideoElement(item, animationType);
    } else if (isImage) {
      return this.createImageElement(item, animationType);
    } else if (item.src) {
      console.warn(`Fuente desconocida o no soportada: ${item.src}. Mostrando solo texto.`);
    }

    return null;
  }

  private static createVideoElement(item: OverlayItem, animationType: string): HTMLVideoElement {
    const video = document.createElement('video');
    video.src = verifyandchangeHOST() + item.src;
    video.autoplay = true;
    video.loop = false;
    video.muted = typeof item.volumen === 'number' && item.volumen === 0;
    video.volume = (typeof item.volumen === 'number' ? item.volumen : 50) / 100;
    
    // Aplicar estilos iniciales para animación
    video.style.opacity = '0';
    
    this.currentVideoElement = video;
    
    video.play().catch(e => console.warn("Reproducción automática de video bloqueada:", e));
    
    // Animar cuando el video esté listo
    video.addEventListener('loadeddata', () => {
      AnimationController.animateMediaElement(video, animationType as any);
    });

    return video;
  }

  private static createImageElement(item: OverlayItem, animationType: string): HTMLImageElement {
    const img = document.createElement('img');
    img.src = verifyandchangeHOST() + item.src;
    img.alt = item.context;
    
    // Aplicar estilos iniciales para animación
    img.style.opacity = '0';
    
    // Animar cuando la imagen se cargue
    img.addEventListener('load', () => {
      AnimationController.animateMediaElement(img, animationType as any);
    });

    return img;
  }

  static cleanupCurrentVideo(): void {
    if (this.currentVideoElement) {
      this.currentVideoElement.pause();
      this.currentVideoElement.removeAttribute('src');
      this.currentVideoElement.load();
      this.currentVideoElement = null;
    }
  }

  static pauseCurrentVideo(): void {
    if (this.currentVideoElement) {
      this.currentVideoElement.pause();
    }
  }
}