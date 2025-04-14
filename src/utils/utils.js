class TypeofData {
  // Verificar si el valor es un objeto
  static isObject(value) {
    return value !== null && typeof value === "object";
  }
  static ObjectStringify(value) {
    if (typeof value === "string") {
      try {
        // Intenta analizar la cadena como JSON
        JSON.parse(value);
        // Si no hay error, asumimos que ya es una cadena JSON válida
      } catch (e) {
        // Si no es JSON válido, lo convertimos a JSON
        value = JSON.stringify(value);
      }
    } else if (typeof value === "object") {
      // Si es un objeto, lo convertimos a JSON
      value = JSON.stringify(value);
    }
    return value;
  }
  static returnArray(value) {
    if (this.isArray(value)) {
      return value;
    } else if (this.isString(value)) {
      return value.split(",");
    } else if (this.isObject(value)) {
      return Object.values(value);
    }
    return [];
  }
  // Verificar si el valor es un array
  static isArray(value) {
    return Array.isArray(value);
  }

  // Verificar si el valor es una función
  static isFunction(value) {
    return typeof value === "function";
  }

  // Verificar si el valor es una string
  static isString(value) {
    return typeof value === "string";
  }

  // Verificar si el valor es un número
  static isNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }

  // Verificar si el valor es un booleano
  static isBoolean(value) {
    return typeof value === "boolean";
  }

  // Verificar si el valor es null
  static isNull(value) {
    return value === null;
  }

  // Verificar si el valor es undefined
  static isUndefined(value) {
    return value === undefined;
  }

  // Convertir string a número
  static toNumber(value) {
    if (this.isString(value) && !isNaN(value)) {
      return Number(value);
    } else if (this.isNumber(value)) {
      return value;
    }
    return null; // Devolver NaN si la conversión falla
  }

  // Convertir número a string
  static toString(value) {
    if (this.isNumber(value)) {
      return String(value);
    }
    if (this.isBoolean(value)) {
      return String(value);
    }
    if (this.isObject(value)) {
      return JSON.stringify(value);
    }
    return "";
  }
  static toStringParse(value) {
    if (!value) return value; // Devuelve el valor original si no es una cadena
    if (this.isString(value)) {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn("Failed to parse JSON string:", value);
        return value; // Devuelve el valor original si no se puede analizar
      }
    }
    return value; // Devuelve el valor original si no es una cadena
  }
  // Verificar si un string puede ser convertido a número
  static canBeNumber(value) {
    return this.isString(value) && !isNaN(value);
  }

  // Obtener el tipo del valor en forma de string
  static getType(value) {
    if (this.isObject(value)) return "object";
    if (this.isArray(value)) return "array";
    if (this.isFunction(value)) return "function";
    if (this.isString(value)) return "string";
    if (this.isNumber(value)) return "number";
    if (this.isBoolean(value)) return "boolean";
    if (this.isNull(value)) return "null";
    if (this.isUndefined(value)) return "undefined";
    return "unknown";
  }
}
function flattenSingleObjectInternal(obj, separator) {
  const result = {};

  function recurse(current, path) {
    // Handle null and non-object primitives
    if (current === null || typeof current !== "object") {
      if (path) {
        // Avoid creating entry for top-level primitive
        result[path.slice(0, -separator.length)] = current;
      }
      return;
    }

    // Iterate over keys for objects or indices for arrays
    let isEmpty = true;
    for (const key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        isEmpty = false;
        const newPath = path + key + separator;
        recurse(current[key], newPath);
      }
    }

    // Handle empty objects or arrays as leaf nodes
    if (isEmpty && path) {
      const finalPath = path.slice(0, -separator.length);
      // Assign empty array/object only if it's not the root itself being empty
      if (finalPath) {
        result[finalPath] = Array.isArray(current) ? [] : {};
      }
    }
  }

  recurse(obj, ""); // Start recursion with empty path

  // If input was primitive/null, recurse doesn't add anything, result is {}
  // If input was {} or [], recurse doesn't add anything *unless* nested, result is {}
  // Handle edge case: input itself is {} or [], should return {}
  if (
    Object.keys(result).length === 0 &&
    typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).length === 0
  ) {
    return {}; // Explicitly return {} for top-level {} or [] input
  }

  return result;
}

