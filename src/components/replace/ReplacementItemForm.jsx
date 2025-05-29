// ReplacementItemForm.jsx
import { createSignal, createEffect, onCleanup } from 'solid-js';
import './ReplacementItemForm.css';

function ReplacementItemForm(props) {
  const { replacement, onUpdate, onRemove } = props;
  
  // Señales locales para evitar re-renders en cada keystroke
  const [pattern, setPattern] = createSignal(replacement.pattern);
  const [dataKey, setDataKey] = createSignal(replacement.dataKey);
  const [defaultValue, setDefaultValue] = createSignal(replacement.defaultValue);
  
  // Timers para debounce
  let patternTimer;
  let dataKeyTimer;
  let defaultValueTimer;
  
  // Cleanup timers on component unmount
  onCleanup(() => {
    clearTimeout(patternTimer);
    clearTimeout(dataKeyTimer);
    clearTimeout(defaultValueTimer);
  });
  
  // Actualizar señales locales cuando cambien las props (para importación de config)
  createEffect(() => {
    setPattern(replacement.pattern);
    setDataKey(replacement.dataKey);
    setDefaultValue(replacement.defaultValue);
  });
  
  // Funciones de debounce para actualizar el estado padre
  const updatePatternDebounced = (value) => {
    clearTimeout(patternTimer);
    patternTimer = setTimeout(() => {
      onUpdate(replacement.id, 'pattern', value);
    }, 300);
  };
  
  const updateDataKeyDebounced = (value) => {
    clearTimeout(dataKeyTimer);
    dataKeyTimer = setTimeout(() => {
      onUpdate(replacement.id, 'dataKey', value);
    }, 300);
  };
  
  const updateDefaultValueDebounced = (value) => {
    clearTimeout(defaultValueTimer);
    defaultValueTimer = setTimeout(() => {
      onUpdate(replacement.id, 'defaultValue', value);
    }, 300);
  };
  
  // Handlers para input y blur
  const handlePatternInput = (e) => {
    const value = e.target.value;
    setPattern(value);
    updatePatternDebounced(value);
  };
  
  const handlePatternBlur = (e) => {
    clearTimeout(patternTimer);
    onUpdate(replacement.id, 'pattern', e.target.value);
  };
  
  const handleDataKeyInput = (e) => {
    const value = e.target.value;
    setDataKey(value);
    updateDataKeyDebounced(value);
  };
  
  const handleDataKeyBlur = (e) => {
    clearTimeout(dataKeyTimer);
    onUpdate(replacement.id, 'dataKey', e.target.value);
  };
  
  const handleDefaultValueInput = (e) => {
    const value = e.target.value;
    setDefaultValue(value);
    updateDefaultValueDebounced(value);
  };
  
  const handleDefaultValueBlur = (e) => {
    clearTimeout(defaultValueTimer);
    onUpdate(replacement.id, 'defaultValue', e.target.value);
  };

  return (
    <div class="replacement-item">
      <div class="replacement-item-grid">
        <div class="form-group">
          <label for={`pattern-${replacement.id}`} class="form-label">Patrón</label>
          <input
            id={`pattern-${replacement.id}`}
            type="text"
            value={pattern()}
            onInput={handlePatternInput}
            onBlur={handlePatternBlur}
            class="form-input form-input-mono"
            placeholder="uniqueId"
          />
        </div>
        
        <div class="form-group">
          <label for={`dataKey-${replacement.id}`} class="form-label">Clave de Datos</label>
          <input
            id={`dataKey-${replacement.id}`}
            type="text"
            value={dataKey()}
            onInput={handleDataKeyInput}
            onBlur={handleDataKeyBlur}
            class="form-input"
            placeholder="uniqueId"
          />
        </div>
        
        <div class="form-group">
          <label for={`defaultValue-${replacement.id}`} class="form-label">Valor por Defecto</label>
          <input
            id={`defaultValue-${replacement.id}`}
            type="text"
            value={defaultValue()}
            onInput={handleDefaultValueInput}
            onBlur={handleDefaultValueBlur}
            class="form-input"
            placeholder="testUser"
          />
        </div>
        
        <div class="replacement-item-action">
          <button
            type="button"
            onClick={() => onRemove(replacement.id)}
            class="button button-danger button-full-width"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplacementItemForm;