// HighlightedResult.jsx
import { createMemo, For, Show } from 'solid-js';
import './HighlightedResult.css';

function HighlightedResult(props) {
  // Función auxiliar para escapar caracteres especiales en regex
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Función para procesar el texto y resaltar los valores reemplazados
  const processText = (text) => {
    if (!text || !props.replacementMap || props.replacementMap.size === 0) {
      return text;
    }

    const replacements = [];
    
    // Crear un mapa de todos los valores que fueron reemplazados
    props.replacementMap.forEach((info, replacedValue) => {
      const regex = new RegExp(`(${escapeRegExp(replacedValue)})`, 'g');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[1].length,
          value: match[1],
          original: info.original,
          dataKey: info.dataKey
        });
      }
    });

    // Ordenar reemplazos por posición para procesarlos correctamente
    replacements.sort((a, b) => a.start - b.start);

    // Si no hay reemplazos, devolver texto normal
    if (replacements.length === 0) {
      return text;
    }

    // Construir JSX con highlighting
    const elements = [];
    let lastIndex = 0;

    replacements.forEach((replacement, index) => {
      // Agregar texto antes del reemplazo
      if (replacement.start > lastIndex) {
        elements.push(text.slice(lastIndex, replacement.start));
      }

      // Agregar el valor reemplazado con highlighting
      elements.push(
        <span 
          key={`highlight-${index}`}
          class="highlighted-value" 
          title={`Original: "${replacement.original}" → DataKey: "${replacement.dataKey}"`}
          data-original={replacement.original}
          data-datakey={replacement.dataKey}
        >
          {replacement.value}
        </span>
      );

      lastIndex = replacement.end;
    });

    // Agregar el resto del texto
    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements;
  };

  // Memo reactivo para el contenido formateado
  const formattedContent = createMemo(() => {
    console.log('HighlightedResult re-rendering with:', {
      result: props.result,
      mapSize: props.replacementMap?.size || 0
    });

    try {
      // Intentar parsear para verificar si es JSON válido
      const parsed = JSON.parse(props.result);
      
      // Formatear el JSON con indentación
      const formatted = JSON.stringify(parsed, null, 2);
      
      // Dividir en líneas para procesar cada una
      const lines = formatted.split('\n');
      
      return {
        type: 'json',
        lines: lines
      };
    } catch (e) {
      // Si no es JSON válido, procesar como texto normal
      return {
        type: 'text',
        content: props.result
      };
    }
  });

  // Memo reactivo para las entradas del mapa de reemplazos
  const replacementEntries = createMemo(() => {
    if (!props.replacementMap || props.replacementMap.size === 0) {
      return [];
    }
    return Array.from(props.replacementMap.entries());
  });

  return (
    <div class="highlighted-result-container">
      <div class="test-result-output success highlighted">
        <Show 
          when={formattedContent().type === 'json'}
          fallback={
            <div class="text-content">
              {processText(formattedContent().content)}
            </div>
          }
        >
          <div class="json-container">
            <For each={formattedContent().lines}>
              {(line, index) => (
                <div class="json-line">
                  <span class="line-number">{index() + 1}</span>
                  <span class="json-content">
                    {processText(line)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      
      {/* Leyenda de colores */}
      <Show when={props.replacementMap && props.replacementMap.size > 0}>
        <div class="replacement-legend">
          <div class="legend-title">Valores Reemplazados:</div>
          <div class="legend-items">
            <For each={replacementEntries()}>
              {([replacedValue, info], index) => (
                <div class="legend-item">
                  <span class="legend-color highlighted-value"></span>
                  <span class="legend-text">
                    <code>"{info.original}"</code> → <strong>"{replacedValue}"</strong>
                    <small> ({info.dataKey})</small>
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default HighlightedResult;