/**
 * Unflattens a single flattened object back into a nested structure.
 * Helper function for unflatten.
 * @param {object} obj The flattened object.
 * @param {string} separator The separator string.
 * @returns {object|array} The unflattened object or array.
 */
function unflattenSingleObjectInternal(obj, separator) {
  if (Object(obj) !== obj || Array.isArray(obj) || obj === null) {
    return obj; // Return if not a plain object to unflatten
  }
  if (Object.keys(obj).length === 0) {
    return {}; // Unflattening empty gives empty object
  }

  const firstParts = Object.keys(obj).map((k) => k.split(separator)[0]);
  const shouldBeArray =
    firstParts.length > 0 && firstParts.every((part) => /^\d+$/.test(part));
  const result = shouldBeArray ? [] : {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const parts = key.split(separator);
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const nextIsArrayIndex = /^\d+$/.test(nextPart);
      const currentIsArrayIndex = /^\d+$/.test(part);
      const parentIsArray = Array.isArray(current);

      let target = parentIsArray ? current[parseInt(part, 10)] : current[part];

      // Create structure if it doesn't exist or is wrong type
      if (
        target === undefined ||
        target === null ||
        typeof target !== "object"
      ) {
        target = nextIsArrayIndex ? [] : {};
        if (parentIsArray) {
          current[parseInt(part, 10)] = target;
        } else {
          current[part] = target;
        }
      } else if (nextIsArrayIndex && !Array.isArray(target)) {
        // Conflict: Expected array, found object. Overwrite with array.
        target = [];
        if (parentIsArray) {
          current[parseInt(part, 10)] = target;
        } else {
          current[part] = target;
        }
      } else if (!nextIsArrayIndex && Array.isArray(target)) {
        // Conflict: Expected object, found array. Overwrite with object.
        target = {};
        if (parentIsArray) {
          current[parseInt(part, 10)] = target;
        } else {
          current[part] = target;
        }
      }
      // else: exists and is correct type, proceed.

      current = target; // Descend into the structure

      // Safety break if something went wrong
      if (typeof current !== "object" || current === null) {
        console.error(
          `Unflattening error: Path segment ${part} in key ${key} did not lead to an object/array.`
        );
        break;
      }
    }

    // If loop broke, skip assignment for this key
    if (typeof current !== "object" || current === null) continue;

    // Assign the final value
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart) && Array.isArray(current)) {
      current[parseInt(lastPart, 10)] = obj[key];
    } else {
      current[lastPart] = obj[key];
    }
  }

  return result;
}

// --- Main Functions ---

/**
 * Flattens an object, or maps flattening over an array of objects.
 * Uses '.' as the default separator.
 * @param {object|array|any} input The object or array of objects to flatten.
 * @param {string} [separator='.'] The separator to use.
 * @returns {object|array|any} The flattened object, array of flattened objects, or original input if not object/array.
 */
function flattenObject(input, separator = "_") {
  if (Array.isArray(input)) {
    // If it's an array, map over each element and flatten it
    return input.map((item) => flattenSingleObjectInternal(item, separator));
  } else if (typeof input === "object" && input !== null) {
    // If it's a single object (and not null), flatten it
    return flattenSingleObjectInternal(input, separator);
  } else {
    // If it's not an array or object (e.g., primitive, null), return as is
    // or return {} if you prefer consistency for non-processable types
    return input;
  }
}

/**
 * Unflattens an object, or maps unflattening over an array of flattened objects.
 * Uses '.' as the default separator.
 * @param {object|array|any} input The flattened object or array of flattened objects to unflatten.
 * @param {string} [separator='.'] The separator used in keys.
 * @returns {object|array|any} The unflattened object, array of unflattened objects, or original input.
 */
function unflattenObject(input, separator = "_") {
  if (Array.isArray(input)) {
    // If it's an array, map over each element and unflatten it
    return input.map((item) => unflattenSingleObjectInternal(item, separator));
  } else if (typeof input === "object" && input !== null) {
    // If it's a single object (and not null), unflatten it
    return unflattenSingleObjectInternal(input, separator);
  } else {
    // If it's not an array or object, return as is
    return input;
  }
}

class Counter {
  constructor(initialValue = 0, interval = 1000) {
    this.value = initialValue;
    this.interval = interval;
    this.intervalId = null;
  }

