// src/components/widgets/overlay/animation-controller.ts
import { animate } from 'animejs'; // Cambio principal: usar named import
import type { AnimationType } from './types';

export class AnimationController {
  private static readonly ANIMATION_DURATION = 800;
  private static readonly FADE_OUT_DURATION = 500;

  static getInitialStyles(animationType: AnimationType): Partial<CSSStyleDeclaration> {
    const styles: Record<AnimationType, Partial<CSSStyleDeclaration>> = {
      fadeIn: { opacity: '0' },
      slideInFromTop: { opacity: '0', transform: 'translateY(-100px)' },
      slideInFromBottom: { opacity: '0', transform: 'translateY(100px)' },
      slideInFromLeft: { opacity: '0', transform: 'translateX(-100px)' },
      slideInFromRight: { opacity: '0', transform: 'translateX(100px)' },
      zoomIn: { opacity: '0', transform: 'scale(0.5)' },
      rotateIn: { opacity: '0', transform: 'rotate(-180deg) scale(0.8)' },
      bounceIn: { opacity: '0', transform: 'scale(0.3)' },
      flipInX: { opacity: '0', transform: 'perspective(400px) rotateX(-90deg)' },
      flipInY: { opacity: '0', transform: 'perspective(400px) rotateY(-90deg)' }
    };

    return styles[animationType] || styles.fadeIn;
  }

  static animateIn(element: HTMLElement, animationType: AnimationType): Promise<void> {
    // Aplicar estilos iniciales
    const initialStyles = this.getInitialStyles(animationType);
    Object.assign(element.style, initialStyles);

    const animations: Record<AnimationType, any> = {
      fadeIn: {
        opacity: [0, 1],
        ease: 'outQuad'
      },
      slideInFromTop: {
        opacity: [0, 1],
        y: [-100, 0],
        ease: 'outBack'
      },
      slideInFromBottom: {
        opacity: [0, 1],
        y: [100, 0],
        ease: 'outBack'
      },
      slideInFromLeft: {
        opacity: [0, 1],
        x: [-100, 0],
        ease: 'outBack'
      },
      slideInFromRight: {
        opacity: [0, 1],
        x: [100, 0],
        ease: 'outBack'
      },
      zoomIn: {
        opacity: [0, 1],
        scale: [0.5, 1],
        ease: 'outBack'
      },
      rotateIn: {
        opacity: [0, 1],
        rotate: [-180, 0],
        scale: [0.8, 1],
        ease: 'outBack'
      },
      bounceIn: {
        opacity: [0, 1],
        scale: [0.3, 1],
        ease: 'outBounce'
      },
      flipInX: {
        opacity: [0, 1],
        rotateX: [-90, 0],
        ease: 'outBack'
      },
      flipInY: {
        opacity: [0, 1],
        rotateY: [-90, 0],
        ease: 'outBack'
      }
    };

    // En V4, animate() retorna una promesa directamente con .then()
    return animate(element, {
      duration: this.ANIMATION_DURATION,
      ...animations[animationType]
    }).then(() => {});
  }

  static animateOut(element: HTMLElement): Promise<void> {
    // En V4, animate() retorna una promesa directamente con .then()
    return animate(element, {
      opacity: 0,
      scale: 0.95,
      duration: this.FADE_OUT_DURATION,
      ease: 'inQuad'
    }).then(() => {});
  }

  static animateMediaElement(mediaElement: HTMLElement, animationType: AnimationType): void {
    // Animación adicional para el elemento de media
    const mediaAnimations: Record<AnimationType, any> = {
      fadeIn: {
        opacity: [0, 1],
        delay: 200
      },
      slideInFromTop: {
        opacity: [0, 1],
        y: [-30, 0], // Cambio: translateY -> y
        delay: 300
      },
      slideInFromBottom: {
        opacity: [0, 1],
        y: [30, 0], // Cambio: translateY -> y
        delay: 300
      },
      slideInFromLeft: {
        opacity: [0, 1],
        x: [-30, 0], // Cambio: translateX -> x
        delay: 300
      },
      slideInFromRight: {
        opacity: [0, 1],
        x: [30, 0], // Cambio: translateX -> x
        delay: 300
      },
      zoomIn: {
        opacity: [0, 1],
        scale: [0.8, 1],
        delay: 200
      },
      rotateIn: {
        opacity: [0, 1],
        rotate: [-45, 0],
        delay: 300
      },
      bounceIn: {
        opacity: [0, 1],
        scale: [0.5, 1],
        delay: 200,
        ease: 'outBounce'
      },
      flipInX: {
        opacity: [0, 1],
        rotateX: [-45, 0],
        delay: 300
      },
      flipInY: {
        opacity: [0, 1],
        rotateY: [-45, 0],
        delay: 300
      }
    };

    animate(mediaElement, {
      duration: 600,
      ease: 'outQuad',
      ...mediaAnimations[animationType]
    });
  }
}