// audio_queue.ts

/**
 * Interface for TTS provider instances
 */
interface TTSProvider {
  speak(text: string, options?: Record<string, any>): Promise<void | string>;
  stop(): void;
  pause(): void;
  resume(): void;
}

/**
 * Interface for provider information
 */
interface ProviderInfo {
  instance: TTSProvider;
  initialized: boolean;
}

/**
 * Map of provider names to their information
 */
type ProvidersMap = Record<string, ProviderInfo>;

/**
 * Interface for audio items with unique identifiers
 */
interface AudioItem {
  id: string;
  text: string;
  providerName: string;
  options: Record<string, any>;
  status: 'pending' | 'playing' | 'completed' | 'error';
  createdAt: Date;
}

/**
 * Interface for queue request items (internal use)
 */
interface QueueRequest extends AudioItem {
  resolve: () => void;
  reject: (reason?: any) => void;
}

/**
 * Queue behavior modes
 */
type QueueMode = 'archive' | 'loop';

/**
 * Configuration for AudioQueue
 */
interface AudioQueueConfig {
  mode: QueueMode;
  maxHistorySize?: number;
}

class AudioQueue {
  private providers: ProvidersMap;
  private queue: QueueRequest[] = [];
  private playedQueue: AudioItem[] = []; // For archive mode - completed items
  private isPlaying: boolean = false;
  private activeProviderName: string | null = null;
  private currentAudioPromise:  Promise<void | string> | null = null;
  private currentIndex: number = -1; // Current playing index in queue
  private mode: QueueMode;
  private maxHistorySize: number;
  private currentAudioId: string | null = null;

  /**
   * Creates an instance of AudioQueue.
   * @param providers - A map where keys are provider names and values are objects { instance: TTSProviderInstance, initialized: boolean }.
   * @param config - Configuration for queue behavior
   */
  constructor(providers: ProvidersMap, config: AudioQueueConfig = { mode: 'archive' }) {
    if (!providers || typeof providers !== 'object') {
      throw new Error("AudioQueue requires a valid providers map.");
    }
    this.providers = providers;
    this.mode = config.mode;
    this.maxHistorySize = config.maxHistorySize || 100;
    console.log(`AudioQueue initialized in ${this.mode} mode.`);
  }

  /**
   * Generates a unique ID for audio items
   */
  private generateId(): string {
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Adds a text-to-speech request to the queue or plays immediately.
   * @param text - The text to be spoken.
   * @param providerName - The name of the provider to use.
   * @param options - Provider-specific options for playback.
   * @param playImmediately - If true, attempt to play this audio immediately.
   * @returns Promise with the audio ID when resolved.
   */
  enqueue(
    text: string, 
    providerName: string, 
    options: Record<string, any> = {}, 
    playImmediately: boolean = false
  ): Promise<string> {
    console.log(`Enqueueing request: "${text.substring(0, 30)}...", Provider: ${providerName}, Immediate: ${playImmediately}`);
    
    if (!text && !providerName) {
      return Promise.reject(new Error("Text and providerName are required for enqueue."));
    }
    if (!providerName) providerName = "streamElements";
    const audioId = this.generateId();
    
    if (playImmediately) {
      return this.playNow(text, providerName, options, audioId);
    }

    // For queued playback, return a promise with the audio ID
    return new Promise<string>((resolve, reject) => {
      const audioItem: QueueRequest = {
        id: audioId,
        text,
        providerName,
        options,
        status: 'pending',
        createdAt: new Date(),
        resolve: () => resolve(audioId),
        reject
      };
      
      this.queue.push(audioItem);
      console.log(`Added to queue. Queue length: ${this.queue.length}`);
      this._processQueue();
    });
  }

  /**
   * Attempts to play the audio immediately, stopping any current playback.
   */
  async playNow(text: string, providerName: string, options: Record<string, any> = {}, audioId?: string): Promise<string> {
    const id = audioId || this.generateId();
    console.log(`Attempting immediate playback: "${text.substring(0, 30)}...", Provider: ${providerName}`);
    
    if (!text || !providerName) {
      return Promise.reject(new Error("Text and providerName are required for playNow."));
    }

    this.stopCurrentPlayback();

    const providerInfo = this.providers[providerName];
    if (!providerInfo || !providerInfo.instance) {
      console.error(`Immediate Playback Error: Provider "${providerName}" not found.`);
      return Promise.reject(new Error(`Provider "${providerName}" not found.`));
    }

    if (!providerInfo.initialized) {
      console.warn(`Immediate Playback Warning: Provider "${providerName}" is not initialized. Attempting anyway.`);
    }

    this.isPlaying = true;
    this.activeProviderName = providerName;
    this.currentAudioId = id;

    try {
      console.log(`Executing immediate speak: ${providerName} - "${text.substring(0, 30)}..."`);
      this.currentAudioPromise = providerInfo.instance.speak(text, options);
      await this.currentAudioPromise;
      console.log(`Immediate playback finished: ${providerName}`);
      
      // Add to played queue if in archive mode
      if (this.mode === 'archive') {
        this._addToPlayedQueue({
          id,
          text,
          providerName,
          options,
          status: 'completed',
          createdAt: new Date()
        });
      }
      
      return Promise.resolve(String(this.currentAudioPromise || id));
    } catch (error) {
      console.error(`Immediate playback error with ${providerName}:`, error);
      return Promise.reject(error);
    } finally {
      this.isPlaying = false;
      this.activeProviderName = null;
      this.currentAudioPromise = null;
      this.currentAudioId = null;
      this._processQueue();
    }
  }
  async play(): Promise<string | void | null> {
    if (this.isPlaying && this.activeProviderName) {
      const providerInfo = this.providers[this.activeProviderName];
      if (providerInfo && providerInfo.instance) {
        console.log(`Stopping current playback by ${this.activeProviderName}.`);
        try {
          providerInfo.instance.resume();
        } catch (e) {
          console.error(`Error trying to stop provider ${this.activeProviderName}:`, e);
        }
      }
    } else {
      console.log("StopCurrentPlayback called, but nothing seems to be playing according to state.");
    }
    return this.currentAudioPromise;
  }
  /**
   * Processes the next item in the queue if not already playing.
   */
  private async _processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift()!;
    this.currentIndex = 0; // Reset to first item when processing queue
    console.log(`_processQueue: Processing item. Remaining queue: ${this.queue.length}. Text: "${request.text.substring(0, 30)}...", Provider: ${request.providerName}`);

    const providerInfo = this.providers[request.providerName];
    if (!providerInfo || !providerInfo.instance) {
      console.error(`Queue Error: Provider "${request.providerName}" not found. Skipping.`);
      request.status = 'error';
      request.reject(new Error(`Provider "${request.providerName}" not found.`));
      this._processQueue();
      return;
    }

    if (!providerInfo.initialized) {
      console.warn(`Queue Warning: Provider "${request.providerName}" is not initialized. Attempting anyway.`);
    }

    this.isPlaying = true;
    this.activeProviderName = request.providerName;
    this.currentAudioId = request.id;
    request.status = 'playing';

    try {
      console.log(`Executing queued speak: ${request.providerName} - "${request.text.substring(0, 30)}..."`);
      this.currentAudioPromise = providerInfo.instance.speak(request.text, request.options);
      await this.currentAudioPromise;
      console.log(`Queued playback finished: ${request.providerName}`);
      
      request.status = 'completed';
      
      // Handle based on mode
      if (this.mode === 'archive') {
        this._addToPlayedQueue({
          id: request.id,
          text: request.text,
          providerName: request.providerName,
          options: request.options,
          status: 'completed',
          createdAt: request.createdAt
        });
      }
      
      request.resolve();
    } catch (error) {
      console.error(`Queued playback error:`, error);
      request.status = 'error';
      request.reject(error);
    } finally {
      console.log(`Queued playback finally block`);
      this.isPlaying = false;
      this.activeProviderName = null;
      this.currentAudioPromise = null;
      this.currentAudioId = null;
      this._processQueue();
    }
  }

  /**
   * Adds an item to the played queue (archive mode)
   */
  private _addToPlayedQueue(item: AudioItem): void {
    this.playedQueue.push(item);
    
    // Limit history size
    if (this.playedQueue.length > this.maxHistorySize) {
      this.playedQueue.shift();
    }
  }

  /**
   * Plays the next audio in queue
   */
  async next(): Promise<boolean> {
    this.stopCurrentPlayback();
    this.isPlaying = false;
    if (this.mode === 'loop' && this.queue.length > 0) {
      this._processQueue();
      return true;
    } else if (this.mode === 'archive' && this.queue.length > 0) {
      this._processQueue();
      return true;
    }
    return false;
  }

  /**
   * Plays the previous audio (only works in loop mode or from played queue)
   */
  async previous(): Promise<boolean> {
    if (this.mode === 'loop') {
      // In loop mode, move current item to end and play the last one
      if (this.queue.length > 0) {
        const current = this.queue.pop();
        if (current) {
          this.queue.unshift(current);
          this.stopCurrentPlayback();
          this._processQueue();
          return true;
        }
      }
    } else if (this.mode === 'archive' && this.playedQueue.length > 0) {
      // In archive mode, replay the last played item
      const lastPlayed = this.playedQueue[this.playedQueue.length - 1];
      await this.playNow(lastPlayed.text, lastPlayed.providerName, lastPlayed.options);
      return true;
    }
    return false;
  }

  /**
   * Gets all pending audio items
   */
  getAllPendingAudios(): AudioItem[] {
    return this.queue.map(item => ({
      id: item.id,
      text: item.text,
      providerName: item.providerName,
      options: item.options,
      status: item.status,
      createdAt: item.createdAt
    }));
  }

  /**
   * Gets all played audio items (archive mode only)
   */
  getAllPlayedAudios(): AudioItem[] {
    return [...this.playedQueue];
  }

  /**
   * Gets audio item by ID
   */
  getAudioById(id: string): AudioItem | null {
    // Check pending queue
    const pending = this.queue.find(item => item.id === id);
    if (pending) {
      return {
        id: pending.id,
        text: pending.text,
        providerName: pending.providerName,
        options: pending.options,
        status: pending.status,
        createdAt: pending.createdAt
      };
    }

    // Check played queue
    const played = this.playedQueue.find(item => item.id === id);
    return played || null;
  }

  /**
   * Removes an audio item by ID
   */
  removeAudioById(id: string): boolean {
    // Remove from pending queue
    const pendingIndex = this.queue.findIndex(item => item.id === id);
    if (pendingIndex !== -1) {
      const removed = this.queue.splice(pendingIndex, 1)[0];
      removed.reject(new Error('Audio item removed from queue'));
      return true;
    }

    // Remove from played queue
    const playedIndex = this.playedQueue.findIndex(item => item.id === id);
    if (playedIndex !== -1) {
      this.playedQueue.splice(playedIndex, 1);
      return true;
    }

    return false;
  }

  /**
   * Moves an audio item to a different position in the queue
   */
  moveAudio(id: string, newPosition: number): boolean {
    const currentIndex = this.queue.findIndex(item => item.id === id);
    if (currentIndex === -1 || newPosition < 0 || newPosition >= this.queue.length) {
      return false;
    }

    const [item] = this.queue.splice(currentIndex, 1);
    this.queue.splice(newPosition, 0, item);
    return true;
  }

  /**
   * Gets currently playing audio info
   */
  getCurrentAudio(): AudioItem | null {
    if (!this.currentAudioId) return null;
    return this.getAudioById(this.currentAudioId);
  }
  getAudioSource(): string | null {
    if (!this.currentAudioId) return null;
    return this.getAudioById(this.currentAudioId)?.text || null;
  }
  /**
   * Changes queue mode
   */
  setMode(mode: QueueMode): void {
    this.mode = mode;
    console.log(`Queue mode changed to: ${mode}`);
  }

  /**
   * Gets current queue mode
   */
  getMode(): QueueMode {
    return this.mode;
  }

  /**
   * Stops the currently playing audio, if any. Does not clear the queue.
   */
  stopCurrentPlayback(): void {
    if (this.isPlaying && this.activeProviderName) {
      const providerInfo = this.providers[this.activeProviderName];
      if (providerInfo && providerInfo.instance) {
        console.log(`Stopping current playback by ${this.activeProviderName}.`);
        try {
          providerInfo.instance.pause();
        } catch (e) {
          console.error(`Error trying to stop provider ${this.activeProviderName}:`, e);
        }
      }
      this.currentAudioPromise = null;
    } else {
      console.log("StopCurrentPlayback called, but nothing seems to be playing according to state.");
    }
  }

  /**
   * Stops the currently playing audio and clears all pending requests from the queue.
   */
  stopAll(): void {
    console.log("Stopping all playback and clearing queue.");
    this.clearQueue();
    this.stopCurrentPlayback();
  }

  /**
   * Removes all pending requests from the queue. Does not stop current playback.
   */
  clearQueue(): void {
    if (this.queue.length > 0) {
      console.log(`Clearing queue. ${this.queue.length} items removed.`);
      this.queue.forEach(request => {
        request.reject(new Error("Queue cleared by stopAll or clearQueue call."));
      });
      this.queue = [];
    }
  }

  /**
   * Clears played queue (archive mode)
   */
  clearPlayedQueue(): void {
    this.playedQueue = [];
    console.log("Played queue cleared.");
  }

  /**
   * Gets the number of items currently waiting in the queue.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Gets the number of played items
   */
  getPlayedQueueLength(): number {
    return this.playedQueue.length;
  }

  /**
   * Checks if the audio queue is currently processing a playback request.
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

export { 
  AudioQueue, 
  type TTSProvider, 
  type ProviderInfo, 
  type ProvidersMap, 
  type AudioItem, 
  type QueueMode, 
  type AudioQueueConfig 
};