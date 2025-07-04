// src/components/widgets/overlay/types.ts
export interface OverlayItem {
  src: string;
  context: string;
  duration: number; // en segundos
  check: boolean | string;
  volumen?: number; // 0-100
}

export interface ApiTask {
  id: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  actionData: OverlayItem;
}

export interface UrlOverlayConfig {
  actionData: OverlayItem;
}

export type AnimationType = 
  | 'fadeIn' 
  | 'slideInFromTop' 
  | 'slideInFromBottom' 
  | 'slideInFromLeft' 
  | 'slideInFromRight'
  | 'zoomIn' 
  | 'rotateIn' 
  | 'bounceIn'
  | 'flipInX'
  | 'flipInY';
