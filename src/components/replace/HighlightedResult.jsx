// HighlightedResult.jsx
import './HighlightedResult.css';

function HighlightedResult(props) {
  const { result, replacementMap } = props;

  // Función para procesar el texto y resaltar los valores reemplazados
  const processText = (text) => {
    if (!text || !replacementMap || replacementMap.size === 0) {
      return text;
    }

    let processedText = text;
    const replacements = [];
    
    // Crear un mapa de todos los valores que fueron reemplazados
    replacementMap.forEach((info, replacedValue) => {
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

  // Función auxiliar para escapar caracteres especiales en regex
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Función para formatear JSON con highlighting
  const formatJsonWithHighlighting = (jsonString) => {
    try {
      // Intentar parsear para verificar si es JSON válido
      const parsed = JSON.parse(jsonString);
      
      // Formatear el JSON con indentación
      const formatted = JSON.stringify(parsed, null, 2);
      
      // Dividir en líneas para procesar cada una
      const lines = formatted.split('\n');
      
      return (
        <div class="json-container">
          {lines.map((line, index) => (
            <div key={index} class="json-line">
              <span class="line-number">{index + 1}</span>
              <span class="json-content">
                {processText(line)}
              </span>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      // Si no es JSON válido, procesar como texto normal
      return <div class="text-content">{processText(jsonString)}</div>;
    }
  };

  return (
    <div class="highlighted-result-container">
      <div class="test-result-output success highlighted">
        {formatJsonWithHighlighting(result)}
      </div>
      
      {/* Leyenda de colores */}
      {replacementMap && replacementMap.size > 0 && (
        <div class="replacement-legend">
          <div class="legend-title">Valores Reemplazados:</div>
          <div class="legend-items">
            {Array.from(replacementMap.entries()).map(([replacedValue, info], index) => (
              <div key={index} class="legend-item">
                <span class="legend-color highlighted-value"></span>
                <span class="legend-text">
                  <code>"{info.original}"</code> → <strong>"{replacedValue}"</strong>
                  <small> (desde {info.dataKey})</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HighlightedResult;