// ReplacerConfigForm.jsx
import { createSignal, createEffect, For, createMemo } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import ReplacementItemForm from './ReplacementItemForm';
import { ConfigurableReplacer } from './ConfigurableReplacer';

export default function ReplacerConfigForm(props) {
  // Convertir el array de props a un store para actualizaciones granulares
  const [replacements, setReplacements] = createStore([]);
  
  // Sincronizar el store con las props cuando cambien (para importación)
  createEffect(() => {
    setReplacements(props.replacements || []);
  });
  
  // Actualizar las props cuando cambie el store local
  createEffect(() => {
    props.onReplacementsChange(replacements);
  });

  const addReplacement = () => {
    const newReplacement = {
      id: Date.now() + Math.random(),
      pattern: "",
      dataKey: "",
      defaultValue: ""
    };
    setReplacements(prev => [...prev, newReplacement]);
  };

  const removeReplacement = (id) => {
    setReplacements(prev => prev.filter(r => r.id !== id));
  };

  // Esta función actualiza solo el elemento específico sin afectar otros
  const updateReplacement = (id, field, value) => {
    setReplacements(
      replacement => replacement.id === id,
      field,
      value
    );
  };

  const saveConfiguration = () => {
    const config = {
      removeBackslashes: props.removeBackslashes,
      useLocalStorage: props.useLocalStorage,
      replacements: {}
    };

    replacements.forEach(r => {
      if (r.pattern.trim() && r.dataKey.trim()) {
        config.replacements[r.pattern] = {
          dataKey: r.dataKey,
          defaultValue: r.defaultValue
        };
      }
    });

    const replacer = new ConfigurableReplacer(config);
    replacer.saveConfig();
    if (localStorage) {
      localStorage.setItem(`configReplacer_default`, JSON.stringify(config));
    }
    console.log('Configuración guardada:', config);
  };

  const exportConfig = () => {
    const config = {
      removeBackslashes: props.removeBackslashes,
      useLocalStorage: props.useLocalStorage,
      replacements: {},
      exportedAt: new Date().toISOString()
    };

    replacements.forEach(r => {
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
          props.onInstanceIdChange('default');
          props.onRemoveBackslashesChange(true);
          props.onUseLocalStorageChange(true);
          
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
    <>


      {/* Configuración de Reemplazos */}
      <section class="config-section">
        <div class="section-header">
          <h2 class="section-title">Configuración de Reemplazos</h2>
                {/* Botones de Acción */}
      <div class="action-buttons">
          <button 
            type="button" 
            onClick={addReplacement}
            class="button button-success"
          >
            ➕ Agregar Reemplazo
          </button>
        <button 
          type="button" 
          onClick={saveConfiguration}
          class="button button-success"
        >
          💾 Guardar Configuración
        </button>
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
      </div>
        </div>
        
        <div class="replacements-list">
          <For each={replacements} fallback={<div>No hay reemplazos configurados</div>}>
            {(replacement, index) => (
              <ReplacementItemForm
                replacement={replacement}
                onUpdate={updateReplacement}
                onRemove={removeReplacement}
                // Clave única para evitar re-renders innecesarios
                key={replacement.id}
              />
            )}
          </For>
        </div>
      </section>


    </>
  );
}