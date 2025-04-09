import  { TTSProvider, StreamElementsProvider, ResponsiveVoiceProvider, WebSpeechProvider } from './tts_provider.js';
// tts_config_setup.js (o similar)

// (getWebSpeechVoices y parseVoices se mantienen como las proporcionaste)
function getWebSpeechVoices() {
    // ... (código de getWebSpeechVoices sin cambios) ...
     if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Web Speech API (speechSynthesis) not available.');
        return Promise.resolve([]);
    }
    const synth = window.speechSynthesis;
    let voicesCache = [];
    const mapVoices = (nativeVoices) => (nativeVoices || []).map(v => ({ name: v.name, lang: v.lang, default: v.default, voiceURI: v.voiceURI, localService: v.localService, _native: v }));
    return new Promise((resolve) => {
        let resolved = false;
        const loadAndResolve = () => {
            if (resolved) return;
            const nativeVoices = synth.getVoices() ?? [];
            if (nativeVoices.length > 0) {
                voicesCache = mapVoices(nativeVoices);
                console.log(`getWebSpeechVoices: Loaded ${voicesCache.length} voices.`);
                resolved = true;
                resolve(voicesCache);
            } else {
                 console.warn("getWebSpeechVoices: loadAndResolve triggered, but getVoices() returned empty.");
            }
        };
        const initialNativeVoices = synth.getVoices() ?? [];
        if (initialNativeVoices.length > 0) {
            voicesCache = mapVoices(initialNativeVoices);
            console.log(`getWebSpeechVoices: ${voicesCache.length} voices available immediately.`);
            resolved = true;
            resolve(voicesCache);
            return;
        }
        console.log('getWebSpeechVoices: Voices not immediate, waiting for voiceschanged event...');
        synth.addEventListener('voiceschanged', loadAndResolve, { once: true });
        setTimeout(() => {
            if (!resolved) {
                console.log("getWebSpeechVoices: Timeout reached, attempting final voice load.");
                const finalNativeVoices = synth.getVoices() ?? [];
                voicesCache = mapVoices(finalNativeVoices);
                 if(voicesCache.length > 0) console.log(`getWebSpeechVoices: Loaded ${voicesCache.length} voices after timeout.`);
                 else console.warn("getWebSpeechVoices: Still no voices found after timeout.");
                 resolved = true;
                 resolve(voicesCache);
            }
        }, 1500);
    });
}

function parseVoices(voices) {
    if (!Array.isArray(voices)) return []; // Asegurarse que es un array
    // Mapear al formato { label: '...', value: '...' } que espera object-edit-form para selects
    const mapedVoices = voices.map(v => ({
        name: v.name, // Mantener el nombre original si se necesita
        label: `${v.name}` + (v.lang ? ` (${v.lang})` : ''), // Crear una etiqueta descriptiva
        value: v.name // El valor para el select será el nombre de la voz
    }));
    // console.log("Parsed voices:", voices, mapedVoices); // Evitar loggear aquí, es muy ruidoso
    return mapedVoices;
}


/**
 * Construye el objeto de datos de configuración completo, obteniendo
 * las voces de forma asíncrona donde sea necesario.
 * @returns {Promise<Object>} Promesa que resuelve con el objeto de datos de configuración.
 */
async function buildTTSConfigData() {
    console.log("Building TTS Config Data...");

    // Obtener voces (WebSpeech es async, las otras son sync por ahora)
    // Nota: Para RV, obtener voces de forma fiable también requiere init(),
    // podríamos necesitar inicializarla aquí o aceptar que la lista inicial esté vacía.
    const voicesWebPromise = getWebSpeechVoices();
    const streamElementsProvider = new StreamElementsProvider(); // Instancia temporal
    const responsiveVoiceProvider = new ResponsiveVoiceProvider(); // Instancia temporal

    // Inicializar RV aquí para intentar obtener voces
    let rvInitSuccess = false;
    if (responsiveVoiceProvider.isAvailable()) {
        rvInitSuccess = await responsiveVoiceProvider.init();
        console.log("ResponsiveVoice init attempt result:", rvInitSuccess);
    }


    const [voicesWebResult] = await Promise.all([voicesWebPromise]); // Esperar WebSpeech

    const streamElementsVoices = parseVoices(streamElementsProvider.getVoices());
    const responsiveVoiceVoices = parseVoices(responsiveVoiceProvider.getVoices()); // Obtener después de init()
    const webSpeechVoices = parseVoices(voicesWebResult);

    console.log("Voice counts:", {
        streamElements: streamElementsVoices.length,
        responsiveVoice: responsiveVoiceVoices.length,
        webSpeech: webSpeechVoices.length
    });

    // Construir y devolver el objeto de datos
    return {
        defaults: {
            streamElements: { defaultVoice: "Brian", rate: 1.0, pitch: 1.0, volume: 0.8, cacheSize: 50 },
            responsiveVoice: { defaultVoice: "UK English Female", rate: 1.0, pitch: 1.0, volume: 1.0 },
            webSpeech: { defaultVoice: "", rate: 1.0, pitch: 1.0, volume: 1.0 }
        },
        fieldConfigs: {
            streamElements: {
                defaultVoice: { label: 'Default Voice (SE)', type: 'select', required: true, options: streamElementsVoices },
                rate: { label: 'Rate', type: 'number', min: 0.5, max: 4, step: 0.1, required: true },
                pitch: { label: 'Pitch', type: 'number', min: 0.5, max: 2, step: 0.1, required: true },
                volume: { label: 'Volume', type: 'number', min: 0, max: 1, step: 0.05, required: true },
                cacheSize: { label: 'Cache Size', type: 'number', min: 0, max: 500, step: 1, required: true }
            },
            responsiveVoice: {
                defaultVoice: { label: 'Default Voice (RV)', type: 'select', required: true, options: responsiveVoiceVoices },
                rate: { label: 'Rate', type: 'number', min: 0, max: 1.5, step: 0.1, required: true },
                pitch: { label: 'Pitch', type: 'number', min: 0, max: 2, step: 0.1, required: true },
                volume: { label: 'Volume', type: 'number', min: 0, max: 1, step: 0.05, required: true }
            },
            webSpeech: {
                defaultVoice: { label: 'Default Voice (Web)', type: 'select', required: false, options: webSpeechVoices },
                rate: { label: 'Rate', type: 'number', min: 0.1, max: 10, step: 0.1, required: true },
                pitch: { label: 'Pitch', type: 'number', min: 0, max: 2, step: 0.1, required: true },
                volume: { label: 'Volume', type: 'number', min: 0, max: 1, step: 0.05, required: true }
            }
        }
    };
}
// tts_config_manager.js (o similar)

