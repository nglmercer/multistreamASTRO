// Archivo: ConfigurableReplacer.ts

// Tipos para las opciones de configuración
interface ReplacementOption {
  dataKey: string;
  defaultValue: string;
}

interface ReplacementConfig {
  [pattern: string]: ReplacementOption;
}

interface LocalStorageKeys {
  playerName: string[];
  [key: string]: string[];
}

interface ConfigOptions {
  instanceId?: string;
  replacements?: ReplacementConfig;
  removeBackslashes?: boolean;
  useLocalStorage?: boolean;
  localStorageKeys?: LocalStorageKeys;
}

interface Config {
  instanceId: string;
  replacements: ReplacementConfig;
  removeBackslashes: boolean;
  useLocalStorage: boolean;
  localStorageKeys: LocalStorageKeys;
}

// Tipo para los datos de entrada
interface ReplacementData {
  [key: string]: string | number | undefined;
}

// Tipo para el mapeo de reemplazos
interface ReplacementMapping {
  original: string;
  dataKey: string;
  replaced: string;
}

// Tipo para el resultado con tracking
interface ReplacementResult {
  result: any;
  replacementMap: Map<string, ReplacementMapping>;
}

// Tipos de entrada permitidos para el procesamiento recursivo
type ProcessableInput = string | number | boolean | null | undefined | ProcessableInput[] | { [key: string]: ProcessableInput };

class ConfigurableReplacer {
  public config: Config; // Hecho público para acceso/modificación desde ReplacerConfig.jsx

  constructor(options: ConfigOptions = {}) {
    // Primero establece los valores predeterminados y luego carga desde localStorage si está habilitado.
    const baseConfig: Config = {
      instanceId: options.instanceId || "default",
      replacements: options.replacements || this.getDefaultReplacements(), // Usa defaults si no se proveen
      removeBackslashes: options.removeBackslashes !== undefined ? options.removeBackslashes : true,
      useLocalStorage: options.useLocalStorage !== undefined ? options.useLocalStorage : true,
      localStorageKeys: options.localStorageKeys || {
        playerName: ["playerNameInput", "playerName"],
      },
    };
    this.config = baseConfig; // Asigna la configuración base
    
    if (this.config.useLocalStorage) { // Carga solo si useLocalStorage es true
        this.loadConfig(); // loadConfig ahora puede fusionar con los defaults ya establecidos
    }
  }

  // Hecho público para que ReplacerConfig.jsx pueda acceder a los reemplazos por defecto
  public getDefaultReplacements(): ReplacementConfig {
    return {
      uniqueId: { dataKey: "uniqueId", defaultValue: "testUser" },
      uniqueid: { dataKey: "uniqueId", defaultValue: "testUser" },
      nickname: { dataKey: "nickname", defaultValue: "testUser" },
      comment: { dataKey: "comment", defaultValue: "testComment" },
      "{milestoneLikes}": { dataKey: "likeCount", defaultValue: "50testLikes" },
      "{likes}": { dataKey: "likeCount", defaultValue: "50testLikes" },
      message: { dataKey: "comment", defaultValue: "testcomment" },
      giftName: { dataKey: "giftName", defaultValue: "testgiftName" },
      giftname: { dataKey: "giftName", defaultValue: "testgiftName" },
      repeatCount: { dataKey: "repeatCount", defaultValue: "123" },
      repeatcount: { dataKey: "repeatCount", defaultValue: "123" },
      playername: { dataKey: "playerName", defaultValue: "@a" },
      diamonds: { dataKey: "diamondCount", defaultValue: "50testDiamonds" },
      likecount: { dataKey: "likeCount", defaultValue: "50testLikes" },
      followRole: { dataKey: "followRole", defaultValue: "followRole 0" },
      userId: { dataKey: "userId", defaultValue: "1235646" },
      teamMemberLevel: { dataKey: "teamMemberLevel", defaultValue: "teamMemberLevel 0" },
      subMonth: { dataKey: "subMonth", defaultValue: "subMonth 0" }
      // Para un reemplazo como "uniqueId dice comment", deberías añadirlo como un patrón específico si quieres reemplazar la frase entera:
      // "uniqueId dice comment": { dataKey: "customPhraseKey", defaultValue: "Usuario Ejemplo dice Hola Ejemplo" }
      // O, se manejará reemplazando "uniqueId" y "comment" individualmente si esos patrones existen.
    };
  }

  private loadConfig(): void {
    // No es necesario verificar useLocalStorage aquí si el constructor ya lo hace.
    // Pero es una buena salvaguarda si se llamara externamente.
    if (!this.config.useLocalStorage) return;

    try {
      const savedConfig = localStorage.getItem(`configReplacer_${this.config.instanceId}`);
      if (savedConfig) {
        const parsedConfig: Partial<Config> = JSON.parse(savedConfig);
        
        // Fusiona la configuración guardada sobre la configuración actual (que ya tiene los defaults).
        // Los reemplazos guardados deben tener prioridad sobre los defaults, pero no borrar defaults no guardados.
        const mergedReplacements = {
          ...this.config.replacements, // Comienza con los reemplazos actuales (podrían ser defaults o ya modificados)
          ...(parsedConfig.replacements || {}) // Sobrescribe con los reemplazos guardados
        };

        this.config = {
          ...this.config, // Mantiene la configuración base actual (instanceId, etc.)
          ...parsedConfig, // Aplica valores guardados como removeBackslashes, etc.
          replacements: mergedReplacements // Aplica los reemplazos fusionados
        };
      }
    } catch (e) {
      console.error("Error loading saved configuration:", e);
    }
  }

