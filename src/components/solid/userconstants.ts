// constants.ts
import type { PlatformTheme } from './userTypes';

export const platformIcons: Record<string, string> = {
  twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>',
  kick: '<svg viewBox="0 0 933 300" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H100V66.6667H133.333V33.3333H166.667V0H266.667V100H233.333V133.333H200V166.667H233.333V200H266.667V300H166.667V266.667H133.333V233.333H100V300H0V0ZM666.667 0H766.667V66.6667H800V33.3333H833.333V0H933.333V100H900V133.333H866.667V166.667H900V200H933.333V300H833.333V266.667H800V233.333H766.667V300H666.667V0ZM300 0H400V300H300V0ZM533.333 0H466.667V33.3333H433.333V266.667H466.667V300H533.333H633.333V200H533.333V100H633.333V0H533.333Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
};

export const platformThemes: Record<string, PlatformTheme> = {
  twitch: {
    color: '#9146FF',
    hoverColor: '#7C2BFF',
    textColor: '#FFFFFF',
    states: {
      online: 'live on Twitch!',
      offline: 'Go live on Twitch',
      away: 'Stream Paused',
      busy: 'Stream Ending Soon'
    }
  },
  youtube: {
    color: '#FF0000',
    hoverColor: '#CC0000',
    textColor: '#FFFFFF',
    states: {
      online: 'Live on YouTube!',
      offline: 'Go Live on YouTube',
      away: 'Stream Paused',
      busy: 'Ending Stream'
    }
  },
  tiktok: {
    color: '#000000',
    hoverColor: '#1a1a1a',
    textColor: '#FFFFFF',
    states: {
      online: 'Live on TikTok!',
      offline: 'Go Live on TikTok',
      away: 'Stream Paused',
      busy: 'Ending Stream'
    }
  },
  kick: {
    color: '#53FC18',
    hoverColor: '#45D614',
    textColor: '#000000',
    states: {
      online: 'live on Kick!',
      offline: 'Start live on Kick',
      away: 'Stream Paused',
      busy: 'Stream Ending Soon'
    }
  },
  facebook: {
    color: '#1877F2',
    hoverColor: '#0E5FC1',
    textColor: '#FFFFFF',
    states: {
      online: 'Live on',
      offline: 'Go Live',
      away: 'Stream Paused',
      busy: 'Ending Stream'
    }
  }
};