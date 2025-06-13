class UserInteractionManager {
    private hasInteracted: boolean = false;
    private callbacks: (() => void | Promise<void>)[] = [];
    private interactionEvents: string[] = [
      'click',
      'keydown',
      'keyup',
      'mousedown',
      'mouseup',
      'touchstart',
      'touchend',
      'pointerdown',
      'pointerup'
    ];
  
    constructor() {
      this.setupListeners();
    }
  
    /**
     * Configura los listeners para detectar la primera interacción
     */
    private setupListeners(): void {
      const handleFirstInteraction = () => {
        if (!this.hasInteracted) {
          this.hasInteracted = true;
          this.executeCallbacks();
          this.removeListeners();
        }
      };
  
      // Agregar listeners para todos los eventos de interacción
      this.interactionEvents.forEach(event => {
        document.addEventListener(event, handleFirstInteraction, { 
          once: true, 
          passive: true 
        });
      });
    }
  
    /**
     * Remueve todos los listeners una vez que se detecta la primera interacción
     */
    private removeListeners(): void {
      this.interactionEvents.forEach(event => {
        document.removeEventListener(event, () => {});
      });
    }
  
    /**
     * Ejecuta todos los callbacks registrados
     */
    private async executeCallbacks(): Promise<void> {
      for (const callback of this.callbacks) {
        try {
          await callback();
        } catch (error) {
          console.error('Error ejecutando callback de interacción:', error);
        }
      }
      
      // Limpiar callbacks después de ejecutarlos
      this.callbacks = [];
    }
  
    /**
     * Registra un callback para ejecutar cuando el usuario interactúe
     * @param callback Función a ejecutar
     */
    public onUserInteraction(callback: () => void | Promise<void>): void {
      if (this.hasInteracted) {
        // Si ya hubo interacción, ejecutar inmediatamente
        callback();
      } else {
        // Si no, agregar a la lista de callbacks
        this.callbacks.push(callback);
      }
    }
  
    /**
     * Verifica si el usuario ya ha interactuado
     */
    public get userHasInteracted(): boolean {
      return this.hasInteracted;
    }
  
    /**
     * Método para forzar la ejecución de callbacks (útil para testing)
     */
    public forceInteraction(): void {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.executeCallbacks();
        this.removeListeners();
      }
    }
  }
  
  // Instancia global del manager
  const userInteractionManager = new UserInteractionManager();
  
  // Funciones helper para facilitar el uso
  export const onUserInteraction = (callback: () => void | Promise<void>): void => {
    userInteractionManager.onUserInteraction(callback);
  };
  
  export const hasUserInteracted = (): boolean => {
    return userInteractionManager.userHasInteracted;
  };
  
  // Ejemplo de uso específico para videos
  export const playVideoOnInteraction = (video: HTMLVideoElement): void => {
    onUserInteraction(async () => {
      try {
        await video.play();
        console.log('Video reproducido después de interacción del usuario');
      } catch (error) {
        console.error('Error al reproducir video:', error);
      }
    });
  };
  
  // Ejemplo de uso específico para audio
  export const playAudioOnInteraction = (audio: HTMLAudioElement): void => {
    onUserInteraction(async () => {
      try {
        await audio.play();
        console.log('Audio reproducido después de interacción del usuario');
      } catch (error) {
        console.error('Error al reproducir audio:', error);
      }
    });
  };
  
  // Ejemplo de uso múltiple
  export const setupAutoplayElements = (): void => {
    // Configurar todos los videos
    const videos = document.querySelectorAll('video[data-autoplay]');
    videos.forEach((video) => {
      playVideoOnInteraction(video as HTMLVideoElement);
    });
  
    // Configurar todos los audios
    const audios = document.querySelectorAll('audio[data-autoplay]');
    audios.forEach((audio) => {
      playAudioOnInteraction(audio as HTMLAudioElement);
    });
  };
  
  // Exportar la clase para uso avanzado
  export { UserInteractionManager };
  
  // Ejemplos de uso:
  
  /*
    import { onUserInteraction } from "@utils/user/userInt"
  // Uso básico
  onUserInteraction(() => {
    console.log('Usuario interactuó por primera vez!');
  });
  
  // Uso con video
  const video = document.getElementById('myVideo') as HTMLVideoElement;
  playVideoOnInteraction(video);
  
  // Uso con múltiples callbacks
  onUserInteraction(async () => {
    const video = document.getElementById('video1') as HTMLVideoElement;
    await video.play();
  });
  
  onUserInteraction(() => {
    // Iniciar animaciones
    document.body.classList.add('user-active');
  });
  
  // Uso con verificación
  if (!hasUserInteracted()) {
    console.log('Esperando interacción del usuario...');
  }
  
  // Configuración automática
  setupAutoplayElements();
  */