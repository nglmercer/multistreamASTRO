// ReplacementItemForm.jsx
import './ReplacementItemForm.css'; // Crearemos este archivo CSS

function ReplacementItemForm(props) {
  const { replacement, onUpdate, onRemove } = props;

  return (
    <div class="replacement-item">
      <div class="replacement-item-grid">
        <div class="form-group">
          <label for={`pattern-${replacement.id}`} class="form-label">Patrón</label>
          <input
            id={`pattern-${replacement.id}`}
            type="text"
            value={replacement.pattern}
            onInput={(e) => onUpdate(replacement.id, 'pattern', e.target.value)}
            class="form-input form-input-mono"
            placeholder="uniqueId"
          />
        </div>
        <div class="form-group">
          <label for={`dataKey-${replacement.id}`} class="form-label">Clave de Datos</label>
          <input
            id={`dataKey-${replacement.id}`}
            type="text"
            value={replacement.dataKey}
            onInput={(e) => onUpdate(replacement.id, 'dataKey', e.target.value)}
            class="form-input"
            placeholder="uniqueId"
          />
        </div>
        <div class="form-group">
          <label for={`defaultValue-${replacement.id}`} class="form-label">Valor por Defecto</label>
          <input
            id={`defaultValue-${replacement.id}`}
            type="text"
            value={replacement.defaultValue}
            onInput={(e) => onUpdate(replacement.id, 'defaultValue', e.target.value)}
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