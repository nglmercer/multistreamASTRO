// --- Tipos (Referencia, eliminados del código final según solicitado) ---
// type TTSVoice = { name: string, lang?: string, default?: boolean };
// type TTSSpeakOptions = { voiceName?: string, rate?: number, pitch?: number, volume?: number };
// --------------------------------------------------------------------

const streamElementsVoices = [
    "Filiz", "Astrid", "Tatyana", "Maxim", "Carmen", "Ines", "Cristiano", "Vitoria",
    "Ricardo", "Maja", "Jan", "Jacek", "Ewa", "Ruben", "Lotte", "Liv", "Seoyeon",
    "Takumi", "Mizuki", "Giorgio", "Carla", "Bianca", "Karl", "Dora", "Mathieu",
    "Celine", "Chantal", "Penelope", "Miguel", "Mia", "Enrique", "Conchita",
    "Geraint", "Salli", "Matthew", "Kimberly", "Kendra", "Justin", "Joey",
    "Joanna", "Ivy", "Raveena", "Aditi", "Emma", "Brian", "Amy", "Russell",
    "Nicole", "Vicki", "Marlene", "Hans", "Naja", "Mads", "Gwyneth", "Zhiyu",
    "es-ES-Standard-A", "it-IT-Standard-A", "it-IT-Wavenet-A", "ja-JP-Standard-A",
    "ja-JP-Wavenet-A", "ko-KR-Standard-A", "ko-KR-Wavenet-A", "pt-BR-Standard-A",
    "tr-TR-Standard-A", "sv-SE-Standard-A", "nl-NL-Standard-A", "nl-NL-Wavenet-A",
    "en-US-Wavenet-A", "en-US-Wavenet-B", "en-US-Wavenet-C", "en-US-Wavenet-D",
    "en-US-Wavenet-E", "en-US-Wavenet-F", "en-GB-Standard-A", "en-GB-Standard-B",
    "en-GB-Standard-C", "en-GB-Standard-D", "en-GB-Wavenet-A", "en-GB-Wavenet-B",
    "en-GB-Wavenet-C", "en-GB-Wavenet-D", "en-US-Standard-B", "en-US-Standard-C",
    "en-US-Standard-D", "en-US-Standard-E", "de-DE-Standard-A", "de-DE-Standard-B",
    "de-DE-Wavenet-A", "de-DE-Wavenet-B", "de-DE-Wavenet-C", "de-DE-Wavenet-D",
    "en-AU-Standard-A", "en-AU-Standard-B", "en-AU-Wavenet-A", "en-AU-Wavenet-B",
    "en-AU-Wavenet-C", "en-AU-Wavenet-D", "en-AU-Standard-C", "en-AU-Standard-D",
    "fr-CA-Standard-A", "fr-CA-Standard-B", "fr-CA-Standard-C", "fr-CA-Standard-D",
    "fr-FR-Standard-C", "fr-FR-Standard-D", "fr-FR-Wavenet-A", "fr-FR-Wavenet-B",
    "fr-FR-Wavenet-C", "fr-FR-Wavenet-D", "da-DK-Wavenet-A", "pl-PL-Wavenet-A",
    "pl-PL-Wavenet-B", "pl-PL-Wavenet-C", "pl-PL-Wavenet-D", "pt-PT-Wavenet-A",
    "pt-PT-Wavenet-B", "pt-PT-Wavenet-C", "pt-PT-Wavenet-D", "ru-RU-Wavenet-A",
    "ru-RU-Wavenet-B", "ru-RU-Wavenet-C", "ru-RU-Wavenet-D", "sk-SK-Wavenet-A",
    "tr-TR-Wavenet-A", "tr-TR-Wavenet-B", "tr-TR-Wavenet-C", "tr-TR-Wavenet-D",
    "tr-TR-Wavenet-E", "uk-UA-Wavenet-A", "ar-XA-Wavenet-A", "ar-XA-Wavenet-B",
    "ar-XA-Wavenet-C", "cs-CZ-Wavenet-A", "nl-NL-Wavenet-B", "nl-NL-Wavenet-C",
    "nl-NL-Wavenet-D", "nl-NL-Wavenet-E", "en-IN-Wavenet-A", "en-IN-Wavenet-B",
    "en-IN-Wavenet-C", "fil-PH-Wavenet-A", "fi-FI-Wavenet-A", "el-GR-Wavenet-A",
    "hi-IN-Wavenet-A", "hi-IN-Wavenet-B", "hi-IN-Wavenet-C", "hu-HU-Wavenet-A",
    "id-ID-Wavenet-A", "id-ID-Wavenet-B", "id-ID-Wavenet-C", "it-IT-Wavenet-B",
    "it-IT-Wavenet-C", "it-IT-Wavenet-D", "ja-JP-Wavenet-B", "ja-JP-Wavenet-C",
    "ja-JP-Wavenet-D", "cmn-CN-Wavenet-A", "cmn-CN-Wavenet-B", "cmn-CN-Wavenet-C",
    "cmn-CN-Wavenet-D", "nb-no-Wavenet-E", "nb-no-Wavenet-A", "nb-no-Wavenet-B",
    "nb-no-Wavenet-C", "nb-no-Wavenet-D", "vi-VN-Wavenet-A", "vi-VN-Wavenet-B",
    "vi-VN-Wavenet-C", "vi-VN-Wavenet-D", "sr-rs-Standard-A", "lv-lv-Standard-A",
    "is-is-Standard-A", "bg-bg-Standard-A", "af-ZA-Standard-A", "Tracy", "Danny",
    "Huihui", "Yaoyao", "Kangkang", "HanHan", "Zhiwei", "Asaf", "An", "Stefanos",
    "Filip", "Ivan", "Heidi", "Herena", "Kalpana", "Hemant", "Matej", "Andika",
    "Rizwan", "Lado", "Valluvar", "Linda", "Heather", "Sean", "Michael",
    "Karsten", "Guillaume", "Pattara", "Jakub", "Szabolcs", "Hoda", "Naayf"
];

