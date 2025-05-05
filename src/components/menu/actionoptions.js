import {socket,TiktokEmitter,tiktokLiveEvents, localStorageManager } from '/src/utils/socketManager.ts';

const eventSelect = document.getElementById('tiktok-event-select');
const emitButton = document.getElementById('emit-tiktok-event-button');
const statusDiv = document.getElementById('tiktok-event-status');

function populateEventOptions() {
  // Clear previous options (keeping the placeholder)
  eventSelect.length = 1;
  statusDiv.textContent = '';
  emitButton.disabled = true; // Disable button initially

  try {
    const storedEvents = localStorageManager.getAll(); // Use the new getAll method
    const eventNames = Object.keys(storedEvents);

    if (eventNames.length === 0) {
      statusDiv.textContent = `No events found in localStorage for key "${STORAGE_KEY}".`;
      return;
    }

    // Sort for better readability
    eventNames.sort().forEach(eventName => {
      // Only add if there's actual data (or explicitly null, which is valid)
      if (storedEvents[eventName] !== undefined) {
         const option = document.createElement('option');
         option.value = eventName;
         // Display the event name. You could potentially show a snippet of data here too if useful.
         option.textContent = eventName;
         eventSelect.appendChild(option);
      }
    });

    // Enable button only if options were added
    if (eventSelect.options.length > 1) {
        // Keep button disabled until an event is selected
        eventSelect.addEventListener('change', () => {
             emitButton.disabled = eventSelect.value === "";
        }, { once: false }); // Re-enable button when selection changes to a valid event
    } else {
         statusDiv.textContent = `No valid event data found in localStorage for key "${STORAGE_KEY}".`;
    }


  } catch (error) {
    console.error("Error reading or processing TikTok events from localStorage:", error);
    statusDiv.textContent = 'Error loading events from localStorage.';
  }
}

function handleEmitEvent() {
  const selectedEventName = eventSelect.value;

  if (!selectedEventName) {
    statusDiv.textContent = 'Please select an event type first.';
    return;
  }

  try {
    const eventData = localStorageManager.get(selectedEventName); // Cast needed if keys aren't perfectly typed generics

    if (eventData === undefined) {
      // Should not happen if populateEventOptions worked correctly, but safety check
       statusDiv.textContent = `Data for event "${selectedEventName}" not found in localStorage. Cannot emit.`;
       console.warn(`Attempted to emit event "${selectedEventName}" but no data was found.`);
       return;
    }

    console.log(`Simulating emit: Event='${selectedEventName}', Data=`, eventData);
    // THE CORE ACTION: Emit the event using the imported Emitter instance
    TiktokEmitter.emit(selectedEventName, eventData);

    statusDiv.textContent = `Successfully emitted "${selectedEventName}" event. Check console or listeners.`;

    // Optional: Briefly highlight the status
    statusDiv.style.color = 'green';
    setTimeout(() => { statusDiv.style.color = ''; }, 2000);


  } catch (error) {
    console.error(`Error retrieving or emitting event "${selectedEventName}":`, error);
    statusDiv.textContent = `Error emitting event "${selectedEventName}". Check console.`;
    statusDiv.style.color = 'red';
    setTimeout(() => { statusDiv.style.color = ''; }, 3000);
  }
}

// Initial population when the script runs
populateEventOptions();

// Add click listener to the button
emitButton.addEventListener('click', handleEmitEvent);