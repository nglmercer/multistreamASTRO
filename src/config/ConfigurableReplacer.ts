// src/utils/ConfigurableReplacer.ts

export interface ReplacementConfig {
  dataKey: string;
  defaultValue: string;
  transform?: (value: string, data: Record<string, any>, replacer: ConfigurableReplacer) => string;
}

export interface ReplacerOptions {
  instanceId?: string;
  replacements?: Record<string, ReplacementConfig>;
  removeBackslashes?: boolean;
  useLocalStorage?: boolean;
  localStorageKeys?: Record<string, string[]>;
}

export class ConfigurableReplacer {
  public config: Required<ReplacerOptions>;

  constructor(options: ReplacerOptions = {}) {
    this.config = {
      instanceId: options.instanceId || "default",
      replacements: options.replacements || this.getDefaultReplacements(),
      removeBackslashes: options.removeBackslashes ?? true,
      useLocalStorage: options.useLocalStorage ?? true,
      localStorageKeys: options.localStorageKeys || {
        playerName: ["playerNameInput", "playerName"],
      },
    };
    this.loadConfig();
  }

  private getDefaultReplacements(): Record<string, ReplacementConfig> {
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
      playername: {
        dataKey: "playerName",
        defaultValue: "@a",
        transform: (value: string, data: Record<string, any>, replacer: ConfigurableReplacer) => {
          if (replacer.config.useLocalStorage && typeof localStorage !== "undefined") {
            const keys = replacer.config.localStorageKeys.playerName;
            for (const key of keys) {
              const storedValue = localStorage.getItem(key);
              if (storedValue) return storedValue;
            }
          }
          return value || data.playerName || "@a";
        },
      },
      diamonds: { dataKey: "diamondCount", defaultValue: "50testDiamonds" },
      likecount: { dataKey: "likeCount", defaultValue: "50testLikes" },
      followRole: { dataKey: "followRole", defaultValue: "followRole 0" },
      userId: { dataKey: "userId", defaultValue: "1235646" },
      teamMemberLevel: { dataKey: "teamMemberLevel", defaultValue: "teamMemberLevel 0" },
      subMonth: { dataKey: "subMonth", defaultValue: "subMonth 0" }
    };
  }

  private loadConfig(): void {
    if (typeof localStorage !== "undefined") {
      const savedConfig = localStorage.getItem(`configReplacer_${this.config.instanceId}`);
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          this.config = { ...this.config, ...parsedConfig };
        } catch (e) {
          console.error("Error loading saved configuration:", e);
        }
      }
    }
  }

  public saveConfig(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        `configReplacer_${this.config.instanceId}`,
        JSON.stringify(this.config)
      );
    }
  }

  /**
   * Reemplaza patrones en strings dentro de un objeto o string, de forma recursiva
   * Solo modifica valores de tipo string, preserva las claves del objeto
   */
  public replace<T>(input: T, data: Record<string, any> = {}): T {
    return this.processRecursively(input, data);
  }

  private processRecursively<T>(input: T, data: Record<string, any>): T {
    // Si es null o undefined, retornar tal como está
    if (input === null || input === undefined) {
      return input;
    }

    // Si es un string, aplicar reemplazos
    if (typeof input === "string") {
      return this.replaceInString(input, data) as T;
    }

    // Si es un array, procesar cada elemento recursivamente
    if (Array.isArray(input)) {
      return input.map(item => this.processRecursively(item, data)) as T;
    }

    // Si es un objeto, procesar solo los valores (no las claves)
    if (typeof input === "object" && input.constructor === Object) {
      const result: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(input)) {
        // La clave se mantiene intacta, solo procesamos el valor
        result[key] = this.processRecursively(value, data);
      }
      
      return result as T;
    }

    // Para otros tipos (number, boolean, Date, etc.), retornar sin modificar
    return input;
  }

  private replaceInString(text: string, data: Record<string, any>): string {
    let replacedText = text;

    // Aplicar reemplazos definidos
    Object.entries(this.config.replacements).forEach(([pattern, options]) => {
      const { dataKey, defaultValue, transform } = options;
      
      let replaceValue: string;
      
      if (transform) {
        replaceValue = transform(data[dataKey] || defaultValue, data, this);
      } else {
        replaceValue = data[dataKey] || defaultValue;
      }

      // Crear regex para el patrón
      const regex = new RegExp(this.escapeRegExp(pattern), "g");
      replacedText = replacedText.replace(regex, String(replaceValue));
    });

    // Remover backslashes si está configurado
    if (this.config.removeBackslashes) {
      replacedText = replacedText.replace(/\\/g, "");
    }

    return replacedText;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  public updateReplacements(newReplacements: Record<string, ReplacementConfig>): void {
    this.config.replacements = { ...this.config.replacements, ...newReplacements };
  }

  public addReplacement(pattern: string, config: ReplacementConfig): void {
    this.config.replacements[pattern] = config;
  }

  public removeReplacement(pattern: string): void {
    delete this.config.replacements[pattern];
  }

  public getReplacements(): Record<string, ReplacementConfig> {
    return { ...this.config.replacements };
  }
}