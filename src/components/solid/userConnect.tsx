// UserProfile.tsx (Fixed Event Handling)
import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { UserProfileProps, UserProfileState, UserProfileComponent } from './userTypes';
import { platformIcons, platformThemes } from './userconstants';
import { createInitialState, getCSSVariables } from './utils';
import { createGroupStore, getGroupStore, deleteGroupStore } from './groupStore';
import styles from './UserProfile.module.css';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
import { socket } from '@utils/socketManager.ts';
const logger = new BrowserLogger('userConnect.tsx')
  .setLevel(LogLevel.DEBUG);

export const UserProfile = (props: UserProfileProps) => {
  const [inputValue, setInputValue] = createSignal('');
  const [isConnecting, setIsConnecting] = createSignal(false);
  
  const uniqueId = Math.random().toString(36).substring(2, 9);

  // Si hay groupId, usar store compartido, sino crear store individual
  const initialState = createInitialState(props.platform);
  let state: UserProfileState;
  let setState: (update: Partial<UserProfileState> | ((prev: UserProfileState) => UserProfileState)) => void;
  let isSharedState = false;

  if (props.groupId) {
    // Estado compartido - SOLO pasar callbacks al primer componente del grupo
    const callbacks = {
      onUserConnected: props.onUserConnected,
      onUserDisconnected: props.onUserDisconnected,
      onConnectionStatusChanged: props.onConnectionStatusChanged
    };

    const groupStore = createGroupStore(props.groupId, initialState, callbacks);
    state = groupStore.store;
    setState = groupStore.setStore;
    isSharedState = true;

    // Suscribirse a cambios del store compartido
    onMount(() => {
      const callback = () => {
        // Sincronizar inputValue cuando el estado compartido cambie
        if (state.username !== inputValue()) {
          setInputValue(state.username || '');
        }
      };
      
      groupStore.subscribers.add(callback);
      
      // Cleanup
      onCleanup(() => {
        groupStore.subscribers.delete(callback);
        // Decrementar contador y limpiar si es necesario
        deleteGroupStore(props.groupId!);
      });
    });
  } else {
    // Estado individual (fallback al comportamiento original)
    const [individualStore, setIndividualStore] = createStore<UserProfileState>(initialState);
    state = individualStore;
    setState = (update) => {
      const prevState = { ...individualStore };
      setIndividualStore(update);
      
      // Para estado individual, ejecutar callbacks directamente
      executeIndividualCallbacks(prevState, individualStore);
    };
  }

  // Función para ejecutar callbacks en estado individual
  const executeIndividualCallbacks = (prevState: UserProfileState, newState: UserProfileState) => {
    // Callback para cambio de estado de conexión
    if (prevState.connectionStatus !== newState.connectionStatus && props.onConnectionStatusChanged) {
      try {
        props.onConnectionStatusChanged({ status: newState.connectionStatus });
      } catch (error) {
        console.error('Error in onConnectionStatusChanged callback:', error);
      }
    }
    
    // Callback para conexión exitosa
    if (!prevState.connected && newState.connected && props.onUserConnected) {
      try {
        props.onUserConnected({ 
          username: newState.username, 
          state: newState 
        });
      } catch (error) {
        console.error('Error in onUserConnected callback:', error);
      }
    }
    
    // Callback para desconexión
    if (prevState.connected && !newState.connected && props.onUserDisconnected) {
      try {
        props.onUserDisconnected();
      } catch (error) {
        console.error('Error in onUserDisconnected callback:', error);
      }
    }
  };

  // Inicializar inputValue con el username del estado
  onMount(() => {
    setInputValue(state.username || '');
  });

  // Efecto para actualizar la plataforma cuando cambie la prop
  createEffect(() => {
    if (props.platform && props.platform !== state.platform) {
      setPlatform(props.platform as UserProfileState['platform']);
    }
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

  const updateConnectionState = (newState: Partial<UserProfileState>) => {
    logger.log('Updating connection state:', newState);
    setState(prev => ({ ...prev, ...newState }));
  };

  const handleConnect = async () => {
    const username = inputValue().trim();
    if (!username || isConnecting() || state.connected) {
      logger.log('Connect blocked:', { username: !!username, isConnecting: isConnecting(), connected: state.connected });
      return;
    }

    logger.log('Starting connection process for:', username);
    setIsConnecting(true);
    
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

  const handleButtonClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Button clicked:', e);
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
      setState({'username': value});
    }
  };

  const connect = async (username: string) => {
    logger.log('=== CONNECT START ===');
    logger.log('Executing connect for username:', username);
    
    // Simular conexión async
    await new Promise(resolve => setTimeout(resolve, 1500));
    socket.emit('join-platform', { uniqueId: username, platform: state.platform });
    const newState = {
      connected: true,
      username: username,
      connectionStatus: 'online' as const
    };
    
    logger.log('Updating state to connected:', newState);
    updateConnectionState(newState);
    
    logger.log('=== CONNECT END ===');
  };

  const disconnect = () => {
    logger.log('=== DISCONNECT START ===');
    
    const newState = {
      connected: false,
      connectionStatus: 'offline' as const
    };
    
    logger.log('Updating state to disconnected:', newState);
    updateConnectionState(newState);
    
    logger.log('=== DISCONNECT END ===');
  };

  const setPlatform = (platform: UserProfileState['platform']) => {
    if (platformThemes[platform]) {
      setState({'platform': platform});
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
    setState({'imageUrl': url || '/favicon.svg'});
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

  const isButtonDisabled = () => {
    if (isConnecting()) {
      return true;
    }
    
    if (state.connected) {
      return false;
    } else {
      return inputValue().trim().length === 0;
    }
  };

  const getButtonText = () => {
    if (isConnecting()) {
      return 'Connecting...';
    }
    return state.connected ? 'Disconnect' : 'Connect';
  };

  // Debug effect
  createEffect(() => {
    logger.log('=== STATE CHANGE ===');
    logger.log('Group ID:', props.groupId);
    logger.log('Shared State:', isSharedState);
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