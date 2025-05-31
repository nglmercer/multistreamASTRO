// types.ts
export interface PlatformTheme {
    color: string;
    hoverColor: string;
    textColor: string;
    states: {
      online: string;
      offline: string;
      away: string;
      busy: string;
    };
  }
  
  export interface UserProfileState {
    connected: boolean;
    username: string;
    imageUrl: string;
    connectionStatus: 'offline' | 'online' | 'away' | 'busy';
    platform: 'twitch' | 'youtube' | 'tiktok' | 'kick' | 'facebook';
  }
  
  export interface GroupInstance {
    state: UserProfileState;
    elements: Set<UserProfileComponent>;
  }
  
  export interface UserProfileComponent {
    setState: (state: UserProfileState) => void;
    getState: () => UserProfileState;
    id: string;
    setPlatform?: (platform: UserProfileState['platform']) => void;
    setConnectionStatus?: (status: UserProfileState['connectionStatus']) => void;
    setProfileImage?: (url: string) => void;
    connect?: (username: string) => void;
    disconnect?: () => void;
  }
  
  export interface UserProfileProps {
    minimal?: boolean;
    groupId?: string;
    platform?: 'tiktok' | 'kick' | 'youtube' | 'twitch' | 'discord' | string;
    ref?: (component: UserProfileComponent) => void;
    onUserConnected?: (data: { username: string; state: UserProfileState }) => void;
    onUserDisconnected?: () => void;
    onConnectionStatusChanged?: (data: { status: UserProfileState['connectionStatus'] }) => void;
  }