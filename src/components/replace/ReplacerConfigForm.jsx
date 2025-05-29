// ReplacerConfig.jsx
import { createSignal, createEffect, For } from 'solid-js';
import ReplacementItemForm from './ReplacementItemForm';
import HighlightedResult from './HighlightedResult'; // Nuevo componente
import './ReplacerConfig.css';

// Clase ConfigurableReplacer (sin cambios)
class ConfigurableReplacer {
  constructor(options = {}) {
    this.config = {
      instanceId: options.instanceId || "default",
      replacements: options.replacements || this.getDefaultReplacements(),
      removeBackslashes: options.removeBackslashes !== undefined ? options.removeBackslashes : true,
      useLocalStorage: options.useLocalStorage !== undefined ? options.useLocalStorage : true,
      localStorageKeys: options.localStorageKeys || {
        playerName: ["playerNameInput", "playerName"],
      },
    };
    this.loadConfig();
  }

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
      playername: { dataKey: "playerName", defaultValue: "@a" },
      diamonds: { dataKey: "diamondCount", defaultValue: "50testDiamonds" },
      likecount: { dataKey: "likeCount", defaultValue: "50testLikes" },
      followRole: { dataKey: "followRole", defaultValue: "followRole 0" },
      userId: { dataKey: "userId", defaultValue: "1235646" },
      teamMemberLevel: { dataKey: "teamMemberLevel", defaultValue: "teamMemberLevel 0" },
      subMonth: { dataKey: "subMonth", defaultValue: "subMonth 0" }
    };
  }

  loadConfig() {
    try {
      const savedConfig = localStorage.getItem(`configReplacer_${this.config.instanceId}`);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (e) {
      console.error("Error loading saved configuration:", e);
    }
  }

  saveConfig() {
    try {
      localStorage.setItem(
        `configReplacer_${this.config.instanceId}`,
        JSON.stringify(this.config)
      );
    } catch (e) {
      console.error("Error saving configuration:", e);
    }
  }

  // Método mejorado que devuelve tanto el resultado como los mapeos de reemplazo
  replaceWithTracking(input, data = {}) {
    const replacementMap = new Map();
    const result = this.processRecursivelyWithTracking(input, data, replacementMap);
    return { result, replacementMap };
  }

  processRecursivelyWithTracking(input, data, replacementMap) {
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
      const result = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.processRecursivelyWithTracking(value, data, replacementMap);
      }
      return result;
    }

    return input;
  }

  replaceInStringWithTracking(text, data, replacementMap) {
    let replacedText = text;

    Object.entries(this.config.replacements).forEach(([pattern, options]) => {
      const { dataKey, defaultValue } = options;
      const replaceValue = data[dataKey] || defaultValue;
      const regex = new RegExp(this.escapeRegExp(pattern), "g");
      
      // Buscar todas las coincidencias para rastrear los reemplazos
      let match;
      while ((match = regex.exec(text)) !== null) {
        replacementMap.set(String(replaceValue), {
          original: pattern,
          dataKey: dataKey,
          replaced: String(replaceValue)
        });
        regex.lastIndex = 0; // Reset para evitar bucle infinito
        break;
      }
      
      replacedText = replacedText.replace(regex, String(replaceValue));
    });

    if (this.config.removeBackslashes) {
      replacedText = replacedText.replace(/\\/g, "");
    }

    return replacedText;
  }

  replace(input, data = {}) {
    return this.processRecursively(input, data);
  }

  processRecursively(input, data) {
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
      const result = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.processRecursively(value, data);
      }
      return result;
    }

    return input;
  }

  replaceInString(text, data) {
    let replacedText = text;

    Object.entries(this.config.replacements).forEach(([pattern, options]) => {
      const { dataKey, defaultValue } = options;
      const replaceValue = data[dataKey] || defaultValue;
      const regex = new RegExp(this.escapeRegExp(pattern), "g");
      replacedText = replacedText.replace(regex, String(replaceValue));
    });

    if (this.config.removeBackslashes) {
      replacedText = replacedText.replace(/\\/g, "");
    }

    return replacedText;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default function ReplacerConfig() {
  const [instanceId, setInstanceId] = createSignal("default");
  const [removeBackslashes, setRemoveBackslashes] = createSignal(true);
  const [useLocalStorage, setUseLocalStorage] = createSignal(true);
  const [replacements, setReplacements] = createSignal([]);
  const [testInput, setTestInput] = createSignal('{"usuario": "uniqueId", "mensaje": "comment", "likes": "{likes}"}');
  const [testData, setTestData] = createSignal('{"uniqueId": "usuario123", "comment": "¡Hola mundo!", "likeCount": "999"}');
  const [testResult, setTestResult] = createSignal("");
  const [replacementMap, setReplacementMap] = createSignal(new Map());
  const [resultError, setResultError] = createSignal(false);

  let replacer = new ConfigurableReplacer();

  createEffect(() => {
    const defaultReplacements = Object.entries(replacer.getDefaultReplacements()).map(([pattern, config]) => ({
      id: Date.now() + Math.random(),
      pattern,
      dataKey: config.dataKey,
      defaultValue: config.defaultValue
    }));
    setReplacements(defaultReplacements);
    loadSavedConfig();
  });

  const loadSavedConfig = () => {
    try {
      const savedConfig = localStorage.getItem(`configReplacer_${instanceId()}`);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setInstanceId(config.instanceId || "default");
        setRemoveBackslashes(config.removeBackslashes === undefined ? true : config.removeBackslashes);
        setUseLocalStorage(config.useLocalStorage === undefined ? true : config.useLocalStorage);
        
        if (config.replacements) {
          const loadedReplacements = Object.entries(config.replacements).map(([pattern, options]) => ({
            id: Date.now() + Math.random(),
            pattern,
            dataKey: options.dataKey,
            defaultValue: options.defaultValue
          }));
          setReplacements(loadedReplacements);
        }
      }
    } catch (e) {
      console.error('Error loading saved config:', e);
    }
  };

  const addReplacement = () => {
    setReplacements(prev => [...prev, {
      id: Date.now() + Math.random(),
      pattern: "",
      dataKey: "",
      defaultValue: ""
    }]);
  };

  const removeReplacement = (id) => {
    setReplacements(prev => prev.filter(r => r.id !== id));
  };

  const updateReplacement = (id, field, value) => {
    setReplacements(prev => prev.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const saveConfiguration = () => {
    const config = {
      instanceId: instanceId(),
      removeBackslashes: removeBackslashes(),
      useLocalStorage: useLocalStorage(),
      replacements: {}
    };

    replacements().forEach(r => {
      if (r.pattern.trim() && r.dataKey.trim()) {
        config.replacements[r.pattern] = {
          dataKey: r.dataKey,
          defaultValue: r.defaultValue
        };
      }
    });

    replacer.config = { ...replacer.config, ...config };
    replacer.saveConfig();
    alert('✅ Configuración guardada exitosamente!');
  };

  const testReplace = () => {
    try {
      let parsedInput;
      let testDataObj = {};
      
      if (testData().trim()) {
        testDataObj = JSON.parse(testData());
      }
      
      try {
        parsedInput = JSON.parse(testInput());
      } catch {
        parsedInput = testInput();
      }

      const currentReplacements = {};
      replacements().forEach(r => {
        if (r.pattern.trim() && r.dataKey.trim()) {
          currentReplacements[r.pattern] = {
            dataKey: r.dataKey,
            defaultValue: r.defaultValue
          };
        }
      });
      
      replacer.config.replacements = currentReplacements;
      replacer.config.removeBackslashes = removeBackslashes();
      
      // Usar el método con tracking para obtener mapeo de reemplazos
      const { result, replacementMap: newReplacementMap } = replacer.replaceWithTracking(parsedInput, testDataObj);
      
      setReplacementMap(newReplacementMap);
      
      if (typeof result === 'object') {
        setTestResult(JSON.stringify(result, null, 2));
      } else {
        setTestResult(result);
      }
      setResultError(false);
    } catch (error) {
      setTestResult(`❌ Error: ${error.message}`);
      setResultError(true);
      setReplacementMap(new Map());
    }
  };

  const exportConfig = () => {
    const config = {
      instanceId: instanceId(),
      removeBackslashes: removeBackslashes(),
      useLocalStorage: useLocalStorage(),
      replacements: {},
      exportedAt: new Date().toISOString()
    };

    replacements().forEach(r => {
      if (r.pattern.trim() && r.dataKey.trim()) {
        config.replacements[r.pattern] = {
          dataKey: r.dataKey,
          defaultValue: r.defaultValue
        };
      }
    });
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `replacer-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          setInstanceId(config.instanceId || 'default');
          setRemoveBackslashes(config.removeBackslashes === undefined ? true : config.removeBackslashes);
          setUseLocalStorage(config.useLocalStorage === undefined ? true : config.useLocalStorage);
          
          if (config.replacements) {
            const importedReplacements = Object.entries(config.replacements).map(([pattern, options]) => ({
              id: Date.now() + Math.random(),
              pattern,
              dataKey: options.dataKey,
              defaultValue: options.defaultValue
            }));
            setReplacements(importedReplacements);
          }
          alert('✅ Configuración importada exitosamente!');
        } catch (error) {
          alert(`❌ Error al importar configuración: ${error.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div class="replacer-app-container">
      <div class="config-card">
        <div class="config-card-header">
          <h1 class="main-title">Configurador de Reemplazos</h1>
          <p class="subtitle">Gestiona patrones de reemplazo dinámicamente con SolidJS</p>
        </div>
        
        <div class="config-card-body">
          {/* Configuración General */}
          <section class="config-section general-config-section">
            <h2 class="section-title">Configuración General</h2>
            <div class="grid-container two-columns">
              <div class="form-group">
                <label for="instanceId" class="form-label">Instance ID</label>
                <input 
                  id="instanceId"
                  type="text" 
                  value={instanceId()}
                  onInput={(e) => setInstanceId(e.target.value)}
                  class="form-input"
                  placeholder="default"
                />
              </div>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={removeBackslashes()}
                    onChange={(e) => setRemoveBackslashes(e.target.checked)}
                    class="form-checkbox"
                  />
                  <span class="checkbox-text">Remover Backslashes</span>
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={useLocalStorage()}
                    onChange={(e) => setUseLocalStorage(e.target.checked)}
                    class="form-checkbox"
                  />
                  <span class="checkbox-text">Usar Local Storage</span>
                </label>
              </div>
            </div>
          </section>

          {/* Área de Pruebas */}
          <section class="config-section test-area-section">
            <h2 class="section-title">Probar Reemplazos</h2>
            <div class="grid-container responsive-columns">
              <div class="test-input-group">
                <div class="form-group">
                  <label for="testInput" class="form-label">Entrada de Prueba</label>
                  <textarea 
                    id="testInput"
                    rows="4" 
                    value={testInput()}
                    onInput={(e) => setTestInput(e.target.value)}
                    class="form-textarea"
                    placeholder='Ejemplo: {"usuario": "uniqueId", "mensaje": "comment", "likes": "{likes}"}'
                  />
                </div>
                <div class="form-group">
                  <label for="testData" class="form-label">Datos de Prueba (JSON)</label>
                  <textarea
                    id="testData" 
                    rows="3" 
                    value={testData()}
                    onInput={(e) => setTestData(e.target.value)}
                    class="form-textarea"
                    placeholder='{"uniqueId": "usuario123", "comment": "¡Hola mundo!", "likeCount": "999"}'
                  />
                </div>
                <button 
                  type="button" 
                  onClick={testReplace}
                  class="button button-primary button-full-width"
                >
                  🧪 Probar Reemplazo
                </button>
              </div>
              <div class="test-result-group">
                <label class="form-label">Resultado</label>
                {!resultError() && testResult() ? (
                  <HighlightedResult 
                    result={testResult()} 
                    replacementMap={replacementMap()} 
                  />
                ) : (
                  <div 
                    class={`test-result-output ${resultError() ? 'error' : 'success'}`}
                  >
                    {testResult() || "Resultado aparecerá aquí..."}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Configuración de Reemplazos */}
          <section class="config-section">
            <div class="section-header">
              <h2 class="section-title">Configuración de Reemplazos</h2>
              <button 
                type="button" 
                onClick={addReplacement}
                class="button button-success"
              >
                ➕ Agregar Reemplazo
              </button>
            </div>
            
            <div class="replacements-list">
              <For each={replacements()}>
                {(replacement) => (
                  <ReplacementItemForm
                    replacement={replacement}
                    onUpdate={updateReplacement}
                    onRemove={removeReplacement}
                  />
                )}
              </For>
            </div>
          </section>

          {/* Botones de Acción */}
          <div class="action-buttons">
            <button 
              type="button" 
              onClick={importConfig}
              class="button button-warning"
            >
              📥 Importar Configuración
            </button>
            <button 
              type="button" 
              onClick={exportConfig}
              class="button button-info"
            >
              📤 Exportar Configuración
            </button>
            <button 
              type="button" 
              onClick={saveConfiguration}
              class="button button-success"
            >
              💾 Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}