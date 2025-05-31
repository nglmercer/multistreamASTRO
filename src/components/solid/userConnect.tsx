// UserProfile.tsx
import { createSignal, createEffect, onMount } from 'solid-js';
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
  onMount(() => {
    initializeState();
  });

  // Efecto para actualizar la plataforma cuando cambie la prop
  createEffect(() => {
    if (props.platform && props.platform !== state.platform) {
      setPlatform(props.platform as UserProfileState['platform']);
    }
  });

  // Save to localStorage when state changes (with debouncing)
  createEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage();
      updateGroupElements();
    }, 100); // Pequeño delay para evitar múltiples saves

    return () => clearTimeout(timeoutId);
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
    const username = inputValue().trim();
    if (username) {
      connect(username);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    setInputValue(value);
    // Solo actualizar el username en el estado si no está conectado
    if (!state.connected) {
      setState('username', value);
    }
  };

  const connect = (username: string) => {
    console.log('Connecting with username:', username);
    
    // Actualizar estado de forma batch para evitar renders múltiples
    setState(prevState => ({
      ...prevState,
      connected: true,
      username: username,
      connectionStatus: 'online' as const
    }));
    
    // Ejecutar callback después de que el estado se haya actualizado
    setTimeout(() => {
      try {
        props.onUserConnected?.({ 
          username: username, 
          state: { ...state, connected: true, username, connectionStatus: 'online' } 
        });
        console.log('onUserConnected callback executed');
      } catch (error) {
        console.error('Error executing onUserConnected callback:', error);
      }
    }, 0);
  };

  const disconnect = () => {
    console.log('Disconnecting...');
    
    // Actualizar estado de forma batch
    setState(prevState => ({
      ...prevState,
      connected: false,
      connectionStatus: 'offline' as const
    }));
    
    // Ejecutar callback después de que el estado se haya actualizado
    setTimeout(() => {
      try {
        props.onUserDisconnected?.();
        console.log('onUserDisconnected callback executed');
      } catch (error) {
        console.error('Error executing onUserDisconnected callback:', error);
      }
    }, 0);
  };

  const setPlatform = (platform: UserProfileState['platform']) => {
    if (platformThemes[platform]) {
      setState('platform', platform);
    } else {
      console.warn(`UserProfile: Platform "${platform}" not recognized.`);
    }
  };

  const setConnectionStatus = (status: UserProfileState['connectionStatus']) => {
    setState(prevState => ({
      ...prevState,
      connectionStatus: status,
      connected: status !== 'offline'
    }));
    
    setTimeout(() => {
      try {
        props.onConnectionStatusChanged?.({ 
          status: status 
        });
        console.log('onConnectionStatusChanged callback executed');
      } catch (error) {
        console.error('Error executing onConnectionStatusChanged callback:', error);
      }
    }, 0);
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

  // Debug effect para monitorear cambios de estado
  createEffect(() => {
    console.log('State changed:', {
      connected: state.connected,
      username: state.username,
      connectionStatus: state.connectionStatus,
      platform: state.platform
    });
  });

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
          disabled={!state.connected && !inputValue().trim()}
        >
          {state.connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </div>
  );
};