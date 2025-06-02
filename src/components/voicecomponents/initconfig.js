import { buildTTSConfigData,TTSConfigManager  } from './tts_config.js';
import { TTSProvider, StreamElementsProvider, ResponsiveVoiceProvider, WebSpeechProvider } from './tts_provider.js';
import { AudioQueue } from './audio_queue.ts'; // Assuming file name
import { TiktokEmitter } from '/src/utils/socketManager';
import { BrowserLogger, LogLevel } from '@utils/Logger.ts';
import { LitFormBuilder } from 'src/litcomponents/forms/form.ts'
const logger = new BrowserLogger("TTS")
    .setLevel(LogLevel.LOG); // Set to INFO or DEBUG as needed
TiktokEmitter.on('play_arrow', async (data) => {
  logger.log("TiktokEmitter",data);
  playTextwithproviderInfo(data.user.data.comment);
});
let activeProviderName = null;
let providerInfo;
let ttsConfigData;
let currentProviders = {}; // Para instancias de proveedores
let selectedProviderName;
const audioQueue = new AudioQueue(currentProviders, { mode: 'loop'});

function updateStatus(message) {
    logger.log(`Status: ${message}`);
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
        logger.error("FATAL: Could not build TTS configuration:", error);
        updateStatus("Error building configuration! Check logger.");
        return; // Detener si la configuración falla
    }

    // --- 2. Crear Instancia del Administrador (Sync) ---
    const ttsConfigManager = new TTSConfigManager(ttsConfigData);

    // --- 3. Inicializar el resto (Ahora puede usar ttsConfigManager) ---
    const providerNames = ['streamElements', 'responsiveVoice', 'webSpeech'];
    const newdisplayElements = {};

    // --- Initialize Config Forms ---
    providerNames.forEach(name => {
        const newdisplayEl = document.getElementById(`${name}-config`);
        if (newdisplayEl) {
            newdisplayElements[name] = newdisplayEl;
            try {
                
                const currentConfig = ttsConfigManager.loadConfig(name);
                const fieldConfigs = ttsConfigManager.getFieldConfigs(name);

                // *** Debugging Crucial ***
                logger.log(`Setting config for ${name}. Field Configs:`, fieldConfigs,currentConfig);
                if (!fieldConfigs || Object.keys(fieldConfigs).length === 0) {
                     logger.error(`!!! FieldConfigs for ${name} are empty or invalid.`);
                }
                 if (fieldConfigs.defaultVoice && (!fieldConfigs.defaultVoice.options || fieldConfigs.defaultVoice.options.length === 0)) {
                    logger.warn(`!!! Voice options for ${name} select are empty.`);
                 }
                newdisplayEl.setConfig(currentConfig, fieldConfigs); // Ahora fieldConfigs tiene las 'options'
                newdisplayEl.addEventListener('action', (event) => {
                    logger.log(`Config updated for ${name}, saving...`, event.detail);
                    const saved = ttsConfigManager.saveConfig(name, event.detail);
                    if (saved) {
                        instantiateProvider(name); // Reinstanciar con nueva config
                    } else {
                        alert(`Failed to save configuration for ${name}!`);
                    }
                });

            } catch (e) {
                 logger.error(`Error setting up config display for ${name}:`, e);
            }
        } else {
            logger.warn(`Could not find display element for ${name}`);
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
                 } else { logger.warn("ResponsiveVoice library not loaded for instantiation."); }
            } else if (name === 'webSpeech') {
                providerInstance = new WebSpeechProvider(config);
            }
            // Llamar a init() es crucial, especialmente para RV/WebSpeech
            if (providerInstance) initPromise = providerInstance.init();

        } catch (err) {
            logger.error(`Error creating provider ${name}:`, err);
        }

        if (providerInstance) {
            currentProviders[name] = { instance: providerInstance, initialized: false };
            logger.log(`Instantiated ${name} with config:`, config);

            initPromise.then(success => {
                if (success) {
                    currentProviders[name].initialized = true;
                    logger.log(`${name} provider initialized successfully.`);
                    updateStatus(`${name} ready.`);
                     // Actualizar dinámicamente las opciones del select si es necesario (más complejo)
                     // if (name === 'webSpeech' || name === 'responsiveVoice') {
                     //    const voices = parseVoices(providerInstance.getVoices());
                     //    const fieldCfgs = ttsConfigManager.getFieldConfigs(name);
                     //    fieldCfgs.defaultVoice.options = voices;
                     //    displayElements[name]?.setConfig(ttsConfigManager.loadConfig(name), fieldCfgs);
                     // }
                } else {
                    logger.warn(`${name} provider failed to initialize or is not available.`);
                    updateStatus(`${name} unavailable.`);
                }
            }).catch(err => {
                logger.error(`Error initializing ${name} provider:`, err);
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
    logger.log("providerSelect.value",providerSelect.value);
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
                   logger.error(`Error playing immediately with ${providerToUse}:`, error);
                   updateStatus(`Error with ${providerToUse}: ${error.message}`);
               }
            } else {
               logger.warn("No text or provider selected for immediate playback.");
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
        logger.log("rawdata",{
            textToSpeak, Providername, playNow
        });
        activeProviderName = Providername;
        updateStatus(`Speaking with ${Providername}...`);
        
        try {
            if (playNow){
                Object.values(currentProviders).forEach(pInfo => pInfo.instance?.stop());
                await providerInfo.instance.speak(textToSpeak);
            }else{
                await audioQueue.enqueue(textToSpeak, Providername);
                updateStatus(`Finished speaking with ${Providername}.`);
                //    await providerInfo.instance.speak(textToSpeak);
            }
        } catch (error) {
            logger.error(`Error speaking with ${Providername}:`, error);
            updateStatus(`Error with ${Providername}: ${error.message}`);
        }
    }
}
async function stopSpeaking() {
    if (audioQueue){
        await audioQueue._processQueue();
        updateStatus("Stopped all speech playback.");
    }else {
        logger.warn("AudioQueue not initialized, stopping all providers.");
        Object.values(currentProviders).forEach(pInfo => pInfo.instance?.stop());
    }
}
async function nextSpeech() {
    if (audioQueue){
        audioQueue.next();
    } else {
        logger.warn("AudioQueue is empty or not initialized.");
    }
}
export {
    playTextwithproviderInfo,
    stopSpeaking,
    nextSpeech
}