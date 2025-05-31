// UserProfile.tsx
import { createSignal, createEffect, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { UserProfileProps, UserProfileState, UserProfileComponent } from './userTypes';
import { platformIcons, platformThemes } from './userconstants';
import { createInitialState, getCSSVariables } from './utils';
import { useGroupState } from './hooks';
import styles from './UserProfile.module.css';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
const logger = new BrowserLogger('solidjs')
  .setPrefix('SOLIDJS')
  .enableDebug()
  .setLevel(LogLevel.DEBUG);
export const UserProfile = (props: UserProfileProps) => {
  // Crear estado inicial con la plataforma especificada en props
  const initialState = createInitialState(props.platform);
  const [state, setState] = createStore<UserProfileState>(initialState);
  const [inputValue, setInputValue] = createSignal('');
  const [isConnecting, setIsConnecting] = createSignal(false);
  
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
    }, 100);

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

  // Función para actualizar el estado completo
  const updateConnectionState = (newState: Partial<UserProfileState>) => {
    logger.log('Updating connection state:', newState);
    setState(prev => ({ ...prev, ...newState }));
    
    // Ejecutar callbacks apropiados
    if (newState.connectionStatus) {
      props.onConnectionStatusChanged?.({ status: newState.connectionStatus });
    }
  };

  const handleConnect = async () => {
    const username = inputValue().trim();
    if (!username || isConnecting() || state.connected) {
      logger.log('Connect blocked:', { username: !!username, isConnecting: isConnecting(), connected: state.connected });
      return;
    }

    logger.log('Starting connection process for:', username);
    setIsConnecting(true);
    
    // Cambiar a estado "busy/connecting"
    updateConnectionState({
      connectionStatus: 'busy'
    });

    try {
      await connect(username);
    } catch (error) {
      console.error('Connection failed:', error);
      updateConnectionState({
        connected: false,
        connectionStatus: 'offline'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Función para manejar el click del botón principal
  const handleButtonClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    logger.log('Button clicked - Current state:', { 
      connected: state.connected, 
      connectionStatus: state.connectionStatus,
      isConnecting: isConnecting()
    });
    
    if (state.connected) {
        disconnect();
    } else {
      handleConnect();
    }
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

  const connect = async (username: string) => {
    logger.log('=== CONNECT START ===');
    logger.log('Executing connect for username:', username);
    logger.log('Current state before connect:', { connected: state.connected, status: state.connectionStatus });
    
    // Simular conexión async (reemplaza con tu lógica real)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Actualizar a estado conectado
    const newState = {
      connected: true,
      username: username,
      connectionStatus: 'online' as const
    };
    
    logger.log('Updating state to connected:', newState);
    updateConnectionState(newState);

    // Ejecutar callback de conexión exitosa
    try {
      props.onUserConnected?.({ 
        username: username, 
        state: { ...state, ...newState }
      });
    } catch (error) {
      console.error('Error in onUserConnected callback:', error);
    }
    
    logger.log('=== CONNECT END ===');
  };

  const disconnect = () => {
    logger.log('=== DISCONNECT START ===');
    logger.log('Executing disconnect');
    logger.log('Current state before disconnect:', { connected: state.connected, status: state.connectionStatus });
    
    // Actualizar inmediatamente a estado desconectado
    const newState = {
      connected: false,
      connectionStatus: 'offline' as const
    };
    
    logger.log('Updating state to disconnected:', newState);
    updateConnectionState(newState);

    // Ejecutar callback de desconexión
    try {
      props.onUserDisconnected?.();
    } catch (error) {
      console.error('Error in onUserDisconnected callback:', error);
    }
    
    logger.log('=== DISCONNECT END ===');
  };

  const setPlatform = (platform: UserProfileState['platform']) => {
    if (platformThemes[platform]) {
      setState('platform', platform);
    } else {
      console.warn(`UserProfile: Platform "${platform}" not recognized.`);
    }
  };

  const setConnectionStatus = (status: UserProfileState['connectionStatus']) => {
    logger.log('Setting connection status to:', status);
    updateConnectionState({
      connectionStatus: status,
      connected: status !== 'offline'
    });
  };

  const setProfileImage = (url: string) => {
    setState('imageUrl', url || '/favicon.svg');
  };

  // Expose methods via ref
  createEffect(() => {
    if (props.ref) {
      props.ref({
        setState: (newState: Partial<UserProfileState>) => {
          updateConnectionState(newState);
        },
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
    state.connected ? styles.connected : styles.disconnected,
    props.minimal ? styles.minimal : ''
  ].filter(Boolean).join(' ');

  const statusClasses = () => [
    styles.statusIndicator,
    styles[state.connectionStatus]
  ].join(' ');

  const buttonClasses = () => {
    if (state.connected) {
      return `${styles.button} ${styles.connected}`;
    } else if (isConnecting()) {
      return `${styles.button} ${styles.connecting}`;
    } else {
      return styles.button;
    }
  };

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = () => {
    if (isConnecting()) {
      return true; // Siempre deshabilitado mientras conecta
    }
    
    if (state.connected) {
      return false; // Disconnect siempre habilitado cuando está conectado
    } else {
      return inputValue().trim().length === 0; // Connect solo habilitado con input válido
    }
  };

  // Texto del botón según el estado
  const getButtonText = () => {
    if (isConnecting()) {
      return 'Connecting...';
    }
    return state.connected ? 'Disconnect' : 'Connect';
  };

  // Debug effect para monitorear cambios de estado
  createEffect(() => {
    logger.log('=== STATE CHANGE ===');
    logger.log('Connected:', state.connected);
    logger.log('Username:', state.username);
    logger.log('Connection Status:', state.connectionStatus);
    logger.log('Platform:', state.platform);
    logger.log('Input Value:', inputValue());
    logger.log('Is Connecting:', isConnecting());
    logger.log('==================');
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
          onClick={handleButtonClick}
          disabled={isButtonDisabled()}
          type="button"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};