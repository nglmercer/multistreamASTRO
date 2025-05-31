// utils.ts
import type { UserProfileState, GroupInstance } from './userTypes';
import { platformThemes } from './userconstants';

// Global state management for grouped instances
export const groupInstances = new Map<string, GroupInstance>();

export const createInitialState = (platform?: string): UserProfileState => {
    // Usar la plataforma proporcionada o defaultear a 'twitch'
    const defaultPlatform: UserProfileState['platform'] = 'twitch';
    const selectedPlatform = platform && platformThemes[platform] 
      ? platform as UserProfileState['platform'] 
      : defaultPlatform;
  
    return {
      connected: false,
      username: '',
      imageUrl: '/favicon.svg',
      connectionStatus: 'offline',
      platform: selectedPlatform
    };
  };
  

export const hexToRgb = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return `${r}, ${g}, ${b}`;
};

export const getCSSVariables = (platform: string) => {
  const theme = platformThemes[platform] || platformThemes.tiktok;
  const mainColorRgb = hexToRgb(theme.color);
  const hoverColorRgb = hexToRgb(theme.hoverColor);

  return {
    '--platform-color': theme.color,
    '--platform-hover-color': theme.hoverColor,
    '--platform-text-color': theme.textColor,
    '--platform-shadow': `rgba(${mainColorRgb}, 0.3)`,
    '--platform-hover-shadow': `rgba(${hoverColorRgb}, 0.3)`,
    '--platform-background': `rgba(${mainColorRgb}, 0.1)`,
    '--button-gradient': `linear-gradient(135deg, ${theme.color} 0%, ${theme.hoverColor} 100%)`
  };
};