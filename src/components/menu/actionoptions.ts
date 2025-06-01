// tiktok-event-simulator.ts
import { socket, TiktokEmitter, KickEmitter, tiktokLiveEvents, localStorageManager } from 'src/utils/socketManager';
import { nextSpeech } from '@components/voicecomponents/initconfig';
// Types
interface EventData {
  [key: string]: any;
}

interface UIElements {
  eventSelect: HTMLSelectElement;
  emitButton: HTMLButtonElement;
  statusDiv: HTMLDivElement;
}

type StatusType = 'success' | 'error' | 'info';

class TikTokEventSimulator {
  private elements: UIElements;
  private readonly STORAGE_KEY = 'TiktokEvents';

  constructor() {
    this.elements = this.getUIElements();
    this.initialize();
  }

  private getUIElements(): UIElements {
    const eventSelect = document.getElementById('tiktok-event-select') as HTMLSelectElement;
    const emitButton = document.getElementById('emit-tiktok-event-button') as HTMLButtonElement;
    const statusDiv = document.getElementById('tiktok-event-status') as HTMLDivElement;

    if (!eventSelect || !emitButton || !statusDiv) {
      throw new Error('Required DOM elements not found');
    }

    return { eventSelect, emitButton, statusDiv };
  }

  private initialize(): void {
    this.populateEventOptions();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Event listener for select change
    this.elements.eventSelect.addEventListener('change', () => {
      this.elements.emitButton.disabled = this.elements.eventSelect.value === '';
    });

    // Event listener for emit button
    this.elements.emitButton.addEventListener('click', () => {
      this.handleEmitEvent();
    });
  }

  private populateEventOptions(): void {
    // Clear previous options (keeping the placeholder)
    this.elements.eventSelect.length = 1;
    this.updateStatus('', 'info');
    this.elements.emitButton.disabled = true;

    try {
      const storedEvents = localStorageManager.getAll() as any;
      const eventNames = Object.keys(storedEvents);

      if (eventNames.length === 0) {
        this.updateStatus(`No events found in localStorage for key "${this.STORAGE_KEY}".`, 'info');
        return;
      }

      // Sort for better readability and populate options
      const validEventNames = eventNames
        .filter(eventName => storedEvents[eventName] !== undefined)
        .sort();

      validEventNames.forEach(eventName => {
        const option = document.createElement('option');
        option.value = eventName;
        option.textContent = eventName;
        this.elements.eventSelect.appendChild(option);
      });

      if (validEventNames.length > 0) {
        this.updateStatus(`${validEventNames.length} events loaded successfully.`, 'success');
      } else {
        this.updateStatus(`No valid event data found in localStorage for key "${this.STORAGE_KEY}".`, 'info');
      }

    } catch (error) {
      console.error("Error reading or processing TikTok events from localStorage:", error);
      this.updateStatus('Error loading events from localStorage.', 'error');
    }
  }

  private handleEmitEvent(): void {
    const selectedEventName = this.elements.eventSelect.value;

    if (!selectedEventName) {
      this.updateStatus('Please select an event type first.', 'error');
      return;
    }

    try {
      const eventData: EventData | undefined = localStorageManager.get(selectedEventName);

      if (eventData === undefined) {
        this.updateStatus(`Data for event "${selectedEventName}" not found in localStorage. Cannot emit.`, 'error');
        console.warn(`Attempted to emit event "${selectedEventName}" but no data was found.`);
        return;
      }

      console.log(`Simulating emit: Event='${selectedEventName}', Data=`, eventData);

      // Emit the event using both emitters
      TiktokEmitter.emit(selectedEventName, eventData);
      KickEmitter.emit(selectedEventName, eventData);

      this.updateStatus(`Successfully emitted "${selectedEventName}" event. Check console or listeners.`, 'success');

    } catch (error) {
      console.error(`Error retrieving or emitting event "${selectedEventName}":`, error);
      this.updateStatus(`Error emitting event "${selectedEventName}". Check console.`, 'error');
    }
  }

  private updateStatus(message: string, type: StatusType): void {
    this.elements.statusDiv.textContent = message;
    
    // Remove previous status classes
    this.elements.statusDiv.classList.remove('status-success', 'status-error', 'status-info');
    
    // Add appropriate status class
    if (message) {
      this.elements.statusDiv.classList.add(`status-${type}`);
    }

    // Auto-clear status after delay for success/error messages
    if (type !== 'info' && message) {
      const delay = type === 'success' ? 3000 : 4000;
      setTimeout(() => {
        this.elements.statusDiv.textContent = '';
        this.elements.statusDiv.classList.remove(`status-${type}`);
      }, delay);
    }
  }

  // Public method to refresh events (useful if localStorage is updated externally)
  public refreshEvents(): void {
    this.populateEventOptions();
  }

  // Public method to get available events
  public getAvailableEvents(): string[] {
    try {
      const storedEvents = localStorageManager.getAll() as any;
      return Object.keys(storedEvents).filter(eventName => storedEvents[eventName] !== undefined);
    } catch (error) {
      console.error("Error getting available events:", error);
      return [];
    }
  }
}

// Initialize the simulator when DOM is ready
const initializeSimulator = (): void => {
  try {
    const simulator = new TikTokEventSimulator();
    
    // Make simulator available globally for debugging (optional)
    (window as any).tiktokEventSimulator = simulator;
    
    console.log('TikTok Event Simulator initialized successfully');
  } catch (error) {
    console.error('Failed to initialize TikTok Event Simulator:', error);
  }
};
function initializeStopSpeaking() {
  const button = document.getElementById('skip-play-button');
  if (!button)return;
  button.addEventListener('click', async () => {
  try {
    await nextSpeech();
    console.log('Stop speaking initialized successfully');
  } catch (error) {
    console.error('Failed to initialize stop speaking:', error);
  }
  }
  );
};
// Initialize immediately if DOM is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeSimulator();
      initializeStopSpeaking();
    });
  } else {
  initializeSimulator();
  initializeStopSpeaking();
}

export { TikTokEventSimulator };