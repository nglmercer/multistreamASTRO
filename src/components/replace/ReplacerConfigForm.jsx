// ReplacerConfigForm.jsx
import { createSignal, createEffect, For } from 'solid-js';
import ReplacementItemForm from './ReplacementItemForm';
import { ConfigurableReplacer } from './ConfigurableReplacer';

export default function ReplacerConfigForm(props) {
  const addReplacement = () => {
    props.onReplacementsChange(prev => [...prev, {
      id: Date.now() + Math.random(),
      pattern: "",
      dataKey: "",
      defaultValue: ""
    }]);
  };

  const removeReplacement = (id) => {
    props.onReplacementsChange(prev => prev.filter(r => r.id !== id));
  };

  const updateReplacement = (id, field, value) => {
    props.onReplacementsChange(prev => prev.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const saveConfiguration = () => {
    const config = {
      instanceId: props.instanceId,
      removeBackslashes: props.removeBackslashes,
      useLocalStorage: props.useLocalStorage,
      replacements: {}
    };

    props.replacements.forEach(r => {
      if (r.pattern.trim() && r.dataKey.trim()) {
        config.replacements[r.pattern] = {
          dataKey: r.dataKey,
          defaultValue: r.defaultValue
        };
      }
    });

    const replacer = new ConfigurableReplacer(config);
    replacer.saveConfig();
    alert('✅ Configuración guardada exitosamente!');
  };

  const exportConfig = () => {
    const config = {
      instanceId: props.instanceId,
      removeBackslashes: props.removeBackslashes,
      useLocalStorage: props.useLocalStorage,
      replacements: {},
      exportedAt: new Date().toISOString()
    };

    props.replacements.forEach(r => {
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
          props.onInstanceIdChange(config.instanceId || 'default');
          props.onRemoveBackslashesChange(config.removeBackslashes === undefined ? true : config.removeBackslashes);
          props.onUseLocalStorageChange(config.useLocalStorage === undefined ? true : config.useLocalStorage);
          
          if (config.replacements) {
            const importedReplacements = Object.entries(config.replacements).map(([pattern, options]) => ({
              id: Date.now() + Math.random(),
              pattern,
              dataKey: options.dataKey,
              defaultValue: options.defaultValue
            }));
            props.onReplacementsChange(importedReplacements);
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
    <>
      {/* Configuración General */}
      <section class="config-section general-config-section">
        <h2 class="section-title">Configuración General</h2>
        <div class="grid-container two-columns">
          <div class="form-group">
            <label for="instanceId" class="form-label">Instance ID</label>
            <input 
              id="instanceId"
              type="text" 
              value={props.instanceId}
              onInput={(e) => props.onInstanceIdChange(e.target.value)}
              class="form-input"
              placeholder="default"
            />
          </div>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                checked={props.removeBackslashes}
                onChange={(e) => props.onRemoveBackslashesChange(e.target.checked)}
                class="form-checkbox"
              />
              <span class="checkbox-text">Remover Backslashes</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                checked={props.useLocalStorage}
                onChange={(e) => props.onUseLocalStorageChange(e.target.checked)}
                class="form-checkbox"
              />
              <span class="checkbox-text">Usar Local Storage</span>
            </label>
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
          <For each={props.replacements}>
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
    </>
  );
}