class TTSProvider {
    constructor(cfg = {}) {
        this.cfg = cfg;
        this.activeAudio = null;
    }

    async init() {
        console.log(`Initializing ${this.constructor.name}`);
        return true;
    }

    isAvailable() {
        return false;
    }

    getVoices() {
        return [];
    }

    async speak(text, opts = {}) {
        console.log(text, opts, "speak debug", this.cfg);
        throw new Error(`'speak' not implemented in ${this.constructor.name}`);
    }

    async generateAudioUrl(text, opts = {}) {
        throw new Error(`'generateAudioUrl' not implemented in ${this.constructor.name}`);
    }
    pause() {
        if (this.activeAudio) {
            console.log(`Pausing audio for ${this.constructor.name}`);
            this.activeAudio.pause();
        }
    }
    stop() {
        if (this.activeAudio) {
            console.log(`Stopping audio for ${this.constructor.name}`);
            this.activeAudio.pause();
            this.activeAudio.oncanplaythrough = null;
            this.activeAudio.onended = null;
            this.activeAudio.onerror = null;
            this.activeAudio.src = '';
            this.activeAudio = null;
        }
    }
    resume(){
        if (this.activeAudio) {
            console.log(`Resuming audio for ${this.constructor.name}`);
            this.activeAudio.play();
        }
    }
}

const defaultSeCfg = {
    defaultVoice: "Brian", rate: 1.0, pitch: 1.0, volume: 0.8, cacheSize: 50
};

class StreamElementsProvider extends TTSProvider {
    static defaultSeCfg = defaultSeCfg;

