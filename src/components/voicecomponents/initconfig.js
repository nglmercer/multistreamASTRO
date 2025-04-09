import { buildTTSConfigData,TTSConfigManager  } from './tts_config.js';
import { TTSProvider, StreamElementsProvider, ResponsiveVoiceProvider, WebSpeechProvider } from './tts_provider.js';
document.addEventListener('DOMContentLoaded', async () => { // <--- HACER ASYNC
    let statusDiv;
    statusDiv = document.getElementById('status'); // Asignar después de que el DOM esté listo

    function updateStatus(message) {
        if (statusDiv) statusDiv.textContent = `Status: ${message}`;
        console.log(`Status: ${message}`);
    }

    updateStatus("Initializing...");

    // --- 1. Construir Datos de Configuración (Async) ---
    let ttsConfigData;
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
    let currentProviders = {}; // Para instancias de proveedores

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

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const applyDarkMode = (isDark) => {
        document.body.style.backgroundColor = isDark ? '#222' : '#fff';
        document.body.style.color = isDark ? '#eee' : '#000';
        Object.values(displayElements).forEach(el => {
            if (isDark) el.setAttribute('darkmode', '');
            else el.removeAttribute('darkmode');
        });
    };
    if (darkModeToggle)     darkModeToggle.addEventListener('change', (event) => {
        applyDarkMode(event.target.checked);
    });

    // applyDarkMode(darkModeToggle.checked); // Aplicar estado inicial si es necesario

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
    const providerSelect = document.getElementById('tts-provider-select');
    const speakButton = document.getElementById('speak-button');
    const stopButton = document.getElementById('stop-button');
    let activeProviderName = null;

    speakButton.addEventListener('click', async () => {
        const selectedProviderName = providerSelect.value;
        const textToSpeak = textInput.value;
        const providerInfo = currentProviders[selectedProviderName];

        if (!textToSpeak) { updateStatus("Enter text to speak."); return; }
        if (!providerInfo || !providerInfo.instance) { updateStatus(`${selectedProviderName} provider not available.`); return; }
        if (!providerInfo.initialized) { updateStatus(`${selectedProviderName} provider not yet initialized.`); return; }

        Object.values(currentProviders).forEach(pInfo => pInfo.instance?.stop());
        activeProviderName = selectedProviderName;
        updateStatus(`Speaking with ${selectedProviderName}...`);

        try {
            await providerInfo.instance.speak(textToSpeak);
            updateStatus(`Finished speaking with ${selectedProviderName}.`);
            activeProviderName = null;
        } catch (error) {
            console.error(`Error speaking with ${selectedProviderName}:`, error);
            updateStatus(`Error with ${selectedProviderName}: ${error.message}`);
            activeProviderName = null;
        }
    });

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

}); 