class TTSConfigManager {
    constructor(configData) {
        if (!configData || !configData.defaults || !configData.fieldConfigs) {
            throw new Error("TTSConfigManager requires valid configData upon construction.");
        }
        this.defaults = configData.defaults;
        this.fieldConfigs = configData.fieldConfigs;
        console.log("TTSConfigManager initialized with data:", this);
    }

    _getStorageKey(providerName) {
        return `ttsConfig_${providerName}`;
    }

    // loadConfig es síncrono porque solo lee localStorage
    loadConfig(providerName) {
        const key = this._getStorageKey(providerName);
        const defaultConfig = this.defaults[providerName] || {};
        let loadedConfig = {};

        try {
            const storedValue = localStorage.getItem(key);
            if (storedValue) {
                loadedConfig = JSON.parse(storedValue);
            }
        } catch (error) {
            console.error(`Error loading/parsing config for ${providerName} from localStorage:`, error);
            loadedConfig = {};
        }

        // Merge con defaults (importante!)
        const finalConfig = { ...defaultConfig };
        for (const configKey in defaultConfig) {
            if (Object.hasOwnProperty.call(defaultConfig, configKey)) {
                if (Object.hasOwnProperty.call(loadedConfig, configKey) && loadedConfig[configKey] !== undefined && loadedConfig[configKey] !== null) {
                    // Simple type check - more robust checks might be needed
                    if (typeof loadedConfig[configKey] === typeof defaultConfig[configKey]) {
                        finalConfig[configKey] = loadedConfig[configKey];
                    } else if (typeof defaultConfig[configKey] === 'number' && !isNaN(Number(loadedConfig[configKey]))) {
                         // Allow string numbers from storage to become numbers
                         finalConfig[configKey] = Number(loadedConfig[configKey]);
                    } else {
                         console.warn(`Type mismatch for key "${configKey}" in ${providerName} config. Using default.`);
                    }
                }
            }
        }
        // console.log(`Loaded config for ${providerName}:`, finalConfig); // Log menos ruidoso
        return finalConfig;
    }

    // saveConfig es síncrono
    saveConfig(providerName, configToSave) {
        const key = this._getStorageKey(providerName);
        try {
            if (typeof configToSave !== 'object' || configToSave === null) {
                throw new Error("Invalid config type provided to saveConfig.");
            }
            // Asegurarse que los números se guardan como números
            const sanitizedConfig = { ...configToSave };
            const defaultConfig = this.defaults[providerName] || {};
            for(const key in sanitizedConfig) {
                if(typeof defaultConfig[key] === 'number' && typeof sanitizedConfig[key] !== 'number') {
                    sanitizedConfig[key] = Number(sanitizedConfig[key]);
                    if(isNaN(sanitizedConfig[key])) {
                        sanitizedConfig[key] = defaultConfig[key]; // Reset a default si la conversión falla
                    }
                }
            }

            const configString = JSON.stringify(sanitizedConfig);
            localStorage.setItem(key, configString);
            console.log(`Saved config for ${providerName}:`, sanitizedConfig);
            return true;
        } catch (error) {
            console.error(`Error saving config for ${providerName} to localStorage:`, error);
            return false;
        }
    }

    // getFieldConfigs es síncrono
    getFieldConfigs(providerName) {
        // Devuelve una copia para evitar modificaciones accidentales
        return JSON.parse(JSON.stringify(this.fieldConfigs[providerName] || {}));
    }
}
export {
    buildTTSConfigData,
    TTSConfigManager 
}