  start() {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        this.increment();
        // console.log(`ID generado: ${this.value}`);
      }, this.interval);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  increment() {
    this.value++;
    return this.value;
  }

  getCurrentValue() {
    return this.value;
  }
}
class ComboTracker {
  constructor(resetInterval = 30000) {
    this.comboCounters = {}; // Almacena los contadores por tipo y uniqueId
    this.resetInterval = resetInterval; // Intervalo en milisegundos para reiniciar los contadores

    // Iniciar el temporizador para restablecer los contadores
    this.startResetTimer();
  }

  // Método general para manejar combos entrantes (like, comment, etc.) y retornar el total acumulado
  addCombo(data, comboType = "likeCount") {
    const { uniqueId, value } = data;

    if (!this.comboCounters[uniqueId]) {
      // Inicializar el contador para este uniqueId
      this.comboCounters[uniqueId] = {};
    }

    if (!this.comboCounters[uniqueId][comboType]) {
      // Inicializar el contador para este comboType si no existe
      this.comboCounters[uniqueId][comboType] = 0;
    }

    // Sumar el valor al contador correspondiente
    this.comboCounters[uniqueId][comboType] += value;

    // Retornar el total acumulado de combos para este uniqueId y comboType
    return this.comboCounters[uniqueId][comboType];
  }

  // Método para obtener el total de todos los combos de todos los tipos
  getTotalCombos() {
    let total = 0;
    Object.values(this.comboCounters).forEach((userCombos) => {
      Object.values(userCombos).forEach((count) => {
        total += count;
      });
    });
    return total;
  }

  // Método para restablecer los contadores de todos los tipos
  resetComboCounters() {
    Object.keys(this.comboCounters).forEach((uniqueId) => {
      Object.keys(this.comboCounters[uniqueId]).forEach((comboType) => {
        this.comboCounters[uniqueId][comboType] = 0; // Reinicia el contador para cada tipo
      });
    });
  }

  // Iniciar el temporizador que restablece los contadores periódicamente
  startResetTimer() {
    setInterval(() => {
      this.resetComboCounters();
      // console.log("Los contadores de combos han sido restablecidos.");
    }, this.resetInterval);
  }
}
class ConfigurableReplacer {
  /**
   * Constructor para crear una nueva instancia del reemplazador
   * @param {Object} options - Opciones de configuración
   * @param {String} options.instanceId - ID único para esta instancia (para guardar en localStorage)
   * @param {Object} options.replacements - Mapa de reemplazos {patron: {dataKey, defaultValue, transform}}
   * @param {Boolean} options.removeBackslashes - Si se deben eliminar barras invertidas
   * @param {Function} options.commandParser - Función para extraer el comando (para isCommand=true)
   * @param {Boolean} options.useLocalStorage - Si debe usar localStorage para valores por defecto
   * @param {Object} options.localStorageKeys - Claves para buscar en localStorage
   */
  constructor(options = {}) {
    // Valores por defecto para las opciones
    this.config = {
      instanceId: options.instanceId || "default",
      replacements: options.replacements || this.getDefaultReplacements(),
      removeBackslashes:
        options.removeBackslashes !== undefined
          ? options.removeBackslashes
          : true,
      commandParser: options.commandParser || this.defaultCommandParser,
      useLocalStorage:
        options.useLocalStorage !== undefined ? options.useLocalStorage : true,
      localStorageKeys: options.localStorageKeys || {
        playerName: ["playerNameInput", "playerName"],
      },
    };

    // Cargar configuración guardada desde localStorage si existe
    this.loadConfig();
  }