  public saveConfig(): void {
    if (!this.config.useLocalStorage) return;
    try {
      localStorage.setItem(
        `configReplacer_${this.config.instanceId}`,
        JSON.stringify(this.config) // Guarda el objeto this.config completo
      );
    } catch (e) {
      console.error("Error saving configuration:", e);
    }
  }

  public replaceWithTracking(input: ProcessableInput, data: ReplacementData = {}): ReplacementResult {
    const replacementMap = new Map<string, ReplacementMapping>();
    const result = this.processRecursivelyWithTracking(input, data, replacementMap);
    return { result, replacementMap };
  }

  private processRecursivelyWithTracking(
    input: ProcessableInput, 
    data: ReplacementData, 
    replacementMap: Map<string, ReplacementMapping>
  ): any {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === "string") {
      return this.replaceInStringWithTracking(input, data, replacementMap);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.processRecursivelyWithTracking(item, data, replacementMap));
    }

    if (typeof input === "object" && input.constructor === Object) {
      const result: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.processRecursivelyWithTracking(value, data, replacementMap);
      }
      return result;
    }

    return input;
  }

  // MÉTODO MODIFICADO Y CORREGIDO
  private replaceInStringWithTracking(
    text: string, // El texto original para esta llamada específica
    data: ReplacementData,
    replacementMap: Map<string, ReplacementMapping>
  ): string {
    let currentTextState = text; // Este es el texto que se modificará iterativamente

    Object.entries(this.config.replacements).forEach(([pattern, options]) => {
      const { dataKey, defaultValue } = options;
      // Determina el valor de reemplazo. Usa defaultValue si data[dataKey] es undefined.
      const valueToReplaceWith = String(
        data[dataKey] === undefined ? defaultValue : data[dataKey]
      );

      // --- Sección de Tracking ---
      // Itera sobre el 'text' original (sin modificar por reemplazos previos en ESTA llamada)
      // para encontrar todas las instancias del patrón actual.
      const trackingRegex = new RegExp(this.escapeRegExp(pattern), "g");
      let match;
      while ((match = trackingRegex.exec(text)) !== null) {
        // El replacementMap está claveado por el valor de reemplazo (`valueToReplaceWith`).
        // Esto es consistente con cómo HighlightedResult lo consume.
        // Nota: Si múltiples patrones originales resultan en el mismo `valueToReplaceWith`,
        // o si un patrón aparece varias veces, el mapa solo almacenará la información
        // del último patrón procesado que resultó en ese `valueToReplaceWith`.
        // Esto es una característica existente del diseño del `replacementMap`.
        replacementMap.set(valueToReplaceWith, {
          original: pattern,
          dataKey: dataKey,
          replaced: valueToReplaceWith
        });
      }
      
      // --- Sección de Reemplazo Real ---
      // Crea una nueva RegExp para la operación de reemplazo real.
      // Esto asegura que `lastIndex` esté fresco (0) para cada patrón.
      const replacementPerformRegex = new RegExp(this.escapeRegExp(pattern), "g");
      // Realiza el reemplazo en `currentTextState`, que acumula los cambios.
      currentTextState = currentTextState.replace(replacementPerformRegex, valueToReplaceWith);
    });

    if (this.config.removeBackslashes) {
      currentTextState = currentTextState.replace(/\\/g, "");
    }

    return currentTextState;
  }

  public replace(input: ProcessableInput, data: ReplacementData = {}): any {
    return this.processRecursively(input, data);
  }

  private processRecursively(input: ProcessableInput, data: ReplacementData): any {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === "string") {
      return this.replaceInString(input, data);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.processRecursively(item, data));
    }

    if (typeof input === "object" && input.constructor === Object) {
      const result: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.processRecursively(value, data);
      }
      return result;
    }

    return input;
  }

  private replaceInString(text: string, data: ReplacementData): string {
    let replacedText = text;

    Object.entries(this.config.replacements).forEach(([pattern, options]) => {
      const { dataKey, defaultValue } = options;
      const replaceValue = String(
        data[dataKey] === undefined ? defaultValue : data[dataKey]
      );
      const regex = new RegExp(this.escapeRegExp(pattern), "g");
      replacedText = replacedText.replace(regex, replaceValue);
    });

    if (this.config.removeBackslashes) {
      replacedText = replacedText.replace(/\\/g, "");
    }

    return replacedText;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default ConfigurableReplacer;
export { ConfigurableReplacer };
export type { 
  ConfigOptions, 
  ReplacementData, 
  ReplacementResult, 
  ReplacementMapping, 
  ReplacementConfig,
  ReplacementOption 
};