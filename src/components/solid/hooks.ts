// hooks.ts
import { createEffect, onCleanup } from 'solid-js';
import type{ UserProfileState, UserProfileComponent, GroupInstance } from './userTypes';
import { groupInstances, createInitialState } from './utils';

export const useGroupState = (
  groupId: string | undefined,
  state: UserProfileState,
  setState: (state: UserProfileState) => void,
  setInputValue: (value: string) => void,
  uniqueId: string
) => {
  const initializeState = () => {
    if (groupId) {
      if (!groupInstances.has(groupId)) {
        groupInstances.set(groupId, {
          state: createInitialState(),
          elements: new Set()
        });
      }

      const group = groupInstances.get(groupId)!;
      const component: UserProfileComponent = {
        setState: (newState) => setState(newState),
        getState: () => state,
        id: uniqueId
      };
      group.elements.add(component);

      const key = `userProfileState_${groupId}`;
      const savedState = localStorage.getItem(key);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          setState({ ...state, ...parsedState });
          group.state = { ...group.state, ...parsedState };
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }

      // Cleanup on unmount
      onCleanup(() => {
        group.elements.delete(component);
        if (group.elements.size === 0) {
          groupInstances.delete(groupId);
        }
      });
    } else {
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    const key = groupId ? `userProfileState_${groupId}` : `userProfileState_${uniqueId}`;
    const savedState = localStorage.getItem(key);

    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setState({ ...state, ...parsedState });
        setInputValue(parsedState.username || '');
      } catch (e) {
        console.error("Failed to parse saved state from localStorage:", e);
      }
    }
  };

  const saveToLocalStorage = () => {
    const key = groupId ? `userProfileState_${groupId}` : `userProfileState_${uniqueId}`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  };

  const updateGroupElements = () => {
    if (groupId) {
      const group = groupInstances.get(groupId);
      if (group) {
        group.state = { ...state };
        group.elements.forEach(element => {
          if (element.id !== uniqueId) {
            element.setState({ ...state });
          }
        });
      }
    }
  };

  return {
    initializeState,
    saveToLocalStorage,
    updateGroupElements
  };
};