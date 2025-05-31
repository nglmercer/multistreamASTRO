// hooks.ts
import { createEffect, onCleanup } from 'solid-js';
import type { UserProfileState, UserProfileComponent, GroupInstance } from './userTypes';
import { groupInstances, createInitialState } from './utils';

export const useGroupState = (
  groupId: string | undefined,
  state: UserProfileState,
  setState: (state: UserProfileState | ((prev: UserProfileState) => UserProfileState)) => void,
  setInputValue: (value: string) => void,
  uniqueId: string
) => {
  let componentRef: UserProfileComponent | null = null;

  const initializeState = () => {
    console.log('Initializing state for:', { groupId, uniqueId });
    
    if (groupId) {
      // Manejo de estado grupal
      if (!groupInstances.has(groupId)) {
        const initialGroupState = createInitialState(state.platform);
        groupInstances.set(groupId, {
          state: initialGroupState,
          elements: new Set()
        });
        console.log('Created new group instance:', groupId);
      }

      const group = groupInstances.get(groupId)!;
      
      // Crear la referencia del componente
      componentRef = {
        setState: (newState: Partial<UserProfileState>) => {
          console.log('Group component setState called with:', newState);
          setState(prevState => ({ ...prevState, ...newState }));
        },
        getState: () => state,
        id: uniqueId
      };

      group.elements.add(componentRef);
      console.log('Added component to group. Total elements:', group.elements.size);

      // Cargar estado guardado del grupo
      loadFromLocalStorage();

      // Cleanup on unmount
      onCleanup(() => {
        console.log('Cleaning up component:', uniqueId);
        if (componentRef) {
          group.elements.delete(componentRef);
        }
        if (group.elements.size === 0) {
          console.log('Removing empty group:', groupId);
          groupInstances.delete(groupId);
        }
      });
    } else {
      // Manejo de estado individual
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    if (typeof window === 'undefined') return; // SSR safety
    
    const key = groupId ? `userProfileState_${groupId}` : `userProfileState_${uniqueId}`;
    
    try {
      const savedState = localStorage.getItem(key);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('Loading saved state from key:', key, parsedState);
        
        // Asegurar tipos correctos
        const stateToApply = {
          connected: Boolean(parsedState.connected),
          username: parsedState.username || '',
          imageUrl: parsedState.imageUrl || '/favicon.svg',
          connectionStatus: parsedState.connectionStatus || 'offline',
          platform: parsedState.platform || state.platform
        };
        
        // Aplicar el estado cargado
        setState(prevState => {
          console.log('Applying loaded state. Previous:', prevState, 'New:', stateToApply);
          return { ...prevState, ...stateToApply };
        });
        
        setInputValue(stateToApply.username);

        // Si hay groupId, actualizar también el estado del grupo
        if (groupId) {
          const group = groupInstances.get(groupId);
          if (group) {
            group.state = { ...group.state, ...stateToApply };
            console.log('Updated group state after loading:', group.state);
          }
        }
      } else {
        console.log('No saved state found for key:', key);
      }
    } catch (e) {
      console.error("Failed to parse saved state from localStorage:", e);
    }
  };

  const saveToLocalStorage = () => {
    if (typeof window === 'undefined') return; // SSR safety
    
    const key = groupId ? `userProfileState_${groupId}` : `userProfileState_${uniqueId}`;
    
    try {
      const stateToSave = {
        connected: Boolean(state.connected),
        username: state.username || '',
        imageUrl: state.imageUrl || '/favicon.svg',
        connectionStatus: state.connectionStatus || 'offline',
        platform: state.platform || 'twitch'
      };
      
      const stateJson = JSON.stringify(stateToSave);
      localStorage.setItem(key, stateJson);
      console.log('Saved state to localStorage:', { key, state: stateToSave });
      
      // Verificar que se guardó correctamente
      const verification = localStorage.getItem(key);
      if (verification !== stateJson) {
        console.error('LocalStorage save verification failed!');
      }
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  };

  const updateGroupElements = () => {
    if (!groupId) return;
    
    const group = groupInstances.get(groupId);
    if (!group) {
      console.warn('Group not found for updateGroupElements:', groupId);
      return;
    }

    // Crear el nuevo estado del grupo
    const newGroupState = {
      connected: Boolean(state.connected),
      username: state.username || '',
      imageUrl: state.imageUrl || '/favicon.svg',
      connectionStatus: state.connectionStatus || 'offline',
      platform: state.platform || 'twitch'
    } as UserProfileState;
    
    group.state = newGroupState;
    console.log('Updating group state:', newGroupState);
    
    // Sincronizar todos los elementos del grupo excepto el actual
    let syncCount = 0;
    group.elements.forEach(element => {
      if (element.id !== uniqueId && element.setState) {
        console.log(`Syncing element ${element.id} with state:`, newGroupState);
        try {
          element.setState(newGroupState);
          syncCount++;
        } catch (error) {
          console.error('Error syncing element:', element.id, error);
        }
      }
    });
    
    console.log(`Successfully synced ${syncCount} elements in group ${groupId}`);
  };

  return {
    initializeState,
    saveToLocalStorage,
    updateGroupElements
  };
};