    constructor(cfg = {}) {
        const mergedCfg = { ...StreamElementsProvider.defaultSeCfg, ...cfg };
        super(mergedCfg);
        this.endpoint = "https://api.streamelements.com/kappa/v2/speech";
        this.cache = new Map();
        this.cacheKeys = [];
        console.log(`StreamElementsProvider initialized with cfg:`, this.cfg);
    }

    async init() {
        return super.init();
    }

    isAvailable() {
        return true;
    }

    getVoices() {
        return streamElementsVoices.map(name => ({ name }));
    }

    _getFinalOpts(opts = {}) {
        return {
            voiceName: opts.voiceName ?? this.cfg.defaultVoice,
            rate: opts.rate ?? this.cfg.rate,
            pitch: opts.pitch ?? this.cfg.pitch,
            volume: opts.volume ?? this.cfg.volume,
            cacheSize: this.cfg.cacheSize
        };
    }

    async generateAudioUrl(text, opts = {}) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
             return Promise.reject(new Error("Text cannot be empty"));
        }

        const finalOpts = this._getFinalOpts(opts);
        const cacheKey = `${finalOpts.voiceName}|${text}`;

        if (this.cache.has(cacheKey)) {
            console.log(`Cache hit: ${cacheKey}`);
            const idx = this.cacheKeys.indexOf(cacheKey);
            if (idx > -1) this.cacheKeys.splice(idx, 1);
            this.cacheKeys.push(cacheKey);
            return this.cache.get(cacheKey);
        }

        console.log(`Cache miss: ${cacheKey}. Fetching...`);

        const params = new URLSearchParams({ voice: finalOpts.voiceName, text: text.trim() });
        const reqUrl = `${this.endpoint}?${params.toString()}`;

        try {
            const resp = await fetch(reqUrl);
            if (!resp.ok) throw new Error(`SE API error: ${resp.status} ${resp.statusText}`);

            const blob = await resp.blob();
            if (blob.type !== 'audio/mpeg') {
                 console.warn(`Unexpected audio format: ${blob.type}`);
            }
            const blobUrl = URL.createObjectURL(blob);

            if (this.cacheKeys.length >= finalOpts.cacheSize) {
                const oldestKey = this.cacheKeys.shift();
                const oldestUrl = this.cache.get(oldestKey);
                console.log(`Cache full. Revoking: ${oldestKey}`);
                URL.revokeObjectURL(oldestUrl);
                this.cache.delete(oldestKey);
            }

            this.cache.set(cacheKey, blobUrl);
            this.cacheKeys.push(cacheKey);
            return blobUrl;

        } catch (err) {
            console.error("Error generating SE audio URL:", err);
            throw err;
        }
    }

    async speak(text, opts = {}) {
        console.log(text, opts, "speak debug", this.cfg);
        this.stop();
        const finalOpts = this._getFinalOpts(opts);

        try {
            const audioUrl = await this.generateAudioUrl(text, finalOpts);
            const audio = new Audio(audioUrl);
            this.activeAudio = audio;

            audio.volume = Math.max(0, Math.min(1, finalOpts.volume));
            audio.playbackRate = Math.max(0.5, Math.min(4, finalOpts.rate));
            audio.preservesPitch = finalOpts.pitch === 1.0 && finalOpts.rate !== 1.0;

            console.log(`Playing audio: "${text}" opts:`, {
                src: audioUrl.substring(0, 50) + '...',
                volume: audio.volume,
                rate: audio.playbackRate,
                preservesPitch: audio.preservesPitch
             });

            return new Promise((resolve, reject) => {
                audio.oncanplaythrough = () => audio.play().catch(reject);
                audio.onended = () => {
                    console.log(`Audio finished: "${text}"`);
                    this.activeAudio = null;
                    resolve();
                };
                audio.onerror = (e) => {
                    console.error(`Error playing audio "${text}":`, e);
                    this.activeAudio = null;
                    reject(new Error(`Audio playback error: ${e.message || 'Unknown'}`));
                };
            });

        } catch (err) {
            console.error(`Error in speak "${text}":`, err);
            this.stop();
            return Promise.reject(err);
        }
    }
}

