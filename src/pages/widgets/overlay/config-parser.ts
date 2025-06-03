
// src/components/widgets/overlay/config-parser.ts
import type { UrlOverlayConfig, AnimationType } from './types.ts';

export class ConfigParser {
  static getOverlayConfigFromUrl(): UrlOverlayConfig | null {
    const urlParams = new URLSearchParams(window.location.search);
    const configParam = urlParams.get('config');

    if (configParam) {
      try {
        const decodedConfig = decodeURIComponent(configParam);
        const parsedConfig: UrlOverlayConfig = JSON.parse(decodedConfig);
        
        if (this.validateConfig(parsedConfig)) {
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

  static getAnimationFromUrl(): AnimationType {
    const urlParams = new URLSearchParams(window.location.search);
    const animation = urlParams.get('animation') as AnimationType;
    
    const validAnimations: AnimationType[] = [
      'fadeIn', 'slideInFromTop', 'slideInFromBottom', 'slideInFromLeft', 
      'slideInFromRight', 'zoomIn', 'rotateIn', 'bounceIn', 'flipInX', 'flipInY'
    ];

    return validAnimations.includes(animation) ? animation : 'fadeIn';
  }

  private static validateConfig(config: UrlOverlayConfig): boolean {
    return config && 
           config.actionData &&
           typeof config.actionData.src === 'string' &&
           typeof config.actionData.context === 'string' &&
           typeof config.actionData.duration === 'number' &&
           typeof config.actionData.check === 'boolean';
  }
}
