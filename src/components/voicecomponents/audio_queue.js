// audio_queue.js

class AudioQueue {
    /**
     * Creates an instance of AudioQueue.
     * @param {object} providers - A map where keys are provider names and values are objects { instance: TTSProviderInstance, initialized: boolean }.
     */
    constructor(providers) {
        if (!providers || typeof providers !== 'object') {
            throw new Error("AudioQueue requires a valid providers map.");
        }
        this.providers = providers;
        this.queue = []; // Stores { text, providerName, options, resolve, reject }
        this.isPlaying = false;
        this.activeProviderName = null;
        this.currentAudioPromise = null; // Stores the promise from the active speak() call
        console.log("AudioQueue initialized.");
    }

    /**
     * Adds a text-to-speech request to the queue or plays immediately.
     * @param {string} text - The text to be spoken.
     * @param {string} providerName - The name of the provider to use (e.g., 'webSpeech').
     * @param {object} [options={}] - Provider-specific options for playback.
     * @param {boolean} [playImmediately=false] - If true, attempt to play this audio immediately, potentially interrupting the current one.
     * @returns {Promise<void>} A promise that resolves when this specific audio finishes playing, or rejects on error.
     */
    enqueue(text, providerName, options = {}, playImmediately = false) {
        console.log(`Enqueueing request: "${text.substring(0, 30)}...", Provider: ${providerName}, Immediate: ${playImmediately}`);
        if (!text || !providerName) {
            return Promise.reject(new Error("Text and providerName are required for enqueue."));
        }

        if (playImmediately) {
            // For immediate playback, we don't add to the standard queue,
            // instead, we call playNow directly.
            return this.playNow(text, providerName, options);
        }

        // For queued playback, return a promise linked to this specific request
        return new Promise((resolve, reject) => {
            this.queue.push({ text, providerName, options, resolve, reject });
            console.log(`Added to queue. Queue length: ${this.queue.length}`);
            // Try to process immediately if nothing is playing
            this._processQueue();
        });
    }

    /**
     * Attempts to play the audio immediately, stopping any current playback.
     * @param {string} text - The text to be spoken.
     * @param {string} providerName - The name of the provider to use.
     * @param {object} [options={}] - Provider-specific options.
     * @returns {Promise<void>} A promise that resolves when the immediate audio finishes or rejects on error.
     */
    async playNow(text, providerName, options = {}) {
         console.log(`Attempting immediate playback: "${text.substring(0,30)}...", Provider: ${providerName}`);
        if (!text || !providerName) {
            return Promise.reject(new Error("Text and providerName are required for playNow."));
        }

        this.stopCurrentPlayback(); // Stop whatever might be playing

        const providerInfo = this.providers[providerName];

        if (!providerInfo || !providerInfo.instance) {
             console.error(`Immediate Playback Error: Provider "${providerName}" not found.`);
             return Promise.reject(new Error(`Provider "${providerName}" not found.`));
        }
        if (!providerInfo.initialized) {
            console.warn(`Immediate Playback Warning: Provider "${providerName}" is not initialized. Attempting anyway.`);
            // Optionally reject: return Promise.reject(new Error(`Provider "${providerName}" not initialized.`));
        }

        // Set state for immediate playback
        this.isPlaying = true;
        this.activeProviderName = providerName;

        try {
            console.log(`Executing immediate speak: ${providerName} - "${text.substring(0, 30)}..."`);
             // Directly await the speak method for immediate playback
            this.currentAudioPromise = providerInfo.instance.speak(text, options);
            await this.currentAudioPromise;
            console.log(`Immediate playback finished: ${providerName}`);
            // Resolve successfully
            return Promise.resolve(); // Explicitly resolve void
        } catch (error) {
            console.error(`Immediate playback error with ${providerName}:`, error);
            // Reject the promise
             return Promise.reject(error);
        } finally {
             // Clean up state regardless of success or failure
            console.log("Immediate playback finally block executing.");
            this.isPlaying = false;
            this.activeProviderName = null;
            this.currentAudioPromise = null;
             // Crucially, try to process the queue now that immediate playback is done
            this._processQueue();
        }
    }


    /**
     * Processes the next item in the queue if not already playing. (Private method)
     * Should not be called directly from outside the class.
     */
    async _processQueue() {
        if (this.isPlaying || this.queue.length === 0) {
            // console.log(`_processQueue: Skipping (isPlaying: ${this.isPlaying}, queueLength: ${this.queue.length})`);
            return; // Don't process if busy or queue is empty
        }

        const request = this.queue.shift(); // Get the next request (FIFO)
         console.log(`_processQueue: Processing item. Remaining queue: ${this.queue.length}. Text: "${request.text.substring(0,30)}...", Provider: ${request.providerName}`);

        const providerInfo = this.providers[request.providerName];

        if (!providerInfo || !providerInfo.instance) {
            console.error(`Queue Error: Provider "${request.providerName}" not found for text "${request.text.substring(0, 30)}...". Skipping.`);
            request.reject(new Error(`Provider "${request.providerName}" not found.`));
            // Don't set isPlaying, immediately try next
            this._processQueue(); // Try next item
            return;
        }

        if (!providerInfo.initialized) {
             console.warn(`Queue Warning: Provider "${request.providerName}" is not initialized for text "${request.text.substring(0, 30)}...". Attempting anyway.`);
            // Optionally reject and skip:
            // request.reject(new Error(`Provider "${request.providerName}" not initialized.`));
            // this._processQueue(); // Try next item
            // return;
        }


        this.isPlaying = true;
        this.activeProviderName = request.providerName;

        try {
            console.log(`Executing queued speak: ${request.providerName} - "${request.text.substring(0, 30)}..."`);
            // Assign the promise so stopCurrentPlayback might reference it (though direct cancellation isn't standard)
            this.currentAudioPromise = providerInfo.instance.speak(request.text, request.options);
            await this.currentAudioPromise;
            console.log(`Queued playback finished: ${request.providerName} - "${request.text.substring(0, 30)}..."`);
            request.resolve(); // Resolve the specific promise for this queued item
        } catch (error) {
            console.error(`Queued playback error with ${request.providerName} for text "${request.text.substring(0, 30)}...":`, error);
            request.reject(error); // Reject the specific promise
        } finally {
            // Cleanup state and try processing the next item, regardless of success/error
             console.log(`Queued playback finally block for: ${request.providerName} - "${request.text.substring(0, 30)}..."`);
            this.isPlaying = false;
            this.activeProviderName = null;
            this.currentAudioPromise = null;
            this._processQueue(); // Always check for the next item after one finishes or fails
        }
    }

    /**
     * Stops the currently playing audio, if any. Does not clear the queue.
     */
    stopCurrentPlayback() {
        if (this.isPlaying && this.activeProviderName) {
            const providerInfo = this.providers[this.activeProviderName];
            if (providerInfo && providerInfo.instance) {
                console.log(`Stopping current playback by ${this.activeProviderName}.`);
                try {
                    providerInfo.instance.stop();
                    // Note: We don't immediately set isPlaying = false here.
                    // The 'finally' block in the original speak call (_processQueue or playNow)
                    // is responsible for resetting state and calling _processQueue again
                    // once the provider signals it has truly stopped (or errored out).
                    // Setting it false here could lead to race conditions where _processQueue starts
                    // the next item before the current one has fully released resources.
                } catch (e) {
                    console.error(`Error trying to stop provider ${this.activeProviderName}:`, e);
                    // Even if stop fails, proceed as if it might have worked or timed out.
                    // The finally block handles state reset.
                }
            }
             this.currentAudioPromise = null; // Disassociate the promise
        } else {
             console.log("StopCurrentPlayback called, but nothing seems to be playing according to state.");
        }
         // Resetting state is handled by the `finally` block of the interrupted `speak` call.
    }


    /**
     * Stops the currently playing audio and clears all pending requests from the queue.
     */
    stopAll() {
        console.log("Stopping all playback and clearing queue.");
        this.clearQueue(); // Clear pending items first
        this.stopCurrentPlayback(); // Then stop the active one
        // State (isPlaying etc.) will be reset by the finally block of the interrupted playback.
    }

    /**
     * Removes all pending requests from the queue. Does not stop current playback.
     */
    clearQueue() {
        if (this.queue.length > 0) {
            console.log(`Clearing queue. ${this.queue.length} items removed.`);
            // Reject any pending promises in the queue
             this.queue.forEach(request => {
                request.reject(new Error("Queue cleared by stopAll or clearQueue call."));
             });
            this.queue = [];
        }
    }

    /**
     * Gets the number of items currently waiting in the queue.
     * @returns {number} The number of pending requests.
     */
    getQueueLength() {
        return this.queue.length;
    }

    /**
     * Checks if the audio queue is currently processing a playback request.
     * @returns {boolean} True if audio is playing, false otherwise.
     */
    isCurrentlyPlaying() {
        return this.isPlaying;
    }
}

export { AudioQueue };