const defaultRvCfg = {
    defaultVoice: "UK English Female", rate: 1.0, pitch: 1.0, volume: 1.0
};

class ResponsiveVoiceProvider extends TTSProvider {
    static defaultRvCfg = defaultRvCfg;

    constructor(cfg = {}) {
        const mergedCfg = { ...ResponsiveVoiceProvider.defaultRvCfg, ...cfg };
        super(mergedCfg);
        this.voices = [];
        this.initialized = false;
        console.log(`ResponsiveVoiceProvider initialized with cfg:`, this.cfg);
    }

    async init() {
        await super.init();
        if (this.isAvailable()) {
            try {
                await new Promise(res => setTimeout(res, 100));
                if (window.responsiveVoice.getVoices) {
                    this.voices = window.responsiveVoice.getVoices().map(v => ({ name: v.name }));
                    this.initialized = true;
                    console.log(`RV initialized. Found ${this.voices.length} voices.`);
                    return true;
                } else {
                    console.warn("RV available, but getVoices not ready.");
                    return false;
                }
            } catch (err) {
                console.error("Error during RV initialization:", err);
                return false;
            }
        } else {
            console.warn("window.responsiveVoice not found.");
            return false;
        }
    }

    isAvailable() {
        return typeof window !== 'undefined' && !!window.responsiveVoice;
    }

    getVoices() {
        if (!this.initialized) {
            console.warn("Getting voices before RV initialized.");
        }
        return this.voices;
    }

    _getFinalOpts(opts = {}) {
        return {
            voiceName: opts.voiceName ?? this.cfg.defaultVoice,
            rate: opts.rate ?? this.cfg.rate,
            pitch: opts.pitch ?? this.cfg.pitch,
            volume: opts.volume ?? this.cfg.volume,
        };
    }

    async speak(text, opts = {}) {
        console.log(text, opts, "speak debug", this.cfg);
        if (!this.isAvailable()) return Promise.reject(new Error('RV lib not available.'));
        if (!this.initialized) return Promise.reject(new Error('RV not initialized. Call init().'));
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
           return Promise.reject(new Error("Text cannot be empty"));
        }

        const finalOpts = this._getFinalOpts(opts);
        this.stop();
        console.log(`Speaking with RV: "${text}" opts:`, finalOpts);

        return new Promise((resolve, reject) => {
            const params = {
                rate: Math.max(0, Math.min(1.5, finalOpts.rate)),
                pitch: Math.max(0, Math.min(2, finalOpts.pitch)),
                volume: Math.max(0, Math.min(1, finalOpts.volume)),
                onstart: () => console.log("RV started."),
                onend: () => {
                    console.log(`RV finished: "${text}"`);
                    resolve();
                },
                onerror: (err) => {
                    console.error(`RV error for "${text}":`, err);
                    try { window.responsiveVoice.cancel(); } catch (e) {}
                    reject(new Error(`RV error: ${err?.message || 'Unknown'}`));
                }
            };

            try {
               window.responsiveVoice.speak(text.trim(), finalOpts.voiceName, params);
            } catch (err) {
                 console.error("Error calling RV speak:", err);
                 reject(err);
            }
        });
    }

    async generateAudioUrl(text, opts = {}) {
        console.warn("RV does not support generating audio URLs.");
        return Promise.reject(new Error('RV does not support audio URL generation.'));
    }

    stop() {
        if (this.isAvailable() && window.responsiveVoice.isPlaying()) {
            console.log(`Stopping RV audio.`);
            try { window.responsiveVoice.cancel(); } catch (err) {
                 console.error("Error calling RV cancel:", err);
            }
        }
    }
}

const defaultWsCfg = {
    rate: 1.0, pitch: 1.0, volume: 1.0, defaultVoice: null
};

