// userTypes.ts
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
    setState: (state: Partial<UserProfileState>) => void; // Cambiado a Partial
    getState: () => UserProfileState;
    id: string;
    setPlatform?: (platform: UserProfileState['platform']) => void;
    setConnectionStatus?: (status: UserProfileState['connectionStatus']) => void;
    setProfileImage?: (url: string) => void;
    connect?: (username: string) => Promise<void>;
    disconnect?: () => void; // Removido Promise ya que disconnect es inmediato
    // Funciones para controlar el estado externamente
    setConnectionSignal?: (status: UserProfileState['connectionStatus']) => void;
    getConnectionSignal?: () => UserProfileState['connectionStatus'] | null;
}

export interface UserProfileProps {
    minimal?: boolean;
    groupId?: string;
    platform?: 'tiktok' | 'kick' | 'youtube' | 'twitch' | 'facebook' | string;
    ref?: (component: UserProfileComponent) => void;
    onUserConnected?: (data: { username: string; state: UserProfileState }) => void;
    onUserDisconnected?: () => void;
    onConnectionStatusChanged?: (data: { status: UserProfileState['connectionStatus'] }) => void;
}