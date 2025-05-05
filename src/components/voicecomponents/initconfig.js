import { buildTTSConfigData,TTSConfigManager  } from './tts_config.js';
import { TTSProvider, StreamElementsProvider, ResponsiveVoiceProvider, WebSpeechProvider } from './tts_provider.js';
import { AudioQueue } from './audio_queue.js'; // Assuming file name
import { TiktokEmitter } from '/src/utils/socketManager';
TiktokEmitter.on('play_arrow', async (data) => {
  console.log("TiktokEmitter",data);
  playTextwithproviderInfo(data.user.data.comment);
});
let activeProviderName = null;
let providerInfo;
let ttsConfigData;
let currentProviders = {}; // Para instancias de proveedores
let selectedProviderName;
const audioQueue = new AudioQueue(currentProviders);

function updateStatus(message) {
    console.log(`Status: ${message}`);
}
document.addEventListener('DOMContentLoaded', async () => { // <--- HACER ASYNC
    updateStatus("Initializing...");

    // --- 1. Construir Datos de Configuración (Async) ---
    try {
        updateStatus("Building configuration (loading voices)...");
        // ¡Esperar a que las voces y la estructura de configuración estén listas!
        ttsConfigData = await buildTTSConfigData();
        updateStatus("Configuration built.");
    } catch (error) {
        console.error("FATAL: Could not build TTS configuration:", error);
        updateStatus("Error building configuration! Check console.");
        return; // Detener si la configuración falla
    }

    // --- 2. Crear Instancia del Administrador (Sync) ---
    const ttsConfigManager = new TTSConfigManager(ttsConfigData);

    // --- 3. Inicializar el resto (Ahora puede usar ttsConfigManager) ---
    const providerNames = ['streamElements', 'responsiveVoice', 'webSpeech'];
    const displayElements = {};

    // --- Initialize Config Forms ---
    providerNames.forEach(name => {
        const displayEl = document.getElementById(`config-${name}`);
        if (displayEl) {
            displayElements[name] = displayEl;
            try {
                const currentConfig = ttsConfigManager.loadConfig(name);
                const fieldConfigs = ttsConfigManager.getFieldConfigs(name);

                // *** Debugging Crucial ***
                console.log(`Setting config for ${name}. Field Configs:`, fieldConfigs);
                if (!fieldConfigs || Object.keys(fieldConfigs).length === 0) {
                     console.error(`!!! FieldConfigs for ${name} are empty or invalid.`);
                }
                 if (fieldConfigs.defaultVoice && (!fieldConfigs.defaultVoice.options || fieldConfigs.defaultVoice.options.length === 0)) {
                    console.warn(`!!! Voice options for ${name} select are empty.`);
                 }

                displayEl.setConfig(currentConfig, fieldConfigs); // Ahora fieldConfigs tiene las 'options'

                displayEl.addEventListener('item-updated', (event) => {
                    console.log(`Config updated for ${name}, saving...`, event.detail);
                    const saved = ttsConfigManager.saveConfig(name, event.detail); // Usa la instancia
                    if (saved) {
                        instantiateProvider(name); // Reinstanciar con nueva config
                    } else {
                        alert(`Failed to save configuration for ${name}!`);
                    }
                });
            } catch (e) {
                 console.error(`Error setting up config display for ${name}:`, e);
                 displayEl.innerHTML = `<p style="color: red;">Error loading config for ${name}</p>`;
            }
        } else {
            console.warn(`Could not find display element for ${name}`);
        }
    });
    // --- Instantiate Providers ---
    function instantiateProvider(name) {
        const config = ttsConfigManager.loadConfig(name); // Usa la instancia
        let providerInstance = null;
        let initPromise = Promise.resolve(false);

        try {
            if (name === 'streamElements') {
                providerInstance = new StreamElementsProvider(config);
            } else if (name === 'responsiveVoice') {
                 if (typeof responsiveVoice !== 'undefined') {
                    // RV ya debería haber sido inicializado una vez en buildTTSConfigData,
                    // pero crear una nueva instancia podría requerir init() de nuevo
                    // si su estado no es globalmente persistente.
                    providerInstance = new ResponsiveVoiceProvider(config);
                 } else { console.warn("ResponsiveVoice library not loaded for instantiation."); }
            } else if (name === 'webSpeech') {
                providerInstance = new WebSpeechProvider(config);
            }
            // Llamar a init() es crucial, especialmente para RV/WebSpeech
            if (providerInstance) initPromise = providerInstance.init();

        } catch (err) {
            console.error(`Error creating provider ${name}:`, err);
        }

        if (providerInstance) {
            currentProviders[name] = { instance: providerInstance, initialized: false };
            console.log(`Instantiated ${name} with config:`, config);

            initPromise.then(success => {
                if (success) {
                    currentProviders[name].initialized = true;
                    console.log(`${name} provider initialized successfully.`);
                    updateStatus(`${name} ready.`);
                     // Actualizar dinámicamente las opciones del select si es necesario (más complejo)
                     // if (name === 'webSpeech' || name === 'responsiveVoice') {
                     //    const voices = parseVoices(providerInstance.getVoices());
                     //    const fieldCfgs = ttsConfigManager.getFieldConfigs(name);
                     //    fieldCfgs.defaultVoice.options = voices;
                     //    displayElements[name]?.setConfig(ttsConfigManager.loadConfig(name), fieldCfgs);
                     // }
                } else {
                    console.warn(`${name} provider failed to initialize or is not available.`);
                    updateStatus(`${name} unavailable.`);
                }
            }).catch(err => {
                console.error(`Error initializing ${name} provider:`, err);
                updateStatus(`${name} init error.`);
            });
        } else {
            delete currentProviders[name];
            updateStatus(`${name} cannot be created.`);
        }
    }

    // Initial instantiation
    providerNames.forEach(instantiateProvider);

    // --- Example Usage ---
    const textInput = document.getElementById('tts-text');
    const providerSelect = document.getElementById('tts-provider-select') || {value: getselectedProviderName()};
    const speakButton = document.getElementById('speak-button');
    const stopButton = document.getElementById('stop-button');
    providerInfo =  currentProviders[providerSelect.value];
    if (providerSelect && providerSelect.addEventListener) {
        providerSelect.value = getselectedProviderName();
        providerSelect?.addEventListener('change', async () => {
            selectedProviderName = providerSelect.value;
            localStorage.setItem('selectedProviderName', selectedProviderName);
        });
    }
    console.log("providerSelect.value",providerSelect.value);
    if (speakButton) {
        speakButton.addEventListener('click', async () => {
            selectedProviderName = providerSelect.value; // Keep track locally if needed
            const textToSpeak = textInput.value;
            const providerToUse = selectedProviderName; // Or getselectedProviderName()
          
            if (textToSpeak && providerToUse) {
               try {
                  // Example: Button click plays immediately, interrupting queue
                  updateStatus(`Playing immediately with ${providerToUse}...`);
                  await audioQueue.playNow(textToSpeak, providerToUse);
                  updateStatus(`Finished immediate playback with ${providerToUse}.`);
               } catch (error) {
                   console.error(`Error playing immediately with ${providerToUse}:`, error);
                   updateStatus(`Error with ${providerToUse}: ${error.message}`);
               }
            } else {
               console.warn("No text or provider selected for immediate playback.");
            }
          });
    }
    if (stopButton) {
    stopButton.addEventListener('click', () => {
        if (activeProviderName && currentProviders[activeProviderName]?.instance) {
            currentProviders[activeProviderName].instance.stop();
            updateStatus(`Stopped ${activeProviderName}.`);
        } else {
            Object.values(currentProviders).forEach(pInfo => pInfo.instance?.stop());
            updateStatus("Stopped any active speech.");
        }
        activeProviderName = null;
    });
    }

}); 
function getselectedProviderName(value) {
    if (value) {
        localStorage.setItem('selectedProviderName', value);
    }
    if (!selectedProviderName) {
        const selectedProviderNamestorage = localStorage.getItem('selectedProviderName');
        if (selectedProviderNamestorage) {
            selectedProviderName = selectedProviderNamestorage;
        } else {
            selectedProviderName = value
        }
    }
    if (!selectedProviderName && !value) {
        return "webSpeech";
    }
    return selectedProviderName || value;
}
async  function playTextwithproviderInfo(textToSpeak, Providername = selectedProviderName, playNow= false) {
    if (!providerInfo.initialized) { updateStatus(`${Providername} provider not yet initialized.`); return; }
    if (providerInfo && providerInfo.instance) {
        console.log("rawdata",textToSpeak,providerInfo,providerInfo,Providername);
        activeProviderName = Providername;
        updateStatus(`Speaking with ${Providername}...`);
        
        try {
            if (playNow){
                Object.values(currentProviders).forEach(pInfo => pInfo.instance?.stop());
                await audioQueue.playNow(textToSpeak, Providername);
            }else{
                await audioQueue.enqueue(textToSpeak, Providername);
                updateStatus(`Finished speaking with ${Providername}.`);
                //    await providerInfo.instance.speak(textToSpeak);
            }
        } catch (error) {
            console.error(`Error speaking with ${Providername}:`, error);
            updateStatus(`Error with ${Providername}: ${error.message}`);
        }
    }
}
export {
    playTextwithproviderInfo
}