class WebSpeechProvider extends TTSProvider {
    constructor(cfg = {}) {
        super({ ...defaultWsCfg, ...cfg });
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtt = null;
    }

    async init() {
        if (!this.isAvailable()) {
            console.warn('Web Speech API not available.');
            return false;
        }
        console.log(`Initializing ${this.constructor.name}`);
        return new Promise((resolve) => {
            const loadVoices = () => {
                this.voices = (this.synth?.getVoices() ?? []).map(v => ({
                    name: v.name, lang: v.lang, default: v.default,
                    voiceURI: v.voiceURI, localService: v.localService, _native: v
                }));
                console.log(`Loaded ${this.voices.length} voices.`);
                resolve(true);
            };

            let initialVoices = this.synth?.getVoices() ?? [];
            if (initialVoices.length > 0) {
                this.voices = initialVoices.map(v => ({
                    name: v.name, lang: v.lang, default: v.default,
                    voiceURI: v.voiceURI, localService: v.localService, _native: v
                }));
                console.log(`${this.voices.length} voices available immediately.`);
                resolve(true);
            } else {
                console.log('Waiting for voiceschanged event...');
                this.synth?.addEventListener('voiceschanged', loadVoices, { once: true });
                setTimeout(() => { if (this.voices.length === 0) loadVoices(); }, 1000);
            }
        });
    }

    isAvailable() {
        return typeof window !== 'undefined' && !!window.speechSynthesis;
    }

    getVoices() {
        return this.voices;
    }

    _createUtt(text, opts = {}) {
        if (!this.isAvailable()) {
            console.error('Web Speech API not available');
            return null;
        }

        const utt = new SpeechSynthesisUtterance(text);
        const mergedOpts = { ...this.cfg, ...opts };
        let voice = null;

        if (opts.voiceName) {
            voice = this.voices.find(v => v.name === opts.voiceName)?._native;
        } else if (mergedOpts.defaultVoice) {
            voice = this.voices.find(v => v.name === mergedOpts.defaultVoice)?._native;
        }

        if (voice) {
            utt.voice = voice;
        } else if (this.voices.length > 0) {
            console.warn("Voice not found, browser default used.");
        }

        utt.rate = Math.max(0.1, Math.min(10, parseFloat(mergedOpts.rate ?? 1.0)));
        utt.pitch = Math.max(0, Math.min(2, parseFloat(mergedOpts.pitch ?? 1.0)));
        utt.volume = Math.max(0, Math.min(1, parseFloat(mergedOpts.volume ?? 1.0)));

        return utt;
    }

    async speak(text, opts = {}) {
        console.log(text, opts, "speak debug", this.cfg);
        if (this.synth?.speaking) {
             console.warn("Synth speaking. Cancelling previous.");
             this.synth.cancel();
        }

        const utt = this._createUtt(text, opts);
        if (!utt) return Promise.reject(new Error('Failed to create utterance.'));

        return new Promise((resolve, reject) => {
            this.currentUtt = utt;
            utt.onend = () => {
                console.log("Speech finished.");
                this.currentUtt = null;
                resolve();
            };
            utt.onerror = (e) => {
                console.error("Speech error:", e);
                this.currentUtt = null;
                reject(new Error(`Speech error: ${e.error}`));
            };
            this.synth.speak(utt);
        });
    }

    async generateAudioUrl(text, opts = {}) {
        console.warn("generateAudioUrl for WebSpeech plays audio aloud and is unreliable.");
        return Promise.reject(new Error('WebSpeech audio generation not supported reliably.'));
    }

    stop() {
        if (this.isAvailable()) {
            if (this.synth?.speaking || this.synth?.pending) {
                 console.log(`Stopping Web Speech for ${this.constructor.name}`);
                 this.synth.cancel();
            }
            this.currentUtt = null;
        }
    }
}
export { TTSProvider, StreamElementsProvider, ResponsiveVoiceProvider, WebSpeechProvider };