  /**
   * Obtiene los reemplazos predeterminados (similar a la función original)
   * @returns {Object} Mapa de reemplazos por defecto
   */
  getDefaultReplacements() {
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
        // Función especial que busca en localStorage
        transform: (value, data, replacer) => {
          if (replacer.config.useLocalStorage) {
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
      teamMemberLevel: {
        dataKey: "teamMemberLevel",
        defaultValue: "teamMemberLevel 0",
      },
      subMonth: { dataKey: "subMonth", defaultValue: "subMonth 0" },
    };
  }

  /**
   * Parser predeterminado para comandos (extrae la parte después del primer espacio)
   * @param {String} command - Comando a parsear
   * @returns {String} Comando parseado
   */
  defaultCommandParser(command) {
    return command.split(" ", 2)[1];
  }

  /**
   * Guarda la configuración actual en localStorage
   */
  saveConfig() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        `configReplacer_${this.config.instanceId}`,
        JSON.stringify(this.config)
      );
    }
  }

  /**
   * Carga la configuración desde localStorage
   */
  loadConfig() {
    if (typeof localStorage !== "undefined") {
      const savedConfig = localStorage.getItem(
        `configReplacer_${this.config.instanceId}`
      );
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          this.config = { ...this.config, ...parsedConfig };
        } catch (e) {
          console.error("Error al cargar la configuración guardada:", e);
        }
      }
    }
  }

  /**
   * Actualiza la configuración actual
   * @param {Object} newConfig - Nueva configuración parcial para actualizar
   */
  updateConfig(newConfig) {
    // Actualización profunda para permitir actualizar subobjetos como replacements
    if (newConfig.replacements) {
      this.config.replacements = {
        ...this.config.replacements,
        ...newConfig.replacements,
      };
      delete newConfig.replacements;
    }

    // Actualizar el resto de propiedades
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // Guardar la configuración actualizada
    this.saveConfig();
  }

  /**
   * Añade un nuevo patrón de reemplazo
   * @param {String} pattern - Patrón a reemplazar (sin los delimitadores de regex)
   * @param {Object} options - Opciones para este reemplazo
   */
  addReplacement(pattern, options) {
    this.config.replacements[pattern] = options;
    this.saveConfig();
  }

  /**
   * Elimina un patrón de reemplazo
   * @param {String} pattern - Patrón a eliminar
   */
  removeReplacement(pattern) {
    delete this.config.replacements[pattern];
    this.saveConfig();
  }

  /**
   * Función principal para reemplazar variables
   * @param {String} command - Texto donde se realizarán los reemplazos
   * @param {Object} data - Datos para usar en los reemplazos
   * @param {Boolean} isCommand - Si es un comando que requiere parsing especial
   * @returns {String} Texto con reemplazos aplicados
   */
  replace(command, data = {}, isCommand = false) {
    // Validación del comando
    if (!command || typeof command !== "string") {
      console.warn(
        "Error: 'command' debe ser una cadena de texto.",
        typeof command
      );
      return command;
    }

    // Si es comando, aplicar el parser configurado
    if (isCommand && command.includes(" ")) {
      command = this.config.commandParser(command);
    }

    // Clonar los datos para evitar modificar el objeto original
    const workingData = { ...data };
    let replacedCommand = command;

    // Aplicar cada reemplazo configurado
    Object.entries(this.config.replacements).forEach(([pattern, options]) => {
      const { dataKey, defaultValue, transform } = options;

      // Determinar el valor a usar para el reemplazo
      let replaceValue;

      if (typeof transform === "function") {
        // Usar la función transform si está definida
        replaceValue = transform(workingData[dataKey], workingData, this);
      } else {
        // Usar el valor de los datos o el valor por defecto
        replaceValue = workingData[dataKey] || defaultValue;
      }

      // Crear un regex para el reemplazo global
      const regex = new RegExp(pattern, "g");
      replacedCommand = replacedCommand.replace(regex, replaceValue);
    });

    // Eliminar barras invertidas si está configurado
    if (this.config.removeBackslashes) {
      replacedCommand = replacedCommand.replace(/\\/g, "");
    }

    return replacedCommand;
  }

  /**
   * Importa una configuración completa desde un objeto JSON
   * @param {Object|String} config - Configuración a importar (objeto o string JSON)
   */
  importConfig(config) {
    try {
      // Si es string, parsearlo como JSON
      const configObj =
        typeof config === "string" ? JSON.parse(config) : config;
      this.config = configObj;
      this.saveConfig();
      return true;
    } catch (e) {
      console.error("Error al importar configuración:", e);
      return false;
    }
  }

  /**
   * Exporta la configuración actual como objeto JSON
   * @returns {Object} Configuración actual
   */
  exportConfig() {
    return this.config;
  }
}

// Función de conveniencia que mantiene la misma firma que la original
const replaceVariables = (command, data, isCommand = false) => {
  // Usar una instancia por defecto
  const defaultReplacer = (window._defaultReplacer =
    window._defaultReplacer || new ConfigurableReplacer());

  return defaultReplacer.replace(command, data, isCommand);
};
export {
  TypeofData,
  flattenObject,
  unflattenObject,
  Counter,
  ComboTracker,
  ConfigurableReplacer,
  replaceVariables,
};
