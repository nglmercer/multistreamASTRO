// groupStore.ts
import { createStore } from 'solid-js/store';
import type { UserProfileState, UserProfileProps } from './userTypes';

interface GroupStoreCallbacks {
  onUserConnected?: (data: { username: string; state: UserProfileState }) => void;
  onUserDisconnected?: () => void;
  onConnectionStatusChanged?: (data: { status: UserProfileState['connectionStatus'] }) => void;
}

// Store global para manejar estados de grupos
const groupStores = new Map<string, {
  store: UserProfileState;
  setStore: (update: Partial<UserProfileState> | ((prev: UserProfileState) => UserProfileState)) => void;
  subscribers: Set<() => void>;
  callbacks: GroupStoreCallbacks;
  componentCount: number;
}>();

export function createGroupStore(
  groupId: string, 
  initialState: UserProfileState,
  callbacks?: GroupStoreCallbacks
) {
  if (groupStores.has(groupId)) {
    const existingStore = groupStores.get(groupId)!;
    // Incrementar contador de componentes
    existingStore.componentCount++;
    
    // Actualizar callbacks si se proporcionan nuevos
    if (callbacks) {
      existingStore.callbacks = { ...existingStore.callbacks, ...callbacks };
    }
    
    return existingStore;
  }

  // Intentar cargar estado guardado
  const savedState = loadStateFromStorage(groupId);
  const finalInitialState = savedState ? { ...initialState, ...savedState } : initialState;
  
  const [store, setStore] = createStore<UserProfileState>(finalInitialState);
  const subscribers = new Set<() => void>();

  const groupStore = {
    store,
    setStore: (update: Partial<UserProfileState> | ((prev: UserProfileState) => UserProfileState)) => {
      const prevState = { ...store };
      setStore(update);
      
      // Guardar en localStorage después de cada cambio
      saveStateToStorage(groupId, store);
      
      // Ejecutar callbacks centralizados SOLO UNA VEZ por grupo
      executeCallbacks(prevState, store, groupStore.callbacks);
      
      // Notificar a todos los suscriptores
      subscribers.forEach(callback => callback());
    },
    subscribers,
    callbacks: callbacks || {},
    componentCount: 1
  };

  groupStores.set(groupId, groupStore);
  return groupStore;
}

export function getGroupStore(groupId: string) {
  return groupStores.get(groupId);
}

export function deleteGroupStore(groupId: string) {
  const store = groupStores.get(groupId);
  if (store) {
    store.componentCount--;
    
    // Solo eliminar el store si no hay más componentes usándolo
    if (store.componentCount <= 0) {
      groupStores.delete(groupId);
    }
  }
}

function executeCallbacks(
  prevState: UserProfileState, 
  newState: UserProfileState, 
  callbacks: GroupStoreCallbacks
) {
  // Solo ejecutar callbacks si hay cambios relevantes
  
  // Callback para cambio de estado de conexión
  if (prevState.connectionStatus !== newState.connectionStatus && callbacks.onConnectionStatusChanged) {
    try {
      callbacks.onConnectionStatusChanged({ status: newState.connectionStatus });
    } catch (error) {
      console.error('Error in onConnectionStatusChanged callback:', error);
    }
  }
  
  // Callback para conexión exitosa
  if (!prevState.connected && newState.connected && callbacks.onUserConnected) {
    try {
      callbacks.onUserConnected({ 
        username: newState.username, 
        state: newState 
      });
    } catch (error) {
      console.error('Error in onUserConnected callback:', error);
    }
  }
  
  // Callback para desconexión
  if (prevState.connected && !newState.connected && callbacks.onUserDisconnected) {
    try {
      callbacks.onUserDisconnected();
    } catch (error) {
      console.error('Error in onUserDisconnected callback:', error);
    }
  }
}

function loadStateFromStorage(groupId: string): Partial<UserProfileState> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(`userProfileState_${groupId}`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load state from storage:', e);
    return null;
  }
}

function saveStateToStorage(groupId: string, state: UserProfileState) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`userProfileState_${groupId}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to storage:', e);
  }
}