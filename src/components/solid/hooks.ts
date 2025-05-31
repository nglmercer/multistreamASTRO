// hooks.ts
import { createEffect, onCleanup, onMount } from 'solid-js';
import type { UserProfileState, UserProfileComponent, GroupInstance } from './userTypes';
import { groupInstances, createInitialState } from './utils';

export const useGroupState = (
  groupId: string | undefined,
  state: UserProfileState,
  setState: (state: UserProfileState | ((prev: UserProfileState) => UserProfileState)) => void,
  setInputValue: (value: string) => void,
  uniqueId: string
) => {
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
      const component: UserProfileComponent = {
        setState: (newState: UserProfileState) => {
          setState(newState);
        },
        getState: () => state,
        id: uniqueId
      };

      group.elements.add(component);
      console.log('Added component to group. Total elements:', group.elements.size);

      // Cargar estado guardado
      const key = `userProfileState_${groupId}`;
      try {
        const savedState = localStorage.getItem(key);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          console.log('Loading saved group state:', parsedState);
          
          // Actualizar tanto el estado local como el del grupo
          setState((prevState: UserProfileState) => ({ ...prevState, ...parsedState }));
          setInputValue(parsedState.username || '');
          group.state = { ...group.state, ...parsedState };
        }
      } catch (e) {
        console.error('Failed to parse saved group state:', e);
      }

      // Cleanup on unmount
      onCleanup(() => {
        console.log('Cleaning up component:', uniqueId);
        group.elements.delete(component);
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
    const key = groupId ? `userProfileState_${groupId}` : `userProfileState_${uniqueId}`;
    
    try {
      const savedState = localStorage.getItem(key);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('Loading individual saved state:', parsedState);
        
        setState((prevState: UserProfileState) => ({ ...prevState, ...parsedState }));
        setInputValue(parsedState.username || '');
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
        connected: state.connected,
        username: state.username,
        imageUrl: state.imageUrl,
        connectionStatus: state.connectionStatus,
        platform: state.platform
      };
      
      localStorage.setItem(key, JSON.stringify(stateToSave));
      console.log('Saved state to localStorage:', { key, state: stateToSave });
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  };

  const updateGroupElements = () => {
    if (!groupId) return;
    
    const group = groupInstances.get(groupId);
    if (group) {
      // Actualizar el estado del grupo
      group.state = { 
        connected: state.connected,
        username: state.username,
        imageUrl: state.imageUrl,
        connectionStatus: state.connectionStatus,
        platform: state.platform
      } as UserProfileState;
      
      console.log('Updating group state:', group.state);
      
      // Sincronizar todos los elementos del grupo
      group.elements.forEach(element => {
        if (element.id !== uniqueId) {
          console.log('Syncing element:', element.id);
          // Fix: Pass the new state directly instead of using a function
          element.setState({ ...element.getState(), ...group.state });
        }
      });
    }
  };

  return {
    initializeState,
    saveToLocalStorage,
    updateGroupElements
  };
};