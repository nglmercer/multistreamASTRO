// UserProfile.tsx
import { createSignal, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { UserProfileProps, UserProfileState, UserProfileComponent } from './userTypes';
import { platformIcons, platformThemes } from './userconstants';
import { createInitialState, getCSSVariables } from './utils';
import { useGroupState } from './hooks';
import styles from './UserProfile.module.css';

export const UserProfile = (props: UserProfileProps) => {
  // Crear estado inicial con la plataforma especificada en props
  const initialState = createInitialState(props.platform);
  const [state, setState] = createStore<UserProfileState>(initialState);
  const [inputValue, setInputValue] = createSignal('');
  const uniqueId = Math.random().toString(36).substring(2, 9);

  // Initialize group state management
  const { initializeState, saveToLocalStorage, updateGroupElements } = useGroupState(
    props.groupId,
    state,
    setState,
    setInputValue,
    uniqueId
  );

  // Initialize on mount
  createEffect(() => {
    initializeState();
  });

  // Efecto para actualizar la plataforma cuando cambie la prop
  createEffect(() => {
    if (props.platform && props.platform !== state.platform) {
      setPlatform(props.platform as UserProfileState['platform']);
    }
  });

  // Save to localStorage when state changes
  createEffect(() => {
    saveToLocalStorage();
    updateGroupElements();
  });

  const renderProfileImage = () => {
    const usePlatformIcon = !state.imageUrl || state.imageUrl === '/favicon.svg';
    
    if (usePlatformIcon && platformIcons[state.platform]) {
      return (
        <div 
          class={`${styles.profileImage} ${styles.icon}`} 
          innerHTML={platformIcons[state.platform]} 
        />
      );
    } else {
      return (
        <img 
          class={styles.profileImage} 
          src={state.imageUrl || '/favicon.svg'} 
          alt="Profile" 
        />
      );
    }
  };

  const handleConnect = () => {
    if (inputValue().trim()) {
      connect(inputValue().trim());
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setInputValue(target.value);
    setState('username', target.value);
  };

  const connect = (username: string) => {
    setState({
      ...state,
      connected: true,
      username: username,
      connectionStatus: 'online'
    });
    
    props.onUserConnected?.({ username: state.username, state: { ...state } });
  };

  const disconnect = () => {
    setState({
      ...state,
      connected: false,
      connectionStatus: 'offline'
    });
    
    props.onUserDisconnected?.();
  };

  const setPlatform = (platform: UserProfileState['platform']) => {
    if (platformThemes[platform]) {
      setState('platform', platform);
    } else {
      console.warn(`UserProfile: Platform "${platform}" not recognized.`);
    }
  };

  const setConnectionStatus = (status: UserProfileState['connectionStatus']) => {
    setState({
      ...state,
      connectionStatus: status,
      connected: status !== 'offline'
    });
    
    props.onConnectionStatusChanged?.({ status: state.connectionStatus });
  };

  const setProfileImage = (url: string) => {
    setState('imageUrl', url || '/favicon.svg');
  };

  // Expose methods via ref
  createEffect(() => {
    if (props.ref) {
      props.ref({
        setState: (newState: any) => setState(newState),
        getState: () => state,
        id: uniqueId,
        setPlatform,
        setConnectionStatus,
        setProfileImage,
        connect,
        disconnect
      } as UserProfileComponent);
    }
  });

  const containerClasses = () => [
    styles.container,
    state.connected ? styles.connected : '',
    props.minimal ? styles.minimal : ''
  ].filter(Boolean).join(' ');

  const statusClasses = () => [
    styles.statusIndicator,
    styles[state.connectionStatus]
  ].join(' ');

  const buttonClasses = () => state.connected ? `${styles.button} ${styles.connected}` : styles.button;

  return (
    <div class={styles.userProfile}>
      <div class={containerClasses()} style={getCSSVariables(state.platform)}>
        <div class={styles.profileWrapper}>
          {renderProfileImage()}
          <div 
            class={statusClasses()}
            title={`Status: ${state.connectionStatus}`}
          />
        </div>
        <input
          class={styles.input}
          type="text"
          placeholder="Enter your name"
          value={inputValue()}
          disabled={state.connected}
          onInput={handleInputChange}
        />
        <button 
          class={buttonClasses()}
          onClick={state.connected ? handleDisconnect : handleConnect}
        >
          {state.connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </div>
  );
};